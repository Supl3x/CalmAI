import React, { useState, useEffect, useRef } from 'react'
import { useLocation, Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'

export default function CalmMode() {
  const { user, profile } = useAuth()
  const { state } = useLocation()
  const activeTask = state?.task || null

  const defaultDuration = (profile?.focus_duration || 25) * 60
  const [seconds, setSeconds] = useState(defaultDuration)
  const [running, setRunning] = useState(false)
  const [session, setSession] = useState(1)
  const [showComplete, setShowComplete] = useState(false)
  const [nextEvent, setNextEvent] = useState(null)
  const intervalRef = useRef(null)

  useEffect(() => {
    setSeconds(defaultDuration)
  }, [defaultDuration])

  useEffect(() => {
    const loadNextEvent = async () => {
      if (!user) return
      const { data } = await supabase.functions.invoke('fetch-calendar-events', {
        body: { userId: user.id }
      })
      const upcoming = (data?.events ?? []).find(e => new Date(e.start) > new Date())
      setNextEvent(upcoming ?? null)
    }
    loadNextEvent()
  }, [user?.id])

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSeconds(s => {
          if (s <= 1) {
            clearInterval(intervalRef.current)
            setRunning(false)
            handleSessionEnd()
            return defaultDuration
          }
          return s - 1
        })
      }, 1000)
    } else {
      clearInterval(intervalRef.current)
    }
    return () => clearInterval(intervalRef.current)
  }, [running])

  const handleSessionEnd = async () => {
    setShowComplete(true)
    setSession(prev => prev + 1)
    if (user) {
      await supabase.from('focus_sessions').insert({
        user_id: user.id,
        duration_minutes: profile?.focus_duration || 25,
        completed: true,
        session_date: new Date().toISOString().split('T')[0],
      })
    }
  }

  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
  const progress = 1 - seconds / defaultDuration
  const circumference = 2 * Math.PI * 140

  return (
    <div style={{ minHeight: 'calc(100vh - 72px)', backgroundColor: 'var(--background)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-md)', position: 'relative', overflow: 'hidden' }}>
      <div className="bg-grid-dots" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 }} />

      {/* Session Complete Overlay */}
      {showComplete && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="brutalist-card" style={{ backgroundColor: 'var(--tertiary-fixed)', padding: 'var(--space-xl)', textAlign: 'center', maxWidth: '400px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '72px', display: 'block', marginBottom: '16px' }}>celebration</span>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '36px', textTransform: 'uppercase', marginBottom: '8px' }}>Session Complete!</h2>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '16px', marginBottom: 'var(--space-md)' }}>
              {profile?.focus_duration || 25} minutes of deep work saved to your analytics. 🔥
            </p>
            <button className="brutalist-btn" onClick={() => { setShowComplete(false); setSeconds(defaultDuration) }} style={{ backgroundColor: 'var(--on-background)', color: 'var(--background)', padding: 'var(--space-sm) var(--space-md)', fontSize: '16px', border: '4px solid var(--on-background)' }}>
              Next Session →
            </button>
          </div>
        </div>
      )}

      {/* Active Task Banner */}
      <header style={{ textAlign: 'center', marginBottom: 'var(--space-xl)', zIndex: 10, position: 'relative' }}>
        {activeTask ? (
          <>
            <div style={{ display: 'inline-block', backgroundColor: 'var(--primary-container)', border: '4px solid var(--on-background)', boxShadow: '4px 4px 0px 0px #000', padding: '6px 20px', marginBottom: 'var(--space-sm)', transform: 'rotate(-1deg)' }}>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--on-primary-container)' }}>Current Focus Active</p>
            </div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'clamp(24px,5vw,56px)', textTransform: 'uppercase', letterSpacing: '-0.04em', lineHeight: 1, maxWidth: '600px' }}>
              {activeTask.description}
            </h1>
          </>
        ) : (
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'clamp(32px,6vw,72px)', textTransform: 'uppercase', letterSpacing: '-0.04em', lineHeight: 1 }}>
            DEEP FOCUS<br />MODE
          </h1>
        )}
      </header>

      {/* Timer */}
      <main style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-xl)', zIndex: 10, position: 'relative' }}>
        <div style={{ position: 'relative' }}>
          <svg width="320" height="320" viewBox="0 0 320 320" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="160" cy="160" r="140" fill="none" stroke="var(--outline-variant)" strokeWidth="8" />
            <circle cx="160" cy="160" r="140" fill="none" stroke="var(--primary)" strokeWidth="10" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - progress)} strokeLinecap="round" style={{ transition: 'stroke-dashoffset 1s linear' }} />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '8px solid var(--on-background)', borderRadius: '50%', boxShadow: '8px 8px 0px 0px #000', backgroundColor: 'var(--surface)', margin: '0px' }}>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'clamp(48px,8vw,80px)', lineHeight: 1 }}>{fmt(seconds)}</span>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '14px', textTransform: 'uppercase', color: 'var(--outline)', fontWeight: 700 }}>Session {session}</span>
          </div>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-md)' }}>
          <button className="brutalist-btn" onClick={() => setRunning(!running)} style={{ backgroundColor: running ? 'var(--error)' : 'var(--primary)', color: 'var(--on-primary)', padding: 'var(--space-md)', border: '4px solid var(--on-background)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '44px' }}>{running ? 'pause' : 'play_arrow'}</span>
          </button>
          <button className="brutalist-btn" onClick={() => { setRunning(false); setSeconds(defaultDuration) }} style={{ backgroundColor: 'var(--surface)', padding: 'var(--space-md)', border: '4px solid var(--on-background)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '44px' }}>replay</span>
          </button>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button className="brutalist-btn-sm" onClick={() => setSeconds(s => s + 5 * 60)} style={{ backgroundColor: 'var(--tertiary-fixed)', border: '2px solid var(--on-background)', padding: '6px 16px', fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', cursor: 'pointer' }}>+5 MIN</button>
            <Link to="/priority" style={{ textDecoration: 'none' }}>
              <button className="brutalist-btn-sm" style={{ width: '100%', backgroundColor: 'var(--error-container)', border: '2px solid var(--on-background)', padding: '6px 16px', fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', cursor: 'pointer' }}>QUIT FLOW</button>
            </Link>
          </div>
        </div>
      </main>

      {/* Status Footer */}
      <footer style={{ position: 'fixed', bottom: 0, left: '256px', right: 0, padding: 'var(--space-sm)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', zIndex: 20, pointerEvents: 'none' }} id="calm-footer">
        <div style={{ backgroundColor: 'var(--on-background)', color: 'var(--background)', padding: 'var(--space-sm)', border: '4px solid var(--on-background)', boxShadow: '4px 4px 0px 0px #000', transform: 'rotate(-2deg)', pointerEvents: 'all' }}>
          <p style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '14px' }}>MODE: {running ? 'DEEP FOCUS 🔥' : 'PAUSED'}</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', pointerEvents: 'all' }}>
          <Link to="/dashboard">
            <button className="brutalist-btn" style={{ width: '56px', height: '56px', backgroundColor: 'var(--surface)', border: '4px solid var(--on-background)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="material-symbols-outlined">close</span>
            </button>
          </Link>
        </div>
      </footer>

      {/* Next Event Hint */}
      {nextEvent && !running && (
        <div style={{ position: 'fixed', bottom: '16px', left: '50%', transform: 'translateX(-50%)', zIndex: 10, padding: 'var(--space-sm)', backgroundColor: 'var(--surface-container-lowest)', border: '2px solid var(--outline-variant)', opacity: 0.8, pointerEvents: 'none' }}>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--on-surface-variant)' }}>
            📅 Next: {nextEvent.summary} at {new Date(nextEvent.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      )}

      {/* Flow Vitals */}
      <div className="brutalist-card" style={{ position: 'absolute', top: '30%', right: 'var(--space-md)', width: '220px', backgroundColor: 'var(--tertiary-fixed)', padding: 'var(--space-md)', transform: 'rotate(-2deg)', zIndex: 10 }} id="vitals-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <span className="material-symbols-outlined" style={{ color: 'var(--primary)' }}>bolt</span>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>Flow Vitals</span>
        </div>
        <p style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '14px' }}>Session #{session}</p>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px' }}>Duration: {profile?.focus_duration || 25} min</p>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', marginTop: '4px', color: 'var(--on-surface-variant)' }}>
          {running ? '⚡ In flow state' : '⏸ Paused'}
        </p>
      </div>

      <style>{`
        @media (max-width: 1023px) {
          #vitals-card { display: none !important; }
          #calm-footer { left: 0 !important; }
        }
      `}</style>
    </div>
  )
}
