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

      // Skip the profile upsert - let the database trigger handle profile creation
      // Just redirect to dashboard immediately
      console.log('Skipping profile upsert, redirecting to dashboard...')
      setStatus('Redirecting to dashboard...')
      
      // Give the trigger time to create the profile
      await new Promise(resolve => setTimeout(resolve, 1000))
      
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
