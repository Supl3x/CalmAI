import React, { useState } from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'
import logo from '../../assets/logo.png'

export default function PublicLayout() {
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()
  const isLanding = location.pathname === '/'

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Public Navbar */}
      <nav style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        backgroundColor: 'var(--background)',
        borderBottom: '4px solid var(--on-background)',
        boxShadow: '8px 8px 0px 0px #000',
        height: '72px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 var(--space-md)',
      }}>
        {/* Logo */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', textDecoration: 'none' }}>
          <img
            src={logo}
            alt="CalmFlow AI Logo"
            style={{ height: '44px', width: '44px', objectFit: 'contain', border: '3px solid var(--on-background)', boxShadow: '3px 3px 0px 0px #000' }}
            onError={(e) => { e.target.style.display = 'none' }}
          />
          <span style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: '20px',
            color: 'var(--primary)',
            textTransform: 'uppercase',
            letterSpacing: '-0.02em',
          }}>
            CalmFlow<span style={{ color: 'var(--on-background)' }}> AI</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }} id="public-nav-desktop">
          <Link to="/" style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '14px', textTransform: 'uppercase', color: location.pathname === '/' ? 'var(--primary)' : 'var(--on-surface-variant)', textDecoration: 'none' }}>Home</Link>
          <Link to="/login" style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '14px', textTransform: 'uppercase', color: 'var(--on-surface-variant)', textDecoration: 'none' }}>Login</Link>
          <Link to="/register">
            <button className="brutalist-btn" style={{ backgroundColor: 'var(--primary-container)', color: 'var(--on-primary-container)', border: '4px solid var(--on-background)', padding: '8px 20px', fontSize: '13px' }}>
              Get Started
            </button>
          </Link>
        </div>

        {/* Mobile Hamburger */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="material-symbols-outlined"
          style={{ display: 'none', background: 'none', border: 'none', cursor: 'pointer', fontSize: '28px' }}
          id="public-hamburger"
        >
          {menuOpen ? 'close' : 'menu'}
        </button>
      </nav>

      {/* Mobile Dropdown */}
      {menuOpen && (
        <div style={{
          position: 'fixed',
          top: '72px',
          left: 0,
          right: 0,
          zIndex: 99,
          backgroundColor: 'var(--background)',
          borderBottom: '4px solid var(--on-background)',
          padding: 'var(--space-sm)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-xs)',
        }}>
          <Link to="/" onClick={() => setMenuOpen(false)} style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '14px', textTransform: 'uppercase', color: 'var(--primary)', textDecoration: 'none', padding: '8px' }}>Home</Link>
          <Link to="/login" onClick={() => setMenuOpen(false)} style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '14px', textTransform: 'uppercase', color: 'var(--on-surface-variant)', textDecoration: 'none', padding: '8px' }}>Login</Link>
          <Link to="/register" onClick={() => setMenuOpen(false)} style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '14px', textTransform: 'uppercase', color: 'var(--on-surface-variant)', textDecoration: 'none', padding: '8px' }}>Register</Link>
          <Link to="/dashboard" onClick={() => setMenuOpen(false)} style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '14px', textTransform: 'uppercase', color: 'var(--secondary)', textDecoration: 'none', padding: '8px' }}>App Dashboard →</Link>
        </div>
      )}

      <main style={{ marginTop: '72px', flex: 1 }}>
        <Outlet />
      </main>

      <style>{`
        @media (max-width: 768px) {
          #public-nav-desktop { display: none !important; }
          #public-hamburger { display: block !important; }
        }
      `}</style>
    </div>
  )
}
