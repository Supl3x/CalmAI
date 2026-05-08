import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'

// Groq call moved to Edge Function

const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export default function WeeklyReport() {
  const { user } = useAuth()
  const [data, setData] = useState({ tasks: [], sessions: [], loops: [] })
  const [googleStats, setGoogleStats] = useState({ emailsSent: 0, meetingsAttended: 0, driveDocsModified: 0 })
  const [insights, setInsights] = useState([])
  const [loadingInsights, setLoadingInsights] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 7)
    const cutoffStr = cutoff.toISOString()

    Promise.all([
      supabase.from('tasks').select('completed_at, ai_priority_score').eq('user_id', user.id).eq('status', 'completed').gte('completed_at', cutoffStr),
      supabase.from('focus_sessions').select('duration_minutes, session_date').eq('user_id', user.id).gte('created_at', cutoffStr),
      supabase.from('open_loops').select('created_at').eq('user_id', user.id).eq('status', 'closed').gte('created_at', cutoffStr),
      supabase.functions.invoke('fetch-weekly-google-stats', { body: { userId: user.id } })
    ]).then(([tasksRes, sessionsRes, loopsRes, googleStatsRes]) => {
      setData({ tasks: tasksRes.data ?? [], sessions: sessionsRes.data ?? [], loops: loopsRes.data ?? [] })
      if (googleStatsRes.error) {
        console.error('Google stats error:', googleStatsRes.error)
        setGoogleStats({ emailsSent: 0, meetingsAttended: 0, driveDocsModified: 0 })
      } else {
        setGoogleStats(googleStatsRes.data ?? { emailsSent: 0, meetingsAttended: 0, driveDocsModified: 0 })
      }
      setLoading(false)
    }).catch(err => {
      console.error('Failed to load weekly data:', err)
      setLoading(false)
    })
  }, [user?.id])

  const totalFocusMinutes = data.sessions.reduce((a, s) => a + s.duration_minutes, 0)
  const tasksCompleted = data.tasks.length
  const loopsClosed = data.loops.length
  const productivityScore = Math.min(100, Math.round((tasksCompleted * 8) + (totalFocusMinutes * 0.3) + (loopsClosed * 4)))

  // Build daily chart data
  const buildBarData = () => {
    const result = Array(7).fill(0)
    data.sessions.forEach(s => {
      const d = new Date(s.session_date)
      const dayOfWeek = (d.getDay() + 6) % 7 // Mon=0
      result[dayOfWeek] += s.duration_minutes
    })
    const max = Math.max(...result, 1)
    return result.map(v => Math.round((v / max) * 100))
  }

  const barData = buildBarData()

  const handleGetInsights = async () => {
    setLoadingInsights(true)
    try {
      const { data: resData, error } = await supabase.functions.invoke('analyse-week', {
        body: {
          tasksCompleted,
          focusMinutes: totalFocusMinutes,
          loopsClosed,
          emailsSent: googleStats.emailsSent,
          meetingsAttended: googleStats.meetingsAttended,
          driveDocsModified: googleStats.driveDocsModified
        }
      })
      if (error) throw error
      setInsights(resData.insights)
    } catch (e) {
      setInsights(['Keep pushing your daily task completion rate.', 'Try to hit 90+ minutes of deep work daily.', 'Clear open loops every morning for a clear mind.'])
    } finally {
      setLoadingInsights(false)
    }
  }

  const scoreColor = productivityScore >= 80 ? 'var(--tertiary-fixed)' : productivityScore >= 50 ? 'var(--primary-fixed)' : 'var(--primary-container)'

  return (
    <div style={{ padding: 'var(--space-md)', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end', gap: 'var(--space-sm)', marginBottom: 'var(--space-lg)' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'clamp(32px,6vw,72px)', textTransform: 'uppercase', lineHeight: 0.95 }}>Weekly<br />Analytics</h1>
          <p style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '16px', color: 'var(--primary)', marginTop: '8px', borderLeft: '6px solid var(--primary)', paddingLeft: '8px' }}>
            Last 7 Days · {loading ? 'Loading...' : `${tasksCompleted} tasks · ${Math.round(totalFocusMinutes / 60)}h focus`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="brutalist-btn" onClick={handleGetInsights} disabled={loadingInsights || loading} style={{ backgroundColor: 'var(--tertiary-fixed)', padding: '12px 24px', fontSize: '14px', cursor: loadingInsights ? 'wait' : 'pointer', opacity: loading ? 0.5 : 1 }}>
            {loadingInsights ? '🤖 Analyzing...' : '🤖 Get AI Insights'}
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
        <div className="brutalist-card" style={{ backgroundColor: scoreColor, padding: 'var(--space-md)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '-20px', right: '-20px', opacity: 0.1 }}>
            <span className="material-symbols-outlined" style={{ fontSize: '160px' }}>bolt</span>
          </div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '18px', textTransform: 'uppercase', marginBottom: '8px' }}>Productivity Score</h3>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '72px', lineHeight: 1 }}>{loading ? '...' : `${productivityScore}%`}</div>
        </div>
        {[
          { label: 'Tasks Completed', value: loading ? '...' : tasksCompleted, unit: 'tasks', color: 'var(--surface-container-lowest)' },
          { label: 'Focus Time', value: loading ? '...' : `${Math.round(totalFocusMinutes / 60)}h ${totalFocusMinutes % 60}m`, unit: '', color: 'var(--surface-container-lowest)' },
          { label: 'Loops Closed', value: loading ? '...' : loopsClosed, unit: 'loops', color: 'var(--surface-container-lowest)' },
          { label: 'Emails Sent', value: loading ? '...' : googleStats.emailsSent, unit: '', color: 'var(--surface-container-lowest)' },
          { label: 'Meetings', value: loading ? '...' : googleStats.meetingsAttended, unit: '', color: 'var(--surface-container-lowest)' },
          { label: 'Docs Modified', value: loading ? '...' : googleStats.driveDocsModified, unit: '', color: 'var(--surface-container-lowest)' },
        ].map(s => (
          <div key={s.label} className="brutalist-card" style={{ backgroundColor: s.color, padding: 'var(--space-md)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '18px', textTransform: 'uppercase' }}>{s.label}</h3>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '48px', lineHeight: 1 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Daily Focus Chart */}
      <div className="brutalist-card" style={{ backgroundColor: 'var(--surface-bright)', padding: 'var(--space-md)', marginBottom: 'var(--space-md)', transform: 'rotate(-0.5deg)' }}>
        <h4 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '18px', textTransform: 'uppercase', marginBottom: 'var(--space-lg)', borderBottom: '4px solid var(--on-background)', paddingBottom: '8px' }}>Daily Focus Minutes</h4>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: '160px', gap: '6px', marginBottom: '8px' }}>
          {barData.map((h, i) => (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', height: '100%', justifyContent: 'flex-end' }}>
              <div style={{ width: '100%', height: `${Math.max(h, 4)}%`, backgroundColor: h > 60 ? 'var(--primary)' : h > 30 ? 'var(--secondary)' : 'var(--outline-variant)', border: '2px solid var(--on-background)', transition: 'height 0.5s' }} />
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-body)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>
          {days.map(d => <span key={d}>{d}</span>)}
        </div>
      </div>

      {/* AI Insights */}
      {insights.length > 0 && (
        <div className="brutalist-card" style={{ backgroundColor: 'var(--on-background)', color: 'var(--background)', padding: 'var(--space-lg)', marginBottom: 'var(--space-md)', display: 'flex', flexWrap: 'wrap', gap: 'var(--space-lg)', alignItems: 'center' }}>
          <div style={{ flexShrink: 0 }}>
            <span className="material-symbols-outlined" style={{ fontSize: '80px', color: 'var(--tertiary-fixed)', opacity: 0.6 }}>psychology</span>
          </div>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <div style={{ display: 'inline-block', backgroundColor: 'var(--tertiary-fixed)', color: 'var(--on-tertiary-fixed)', padding: '4px 12px', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', marginBottom: '12px' }}>AI Insights Active</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {insights.map((insight, i) => (
                <div key={i} style={{ borderLeft: '4px solid var(--primary)', paddingLeft: 'var(--space-sm)' }}>
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: '15px', lineHeight: 1.6, color: 'var(--surface-variant)' }}>{i + 1}. {insight}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
