import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'

const GROQ_KEY = import.meta.env.VITE_GROQ_API_KEY

async function callGroq(prompt) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${GROQ_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'llama-3.1-8b-instant', messages: [{ role: 'user', content: prompt }], temperature: 0.3, max_tokens: 600 })
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

export default function OpenLoopCleaner() {
  const { user } = useAuth()
  const [loops, setLoops] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [importing, setImporting] = useState(null)

  useEffect(() => {
    if (!user) return
    supabase.from('open_loops').select('*').eq('user_id', user.id).eq('is_complete', false).order('created_at', { ascending: false })
      .then(({ data }) => { setLoops(data ?? []); setLoading(false) })

    const channel = supabase.channel('loops-' + user.id)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'open_loops', filter: `user_id=eq.${user.id}` },
        ({ new: updated }) => setLoops(prev => prev.map(l => l.id === updated.id ? updated : l)))
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [user?.id])

  const captureLoop = async () => {
    if (!input.trim()) return
    const content = input.trim()
    const tempId = 'temp-' + Date.now()
    const tempLoop = { id: tempId, content, category: 'Classifying...', urgency: 'Medium', created_at: new Date().toISOString() }
    setLoops(prev => [tempLoop, ...prev])
    setInput('')

    const { data, error } = await supabase.from('open_loops').insert({ user_id: user.id, content }).select().single()
    if (error) { setLoops(prev => prev.filter(l => l.id !== tempId)); return }
    setLoops(prev => prev.map(l => l.id === tempId ? data : l))

    // AI classification in background
    classifyLoop(data.id, content)
  }

  const classifyLoop = async (loopId, content) => {
    try {
      const prompt = `Classify this thought into category and urgency.
Thought: "${content}"
Return ONLY JSON (no markdown): { "category": "Finance|Study|Personal|Reminder", "urgency": "High|Medium|Low" }`
      let raw = await callGroq(prompt)
      raw = raw.replace(/```json?/gi, '').replace(/```/g, '').trim()
      const { category, urgency } = JSON.parse(raw)
      await supabase.from('open_loops').update({ category, urgency }).eq('id', loopId)
    } catch (e) {
      console.warn('Classification failed:', e)
    }
  }

  const importEmailsAsLoops = async () => {
    setImporting('gmail')
    const { data } = await supabase.functions.invoke('fetch-gmail-threads', {
      body: { userId: user.id, maxResults: 10 }
    })

    const newLoops = (data?.emails ?? []).map(e => ({
      user_id: user.id,
      content: `Reply to email: "${e.subject}" from ${e.from}`,
      category: 'Uncategorised',
      urgency: 'Medium',
    }))

    if (newLoops.length > 0) {
      await supabase.from('open_loops').insert(newLoops)
    }
    setImporting(null)
  }

  const importCalendarAsLoops = async () => {
    setImporting('calendar')
    const { data } = await supabase.functions.invoke('fetch-calendar-events', {
      body: { userId: user.id }
    })

    const newLoops = (data?.events ?? []).map(e => ({
      user_id: user.id,
      content: `Prepare for: "${e.summary}" on ${new Date(e.start).toLocaleDateString()}`,
      category: 'Reminder',
      urgency: 'Medium',
      scheduled_date: e.start?.split('T')[0],
    }))

    if (newLoops.length > 0) {
      await supabase.from('open_loops').insert(newLoops)
    }
    setImporting(null)
  }

  const completeLoop = async (id) => {
    setLoops(prev => prev.filter(l => l.id !== id))
    await supabase.from('open_loops').update({ is_complete: true }).eq('id', id)
  }

  const scheduleLoop = async (id, days) => {
    const d = new Date()
    d.setDate(d.getDate() + days)
    const date = d.toISOString().split('T')[0]
    await supabase.from('open_loops').update({ scheduled_date: date }).eq('id', id)
    setLoops(prev => prev.map(l => l.id === id ? { ...l, scheduled_date: date } : l))
  }

  const urgencyColors = { High: 'var(--primary-container)', Medium: 'var(--tertiary-fixed)', Low: 'var(--secondary-fixed)' }
  const rotations = ['-1deg', '1.5deg', '-0.5deg', '1deg', '-2deg', '0.5deg']

  return (
    <div style={{ padding: 'var(--space-md)', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 'var(--space-lg)' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'clamp(28px,5vw,56px)', textTransform: 'uppercase', letterSpacing: '-0.02em' }}>Open Loop <span style={{ color: 'var(--primary)' }}>Cleaner</span></h1>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '16px', color: 'var(--on-surface-variant)', marginTop: '8px' }}>
          Brain dump every floating thought. AI categorizes automatically. You clear the mental cache.
        </p>
      </div>

      {/* Capture Bar */}
      <section style={{ maxWidth: '800px', margin: '0 auto var(--space-lg)' }}>
        <div style={{ display: 'flex', border: '4px solid var(--on-background)', backgroundColor: 'white', boxShadow: '8px 8px 0px 0px #000', alignItems: 'center' }}>
          <span className="material-symbols-outlined" style={{ paddingLeft: 'var(--space-sm)', color: 'var(--on-surface)', flexShrink: 0 }}>psychology</span>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && captureLoop()}
            placeholder="DUMP A THOUGHT HERE... (press Enter)"
            style={{ flex: 1, border: 'none', outline: 'none', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'clamp(14px,2.5vw,18px)', textTransform: 'uppercase', padding: 'var(--space-sm) var(--space-md)', backgroundColor: 'transparent' }}
          />
          <button className="brutalist-btn" onClick={captureLoop} style={{ backgroundColor: 'var(--primary)', color: 'var(--on-primary)', padding: 'var(--space-sm) var(--space-md)', fontSize: '14px', border: '4px solid var(--on-background)', flexShrink: 0 }}>
            Capture
          </button>
        </div>
        <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
          <button onClick={importEmailsAsLoops} disabled={importing === 'gmail'} style={{ background: 'none', border: '2px solid var(--on-background)', padding: '4px 12px', fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700, cursor: importing === 'gmail' ? 'not-allowed' : 'pointer', opacity: importing === 'gmail' ? 0.5 : 1 }}>
            {importing === 'gmail' ? 'Importing...' : '📧 Import from Gmail'}
          </button>
          <button onClick={importCalendarAsLoops} disabled={importing === 'calendar'} style={{ background: 'none', border: '2px solid var(--on-background)', padding: '4px 12px', fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700, cursor: importing === 'calendar' ? 'not-allowed' : 'pointer', opacity: importing === 'calendar' ? 0.5 : 1 }}>
            {importing === 'calendar' ? 'Importing...' : '📅 Import from Calendar'}
          </button>
        </div>
        <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ backgroundColor: 'var(--on-background)', color: 'var(--background)', padding: '2px 8px', fontFamily: 'var(--font-body)', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' }}>AI:</span>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: '13px', fontStyle: 'italic', color: 'var(--on-surface-variant)' }}>New thoughts are automatically classified by category and urgency.</span>
        </div>
      </section>

      {/* Stats Bar */}
      <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap', marginBottom: 'var(--space-md)' }}>
        {[
          { label: 'Total Loops', val: loops.length },
          { label: 'High Urgency', val: loops.filter(l => l.urgency === 'High').length },
          { label: 'Classified', val: loops.filter(l => l.category && l.category !== 'Classifying...').length },
        ].map(s => (
          <div key={s.label} style={{ padding: '6px 16px', border: '3px solid var(--on-background)', backgroundColor: 'var(--surface-container)', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '13px', textTransform: 'uppercase' }}>
            {s.val} {s.label}
          </div>
        ))}
      </div>

      {/* Masonry Grid */}
      {loading ? (
        <p style={{ fontFamily: 'var(--font-body)', textAlign: 'center', padding: 'var(--space-xl)', color: 'var(--on-surface-variant)' }}>Loading your loops...</p>
      ) : loops.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 'var(--space-xl)', border: '4px dashed var(--outline-variant)' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '64px', display: 'block', marginBottom: '16px', opacity: 0.3 }}>psychology_alt</span>
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '24px', textTransform: 'uppercase', marginBottom: '8px' }}>Brain Clear! 🎉</h3>
          <p style={{ fontFamily: 'var(--font-body)', color: 'var(--on-surface-variant)' }}>No open loops. Add a floating thought above to get started.</p>
        </div>
      ) : (
        <section style={{ columns: '280px', gap: 'var(--space-md)', marginBottom: 'var(--space-xl)' }}>
          {loops.map((loop, i) => (
            <div key={loop.id} style={{
              breakInside: 'avoid',
              border: '4px solid var(--on-background)',
              boxShadow: '8px 8px 0px 0px #000',
              backgroundColor: urgencyColors[loop.urgency] || 'var(--surface-container)',
              padding: 'var(--space-md)',
              marginBottom: 'var(--space-md)',
              transform: `rotate(${rotations[i % rotations.length]})`,
              transition: 'transform 0.1s, box-shadow 0.1s',
              cursor: 'pointer',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = `translateX(4px) translateY(4px) rotate(0deg)`; e.currentTarget.style.boxShadow = '4px 4px 0px 0px #000' }}
            onMouseLeave={e => { e.currentTarget.style.transform = `rotate(${rotations[i % rotations.length]})`; e.currentTarget.style.boxShadow = '8px 8px 0px 0px #000' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-sm)' }}>
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                  <span style={{ backgroundColor: 'var(--on-background)', color: 'white', padding: '2px 8px', fontFamily: 'var(--font-body)', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase' }}>{loop.category || 'Classifying...'}</span>
                  {loop.urgency && loop.urgency !== 'Classifying...' && (
                    <span style={{ backgroundColor: loop.urgency === 'High' ? 'var(--error)' : 'white', color: loop.urgency === 'High' ? 'white' : 'var(--on-background)', padding: '2px 8px', fontFamily: 'var(--font-body)', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', border: '2px solid var(--on-background)' }}>{loop.urgency}</span>
                  )}
                </div>
                <button onClick={() => completeLoop(loop.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--tertiary)' }}>check_circle</span>
                </button>
              </div>
              <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '15px', marginBottom: 'var(--space-sm)', lineHeight: 1.4 }}>"{loop.content}"</p>
              {loop.scheduled_date ? (
                <div style={{ fontSize: '11px', fontFamily: 'var(--font-body)', fontWeight: 700, color: 'var(--secondary)', textTransform: 'uppercase' }}>📅 Scheduled: {loop.scheduled_date}</div>
              ) : (
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                  {[{ label: 'Today', days: 0 }, { label: 'Tomorrow', days: 1 }, { label: 'Next Week', days: 7 }].map(s => (
                    <button key={s.label} onClick={() => scheduleLoop(loop.id, s.days)} style={{ border: '2px solid var(--on-background)', backgroundColor: 'white', padding: '2px 8px', fontFamily: 'var(--font-body)', fontSize: '10px', fontWeight: 700, cursor: 'pointer', textTransform: 'uppercase' }}>{s.label}</button>
                  ))}
                </div>
              )}
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '10px', color: 'var(--on-surface-variant)', marginTop: '8px' }}>{new Date(loop.created_at).toLocaleDateString()}</p>
            </div>
          ))}
        </section>
      )}
    </div>
  )
}
