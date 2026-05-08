import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'

// Groq call moved to Edge Function

export default function DailyBriefing() {
  const { user } = useAuth()
  const [briefing, setBriefing] = useState(null)
  const [generating, setGenerating] = useState(false)
  const today = new Date().toISOString().split('T')[0]

  const generateBriefing = async () => {
    setGenerating(true)
    try {
      const { data, error } = await supabase.functions.invoke('generate-briefing', {
        body: { userId: user.id }
      })

      if (error) throw error

      setBriefing(data.content)
    } catch (e) {
      console.error('Briefing error:', e)
    } finally {
      setGenerating(false)
    }
  }

  useEffect(() => {
    if (!user) return
    const load = async () => {
      const { data } = await supabase.from('daily_briefings').select('*').eq('user_id', user.id).eq('briefing_date', today).maybeSingle()
      if (data) setBriefing(data.content)
      else generateBriefing()
    }
    load()
  }, [user?.id])

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'GOOD MORNING,' : hour < 17 ? 'GOOD AFTERNOON,' : 'GOOD EVENING,'

  return (
    <div style={{ padding: 'var(--space-md)', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Hero Greeting */}
      <section style={{ marginBottom: 'var(--space-xl)' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'clamp(40px,8vw,96px)', textTransform: 'uppercase', lineHeight: 0.95, transform: 'rotate(-1deg)', display: 'inline-block', marginBottom: '8px' }}>{greeting}</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'clamp(40px,8vw,96px)', textTransform: 'uppercase', lineHeight: 0.95 }}>HUMAN.</h2>
          <div className="brutalist-card" style={{ width: '72px', height: '72px', backgroundColor: 'var(--primary-container)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '40px' }}>{hour < 12 ? 'light_mode' : hour < 17 ? 'wb_sunny' : 'nights_stay'}</span>
          </div>
        </div>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '16px', color: 'var(--on-surface-variant)', marginTop: '12px' }}>
          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </section>

      {generating ? (
        <div style={{ textAlign: 'center', padding: 'var(--space-xl)', border: '4px solid var(--on-background)', boxShadow: '8px 8px 0px 0px #000' }}>
          <div style={{ width: '60px', height: '60px', border: '4px solid var(--on-background)', borderTop: '4px solid var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '24px', textTransform: 'uppercase' }}>AI Is Generating Your Briefing...</h3>
          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : briefing ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px,1fr))', gap: 'var(--space-md)', alignItems: 'start' }}>
          {/* Main Briefing */}
          <div className="brutalist-card" style={{ gridColumn: 'span 2', backgroundColor: 'var(--surface-container-lowest)', padding: 'var(--space-md)' }}>
            {briefing.warning && (
              <div style={{ backgroundColor: 'var(--error-container)', border: '3px solid var(--error)', padding: 'var(--space-sm)', marginBottom: 'var(--space-md)', display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span className="material-symbols-outlined" style={{ color: 'var(--error)' }}>warning</span>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--on-error-container)', fontWeight: 700 }}>{briefing.warning}</p>
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 'var(--space-md)' }}>
              <span className="material-symbols-outlined" style={{ color: 'var(--primary)', fontSize: '28px' }}>auto_awesome</span>
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '24px', textTransform: 'uppercase' }}>Daily Intelligence Brief</h3>
            </div>

            {/* AI Insight */}
            <div style={{ backgroundColor: 'var(--primary-container)', border: '3px solid var(--on-background)', padding: 'var(--space-sm)', marginBottom: 'var(--space-md)' }}>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '16px', fontStyle: 'italic', lineHeight: 1.6 }}>"{briefing.insight}"</p>
            </div>

            {/* Email Alert */}
            {briefing.emailAlert && (
              <div style={{ backgroundColor: 'white', border: '3px solid var(--on-background)', padding: 'var(--space-sm)', marginBottom: 'var(--space-md)', display: 'flex', gap: '12px', alignItems: 'center' }}>
                <span className="material-symbols-outlined" style={{ color: 'var(--primary)', fontSize: '24px' }}>mail</span>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', flex: 1, fontWeight: 700 }}>{briefing.emailAlert}</p>
                <button className="brutalist-btn" onClick={() => window.open('https://mail.google.com', '_blank')} style={{ backgroundColor: 'var(--primary)', color: 'white', padding: '4px 12px', fontSize: '12px' }}>
                  Open Gmail
                </button>
              </div>
            )}

            {/* Priorities */}
            <h4 style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '14px', textTransform: 'uppercase', marginBottom: 'var(--space-sm)' }}>Critical Priorities</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 'var(--space-sm)', marginBottom: 'var(--space-md)' }}>
              {briefing.priorities?.map((p, i) => (
                <div key={i} className="brutalist-card" style={{ backgroundColor: 'white', padding: 'var(--space-sm)', transform: `translateY(${[0, 8, -4][i] || 0}px)` }}>
                  <p style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', color: 'var(--primary)', marginBottom: '4px' }}>Priority #{i + 1}</p>
                  <p style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '14px' }}>{p}</p>
                </div>
              ))}
            </div>

            {/* Schedule */}
            <h4 style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '14px', textTransform: 'uppercase', marginBottom: 'var(--space-sm)', borderTop: '4px solid var(--on-background)', paddingTop: 'var(--space-sm)' }}>Smart Schedule</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {briefing.schedule?.map((s, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', borderLeft: `8px solid ${['var(--primary)', 'var(--secondary)', 'var(--tertiary)'][i % 3]}`, border: '4px solid var(--on-background)', borderLeftWidth: '8px', borderLeftColor: ['var(--primary)', 'var(--secondary)', 'var(--tertiary)'][i % 3], padding: 'var(--space-xs) var(--space-sm)', backgroundColor: i === 0 ? 'var(--surface-container)' : 'white' }}>
                  <span style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '14px', width: '80px', flexShrink: 0 }}>{s.time}</span>
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: '14px' }}>{s.activity}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Actions Sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            <div className="brutalist-card" style={{ backgroundColor: 'var(--tertiary-container)', padding: 'var(--space-md)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h4 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '20px', textTransform: 'uppercase', color: 'var(--on-tertiary-container)' }}>Flow State</h4>
                <span className="material-symbols-outlined" style={{ color: 'var(--on-tertiary-container)' }}>bolt</span>
              </div>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--on-tertiary-container)', opacity: 0.8 }}>Your briefing is ready. Time to execute.</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <Link to="/calm" style={{ textDecoration: 'none' }}>
                <button className="brutalist-btn" style={{ width: '100%', padding: 'var(--space-sm)', backgroundColor: 'var(--secondary)', color: 'var(--on-secondary)', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                  <span className="material-symbols-outlined">play_arrow</span>START DAY
                </button>
              </Link>
              <button className="brutalist-btn" onClick={generateBriefing} style={{ width: '100%', padding: 'var(--space-sm)', backgroundColor: 'var(--primary-container)', color: 'var(--on-primary-container)', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                <span className="material-symbols-outlined">refresh</span>REGENERATE
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
