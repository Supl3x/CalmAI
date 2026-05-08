import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'

export default function Dashboard() {
  const { user, profile } = useAuth()
  const [topTasks, setTopTasks] = useState([])
  const [loopCount, setLoopCount] = useState(0)
  const [todayBriefing, setTodayBriefing] = useState(null)
  const [focusMinutes, setFocusMinutes] = useState(0)
  const [loading, setLoading] = useState(true)

  const today = new Date().toISOString().split('T')[0]

  const cognitiveLoad = Math.min(100, Math.round((loopCount * 4) + (topTasks.length * 6)))

  useEffect(() => {
    if (!user) return
    const loadDashboard = async () => {
      setLoading(true)
      const [tasksRes, loopsRes, briefingRes, sessionsRes] = await Promise.all([
        supabase.from('tasks').select('*').eq('user_id', user.id).eq('status', 'todo').order('ai_priority_score', { ascending: false }).limit(5),
        supabase.from('open_loops').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'open'),
        supabase.from('daily_briefings').select('*').eq('user_id', user.id).eq('briefing_date', today).maybeSingle(),
        supabase.from('focus_sessions').select('duration_minutes').eq('user_id', user.id).eq('session_date', today),
      ])
      setTopTasks(tasksRes.data ?? [])
      setLoopCount(loopsRes.count ?? 0)
      setTodayBriefing(briefingRes.data)
      setFocusMinutes(sessionsRes.data?.reduce((acc, s) => acc + s.duration_minutes, 0) ?? 0)
      setLoading(false)
    }
    loadDashboard()

    // Realtime subscription for open loops badge
    const channel = supabase
      .channel('dashboard-loops')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'open_loops', filter: `user_id=eq.${user.id}` }, () => {
        supabase.from('open_loops').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'open')
          .then(({ count }) => setLoopCount(count ?? 0))
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [user?.id])

  const displayName = profile?.full_name || user?.user_metadata?.full_name || 'Agent'
  const firstName = displayName.split(' ')[0]

  const stats = [
    { label: 'Active Tasks', value: topTasks.length.toString(), color: 'var(--tertiary-fixed)' },
    { label: 'Cognitive Load', value: `${cognitiveLoad}%`, color: 'var(--primary-fixed)' },
    { label: 'Open Loops', value: loopCount.toString(), color: 'var(--secondary-fixed)' },
    { label: 'Focus Today', value: `${focusMinutes}m`, color: 'var(--surface-container-highest)' },
  ]

  return (
    <div style={{ padding: 'var(--space-md)', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Greeting */}
      <div style={{ marginBottom: 'var(--space-md)', borderBottom: '4px solid var(--on-background)', paddingBottom: 'var(--space-sm)' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'clamp(24px,4vw,40px)', textTransform: 'uppercase' }}>
          Welcome, <span style={{ color: 'var(--primary)' }}>{firstName}</span> // Command Center
        </h1>
      </div>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px,1fr))', gap: 'var(--space-gutter)', marginBottom: 'var(--space-md)' }}>
        {stats.map((s, i) => (
          <div key={s.label} className={`brutalist-card stagger-${(i % 3) + 1}`} style={{ backgroundColor: s.color, padding: 'var(--space-sm)' }}>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</p>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: loading ? '24px' : '48px', lineHeight: 1, margin: '4px 0' }}>
              {loading ? '...' : s.value}
            </h3>
            <div style={{ height: '3px', backgroundColor: 'var(--on-background)', width: '100%' }} />
          </div>
        ))}
      </div>

      {/* Bento Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12,1fr)', gap: 'var(--space-gutter)' }}>
        {/* Daily Briefing */}
        <section className="brutalist-card" style={{ gridColumn: 'span 8', backgroundColor: 'var(--surface-container-low)', padding: 'var(--space-md)', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: '-12px', right: '-12px', transform: 'rotate(12deg)', backgroundColor: 'var(--tertiary-fixed-dim)', border: '4px solid var(--on-background)', padding: '4px 16px', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', zIndex: 10 }}>Today's Focus</div>
          <div style={{ marginBottom: 'var(--space-md)' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '24px', textTransform: 'uppercase', marginBottom: '8px' }}>AI Daily Briefing</h2>
            {todayBriefing ? (
              <div>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '16px', color: 'var(--on-surface-variant)', fontStyle: 'italic', marginBottom: 'var(--space-sm)' }}>
                  "{todayBriefing.content?.insight}"
                </p>
                {todayBriefing.content?.priorities?.slice(0, 2).map((p, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', borderBottom: '2px solid var(--on-background)', paddingBottom: 'var(--space-xs)', marginBottom: '8px' }}>
                    <span className="material-symbols-outlined" style={{ color: 'var(--primary)' }}>auto_awesome</span>
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px' }}>{p}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--on-surface-variant)', fontStyle: 'italic' }}>
                {loading ? 'Loading briefing...' : 'No briefing yet. Visit Daily Briefing to generate one.'}
              </p>
            )}
          </div>
          <Link to="/briefing" style={{ textDecoration: 'none' }}>
            <button className="brutalist-btn-sm" style={{ backgroundColor: 'var(--primary)', color: 'white', padding: '8px 20px', fontSize: '13px', border: '3px solid var(--on-background)' }}>
              {todayBriefing ? 'Full Briefing →' : 'Generate Briefing →'}
            </button>
          </Link>
        </section>

        {/* Focus Timer Widget */}
        <section className="brutalist-card stagger-1" style={{ gridColumn: 'span 4', backgroundColor: 'var(--on-background)', color: 'var(--background)', padding: 'var(--space-md)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'center', textAlign: 'center' }}>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Current Focus Sprint</p>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '64px', lineHeight: 1, margin: 'var(--space-sm) 0' }}>
            {String(profile?.focus_duration || 25).padStart(2,'0')}:00
          </div>
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <Link to="/calm" style={{ textDecoration: 'none' }}>
              <button className="brutalist-btn" style={{ width: '100%', backgroundColor: 'var(--tertiary-fixed)', color: 'var(--on-tertiary-fixed)', fontSize: '14px', padding: '10px', border: '3px solid white' }}>
                Open Calm Mode
              </button>
            </Link>
          </div>
        </section>

        {/* Priority Tasks */}
        <section className="brutalist-card stagger-2" style={{ gridColumn: 'span 5', backgroundColor: 'var(--background)', padding: 'var(--space-md)' }}>
          <div style={{ borderBottom: '4px solid var(--on-background)', marginBottom: 'var(--space-md)', paddingBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '24px', textTransform: 'uppercase' }}>Next Up</h2>
            <Link to="/priority" style={{ textDecoration: 'none', fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase' }}>View All →</Link>
          </div>
          {loading ? (
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--on-surface-variant)' }}>Loading tasks...</p>
          ) : topTasks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 'var(--space-md)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '48px', opacity: 0.3, display: 'block', marginBottom: '8px' }}>task_alt</span>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: 'var(--on-surface-variant)' }}>No tasks yet.</p>
              <Link to="/micro-task" style={{ color: 'var(--primary)', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '13px' }}>Add your first task →</Link>
            </div>
          ) : (
            <ul style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', listStyle: 'none' }}>
              {topTasks.map((task, i) => (
                <li key={task.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-sm)' }}>
                  <div style={{ width: '28px', height: '28px', border: '3px solid var(--on-background)', backgroundColor: ['var(--tertiary-fixed)', 'var(--surface-variant)', 'var(--primary-fixed)'][i % 3], flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '11px' }}>#{i + 1}</span>
                  </div>
                  <div>
                    <p style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '14px', textTransform: 'uppercase' }}>{task.description}</p>
                    <p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: 'var(--on-surface-variant)', marginTop: '2px' }}>Score: {task.priority_score} · {task.parent_task?.slice(0, 30)}...</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Cognitive Load Meter */}
        <section className="brutalist-card" style={{ gridColumn: 'span 7', backgroundColor: 'var(--surface-container-high)', padding: 'var(--space-md)' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '24px', textTransform: 'uppercase', marginBottom: 'var(--space-sm)' }}>Cognitive Load</h2>
          <div style={{ position: 'relative', height: '56px', backgroundColor: 'var(--background)', border: '4px solid var(--on-background)', width: '100%', overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${cognitiveLoad}%`,
              backgroundColor: cognitiveLoad > 80 ? 'var(--error)' : cognitiveLoad > 60 ? 'var(--primary-container)' : 'var(--tertiary-fixed)',
              transition: 'width 0.5s ease',
            }} />
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '20px' }}>
              {cognitiveLoad}% {cognitiveLoad > 80 ? '🔥 HIGH' : cognitiveLoad > 60 ? '⚡ ELEVATED' : '✅ OPTIMAL'}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontFamily: 'var(--font-body)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--on-surface-variant)' }}>
            <span>Clear Mind</span><span>Optimal Flow</span><span>Total Burnout</span>
          </div>
        </section>

        {/* Quick Links */}
        <section style={{ gridColumn: 'span 12' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px,1fr))', gap: 'var(--space-sm)' }}>
            {[
              { to: '/open-loop', label: 'Open Loops', icon: 'psychology_alt', color: 'var(--primary-container)', badge: loopCount > 0 ? loopCount : null },
              { to: '/micro-task', label: 'Decompose Task', icon: 'account_tree', color: 'var(--tertiary-fixed)' },
              { to: '/weekly', label: 'Weekly Report', icon: 'monitoring', color: 'var(--secondary-fixed)' },
              { to: '/draft', label: 'AI Draft', icon: 'auto_awesome', color: 'var(--primary-fixed)' },
            ].map(item => (
              <Link key={item.to} to={item.to} style={{ textDecoration: 'none' }}>
                <div className="brutalist-card" style={{ backgroundColor: item.color, padding: 'var(--space-sm)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', cursor: 'pointer', textAlign: 'center', position: 'relative' }}>
                  {item.badge && (
                    <div style={{ position: 'absolute', top: '-8px', right: '-8px', backgroundColor: 'var(--error)', color: 'white', border: '2px solid var(--on-background)', width: '22px', height: '22px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-body)', fontSize: '11px', fontWeight: 700 }}>
                      {item.badge}
                    </div>
                  )}
                  <span className="material-symbols-outlined" style={{ fontSize: '28px' }}>{item.icon}</span>
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase' }}>{item.label}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>

      {/* Calm Mode FAB */}
      <Link to="/calm" style={{ textDecoration: 'none' }}>
        <button className="brutalist-btn" style={{ position: 'fixed', bottom: 'var(--space-md)', right: 'var(--space-md)', width: '72px', height: '72px', backgroundColor: 'var(--tertiary-fixed-dim)', color: 'var(--on-tertiary-fixed)', border: '4px solid var(--on-background)', borderRadius: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, flexDirection: 'column', gap: '2px' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '28px' }}>self_improvement</span>
          <span style={{ fontSize: '8px', fontWeight: 700 }}>FOCUS</span>
        </button>
      </Link>

      <style>{`
        @media (max-width: 1023px) {
          section[style*="gridColumn: 'span 8'"] { grid-column: span 12 !important; }
          section[style*="gridColumn: 'span 4'"] { grid-column: span 12 !important; }
          section[style*="gridColumn: 'span 5'"] { grid-column: span 12 !important; }
          section[style*="gridColumn: 'span 7'"] { grid-column: span 12 !important; }
          section[style*="gridColumn: 'span 12'"] { grid-column: span 12 !important; }
        }
      `}</style>
    </div>
  )
}
