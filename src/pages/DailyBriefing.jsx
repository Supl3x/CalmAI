import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { useGoogleToken } from '../hooks/useGoogleToken'

// Groq call moved to Edge Function

export default function DailyBriefing() {
  const { user } = useAuth()
  const { getToken } = useGoogleToken()
  const [briefing, setBriefing] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState(null)
  const [calendarConnected, setCalendarConnected] = useState(false)
  const today = new Date().toISOString().split('T')[0]

  const generateBriefing = async (withGoogle = false) => {
    setGenerating(true)
    setError(null)
    try {
      // Get a fresh Google token from the browser ONLY if user clicked the button
      let googleToken = null
      if (withGoogle) {
        try {
          googleToken = await getToken()
          setCalendarConnected(true)
        } catch (e) {
          console.warn('Google Calendar not connected, generating AI-only briefing:', e.message)
        }
      }

      const { data, error } = await supabase.functions.invoke('generate-briefing', {
        body: { userId: user.id, googleToken }
      })

      if (error) throw new Error(error.message || 'Edge function failed')
      if (!data?.content) throw new Error('No content returned from AI')

      setBriefing(data.content)
    } catch (e) {
      console.error('Briefing error:', e)
      setError(e.message || 'Something went wrong generating your briefing.')
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

  // Re-load when user switches back to this tab — only if no briefing loaded yet
  // Note: do not refetch on tab focus. Users reported "reloads" when returning.

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
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--on-surface-variant)', marginTop: '8px' }}>Fetching your Google Calendar &amp; tasks...</p>
          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : briefing ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px,1fr))', gap: 'var(--space-md)', alignItems: 'start' }}>
          {/* Main Briefing */}
          <div className="brutalist-card" style={{ gridColumn: 'span 2', backgroundColor: 'var(--surface-container-lowest)', padding: 'var(--space-md)' }}>
            {briefing.cognitive_overload_warning?.is_overloaded && (
              <div style={{ backgroundColor: 'var(--error-container)', border: '3px solid var(--error)', padding: 'var(--space-sm)', marginBottom: 'var(--space-md)', display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span className="material-symbols-outlined" style={{ color: 'var(--error)', fontSize: '28px' }}>warning</span>
                <div>
                  <h4 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '16px', color: 'var(--error)', textTransform: 'uppercase', marginBottom: '2px' }}>Cognitive Overload Warning</h4>
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--on-error-container)', fontWeight: 700 }}>{briefing.cognitive_overload_warning.message}</p>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 'var(--space-md)' }}>
              <span className="material-symbols-outlined" style={{ color: 'var(--primary)', fontSize: '28px' }}>auto_awesome</span>
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '24px', textTransform: 'uppercase' }}>Daily Intelligence Brief</h3>
              {calendarConnected && (
                <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-body)', fontSize: '11px', fontWeight: 700, backgroundColor: '#22c55e', color: 'white', padding: '2px 10px', border: '2px solid black' }}>✓ CALENDAR CONNECTED</span>
              )}
            </div>

            {/* AI Insight */}
            <div style={{ backgroundColor: 'var(--primary-container)', border: '3px solid var(--on-background)', padding: 'var(--space-sm)', marginBottom: 'var(--space-md)' }}>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '16px', fontStyle: 'italic', lineHeight: 1.6 }}>"{briefing.motivational_insight}"</p>
            </div>



            {/* Priorities */}
            <h4 style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '14px', textTransform: 'uppercase', marginBottom: 'var(--space-sm)' }}>Critical Priorities</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 'var(--space-sm)', marginBottom: 'var(--space-md)' }}>
              {briefing.top_3_priorities?.map((p, i) => (
                <div key={i} className="brutalist-card" style={{ backgroundColor: 'white', padding: 'var(--space-sm)', transform: `translateY(${[0, 8, -4][i] || 0}px)` }}>
                  <p style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', color: 'var(--primary)', marginBottom: '4px' }}>Priority #{i + 1}</p>
                  <p style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '14px' }}>{p}</p>
                </div>
              ))}
            </div>

            {/* Schedule */}
            <h4 style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '14px', textTransform: 'uppercase', marginBottom: 'var(--space-sm)', borderTop: '4px solid var(--on-background)', paddingTop: 'var(--space-sm)' }}>Smart Schedule</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {briefing.suggested_schedule?.map((s, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', borderLeft: `8px solid ${['var(--primary)', 'var(--secondary)', 'var(--tertiary)'][i % 3]}`, border: '4px solid var(--on-background)', borderLeftWidth: '8px', borderLeftColor: ['var(--primary)', 'var(--secondary)', 'var(--tertiary)'][i % 3], padding: 'var(--space-xs) var(--space-sm)', backgroundColor: i === 0 ? 'var(--surface-container)' : 'white' }}>
                  <span style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '14px', width: '80px', flexShrink: 0 }}>{s.time}</span>
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: '14px' }}>{s.activity}</span>
                </div>
              ))}
            </div>

            {/* Calendar Events */}
            {briefing.calendar_events && briefing.calendar_events.length > 0 && (
              <>
                <h4 style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '14px', textTransform: 'uppercase', marginBottom: 'var(--space-sm)', borderTop: '4px solid var(--on-background)', paddingTop: 'var(--space-sm)', marginTop: 'var(--space-md)' }}>
                  📅 Today's Meetings ({briefing.calendar_events.length})
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {briefing.calendar_events.map((event, i) => (
                    <div key={event.id || i} className="brutalist-card" style={{ backgroundColor: 'var(--tertiary-fixed-dim)', padding: 'var(--space-sm)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <span style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '12px', backgroundColor: 'var(--primary)', color: 'white', padding: '2px 8px', border: '2px solid var(--on-background)' }}>
                              {event.time}
                            </span>
                            {event.meetLink && (
                              <a href={event.meetLink} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
                                <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--primary)' }}>videocam</span>
                              </a>
                            )}
                          </div>
                          <h5 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '16px', marginBottom: '4px' }}>
                            {event.name}
                          </h5>
                          {event.description && (
                            <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--on-surface-variant)', marginBottom: '4px' }}>
                              {event.description.substring(0, 100)}{event.description.length > 100 ? '...' : ''}
                            </p>
                          )}
                          {event.location && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                              <span className="material-symbols-outlined" style={{ fontSize: '14px', color: 'var(--on-surface-variant)' }}>location_on</span>
                              <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--on-surface-variant)' }}>
                                {event.location}
                              </span>
                            </div>
                          )}
                          {event.attendees && event.attendees.length > 0 && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                              <span className="material-symbols-outlined" style={{ fontSize: '14px', color: 'var(--on-surface-variant)' }}>group</span>
                              <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--on-surface-variant)' }}>
                                {event.attendees.length} attendee{event.attendees.length > 1 ? 's' : ''}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Email Alert */}
            {briefing.unread_emails > 10 && (
              <div style={{ backgroundColor: 'var(--secondary-container)', border: '3px solid var(--on-background)', padding: 'var(--space-sm)', marginTop: 'var(--space-md)', display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span className="material-symbols-outlined" style={{ color: 'var(--secondary)', fontSize: '24px' }}>mail</span>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontWeight: 700 }}>
                  You have {briefing.unread_emails} unread emails. Consider a 10-minute inbox triage before deep work.
                </p>
              </div>
            )}
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
              <button className="brutalist-btn" onClick={() => generateBriefing(true)} style={{ width: '100%', padding: 'var(--space-sm)', backgroundColor: 'var(--primary-container)', color: 'var(--on-primary-container)', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                <span className="material-symbols-outlined">sync</span>SYNC CALENDAR
              </button>
            </div>
          </div>
        </div>
      ) : error ? (
        <div style={{ border: '4px solid var(--error)', backgroundColor: 'var(--error-container)', padding: 'var(--space-lg)', boxShadow: '8px 8px 0px 0px #000' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '24px', textTransform: 'uppercase', color: 'var(--error)', marginBottom: '12px' }}>⚠ Briefing Failed</h3>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '15px', color: 'var(--on-error-container)', marginBottom: 'var(--space-md)' }}>{error}</p>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--on-error-container)', opacity: 0.8, marginBottom: 'var(--space-md)' }}>
            Most likely cause: Google OAuth tokens are not stored in your profile, or the <code>VITE_GOOGLE_CLIENT_ID</code> is missing from .env.
          </p>
          <button className="brutalist-btn" onClick={() => generateBriefing(false)} style={{ backgroundColor: 'var(--primary)', color: 'white', padding: 'var(--space-sm) var(--space-md)' }}>Try Again</button>
        </div>
      ) : null}
    </div>
  )
}
