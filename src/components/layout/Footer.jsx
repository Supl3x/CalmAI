import React from 'react'
import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer style={{
      backgroundColor: 'var(--on-background)',
      borderTop: '4px solid var(--on-background)',
      padding: 'var(--space-lg) var(--space-md)',
      color: 'var(--background)',
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 'var(--space-md)',
      }}>
        {/* Brand */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: '20px',
            textTransform: 'uppercase',
            letterSpacing: '-0.02em',
            color: 'var(--primary-fixed)',
          }}>
            CalmFlow AI
          </span>
          <p style={{
            fontFamily: 'var(--font-body)',
            fontSize: '12px',
            opacity: 0.7,
            color: 'var(--surface-variant)',
            textTransform: 'uppercase',
          }}>
            © 2025 CalmFlow AI. Brutally Productive.
          </p>
        </div>

        {/* Links */}
        <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
          {['Privacy', 'Terms', 'API Docs'].map((link) => (
            <a
              key={link}
              href="#"
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '13px',
                color: 'var(--surface-variant)',
                textDecoration: 'none',
                textTransform: 'uppercase',
                transition: 'color 0.1s',
              }}
              onMouseEnter={e => e.target.style.color = 'var(--primary-fixed-dim)'}
              onMouseLeave={e => e.target.style.color = 'var(--surface-variant)'}
            >
              {link}
            </a>
          ))}
        </div>

        {/* Social Icons */}
        <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
          {[
            { label: 'X', icon: 'close' },
            { label: 'GH', icon: 'code' },
            { label: 'LI', icon: 'business' },
          ].map((s) => (
            <button
              key={s.label}
              className="brutalist-btn"
              style={{
                width: '40px',
                height: '40px',
                backgroundColor: 'var(--secondary)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '2px solid var(--background)',
                fontSize: '11px',
                fontWeight: 700,
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
    </footer>
  )
}
