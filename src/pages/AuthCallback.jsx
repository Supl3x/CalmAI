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
        console.warn('Auth callback timeout - redirecting to login')
        setError('Authentication timed out. Please try again.')
        setTimeout(() => navigate('/login'), 2000)
      }
    }, 10000) // 10 second timeout

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth event:', event, 'Session:', !!session)
      
      if (isProcessing) return // Prevent duplicate processing
      
      if (event === 'SIGNED_IN' && session) {
        isProcessing = true
        clearTimeout(timeoutId)
        
        const providerToken = session.provider_token
        const providerRefreshToken = session.provider_refresh_token

        console.log('OAuth tokens:', {
          hasAccessToken: !!providerToken,
          hasRefreshToken: !!providerRefreshToken
        })

        if (providerToken) {
          setStatus('Saving Google permissions...')
          try {
            const { error: upsertError } = await supabase.from('profiles').upsert({
              id: session.user.id,
              google_access_token: providerToken,
              google_refresh_token: providerRefreshToken ?? null,
              google_token_expiry: new Date(Date.now() + 3600 * 1000).toISOString(),
            }, { onConflict: 'id' })

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
        subscription.unsubscribe()
        navigate('/dashboard', { replace: true })
      } else if (event === 'SIGNED_OUT') {
        clearTimeout(timeoutId)
        navigate('/login', { replace: true })
      }
    })

    // Fallback check for existing session
    const checkSession = async () => {
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      if (isProcessing) return
      
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        console.log('Found existing session, redirecting...')
        clearTimeout(timeoutId)
        navigate('/dashboard', { replace: true })
      } else {
        // Wait a bit more, then redirect to login if still no session
        await new Promise(resolve => setTimeout(resolve, 3000))
        if (!isProcessing) {
          const { data: { session: s } } = await supabase.auth.getSession()
          if (!s) {
            console.warn('No session found after waiting, redirecting to login')
            clearTimeout(timeoutId)
            setError('No session found. Please try signing in again.')
            setTimeout(() => navigate('/login', { replace: true }), 2000)
          }
        }
      }
    }

    checkSession()

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
