// @ts-nocheck
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

async function getGoogleToken(userId: string, supabase: any): Promise<string> {
  const refreshRes = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/refresh-google-token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
    },
    body: JSON.stringify({ userId })
  })
  const { access_token, error } = await refreshRes.json()
  if (error || !access_token) throw new Error('Google auth failed: ' + error)
  return access_token
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' } })

  try {
    const { userId } = await req.json()
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const GROQ_KEY = Deno.env.get('GROQ_API_KEY')

    let token = null
    try {
      token = await getGoogleToken(userId, supabase)
    } catch (e) {
      console.warn("Could not get Google token, skipping Gmail parsing", e)
    }

    // 1. Fetch unread emails from Gmail
    let newTasksFromGmail = []
    if (token) {
      try {
        const gmailRes = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=is:unread&maxResults=3`,
          { headers: { Authorization: `Bearer ${token}` } }
        )
        const gmailData = await gmailRes.json()
        const messages = gmailData.messages ?? []

        if (messages.length > 0) {
          const emailTexts = []
          for (const msg of messages) {
            const msgRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`, {
              headers: { Authorization: `Bearer ${token}` }
            })
            const msgData = await msgRes.json()
            const snippet = msgData.snippet ?? ""
            if (snippet) emailTexts.push(snippet)
          }

          if (emailTexts.length > 0) {
            // Parse tasks from emails
            const parsePrompt = `You are an AI that extracts tasks from emails.
Emails: ${JSON.stringify(emailTexts)}
Extract any actionable tasks. Return ONLY a valid JSON array:
[{"description": "...", "difficulty": 1-10, "resistance": 1-10, "urgency": 1-10}]`

            const parseRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
              method: 'POST',
              headers: { Authorization: `Bearer ${GROQ_KEY}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({
                model: 'llama-3.1-8b-instant',
                messages: [{ role: 'user', content: parsePrompt }],
                temperature: 0.2, max_tokens: 800
              })
            })
            const parseJson = await parseRes.json()
            const parsedStr = parseJson.choices[0].message.content.replace(/```json?/gi, '').replace(/```/g, '').trim()
            const extractedTasks = JSON.parse(parsedStr)

            // Insert into Supabase
            const rows = extractedTasks.map((t: any) => ({
              user_id: userId,
              parent_task: 'Gmail Extracted Task',
              description: t.description,
              difficulty: t.difficulty ?? 5,
              resistance: t.resistance ?? 5,
              urgency: t.urgency ?? 5,
              source: 'gmail',
              ai_generated: true
            }))
            if (rows.length > 0) {
              await supabase.from('tasks').insert(rows)
            }
          }
        }
      } catch (e) {
        console.warn("Failed to parse Gmail tasks", e)
      }
    }

    // 2. Query all incomplete tasks
    const { data: dbTasks } = await supabase.from('tasks')
      .select('*')
      .eq('user_id', userId)
      .eq('is_complete', false)
      .order('priority_score', { ascending: false })

    const topTasks = (dbTasks ?? []).slice(0, 5)

    // 3. Fetch Calendar events
    let todayEvents = []
    if (token) {
      try {
        const now = new Date().toISOString()
        const dayEnd = new Date()
        dayEnd.setHours(23, 59, 59, 0)

        const calRes = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${now}&timeMax=${dayEnd.toISOString()}&singleEvents=true&orderBy=startTime`,
          { headers: { Authorization: `Bearer ${token}` } }
        )
        const calData = await calRes.json()
        todayEvents = (calData.items ?? []).map((e: any) => ({
          name: e.summary,
          time: e.start?.dateTime ?? e.start?.date
        }))
      } catch (e) {
        console.warn("Failed to fetch calendar", e)
      }
    }

    // 4. Generate AI Explanation
    let explanation = "Focus on the top priority task first."
    if (topTasks.length > 0) {
      const prompt = `You are a productivity coach ranking tasks by priority score.
Ranked tasks: ${JSON.stringify(topTasks.map((t: any) => ({ name: t.description, score: t.priority_score })))}
Today's calendar commitments: ${JSON.stringify(todayEvents)}
Explain in 2-3 sentences why this order makes sense given today's schedule.
Suggest which task to start RIGHT NOW based on the calendar. Be direct and encouraging.`

      const aiRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${GROQ_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.4, max_tokens: 800
        })
      })
      
      const json = await aiRes.json()
      explanation = json.choices[0].message.content
    }

    return new Response(JSON.stringify({ explanation, tasks: dbTasks }), {
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }
    })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' } })
  }
})
