import React from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function RegisterPage() {
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
      <div style={{ position: 'absolute', top: '-60px', left: '-40px', width: '280px', height: '280px', backgroundColor: 'var(--secondary-fixed)', border: '4px solid var(--on-background)', transform: 'rotate(-8deg)', opacity: 0.2, zIndex: 0 }} />
      <div style={{ position: 'absolute', bottom: '-40px', right: '-30px', width: '220px', height: '220px', backgroundColor: 'var(--primary-fixed)', border: '4px solid var(--on-background)', transform: 'rotate(12deg)', opacity: 0.2, zIndex: 0 }} />

      <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: '520px' }}>
        <div style={{ backgroundColor: 'var(--primary-container)', border: '4px solid var(--on-background)', boxShadow: '4px 4px 0px 0px #000', padding: '8px 20px', display: 'inline-block', transform: 'rotate(1deg)', marginBottom: 'var(--space-sm)' }}>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--on-primary-container)' }}>Join the Flow</span>
        </div>

        <div className="brutalist-card" style={{ backgroundColor: 'white', padding: 'var(--space-lg)' }}>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '48px', textTransform: 'uppercase', letterSpacing: '-0.02em', marginBottom: 'var(--space-sm)' }}>GET STARTED</h1>
          <div style={{ height: '4px', backgroundColor: 'var(--on-background)', marginBottom: 'var(--space-lg)' }} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
            {/* Benefits */}
            {[
              { icon: 'psychology', text: 'AI-powered task decomposition & prioritization' },
              { icon: 'self_improvement', text: 'Calm mode with Pomodoro focus sessions' },
              { icon: 'auto_awesome', text: 'One-click AI drafts for emails, reports, and more' },
              { icon: 'monitoring', text: 'Weekly analytics and cognitive load tracking' },
            ].map((b, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px', borderLeft: '4px solid var(--tertiary-container)' }}>
                <span className="material-symbols-outlined" style={{ color: 'var(--tertiary)', fontSize: '20px' }}>{b.icon}</span>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px' }}>{b.text}</p>
              </div>
            ))}

            <div style={{ height: '4px', backgroundColor: 'var(--surface-container)', margin: 'var(--space-sm) 0' }} />

            <button
              onClick={signInWithGoogle}
              disabled={loading}
              className="brutalist-btn"
              style={{
                width: '100%',
                padding: 'var(--space-sm) var(--space-md)',
                backgroundColor: 'var(--tertiary-container)',
                color: 'var(--on-tertiary-container)',
                fontSize: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                border: '4px solid var(--on-background)',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {loading ? 'Connecting...' : 'Sign Up with Google — It\'s Free'}
            </button>

            <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', textAlign: 'center', color: 'var(--on-surface-variant)', marginTop: '4px' }}>
              No credit card. No email/password. Just Google.
            </p>
          </div>

          <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', textAlign: 'center', marginTop: 'var(--space-md)', color: 'var(--on-surface-variant)' }}>
            Already organized? <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 700, textDecoration: 'none' }}>Sign In →</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
