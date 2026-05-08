// @ts-nocheck
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' } })
  }

  const { userId } = await req.json()
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { data: profile } = await supabase
    .from('profiles').select('google_refresh_token, google_token_expires_at').eq('id', userId).single()

  if (!profile?.google_refresh_token) {
    return new Response(JSON.stringify({ error: 'No refresh token stored' }), { status: 401, headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' } })
  }

  // Check if token is still valid (expires in >5 minutes)
  const expiryTime = new Date(profile.google_token_expires_at ?? 0).getTime()
  if (expiryTime - Date.now() > 5 * 60 * 1000) {
    // Token still valid — fetch and return current token
    const { data: full } = await supabase.from('profiles').select('google_access_token').eq('id', userId).single()
    return new Response(JSON.stringify({ access_token: full?.google_access_token }), { headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' } })
  }

  // Token expired — refresh it
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: Deno.env.get('GOOGLE_CLIENT_ID') || Deno.env.get('VITE_GOOGLE_CLIENT_ID') || '',
      client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET') || Deno.env.get('VITE_GOOGLE_CLIENT_SECRET') || '',
      refresh_token: profile.google_refresh_token,
      grant_type: 'refresh_token',
    })
  })
  const tokens = await res.json()
  if (!tokens.access_token) {
    return new Response(JSON.stringify({ error: 'Token refresh failed' }), { status: 401, headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' } })
  }

  // Save new token
  await supabase.from('profiles').update({
    google_access_token: tokens.access_token,
    google_token_expires_at: new Date(Date.now() + (tokens.expires_in * 1000)).toISOString()
  }).eq('id', userId)

  return new Response(JSON.stringify({ access_token: tokens.access_token }), { headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' } })
})
