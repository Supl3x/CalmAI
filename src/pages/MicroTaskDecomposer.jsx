import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'

const GROQ_KEY = import.meta.env.VITE_GROQ_API_KEY

async function callGroq(prompt) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${GROQ_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'llama-3.1-8b-instant', messages: [{ role: 'user', content: prompt }], temperature: 0.4, max_tokens: 1000 })
  })
  const json = await res.json()
  
  // Check for API errors
  if (json.error) {
    console.error('Groq API error:', json.error)
    throw new Error(json.error.message || 'Groq API error')
  }
  
  if (!json.choices || !json.choices[0]) {
    console.error('Unexpected Groq response:', json)
    throw new Error('Invalid response from Groq API')
  }
  
  return json.choices[0].message.content
}

export default function MicroTaskDecomposer() {
  const { user } = useAuth()
  const [task, setTask] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [subtasks, setSubtasks] = useState([])
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState(null)
  const [aiModel, setAiModel] = useState('groq')
  const [driveFiles, setDriveFiles] = useState([])
  const [showDrivePicker, setShowDrivePicker] = useState(false)

  const loadDriveFiles = async () => {
    const { data } = await supabase.functions.invoke('list-drive-files', { body: { userId: user.id } })
    setDriveFiles(data.files ?? [])
    setShowDrivePicker(true)
  }

  const importFromDrive = async (fileId) => {
    const { data } = await supabase.functions.invoke('fetch-drive-doc', { body: { userId: user.id, fileId } })
    setTask(prev => prev + '\n\nContext from Drive doc:\n' + data.content)
    setShowDrivePicker(false)
  }

  const handleDecompose = async () => {
    if (!task.trim()) return
    setAnalyzing(true)
    setError(null)
    setSubtasks([])
    setProgress(20)

    const prompt = `You are a productivity AI. Break this task into 3-8 concrete subtasks.
Task: "${task}"
Return ONLY valid JSON array, no explanation, no markdown:
[{ "description": "...", "difficulty": 1-10, "resistance": 1-10, "urgency": 5 }]`

    try {
      setProgress(50)
      let raw = await callGroq(prompt)
      setProgress(80)
      setAiModel('groq')

      // Parse JSON — strip markdown fences if present
      raw = raw.replace(/```json?/gi, '').replace(/```/g, '').trim()
      const parsed = JSON.parse(raw)

      // Save to Supabase - map to correct schema
      const rows = parsed.map(s => ({
        user_id: user.id,
        title: s.description,
        description: `Part of: ${task}`,
        ai_generated: true,
        ai_source: 'decomposer',
        ai_parent_prompt: task,
        ai_difficulty: s.difficulty <= 3 ? 'easy' : s.difficulty <= 7 ? 'medium' : 'hard',
        priority: s.urgency >= 8 ? 'urgent' : s.urgency >= 6 ? 'high' : s.urgency >= 4 ? 'medium' : 'low',
        ai_priority_score: Math.round(((s.difficulty + s.resistance + s.urgency) / 3) * 10),
        status: 'todo',
      }))
      const { data, error: dbError } = await supabase.from('tasks').insert(rows).select()
      if (dbError) throw dbError

      setSubtasks(data)
      setProgress(100)
    } catch (err) {
      console.error('Decompose error:', err)
      setError('AI unavailable or parse error. Please try again.')
      setProgress(0)
    } finally {
      setAnalyzing(false)
    }
  }

  const toggleDone = async (id) => {
    const task = subtasks.find(t => t.id === id)
    const newStatus = task.status === 'completed' ? 'todo' : 'completed'
    const completedAt = newStatus === 'completed' ? new Date().toISOString() : null
    setSubtasks(prev => prev.map(t => t.id === id ? { ...t, status: newStatus, completed_at: completedAt } : t))
    await supabase.from('tasks').update({ status: newStatus, completed_at: completedAt }).eq('id', id)
  }

  const deleteTask = async (id) => {
    setSubtasks(prev => prev.filter(t => t.id !== id))
    await supabase.from('tasks').delete().eq('id', id)
  }

  // Load recent decompositions
  useEffect(() => {
    if (!user) return
    supabase.from('tasks').select('*').eq('user_id', user.id).eq('status', 'todo').order('created_at', { ascending: false }).limit(8)
      .then(({ data }) => { if (data?.length) setSubtasks(data) })
  }, [user?.id])

  return (
    <div style={{ padding: 'var(--space-md)', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Title */}
      <div style={{ marginBottom: 'var(--space-lg)' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'clamp(28px,5vw,56px)', textTransform: 'uppercase', letterSpacing: '-0.02em' }}>
          Micro Task <span style={{ color: 'var(--primary)' }}>Decomposer</span>
        </h1>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '16px', color: 'var(--on-surface-variant)', marginTop: '8px' }}>
          Powered by Groq AI · Results saved to your task database automatically.
        </p>
      </div>

      {/* Input Zone */}
      <section style={{ position: 'relative', marginBottom: 'var(--space-xl)' }}>
        <div style={{ position: 'absolute', top: '-20px', left: '-8px', backgroundColor: 'var(--tertiary-fixed)', border: '4px solid var(--on-background)', boxShadow: '4px 4px 0px 0px #000', padding: '4px 16px', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '14px', textTransform: 'uppercase', transform: 'rotate(-2deg)', zIndex: 10 }}>TASK DECOMPOSER</div>
        <div className="brutalist-card" style={{ backgroundColor: 'white', padding: 'var(--space-lg)' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '20px', marginBottom: '8px' }}>What's the big mission?</h2>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', marginBottom: 'var(--space-md)', color: 'var(--on-surface-variant)' }}>Drop your massive, overwhelming task here. AI will chew it into manageable pieces.</p>

          <textarea
            value={task}
            onChange={e => setTask(e.target.value)}
            placeholder="e.g. Launch a full-scale marketing campaign for a new coffee brand..."
            style={{ fontFamily: 'var(--font-body)', fontSize: '14px', width: '100%', minHeight: '140px', border: '4px solid var(--on-background)', padding: 'var(--space-sm)', outline: 'none', resize: 'vertical', backgroundColor: 'white', marginBottom: 'var(--space-sm)' }}
            onFocus={e => e.target.style.backgroundColor = 'var(--tertiary-fixed-dim)'}
            onBlur={e => e.target.style.backgroundColor = 'white'}
          />

          <div style={{ display: 'flex', gap: '8px', marginBottom: 'var(--space-md)' }}>
            <button onClick={loadDriveFiles} style={{ background: 'none', border: '2px solid var(--on-background)', padding: '4px 12px', fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>description</span> Import from Drive
            </button>
          </div>

          {showDrivePicker && (
            <div style={{ border: '2px solid var(--on-background)', backgroundColor: 'var(--surface)', padding: 'var(--space-sm)', marginBottom: 'var(--space-md)', maxHeight: '160px', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700 }}>Select a Google Doc</span>
                <button onClick={() => setShowDrivePicker(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '12px' }}>Close</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {driveFiles.map(f => (
                  <button key={f.id} onClick={() => importFromDrive(f.id)} style={{ textAlign: 'left', background: 'none', border: '1px solid var(--outline)', padding: '4px 8px', fontFamily: 'var(--font-body)', fontSize: '13px', cursor: 'pointer' }}>
                    {f.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-sm)' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <div style={{ padding: '6px 12px', backgroundColor: 'var(--secondary-fixed)', border: '4px solid var(--on-background)', fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase' }}>
                🤖 {aiModel === 'groq' ? 'Groq AI' : 'Gemini AI'}
              </div>
            </div>
            <button
              className="brutalist-btn"
              onClick={handleDecompose}
              disabled={analyzing || !task.trim()}
              style={{ backgroundColor: analyzing ? 'var(--outline-variant)' : 'var(--primary-container)', color: 'var(--on-primary-container)', padding: 'var(--space-sm) var(--space-md)', fontSize: '16px', opacity: analyzing ? 0.7 : 1, cursor: analyzing ? 'not-allowed' : 'pointer' }}
            >
              {analyzing ? '⚡ ANALYZING...' : 'DECOMPOSE NOW'}
            </button>
          </div>

          {error && (
            <div style={{ marginTop: 'var(--space-sm)', padding: 'var(--space-sm)', backgroundColor: 'var(--error-container)', border: '2px solid var(--error)', fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--on-error-container)' }}>
              {error}
            </div>
          )}
        </div>
      </section>

      {/* AI Progress */}
      {analyzing && (
        <section style={{ marginBottom: 'var(--space-xl)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', marginBottom: 'var(--space-sm)' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '20px', textTransform: 'uppercase' }}>AI IS CRUNCHING...</h3>
            <span className="material-symbols-outlined" style={{ fontSize: '28px', color: 'var(--primary)', animation: 'spin 0.8s linear infinite' }}>bolt</span>
          </div>
          <div style={{ width: '100%', height: '48px', border: '4px solid var(--on-background)', backgroundColor: 'white', position: 'relative', overflow: 'hidden', boxShadow: '4px 4px 0px 0px #000' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: `${progress}%`, backgroundColor: 'var(--primary-container)', transition: 'width 0.5s', borderRight: '4px solid var(--on-background)' }} />
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '16px' }}>{progress}% ANALYZED</div>
          </div>
        </section>
      )}

      {/* Blueprint Results */}
      {subtasks.length > 0 && (
        <section style={{ marginBottom: 'var(--space-xl)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px', marginBottom: 'var(--space-lg)' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'clamp(28px,5vw,56px)', textTransform: 'uppercase', borderBottom: '8px solid var(--tertiary-fixed)', lineHeight: 0.95 }}>THE BLUEPRINT</h2>
            <span className="material-symbols-outlined" style={{ fontSize: '32px', marginBottom: '8px' }}>account_tree</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 'var(--space-gutter)' }}>
            {subtasks.map((st, i) => {
              const colors = ['white', 'var(--tertiary-fixed)', 'var(--primary-fixed)', 'white']
              const isComplete = st.status === 'completed'
              const difficulty = st.ai_difficulty === 'easy' ? 3 : st.ai_difficulty === 'medium' ? 6 : 9
              const resistance = Math.round(st.ai_priority_score / 10) // Approximate from priority score
              return (
                <div key={st.id} className="brutalist-card" style={{ backgroundColor: colors[i % colors.length], padding: 'var(--space-md)', opacity: isComplete ? 0.6 : 1, transition: 'opacity 0.3s' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <span style={{ backgroundColor: 'var(--on-background)', color: 'white', padding: '2px 8px', fontFamily: 'var(--font-body)', fontSize: '11px', fontWeight: 700, textDecoration: isComplete ? 'line-through' : 'none' }}>TASK_{String(i + 1).padStart(2, '0')}</span>
                    <button onClick={() => deleteTask(st.id)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--outline)' }}>delete</span>
                    </button>
                  </div>
                  <h4 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '16px', textTransform: 'uppercase', marginBottom: '8px', textDecoration: isComplete ? 'line-through' : 'none' }}>{st.title}</h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
                    <span style={{ border: '2px solid var(--on-background)', backgroundColor: 'var(--surface-variant)', padding: '2px 8px', fontFamily: 'var(--font-body)', fontSize: '11px', fontWeight: 700 }}>D: {difficulty}/10</span>
                    <span style={{ border: '2px solid var(--on-background)', backgroundColor: 'var(--surface-variant)', padding: '2px 8px', fontFamily: 'var(--font-body)', fontSize: '11px', fontWeight: 700 }}>R: {resistance}/10</span>
                    <span style={{ border: '2px solid var(--on-background)', backgroundColor: 'var(--secondary-fixed)', padding: '2px 8px', fontFamily: 'var(--font-body)', fontSize: '11px', fontWeight: 700 }}>Score: {st.ai_priority_score}</span>
                  </div>
                  <div style={{ borderTop: '4px solid var(--on-background)', paddingTop: '8px', display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => toggleDone(st.id)}
                      style={{ border: '2px solid var(--on-background)', backgroundColor: isComplete ? 'var(--tertiary-fixed)' : 'white', padding: '4px 12px', cursor: 'pointer', fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase' }}
                    >
                      {isComplete ? '✓ Done' : 'Mark Done'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* CTA */}
      {subtasks.length > 0 && (
        <section className="brutalist-card" style={{ backgroundColor: 'var(--on-background)', color: 'var(--background)', padding: 'var(--space-lg)', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-md)' }}>
          <div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'clamp(20px,4vw,36px)', textTransform: 'uppercase', color: 'var(--primary-fixed)', marginBottom: '8px' }}>READY TO EXECUTE?</h2>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '16px', opacity: 0.8 }}>
              {subtasks.filter(t => t.status !== 'completed').length} tasks remaining · {subtasks.filter(t => t.status === 'completed').length} completed
            </p>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
            <button onClick={() => { setSubtasks([]); setTask(''); setProgress(0) }} className="brutalist-btn" style={{ backgroundColor: 'var(--tertiary-fixed)', color: 'var(--on-tertiary-fixed)', border: '4px solid var(--on-background)', padding: 'var(--space-sm) var(--space-md)', fontSize: '14px' }}>
              NEW TASK
            </button>
          </div>
        </section>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
