// @ts-nocheck
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { getGroqApiKey } from '../_shared/google.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' } })

  try {
    const { task } = await req.json()
    const GROQ_KEY = getGroqApiKey()

    const prompt = `You are a productivity AI. Break this task into 3-8 concrete subtasks.
Task: "${task}"
Return ONLY valid JSON array, no explanation, no markdown:
[{ "title": "short title", "description": "...", "ai_difficulty": "easy" | "medium" | "hard", "ai_priority_score": 1-100 }]`

    const aiRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${GROQ_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.4,
        max_tokens: 1000
      })
    })

    const json = await aiRes.json()
    if (json.error) throw new Error(json.error.message || 'Groq API error')

    let raw = json.choices[0].message.content
    raw = raw.replace(/```json?/gi, '').replace(/```/g, '').trim()
    const subtasks = JSON.parse(raw)

    return new Response(JSON.stringify({ subtasks }), {
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }
    })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }
    })
  }
})
