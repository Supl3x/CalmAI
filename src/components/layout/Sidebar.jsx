import React from 'react'
import { Link, useLocation } from 'react-router-dom'

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: 'grid_view' },
  { path: '/priority', label: 'AI Priority', icon: 'psychology' },
  { path: '/briefing', label: 'Daily Briefing', icon: 'wb_sunny' },
  { path: '/draft', label: 'AI Draft', icon: 'auto_awesome' },
  { path: '/calm', label: 'Calm Mode', icon: 'self_improvement' },
  { path: '/weekly', label: 'Weekly Report', icon: 'monitoring' },
  { path: '/open-loop', label: 'Open Loops', icon: 'psychology_alt' },
  { path: '/micro-task', label: 'Micro Tasks', icon: 'account_tree' },
]

export default function Sidebar({ open, onClose }) {
  const location = useLocation()

  return (
    <>
      {/* Overlay for mobile */}
      {open && (
        <div
          onClick={onClose}
          style={{
            display: 'none',
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: 89,
          }}
          id="sidebar-overlay"
        />
      )}

      <aside
        id="main-sidebar"
        style={{
          position: 'fixed',
          left: 0,
          top: '72px',
          height: 'calc(100vh - 72px)',
          width: '256px',
          backgroundColor: 'var(--surface)',
          borderRight: '4px solid var(--on-background)',
          boxShadow: '8px 0px 0px 0px #000000',
          zIndex: 90,
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
          transform: open ? 'translateX(0)' : undefined,
          transition: 'transform 0.2s ease',
        }}
      >
        {/* Brand tagline */}
        <div style={{
          padding: 'var(--space-sm)',
          borderBottom: '4px solid var(--on-background)',
          backgroundColor: 'var(--on-background)',
        }}>
          <p style={{
            fontFamily: 'var(--font-body)',
            fontSize: '11px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: 'var(--tertiary-fixed)',
          }}>
            ⚡ Aggressively Organized
          </p>
        </div>

        {/* Navigation Items */}
        <nav style={{ flex: 1, padding: '8px' }}>
          {navItems.map((item) => {
            const isActive = location.pathname === item.path
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={onClose}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px var(--space-sm)',
                  margin: '4px 0',
                  textDecoration: 'none',
                  fontFamily: 'var(--font-body)',
                  fontSize: '13px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: isActive ? 'var(--on-tertiary-container)' : 'var(--on-surface)',
                  backgroundColor: isActive ? 'var(--tertiary-container)' : 'transparent',
                  border: isActive ? '2px solid var(--on-background)' : '2px solid transparent',
                  boxShadow: isActive ? '4px 4px 0px 0px #000' : 'none',
                  transform: isActive ? 'translate(2px, 2px)' : 'none',
                  transition: 'all 0.1s ease',
                }}
                onMouseEnter={e => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'var(--secondary-fixed-dim)'
                    e.currentTarget.style.border = '2px solid var(--on-background)'
                    e.currentTarget.style.transform = 'translateX(4px)'
                    e.currentTarget.style.boxShadow = '4px 4px 0px 0px #000'
                  }
                }}
                onMouseLeave={e => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'transparent'
                    e.currentTarget.style.border = '2px solid transparent'
                    e.currentTarget.style.transform = 'none'
                    e.currentTarget.style.boxShadow = 'none'
                  }
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                  {item.icon}
                </span>
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* New Workflow CTA */}
        <div style={{ padding: 'var(--space-sm)', borderTop: '4px solid var(--on-background)' }}>
          <Link to="/draft" onClick={onClose} style={{ textDecoration: 'none' }}>
            <button className="brutalist-btn" style={{
              width: '100%',
              padding: '12px',
              backgroundColor: 'var(--primary)',
              color: 'var(--on-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              fontSize: '13px',
              border: '4px solid var(--on-background)',
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>add_circle</span>
              New Workflow
            </button>
          </Link>
        </div>
      </aside>

      <style>{`
        @media (max-width: 1023px) {
          #main-sidebar {
            transform: ${open ? 'translateX(0)' : 'translateX(-100%)'} !important;
          }
          #sidebar-overlay {
            display: ${open ? 'block' : 'none'} !important;
          }
        }
        @media (min-width: 1024px) {
          #main-sidebar {
            transform: translateX(0) !important;
          }
          #sidebar-overlay {
            display: none !important;
          }
        }
      `}</style>
    </>
  )
}
