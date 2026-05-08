import React, { useState, useRef, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import logo from '../../assets/logo.png'

export default function Navbar({ sidebarOpen, setSidebarOpen }) {
  const location = useLocation()
  const { user, profile, signOut } = useAuth()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const menuRef = useRef(null)

  const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url
  const displayName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowUserMenu(false)
      }
    }

    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showUserMenu])

  const handleSignOut = async () => {
    setShowUserMenu(false)
    await signOut()
  }

  return (
    <header style={{
      position: 'fixed',
      top: 0, left: 0, right: 0,
      zIndex: 100,
      backgroundColor: 'var(--background)',
      borderBottom: '4px solid var(--on-background)',
      boxShadow: '0px 8px 0px 0px #000000',
      height: '72px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 var(--space-md)',
    }}>
      {/* Left */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="material-symbols-outlined"
          id="hamburger-btn"
          style={{ display: 'none', background: 'none', border: 'none', cursor: 'pointer', fontSize: '28px', color: 'var(--on-background)' }}
          aria-label="Toggle sidebar"
        >
          {sidebarOpen ? 'close' : 'menu'}
        </button>
        <Link to="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', textDecoration: 'none' }}>
          <img
            src={logo}
            alt="CalmFlow AI Logo"
            style={{ height: '44px', width: '44px', objectFit: 'contain', border: '3px solid var(--on-background)', boxShadow: '3px 3px 0px 0px #000' }}
            onError={(e) => { e.target.style.display = 'none' }}
          />
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '20px', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '-0.02em' }}>
            CalmFlow<span style={{ color: 'var(--on-background)' }}> AI</span>
          </span>
        </Link>
      </div>

      {/* Right */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }} ref={menuRef}>
        <button
          className="material-symbols-outlined"
          style={{ background: 'none', border: '2px solid transparent', cursor: 'pointer', padding: '6px', color: 'var(--on-background)', transition: 'all 0.1s' }}
          onMouseEnter={e => { e.target.style.backgroundColor = 'var(--primary-container)'; e.target.style.border = '2px solid var(--on-background)'; }}
          onMouseLeave={e => { e.target.style.backgroundColor = 'transparent'; e.target.style.border = '2px solid transparent'; }}
          aria-label="Notifications"
        >notifications</button>

        {/* User Avatar Button */}
        <button
          onClick={() => setShowUserMenu(!showUserMenu)}
          style={{
            width: '40px', height: '40px',
            border: '3px solid var(--on-background)',
            boxShadow: '3px 3px 0px 0px #000',
            overflow: 'hidden',
            cursor: 'pointer',
            background: 'none',
            padding: 0,
            flexShrink: 0,
          }}
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: '100%', height: '100%', backgroundColor: 'var(--secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="material-symbols-outlined" style={{ color: 'white', fontSize: '22px' }}>person</span>
            </div>
          )}
        </button>

        {/* User Dropdown */}
        {showUserMenu && (
          <div style={{
            position: 'absolute', top: '52px', right: 0,
            backgroundColor: 'var(--surface)',
            border: '4px solid var(--on-background)',
            boxShadow: '8px 8px 0px 0px #000',
            minWidth: '200px',
            zIndex: 200,
          }}>
            <div style={{ padding: 'var(--space-sm)', borderBottom: '4px solid var(--on-background)', backgroundColor: 'var(--surface-container)' }}>
              <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '14px', textTransform: 'uppercase' }}>{displayName}</p>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: 'var(--on-surface-variant)', marginTop: '2px' }}>{user?.email}</p>
            </div>
            <button
              onClick={handleSignOut}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                width: '100%', padding: 'var(--space-xs) var(--space-sm)',
                background: 'none', border: 'none', cursor: 'pointer',
                fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '13px', textTransform: 'uppercase',
                color: 'var(--error)',
              }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--error-container)'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>logout</span>
              Sign Out
            </button>
          </div>
        )}
      </div>

      <style>{`
        @media (max-width: 1023px) { #hamburger-btn { display: block !important; } }
      `}</style>
    </header>
  )
}
