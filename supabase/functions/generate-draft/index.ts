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
    const { userId, draftType, tone, contextInput, threadId } = await req.json()
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const GROQ_KEY = Deno.env.get('GROQ_API_KEY')

    let emailContext = ''
    if (draftType === 'email' && threadId) {
      try {
        const token = await getGoogleToken(userId, supabase)
        const res = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${threadId}?format=full`,
          { headers: { Authorization: `Bearer ${token}` } }
        )
        const msg = await res.json()
        
        function extractBody(payload: any): string {
          if (payload.mimeType === 'text/plain' && payload.body?.data) {
            return atob(payload.body.data.replace(/-/g, '+').replace(/_/g, '/'))
          }
          if (payload.parts) {
            for (const part of payload.parts) {
              const text = extractBody(part)
              if (text) return text
            }
          }
          return ''
        }

        emailContext = `\n\nOriginal email thread context:\n${extractBody(msg.payload).slice(0, 2000)}`
      } catch (e) {
        console.warn('Could not fetch email thread context')
      }
    }

    const prompt = `Write a ${draftType} with a ${tone} tone.
Context: ${contextInput}${emailContext}
Write the complete, ready-to-use ${draftType}. No explanation.`

    const aiRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${GROQ_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.4, max_tokens: 1000
      })
    })
    
    const json = await aiRes.json()
    const content = json.choices[0].message.content

    return new Response(JSON.stringify({ content }), {
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }
    })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' } })
  }
})
