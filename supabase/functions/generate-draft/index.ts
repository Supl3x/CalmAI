// @ts-nocheck
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getGoogleAccessToken, getGroqApiKey } from '../_shared/google.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' } })

  try {
    const { userId, draftType, tone, contextInput, threadId } = await req.json()
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const GROQ_KEY = getGroqApiKey()

    let emailContext = ''
    if (draftType === 'email' && threadId) {
      try {
        const token = await getGoogleAccessToken({ supabase, userId })
        const res = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${threadId}?format=full`,
          { headers: { Authorization: `Bearer ${token}` } }
        )
        const msg = await res.json()
        
        // Extract subject
        const headers = msg.payload?.headers || []
        const subject = headers.find((h: any) => h.name === 'Subject')?.value || ''
        const from = headers.find((h: any) => h.name === 'From')?.value || ''
        
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

        const emailBody = extractBody(msg.payload).slice(0, 2000)
        emailContext = `\n\nOriginal email you are replying to:
From: ${from}
Subject: ${subject}
Body: ${emailBody}`
        
        console.log('Email context fetched successfully:', emailContext.substring(0, 200))
      } catch (e: any) {
        console.warn('Could not fetch email thread context:', e.message)
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
    if (json.error) throw new Error(json.error.message || 'Groq API error')
    if (!json.choices?.[0]?.message?.content) throw new Error('Empty response from Groq')
    const content = json.choices[0].message.content

    return new Response(JSON.stringify({ content }), {
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }
    })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' } })
  }
})
