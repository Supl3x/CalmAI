// @ts-nocheck
/**
 * Shared Google OAuth helper for Supabase Edge Functions.
 * Handles token refresh with proper error handling and retry logic.
 */
export async function getGoogleAccessToken(params: { supabase: any; userId: string; forceRefresh?: boolean }): Promise<string> {
  const { supabase, userId, forceRefresh = false } = params

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('google_access_token, google_refresh_token, google_token_expires_at')
    .eq('id', userId)
    .single()

  if (profileError) {
    throw new Error(`Failed to fetch profile: ${profileError.message}`)
  }

  const accessToken = profile?.google_access_token ?? null
  const refreshToken = profile?.google_refresh_token ?? null
  const expiry = profile?.google_token_expires_at ? new Date(profile.google_token_expires_at).getTime() : 0

  // If access token exists and is valid for >10 minutes (increased buffer), use it
  if (!forceRefresh && accessToken && expiry - Date.now() > 10 * 60 * 1000) {
    return accessToken
  }

  if (!refreshToken) {
    // Some OAuth flows may provide access token only; allow it as a last resort
    if (accessToken) return accessToken
    throw new Error('NO_REFRESH_TOKEN: Please sign out and sign back in with Google to reconnect your account.')
  }

  const clientId =
    Deno.env.get('GOOGLE_CLIENT_ID') ||
    Deno.env.get('VITE_GOOGLE_CLIENT_ID') ||
    ''
  const clientSecret =
    Deno.env.get('GOOGLE_CLIENT_SECRET') ||
    Deno.env.get('VITE_GOOGLE_CLIENT_SECRET') ||
    ''

  if (!clientId || !clientSecret) {
    throw new Error('Missing GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET in Edge Function environment variables.')
  }

  // Refresh the token with retry logic
  let retries = 2
  while (retries > 0) {
    try {
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
      
      if (!res.ok || !tokens?.access_token) {
        if (tokens?.error === 'invalid_grant') {
          throw new Error('Google refresh token is invalid or expired. Please reconnect your Google account.')
        }
        throw new Error(tokens?.error_description || tokens?.error || `Token refresh failed with status ${res.status}`)
      }

      // Update the profile with new token
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          google_access_token: tokens.access_token,
          google_token_expires_at: new Date(Date.now() + (Number(tokens.expires_in || 3600) * 1000)).toISOString(),
        })
        .eq('id', userId)

      if (updateError) {
        console.warn('Failed to update profile with new token:', updateError.message)
      }

      return tokens.access_token
    } catch (error) {
      retries--
      if (retries === 0) throw error
      // Wait 1 second before retry
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }

  throw new Error('Failed to refresh Google token after retries')
}

export function getGroqApiKey(): string {
  const key = Deno.env.get('GROQ_API_KEY') || ''
  if (!key) {
    throw new Error('GROQ_API_KEY is not set in Supabase Edge Function secrets. Go to Supabase Dashboard → Edge Functions → Secrets and add GROQ_API_KEY.')
  }
  return key
}

/**
 * Fetch Gmail data with caching to prevent rate limiting
 */
export async function fetchGmailWithCache(params: {
  supabase: any
  userId: string
  token: string
  query: string
  maxResults?: number
  cacheMinutes?: number
}): Promise<any> {
  const { supabase, userId, token, query, maxResults = 10, cacheMinutes = 5 } = params
  
  const cacheKey = `gmail_${userId}_${query}_${maxResults}`
  const now = Date.now()
  
  // Check cache first
  const { data: cached } = await supabase
    .from('api_cache')
    .select('data, cached_at')
    .eq('cache_key', cacheKey)
    .single()
  
  if (cached && (now - new Date(cached.cached_at).getTime()) < cacheMinutes * 60 * 1000) {
    console.log('Using cached Gmail data')
    return cached.data
  }
  
  // Fetch fresh data with rate limit handling
  try {
    const response = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=${maxResults}`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    
    if (response.status === 429) {
      // Rate limited - use cached data even if expired
      if (cached) {
        console.warn('Rate limited, using stale cache')
        return cached.data
      }
      throw new Error('Gmail API rate limit exceeded. Please try again in a few minutes.')
    }
    
    if (!response.ok) {
      throw new Error(`Gmail API error: ${response.status} ${response.statusText}`)
    }
    
    const data = await response.json()
    
    // Update cache (non-fatal if it fails)
    try {
      await supabase
        .from('api_cache')
        .upsert({
          cache_key: cacheKey,
          user_id: userId,
          data,
          cached_at: new Date().toISOString()
        }, { onConflict: 'cache_key' })
    } catch (cacheErr) {
      console.warn('Cache write failed (non-fatal):', cacheErr)
    }
    
    return data
  } catch (error) {
    // On error, return cached data if available
    if (cached) {
      console.warn('Error fetching Gmail, using stale cache:', error)
      return cached.data
    }
    throw error
  }
}

/**
 * Fetch Calendar data with caching
 */
export async function fetchCalendarWithCache(params: {
  supabase: any
  userId: string
  token: string
  timeMin: string
  timeMax: string
  cacheMinutes?: number
}): Promise<any> {
  const { supabase, userId, token, timeMin, timeMax, cacheMinutes = 10 } = params
  
  // Normalize cache key to date-only to avoid cache misses
  const dateStr = timeMin.split('T')[0]
  const cacheKey = `calendar_${userId}_${dateStr}`
  const now = Date.now()
  
  // Check cache
  const { data: cached } = await supabase
    .from('api_cache')
    .select('data, cached_at')
    .eq('cache_key', cacheKey)
    .single()
  
  if (cached && (now - new Date(cached.cached_at).getTime()) < cacheMinutes * 60 * 1000) {
    console.log('Using cached Calendar data')
    return cached.data
  }
  
  // Fetch fresh data
  try {
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&orderBy=startTime`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    
    if (response.status === 429) {
      if (cached) {
        console.warn('Rate limited, using stale cache')
        return cached.data
      }
      throw new Error('Calendar API rate limit exceeded. Please try again in a few minutes.')
    }
    
    if (!response.ok) {
      throw new Error(`Calendar API error: ${response.status} ${response.statusText}`)
    }
    
    const data = await response.json()
    
    // Update cache (non-fatal if it fails)
    try {
      await supabase
        .from('api_cache')
        .upsert({
          cache_key: cacheKey,
          user_id: userId,
          data,
          cached_at: new Date().toISOString()
        }, { onConflict: 'cache_key' })
    } catch (cacheErr) {
      console.warn('Cache write failed (non-fatal):', cacheErr)
    }
    
    return data
  } catch (error) {
    if (cached) {
      console.warn('Error fetching Calendar, using stale cache:', error)
      return cached.data
    }
    throw error
  }
}

