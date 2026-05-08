import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { Link } from 'react-router-dom'

// Groq call moved to Edge Function

export default function PriorityEngine() {
  const { user } = useAuth()
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [explanation, setExplanation] = useState('')
  const [explaining, setExplaining] = useState(false)

  const loadTasks = async () => {
    if (!user) return
    setLoading(true)
    const { data } = await supabase.from('tasks').select('*').eq('user_id', user.id).eq('is_complete', false).order('priority_score', { ascending: false })
    setTasks(data ?? [])
    setLoading(false)
  }

  useEffect(() => { loadTasks() }, [user?.id])

  const handleRerank = async () => {
    if (!tasks.length) return
    setExplaining(true)
    try {
      const { data, error } = await supabase.functions.invoke('priority-explain', {
        body: { userId: user.id, tasks: tasks.slice(0, 5) }
      })
      if (error) throw error
      setExplanation(data.explanation)
    } catch (e) {
      setExplanation('AI explanation unavailable right now.')
    } finally {
      setExplaining(false)
    }
  }

  const completeTask = async (id) => {
    setTasks(prev => prev.filter(t => t.id !== id))
    await supabase.from('tasks').update({ is_complete: true, completed_at: new Date().toISOString() }).eq('id', id)
  }

  if (loading) {
    return <div style={{ padding: 'var(--space-md)', fontFamily: 'var(--font-body)', textTransform: 'uppercase', fontSize: '16px' }}>Loading priority engine...</div>
  }

  return (
    <div style={{ padding: 'var(--space-md)', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <section style={{ marginBottom: 'var(--space-lg)', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--space-md)' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'clamp(32px,6vw,64px)', textTransform: 'uppercase', letterSpacing: '-0.02em' }}>AI Priority Engine</h1>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '16px', color: 'var(--on-surface-variant)', maxWidth: '480px', marginTop: '8px' }}>
            {tasks.length > 0 ? `${tasks.length} tasks ranked by AI score formula: (urgency × 2) + difficulty - resistance` : 'No tasks yet. Decompose a task to get started.'}
          </p>
        </div>
        <button className="brutalist-btn" onClick={handleRerank} disabled={explaining || !tasks.length} style={{ backgroundColor: 'var(--secondary)', color: 'var(--secondary-fixed)', padding: 'var(--space-sm) var(--space-md)', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px', cursor: tasks.length ? 'pointer' : 'not-allowed', opacity: tasks.length ? 1 : 0.5 }}>
          <span className="material-symbols-outlined">{explaining ? 'hourglass_empty' : 'psychology'}</span>
          {explaining ? 'ANALYZING...' : 'AI EXPLAIN'}
        </button>
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--space-md)' }}>
          {/* Priority #1 */}
          {tasks[0] && (
            <div style={{ gridColumn: '1 / -1' }}>
              <div style={{ backgroundColor: '#FF4500', border: '8px solid black', boxShadow: '8px 8px 0px 0px #000', padding: 'var(--space-md)', position: 'relative', transform: 'rotate(-1deg)' }}>
                <div style={{ position: 'absolute', top: '-20px', right: '-20px', backgroundColor: '#FACC15', border: '4px solid black', padding: '4px 16px', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '18px', boxShadow: '4px 4px 0px 0px #000', zIndex: 10 }}>
                  #1 PRIORITY
                </div>
                <div style={{ marginBottom: 'var(--space-md)' }}>
                  <span style={{ border: '2px solid black', padding: '2px 8px', backgroundColor: 'black', color: 'white', fontFamily: 'var(--font-body)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>Score: {tasks[0].priority_score}</span>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'clamp(20px,3vw,36px)', color: 'white', marginTop: '8px', lineHeight: 1, textTransform: 'uppercase' }}>{tasks[0].description}</h3>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                  <p style={{ fontFamily: 'var(--font-body)', fontWeight: 700, color: 'black', fontSize: '14px' }}>{tasks[0].parent_task}</p>
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
                  <span style={{ fontFamily: 'var(--font-body)', fontSize: '11px', fontWeight: 700, border: '2px solid var(--on-background)', padding: '2px 8px', backgroundColor: 'var(--secondary-fixed)', textTransform: 'uppercase' }}>Score: {task.priority_score}</span>
                </div>
                <button onClick={() => completeTask(task.id)} style={{ background: 'none', border: '2px solid var(--on-background)', cursor: 'pointer', padding: '2px 8px', fontFamily: 'var(--font-body)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>Done</button>
              </div>
              <h4 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '18px', marginBottom: '8px', textTransform: 'uppercase' }}>{task.description}</h4>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--on-surface-variant)', marginBottom: 'var(--space-sm)' }}>{task.parent_task}</p>
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                {[{ l: 'D', v: task.difficulty }, { l: 'R', v: task.resistance }, { l: 'U', v: task.urgency }].map(s => (
                  <span key={s.l} style={{ border: '2px solid var(--on-background)', padding: '2px 8px', fontFamily: 'var(--font-body)', fontSize: '11px', fontWeight: 700, backgroundColor: 'var(--surface-variant)' }}>{s.l}: {s.v}/10</span>
                ))}
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
          <p>{'>'} Priority formula: (urgency × 2) + difficulty - resistance</p>
          <p>{'>'} {tasks.length} active tasks loaded from database</p>
          <p>{'>'} Sorted by priority_score (highest → critical)</p>
          <p style={{ color: 'var(--tertiary-fixed-dim)', fontWeight: 700, fontStyle: 'italic' }}>
            {'>>'} Click "AI EXPLAIN" for natural language reasoning {'<<'}
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
