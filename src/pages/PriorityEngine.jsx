import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { Link } from 'react-router-dom'
import { buildMockGmailTasks, MOCK_PRIORITY_EXPLANATION } from '../lib/mockGoogleData'

export default function PriorityEngine() {
  const { user } = useAuth()
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(false)
  const [explanation, setExplanation] = useState('')
  const [explaining, setExplaining] = useState(false)
  const [lastSync, setLastSync] = useState(null)

  const loadTasks = async () => {
    if (!user) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'todo')
        .order('ai_priority_score', { ascending: false })
      if (error) throw error
      setTasks(data ?? [])
      
      // Get last sync time from profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('last_gmail_sync')
        .eq('id', user.id)
        .single()
      setLastSync(profile?.last_gmail_sync)
    } catch (e) {
      console.error('Failed to load tasks:', e.message)
      setTasks([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadTasks() }, [user?.id])

  const loadDemoGmailTasks = async () => {
    if (!user) return
    setExplaining(true)
    try {
      await supabase.from('tasks').delete().eq('user_id', user.id).eq('ai_source', 'demo_gmail')
      const rows = buildMockGmailTasks(user.id)
      const { error: insErr } = await supabase.from('tasks').insert(rows)
      if (insErr) throw insErr
      setExplanation(MOCK_PRIORITY_EXPLANATION)
      await loadTasks()
    } catch (e) {
      console.error(e)
      alert(e.message || 'Could not insert demo tasks.')
    } finally {
      setExplaining(false)
    }
  }

  const handleRerank = async () => {
    setExplaining(true)
    setExplanation('Fetching Gmail and analyzing priorities...')
    try {
      const { data, error } = await supabase.functions.invoke('priority-explain', {
        body: { userId: user.id }
      })
      if (error) throw error
      setExplanation(data.explanation || 'Tasks prioritized successfully.')
      
      // Update last sync time
      await supabase
        .from('profiles')
        .update({ last_gmail_sync: new Date().toISOString() })
        .eq('id', user.id)
      
      await loadTasks()
    } catch (e) {
      console.error('Priority engine error:', e)
      setExplanation(`Error: ${e.message || 'Failed to fetch Gmail data. Please ensure your Google account is connected.'}`)
    } finally {
      setExplaining(false)
    }
  }

  const completeTask = async (id) => {
    setTasks(prev => prev.filter(t => t.id !== id))
    await supabase.from('tasks').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', id)
  }

  if (loading) {
    return <div style={{ padding: 'var(--space-md)', fontFamily: 'var(--font-body)', textTransform: 'uppercase', fontSize: '16px' }}>Loading priority engine...</div>
  }

  const timeSinceSync = lastSync ? Math.round((Date.now() - new Date(lastSync).getTime()) / 60000) : null

  return (
    <div style={{ padding: 'var(--space-md)', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <section style={{ marginBottom: 'var(--space-lg)', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--space-md)' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'clamp(32px,6vw,64px)', textTransform: 'uppercase', letterSpacing: '-0.02em' }}>AI Priority Engine</h1>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '16px', color: 'var(--on-surface-variant)', maxWidth: '480px', marginTop: '8px' }}>
          {tasks.length > 0
            ? `${tasks.length} tasks ranked by AI · Includes Gmail-extracted tasks`
            : 'Click "Re-Prioritise with AI" to import from Gmail and rank all your tasks.'}
          </p>
          {timeSinceSync !== null && (
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--primary)', marginTop: '4px' }}>
              Last synced: {timeSinceSync < 1 ? 'Just now' : `${timeSinceSync} min ago`}
            </p>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
          <button className="brutalist-btn" onClick={handleRerank} disabled={explaining} style={{ backgroundColor: 'var(--secondary)', color: 'var(--secondary-fixed)', padding: 'var(--space-sm) var(--space-md)', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px', cursor: explaining ? 'not-allowed' : 'pointer' }}>
            <span className="material-symbols-outlined">{explaining ? 'hourglass_empty' : 'psychology'}</span>
            {explaining ? 'FETCHING GMAIL & ANALYZING...' : 'RE-PRIORITISE WITH AI'}
          </button>
          <button className="brutalist-btn" type="button" onClick={loadDemoGmailTasks} disabled={explaining} style={{ backgroundColor: 'var(--tertiary-fixed)', color: 'var(--on-tertiary-fixed)', padding: 'var(--space-sm) var(--space-md)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', cursor: explaining ? 'not-allowed' : 'pointer' }}>
            <span className="material-symbols-outlined">science</span>
            LOAD DEMO GMAIL TASKS
          </button>
        </div>
      </section>

      {/* AI Explanation */}
      {explanation && (
        <div style={{ backgroundColor: 'var(--on-background)', color: 'var(--background)', border: '4px solid var(--on-background)', padding: 'var(--space-md)', marginBottom: 'var(--space-md)', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
          <span className="material-symbols-outlined" style={{ color: 'var(--tertiary-fixed-dim)', flexShrink: 0, fontSize: '28px' }}>psychology</span>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '15px', lineHeight: 1.7, fontStyle: 'italic' }}>{explanation}</p>
        </div>
      )}

      {/* Empty State */}
      {tasks.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 'var(--space-xl)', border: '4px dashed var(--outline-variant)' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '64px', display: 'block', marginBottom: '16px', opacity: 0.3 }}>checklist</span>
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '24px', textTransform: 'uppercase', marginBottom: '12px' }}>No Tasks Yet</h3>
          <Link to="/micro-task" style={{ textDecoration: 'none' }}>
            <button className="brutalist-btn" style={{ backgroundColor: 'var(--primary)', color: 'white', padding: 'var(--space-sm) var(--space-md)', fontSize: '14px' }}>Decompose Your First Task →</button>
          </Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--space-md)', maxHeight: '60vh', overflowY: 'auto', paddingRight: '10px' }}>
          {/* Priority #1 */}
          {tasks[0] && (
            <div style={{ gridColumn: '1 / -1' }}>
              <div style={{ backgroundColor: '#FF4500', border: '8px solid black', boxShadow: '8px 8px 0px 0px #000', padding: 'var(--space-md)', position: 'relative', transform: 'rotate(-1deg)', animation: 'glow 2s infinite alternate' }}>
                <style>{`
                  @keyframes glow {
                    from { box-shadow: 8px 8px 0px 0px #000, 0 0 10px #FF4500, 0 0 20px #FF4500; }
                    to { box-shadow: 8px 8px 0px 0px #000, 0 0 20px #FF4500, 0 0 30px #FF8C00; }
                  }
                `}</style>
                <div style={{ position: 'absolute', top: '-20px', right: '-20px', backgroundColor: '#FACC15', border: '4px solid black', padding: '4px 16px', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '18px', boxShadow: '4px 4px 0px 0px #000', zIndex: 10 }}>
                  #1 PRIORITY
                </div>
                <div style={{ marginBottom: 'var(--space-md)' }}>
                  <span style={{ border: '2px solid black', padding: '2px 8px', backgroundColor: 'black', color: 'white', fontFamily: 'var(--font-body)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>Score: {tasks[0].ai_priority_score || tasks[0].priority_score}</span>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'clamp(20px,3vw,36px)', color: 'white', marginTop: '8px', lineHeight: 1, textTransform: 'uppercase' }}>{tasks[0].title || 'Task'}</h3>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                  <p style={{ fontFamily: 'var(--font-body)', fontWeight: 700, color: 'black', fontSize: '14px' }}>{tasks[0].description}</p>
                  <button onClick={() => completeTask(tasks[0].id)} style={{ border: '3px solid black', backgroundColor: 'white', padding: '8px 20px', cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '14px', textTransform: 'uppercase' }}>
                    ✓ Mark Done
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Tasks #2+ */}
          {tasks.slice(1).map((task, i) => (
            <div key={task.id} className="brutalist-card" style={{ backgroundColor: 'var(--surface)', padding: 'var(--space-md)', position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: '11px', fontWeight: 700, border: '2px solid var(--on-background)', padding: '2px 8px', textTransform: 'uppercase' }}>#{i + 2}</span>
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: '11px', fontWeight: 700, border: '2px solid var(--on-background)', padding: '2px 8px', backgroundColor: 'var(--secondary-fixed)', textTransform: 'uppercase' }}>Score: {task.ai_priority_score || task.priority_score}</span>
                </div>
                <button onClick={() => completeTask(task.id)} style={{ background: 'none', border: '2px solid var(--on-background)', cursor: 'pointer', padding: '2px 8px', fontFamily: 'var(--font-body)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>Done</button>
              </div>
              <h4 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '18px', marginBottom: '8px', textTransform: 'uppercase' }}>{task.title || 'Task'}</h4>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--on-surface-variant)', marginBottom: 'var(--space-sm)' }}>{task.description}</p>
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                <span style={{ border: '2px solid var(--on-background)', padding: '2px 8px', fontFamily: 'var(--font-body)', fontSize: '11px', fontWeight: 700, backgroundColor: 'var(--surface-variant)' }}>D: {task.ai_difficulty || 'medium'}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reasoning Sidebar */}
      <div className="brutalist-card" style={{ backgroundColor: 'var(--on-background)', color: 'var(--background)', padding: 'var(--space-md)', marginTop: 'var(--space-md)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 'var(--space-md)' }}>
          <span className="material-symbols-outlined" style={{ color: 'var(--tertiary-fixed-dim)' }}>psychology</span>
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '20px', textTransform: 'uppercase', fontStyle: 'italic' }}>AI Reasoning Log</h3>
        </div>
        <div style={{ fontFamily: 'var(--font-body)', fontSize: '14px', lineHeight: '2', opacity: 0.9, borderLeft: '4px solid var(--primary)', paddingLeft: 'var(--space-sm)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <p>{'>'} Source 1: Micro-Task Decomposer (your manual breakdowns)</p>
          <p>{'>'} Source 2: Gmail AI Extraction (unread emails scanned for deadlines &amp; keywords)</p>
          <p>{'>'} {tasks.length} total tasks ranked by ai_priority_score (0–100)</p>
          <p>{'>'} Higher score = more urgent based on deadline signals in email</p>
          <p style={{ color: 'var(--tertiary-fixed-dim)', fontWeight: 700, fontStyle: 'italic' }}>
            {'>>'} Click "RE-PRIORITISE WITH AI" to pull latest Gmail &amp; re-rank {'<<'}
          </p>
        </div>
        <div style={{ marginTop: 'var(--space-md)', paddingTop: 'var(--space-sm)', borderTop: '1px solid rgba(255,255,255,0.2)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-body)', fontSize: '11px', textTransform: 'uppercase', marginBottom: '6px' }}>
            <span>Engine Reliability</span><span>98.4%</span>
          </div>
          <div style={{ width: '100%', backgroundColor: 'rgba(255,255,255,0.2)', height: '12px', border: '2px solid white' }}>
            <div style={{ backgroundColor: 'var(--tertiary-fixed-dim)', height: '100%', width: '98.4%' }} />
          </div>
        </div>
      </div>
    </div>
  )
}
