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
    const today = new Date().toISOString().split('T')[0]
    const GROQ_KEY = Deno.env.get('GROQ_API_KEY')

    // 1. Fetch user's tasks from DB
    const { data: tasks } = await supabase.from('tasks')
      .select('description, priority_score').eq('user_id', userId).eq('is_complete', false)
      .order('priority_score', { ascending: false }).limit(5)

    // 2. Fetch open loop count
    const { count: loopCount } = await supabase.from('open_loops')
      .select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('is_complete', false)

    // 3. Fetch today's calendar events
    let calendarEvents: any[] = []
    let unreadEmailCount = 0
    try {
      const token = await getGoogleToken(userId, supabase)

      const now = new Date()
      const dayEnd = new Date(now)
      dayEnd.setHours(23, 59, 59, 0)

      const [calRes, gmailRes] = await Promise.all([
        fetch(
          `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${now.toISOString()}&timeMax=${dayEnd.toISOString()}&singleEvents=true&orderBy=startTime`,
          { headers: { Authorization: `Bearer ${token}` } }
        ),
        fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=is:unread&maxResults=1`,
          { headers: { Authorization: `Bearer ${token}` } }
        )
      ])

      const calData = await calRes.json()
      const gmailData = await gmailRes.json()

      calendarEvents = (calData.items ?? []).map((e: any) => ({
        name: e.summary ?? 'Untitled',
        time: e.start?.dateTime
          ? new Date(e.start.dateTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
          : 'All day'
      }))
      unreadEmailCount = gmailData.resultSizeEstimate ?? 0
    } catch (e: any) {
      console.warn('Google API unavailable, using task data only:', e.message)
    }

    // 4. Build AI prompt with real data
    const prompt = `You are a calm productivity AI generating a morning briefing.
User data:
- Top tasks (by priority): ${JSON.stringify(tasks)}
- Open mental loops: ${loopCount}
- Today's calendar: ${JSON.stringify(calendarEvents)}
- Unread emails: ${unreadEmailCount}

Return ONLY this JSON structure, no extra text:
{
  "priorities": ["top task 1", "top task 2", "top task 3"],
  "schedule": [
    { "time": "9:00 AM", "activity": "..." },
    { "time": "11:00 AM", "activity": "..." },
    { "time": "2:00 PM", "activity": "..." }
  ],
  "insight": "one motivational sentence based on their actual workload",
  "warning": "if overloaded OR many unread emails, a gentle caution — else null",
  "emailAlert": ${unreadEmailCount > 10 ? '"You have ' + unreadEmailCount + ' unread emails — consider a 10-minute inbox triage before starting deep work."' : 'null'}
}`

    // 5. Call Groq AI
    let content: any = {}
    try {
      const aiRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${GROQ_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.5, max_tokens: 1000
        })
      })
      const json = await aiRes.json()
      content = JSON.parse(json.choices[0].message.content)
    } catch (e) {
      content = {
        priorities: tasks?.map((t: any) => t.description).slice(0, 3) ?? [],
        schedule: calendarEvents.map((e: any) => ({ time: e.time, activity: e.name })),
        insight: 'Focus on what matters most today.',
        warning: null,
        emailAlert: null,
      }
    }

    // 6. Save to daily_briefings
    await supabase.from('daily_briefings').upsert({
      user_id: userId,
      briefing_date: today,
      content,
    }, { onConflict: 'user_id,briefing_date' })

    return new Response(JSON.stringify({ content }), {
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }
    })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' } })
  }
})
