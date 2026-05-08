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
    const { userId, tasks } = await req.json()
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const GROQ_KEY = Deno.env.get('GROQ_API_KEY')

    const token = await getGoogleToken(userId, supabase)

    const now = new Date().toISOString()
    const dayEnd = new Date()
    dayEnd.setHours(23, 59, 59, 0)

    const calRes = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${now}&timeMax=${dayEnd.toISOString()}&singleEvents=true&orderBy=startTime`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    const calData = await calRes.json()
    const todayEvents = (calData.items ?? []).map((e: any) => ({
      name: e.summary,
      time: e.start?.dateTime ?? e.start?.date
    }))

    const prompt = `You are a productivity coach ranking tasks by priority score.
Ranked tasks: ${JSON.stringify(tasks.map((t: any) => ({ name: t.description, score: t.priority_score })))}
Today's calendar commitments: ${JSON.stringify(todayEvents)}
Explain in 3-4 sentences why this order makes sense given today's schedule.
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
    const explanation = json.choices[0].message.content

    return new Response(JSON.stringify({ explanation }), {
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }
    })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' } })
  }
})
