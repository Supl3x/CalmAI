import { useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'

/**
 * Hook to sync Google OAuth tokens from Supabase session to profiles table
 * This runs after successful authentication
 */
export function useGoogleTokenSync() {
  const { user } = useAuth()

  useEffect(() => {
    if (!user) return

    const syncTokens = async () => {
      try {
        // Get the current session which contains provider tokens
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!session?.provider_token) {
          console.log('No provider token in session')
          return
        }

        console.log('Syncing Google tokens to profile...')

        // Update profile with Google tokens
        const { error } = await supabase
          .from('profiles')
          .update({
            google_access_token: session.provider_token,
            google_refresh_token: session.provider_refresh_token || null,
            google_token_expires_at: new Date(Date.now() + 3600 * 1000).toISOString()
          })
          .eq('id', user.id)

        if (error) {
          console.error('Failed to sync Google tokens:', error)
        } else {
          console.log('Google tokens synced successfully')
        }
      } catch (e) {
        console.error('Token sync error:', e)
      }
    }

    // Sync tokens 2 seconds after component mounts (gives time for profile to be created)
    const timeoutId = setTimeout(syncTokens, 2000)

    return () => clearTimeout(timeoutId)
  }, [user])
}
