import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

export default function AuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        navigate('/login')
        return
      }
      // Extract Google tokens from Supabase session
      const providerToken = session.provider_token
      const providerRefreshToken = session.provider_refresh_token

      if (providerToken) {
        console.log("Saving Google tokens to profiles table...");
        const { error: upsertError } = await supabase.from('profiles').upsert({
          id: session.user.id,
          google_access_token: providerToken,
          google_refresh_token: providerRefreshToken,
          google_token_expiry: new Date(Date.now() + 3600 * 1000).toISOString(),
        })
        if (upsertError) {
          console.error("Failed to save tokens:", upsertError);
          alert("Database Error: Could not save your Google permissions. Tell your friend to check the profiles table columns!");
        } else {
          console.log("Tokens saved successfully!");
        }
      }

      // Check if profile/onboarding exists
      const { data: profile } = await supabase
        .from('profiles')
        .select('onboarding_complete')
        .eq('id', session.user.id)
        .single()

      if (!profile || !profile.onboarding_complete) {
        navigate('/dashboard') // send to dashboard, which shows onboarding prompts
      } else {
        navigate('/dashboard')
      }
    })
  }, [navigate])

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'var(--background)',
      flexDirection: 'column',
      gap: '16px',
    }}>
      <div style={{
        width: '60px',
        height: '60px',
        border: '4px solid var(--on-background)',
        borderTop: '4px solid var(--primary)',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
      <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '20px', textTransform: 'uppercase' }}>
        Signing you in...
      </p>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
