// @ts-nocheck
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getGoogleAccessToken } from '../_shared/google.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' } })

  try {
    const { userId, maxResults = 10 } = await req.json()
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const token = await getGoogleAccessToken({ supabase, userId })

    // Fetch unread emails, limited to past 6 months to optimize
    const listRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=is:unread newer_than:6m&maxResults=${maxResults}`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    const { messages = [] } = await listRes.json()

    // Fetch subject line for each message
    const subjects = await Promise.all(messages.map(async (msg: any) => {
      const detail = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      const data = await detail.json()
      const headers = data.payload?.headers ?? []
      const subject = headers.find((h: any) => h.name === 'Subject')?.value ?? '(No subject)'
      const from = headers.find((h: any) => h.name === 'From')?.value ?? ''
      return { id: msg.id, subject, from }
    }))

    return new Response(JSON.stringify({ emails: subjects }), {
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }
    })
  } catch (err: any) {
    const isAuthError = err.message?.includes('NO_REFRESH_TOKEN') || err.message?.includes('refresh token') || err.message?.includes('invalid_grant')
    const status = isAuthError ? 401 : 500
    return new Response(JSON.stringify({ error: err.message, needsReauth: isAuthError }), {
      status,
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }
    })
  }
})
