import React from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const { signInWithGoogle, loading } = useAuth()

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'var(--background)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 'var(--space-md)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* BG Deco */}
      <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '300px', height: '300px', backgroundColor: 'var(--primary-container)', border: '4px solid var(--on-background)', transform: 'rotate(15deg)', opacity: 0.15, zIndex: 0 }} />
      <div style={{ position: 'absolute', bottom: '-60px', left: '-40px', width: '250px', height: '250px', backgroundColor: 'var(--tertiary-fixed)', border: '4px solid var(--on-background)', transform: 'rotate(-10deg)', opacity: 0.2, zIndex: 0 }} />

      <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: '480px' }}>
        {/* Tag */}
        <div style={{ backgroundColor: 'var(--tertiary-fixed)', border: '4px solid var(--on-background)', boxShadow: '4px 4px 0px 0px #000', padding: '8px 20px', display: 'inline-block', transform: 'rotate(-1deg)', marginBottom: 'var(--space-sm)' }}>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Secure Access</span>
        </div>

        <div className="brutalist-card" style={{ backgroundColor: 'white', padding: 'var(--space-lg)' }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '48px', textTransform: 'uppercase', letterSpacing: '-0.02em', marginBottom: 'var(--space-sm)' }}>SIGN IN</h1>
          <div style={{ height: '4px', backgroundColor: 'var(--on-background)', marginBottom: 'var(--space-lg)' }} />

          <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--on-surface-variant)', marginBottom: 'var(--space-lg)', lineHeight: 1.6 }}>
            CalmFlow AI uses Google Sign-In for secure, instant access. No passwords required.
          </p>

          {/* Google OAuth Button */}
          <button
            onClick={signInWithGoogle}
            disabled={loading}
            className="brutalist-btn"
            style={{
              width: '100%',
              padding: 'var(--space-sm) var(--space-md)',
              backgroundColor: 'var(--secondary)',
              color: 'white',
              fontSize: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              border: '4px solid var(--on-background)',
              opacity: loading ? 0.7 : 1,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {/* Google Icon */}
            <svg width="24" height="24" viewBox="0 0 24 24">
              <path fill="#fff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {loading ? 'Connecting...' : 'Continue with Google'}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', margin: 'var(--space-md) 0' }}>
            <div style={{ flex: 1, height: '2px', backgroundColor: 'var(--outline-variant)' }} />
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--outline)', textTransform: 'uppercase' }}>The only way in</span>
            <div style={{ flex: 1, height: '2px', backgroundColor: 'var(--outline-variant)' }} />
          </div>

          <div style={{ backgroundColor: 'var(--surface-container)', border: '2px solid var(--outline-variant)', padding: 'var(--space-sm)', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--tertiary)', flexShrink: 0 }}>security</span>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--on-surface-variant)', lineHeight: 1.5 }}>
              Your Google account data stays private. We only use your name and email to personalize your dashboard.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
