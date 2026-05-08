import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

export default function AuthCallback() {
  const navigate = useNavigate()
  const [status, setStatus] = useState('Signing you in...')
  const [error, setError] = useState(null)

  useEffect(() => {
    let timeoutId = null
    let isProcessing = false

    // Set a timeout to prevent infinite hanging
    timeoutId = setTimeout(() => {
      if (!isProcessing) {
        console.warn('Auth callback timeout - redirecting to dashboard anyway')
        navigate('/dashboard', { replace: true })
      }
    }, 10000) // 10 second timeout

    const handleSession = async (session) => {
      if (!session || isProcessing) return
      
      isProcessing = true
      clearTimeout(timeoutId)
      
      const providerToken = session.provider_token
      const providerRefreshToken = session.provider_refresh_token

      console.log('Processing session. OAuth tokens:', {
        hasAccessToken: !!providerToken,
        hasRefreshToken: !!providerRefreshToken,
        userId: session.user.id
      })

      if (providerToken) {
        setStatus('Saving Google permissions...')
        try {
          const updatePayload = {
            id: session.user.id,
            google_access_token: providerToken,
            google_token_expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
          }
          // Only overwrite refresh token if Google actually returned one
          if (providerRefreshToken) {
            updatePayload.google_refresh_token = providerRefreshToken
          }
          
          console.log('Upserting to profiles table...', updatePayload)
          const { error: upsertError } = await supabase.from('profiles').upsert(updatePayload, { onConflict: 'id' })

          if (upsertError) {
            console.error('Failed to save tokens:', upsertError)
            setStatus('Warning: Could not save Google tokens. Continuing...')
            await new Promise(resolve => setTimeout(resolve, 1000))
          } else {
            console.log('Google tokens saved successfully!')
          }
        } catch (e) {
          console.error('Token save error:', e)
        }
      } else {
        console.warn('No provider_token - Google scopes may not have been granted')
      }

      setStatus('Redirecting to dashboard...')
      await new Promise(resolve => setTimeout(resolve, 500))
      navigate('/dashboard', { replace: true })
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth event:', event, 'Session:', !!session, 'isProcessing:', isProcessing)
      
      if (event === 'SIGNED_IN' && session) {
        await handleSession(session)
      } else if (event === 'SIGNED_OUT') {
        clearTimeout(timeoutId)
        navigate('/login', { replace: true })
      }
    })

    // Check for existing session immediately
    const checkExistingSession = async () => {
      console.log('Checking for existing session...')
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        console.log('Found existing session, processing...')
        await handleSession(session)
      }
    }

    checkExistingSession()

    return () => {
      clearTimeout(timeoutId)
      subscription.unsubscribe()
    }
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
      padding: 'var(--space-md)',
    }}>
      {error ? (
        <>
          <span className="material-symbols-outlined" style={{ fontSize: '48px', color: 'var(--error)' }}>
            error
          </span>
          <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '20px', textTransform: 'uppercase', color: 'var(--error)', textAlign: 'center' }}>
            {error}
          </p>
        </>
      ) : (
        <>
          <div style={{
            width: '60px',
            height: '60px',
            border: '4px solid var(--on-background)',
            borderTop: '4px solid var(--primary)',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }} />
          <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '20px', textTransform: 'uppercase', textAlign: 'center' }}>
            {status}
          </p>
        </>
      )}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
