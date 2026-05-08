// @ts-nocheck
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getGroqApiKey } from '../_shared/google.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' } })

  try {
    const { tasksCompleted, focusMinutes, loopsClosed, emailsSent, meetingsAttended, driveDocsModified } = await req.json()
    const GROQ_KEY = getGroqApiKey()

    const prompt = `You are a productivity coach reviewing a user's week.
App activity:
- Tasks completed: ${tasksCompleted}
- Focus minutes: ${focusMinutes}
- Open loops closed: ${loopsClosed}

Real-world digital activity (from Google):
- Emails sent: ${emailsSent}
- Meetings attended: ${meetingsAttended}
- Documents worked on: ${driveDocsModified}

Give 4 insights in a JSON array of strings. Be honest, specific, and encouraging.
Example: ["You sent ${emailsSent} emails but only closed ${loopsClosed} loops — your inbox might be creating new open loops faster than you're closing them."]
Return ONLY: ["insight 1", "insight 2", "insight 3", "insight 4"]`

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
    if (json.error) throw new Error(json.error.message || 'Groq API error')
    let raw = json.choices?.[0]?.message?.content ?? '[]'
    raw = raw.replace(/```json?/gi, '').replace(/```/g, '').trim()
    let insights: string[]
    try {
      insights = JSON.parse(raw)
      if (!Array.isArray(insights)) throw new Error('Not an array')
    } catch {
      insights = ['Keep pushing your daily task completion rate.', 'Try to hit 90+ minutes of deep work daily.', 'Clear open loops every morning for a clear mind.', 'Review your weekly metrics every Sunday.']
    }

    return new Response(JSON.stringify({ insights }), {
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }
    })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' } })
  }
})
