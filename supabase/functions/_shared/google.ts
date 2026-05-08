// @ts-nocheck
/**
 * Shared Google OAuth helper for Supabase Edge Functions.
 * Avoids calling another Edge Function over HTTP (which can fail auth in prod).
 */
export async function getGoogleAccessToken(params: { supabase: any; userId: string }): Promise<string> {
  const { supabase, userId } = params

  const { data: profile } = await supabase
    .from('profiles')
    .select('google_access_token, google_refresh_token, google_token_expiry')
    .eq('id', userId)
    .single()

  const accessToken = profile?.google_access_token ?? null
  const refreshToken = profile?.google_refresh_token ?? null
  const expiry = profile?.google_token_expiry ? new Date(profile.google_token_expiry).getTime() : 0

  // If access token exists and is valid for >5 minutes, use it.
  if (accessToken && expiry - Date.now() > 5 * 60 * 1000) return accessToken

  if (!refreshToken) {
    // Some OAuth flows may provide access token only; allow it as a last resort.
    if (accessToken) return accessToken
    throw new Error('No Google refresh token stored. Reconnect Google with offline access.')
  }

  const clientId =
    Deno.env.get('GOOGLE_CLIENT_ID') ||
    Deno.env.get('VITE_GOOGLE_CLIENT_ID') ||
    Deno.env.get('SUPABASE_GOOGLE_CLIENT_ID') ||
    ''
  const clientSecret =
    Deno.env.get('GOOGLE_CLIENT_SECRET') ||
    Deno.env.get('VITE_GOOGLE_CLIENT_SECRET') ||
    Deno.env.get('SUPABASE_GOOGLE_CLIENT_SECRET') ||
    ''

  if (!clientId || !clientSecret) {
    throw new Error('Missing GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET in Edge Function env.')
  }

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })

  const tokens = await res.json()
  if (!tokens?.access_token) {
    throw new Error(tokens?.error_description || tokens?.error || 'Token refresh failed')
  }

  await supabase
    .from('profiles')
    .update({
      google_access_token: tokens.access_token,
      google_token_expiry: new Date(Date.now() + (Number(tokens.expires_in || 3600) * 1000)).toISOString(),
    })
    .eq('id', userId)

  return tokens.access_token
}

export function getGroqApiKey(): string {
  return (
    Deno.env.get('GROQ_API_KEY') ||
    // Some deployments incorrectly set client-side env in function secrets; tolerate it.
    Deno.env.get('VITE_GROQ_API_KEY') ||
    ''
  )
}

