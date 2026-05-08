// @ts-nocheck
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getGoogleAccessToken, getGroqApiKey } from '../_shared/google.ts'

function decodeBase64Url(input: string): string {
  return atob(input.replace(/-/g, '+').replace(/_/g, '/'))
}

function extractPlainText(payload: any): string {
  if (!payload) return ''
  if (payload.mimeType === 'text/plain' && payload.body?.data) {
    return decodeBase64Url(payload.body.data)
  }
  if (payload.parts?.length) {
    for (const part of payload.parts) {
      const text = extractPlainText(part)
      if (text) return text
    }
  }
  return ''
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' } })

  try {
    const { userId, googleToken } = await req.json()
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const GROQ_KEY = getGroqApiKey()

    // Use browser-provided token (GIS flow) or fall back to stored token
    let token: string | null = googleToken ?? null
    if (!token) {
      try {
        token = await getGoogleAccessToken({ supabase, userId })
      } catch (e) {
        console.warn('Could not get stored Google token, skipping Gmail parsing', e)
      }
    }

    // 1. Import tasks ONLY from Gmail (unread) into tasks table
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
            const headers = msgData.payload?.headers ?? []
            const subject = headers.find((h: any) => h.name === 'Subject')?.value ?? '(No subject)'
            const from = headers.find((h: any) => h.name === 'From')?.value ?? ''
            const body = extractPlainText(msgData.payload).slice(0, 4000)

            const combined = `From: ${from}\nSubject: ${subject}\n\n${body || msgData.snippet || ''}`.trim()
            if (combined) emailTexts.push(combined)
          }

          if (emailTexts.length > 0) {
            // Parse tasks from emails
            const parsePrompt = `You are an AI that extracts tasks from emails based on keywords and deadlines.
Emails: ${JSON.stringify(emailTexts)}
Extract any actionable tasks. Pay special attention to deadlines or urgent keywords. Return ONLY a valid JSON array:
[{"title": "short title", "description": "...", "ai_difficulty": "easy" | "medium" | "hard", "ai_priority_score": 1-100 (higher if urgent/deadline)}]`

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
              title: (t.title || 'Gmail Task').slice(0, 180),
              description: (t.description || '').slice(0, 2000),
              ai_difficulty: t.ai_difficulty || 'medium',
              ai_priority_score: t.ai_priority_score || 50,
              ai_source: 'priority_engine',
              ai_generated: true
            }))
            if (rows.length > 0) {
              // Avoid importing the same Gmail-derived task repeatedly when users click multiple times.
              const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
              const titles = rows.map((r: any) => r.title)
              const { data: existing } = await supabase
                .from('tasks')
                .select('title')
                .eq('user_id', userId)
                .eq('ai_source', 'priority_engine')
                .in('title', titles)
                .gte('created_at', cutoff)

              const existingSet = new Set((existing ?? []).map((e: any) => e.title))
              const toInsert = rows.filter((r: any) => !existingSet.has(r.title))
              if (toInsert.length > 0) await supabase.from('tasks').insert(toInsert)
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
      .eq('status', 'todo')
      .order('ai_priority_score', { ascending: false })

    const topTasks = (dbTasks ?? []).slice(0, 5)

    // 4. Generate AI Explanation
    let explanation = "Focus on the top priority task first."
    if (topTasks.length > 0) {
      const prompt = `You are a productivity coach ranking tasks by priority score.
Ranked tasks: ${JSON.stringify(topTasks.map((t: any) => ({ name: t.title || t.description, score: t.ai_priority_score ?? t.priority_score ?? 0 })))}
Explain in 2-3 sentences why this order makes sense.
Suggest which task to start RIGHT NOW. Be direct and encouraging.`

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
