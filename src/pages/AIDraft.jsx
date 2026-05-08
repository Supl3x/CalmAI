import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'

// Groq call moved to Edge Function

const draftTypes = [
  { icon: 'alternate_email', title: 'Email', desc: 'High-conversion outreach.', color: 'var(--tertiary-fixed)', value: 'email' },
  { icon: 'article', title: 'Report', desc: 'Structured business reports.', color: 'var(--surface-container-low)', value: 'report' },
  { icon: 'chat', title: 'Message', desc: 'Direct communication drafts.', color: 'var(--primary-fixed)', value: 'message' },
  { icon: 'school', title: 'Study Note', desc: 'Academic & research notes.', color: 'var(--secondary-fixed)', value: 'study_note' },
]
const tones = ['formal', 'friendly', 'academic', 'assertive']

export default function AIDraft() {
  const { user } = useAuth()
  const [selected, setSelected] = useState(0)
  const [tone, setTone] = useState('formal')
  const [contextInput, setContextInput] = useState('')
  const [generated, setGenerated] = useState('')
  const [status, setStatus] = useState('idle') // idle | loading | success | error
  const [draftHistory, setDraftHistory] = useState([])
  const [currentDraftId, setCurrentDraftId] = useState(null)
  
  const [recentEmails, setRecentEmails] = useState([])
  const [selectedThread, setSelectedThread] = useState(null)
  const [recipientEmail, setRecipientEmail] = useState('')
  const [draftSubject, setDraftSubject] = useState('')
  const [sending, setSending] = useState(false)

  const loadRecentEmails = async () => {
    const { data, error } = await supabase.functions.invoke('fetch-gmail-threads', {
      body: { userId: user.id, maxResults: 8 }
    })
    if (error || data?.needsReauth) {
      console.warn('Gmail not connected:', error?.message || data?.error)
      setRecentEmails([])
      return
    }
    setRecentEmails(data?.emails ?? [])
  }

  useEffect(() => {
    if (draftTypes[selected].value === 'email') loadRecentEmails()
  }, [selected])

  useEffect(() => {
    if (!user) return
    supabase.from('drafts').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10)
      .then(({ data }) => setDraftHistory(data ?? []))
  }, [user?.id])

  const handleGenerate = async () => {
    if (!contextInput.trim()) return
    setStatus('loading')
    setGenerated('')

    const draftType = draftTypes[selected].value

    try {
      const { data: resData, error: invokeError } = await supabase.functions.invoke('generate-draft', {
        body: {
          userId: user.id,
          draftType,
          tone,
          contextInput,
          threadId: draftType === 'email' ? selectedThread?.id : null
        }
      })

      if (invokeError) throw invokeError

      const content = resData.content
      setGenerated(content)

      // Save to Supabase
      const { data } = await supabase.from('drafts').insert({
        user_id: user.id,
        draft_type: draftType,
        tone,
        context_input: contextInput,
        generated_content: content,
      }).select().single()

      if (data) {
        setCurrentDraftId(data.id)
        setDraftHistory(prev => [data, ...prev])
      }
      setStatus('success')
    } catch (e) {
      console.error('Draft error:', e)
      setStatus('error')
    }
  }

  const loadDraft = (draft) => {
    setContextInput(draft.context_input)
    setGenerated(draft.generated_content)
    setTone(draft.tone)
    setSelected(draftTypes.findIndex(d => d.value === draft.draft_type))
    setCurrentDraftId(draft.id)
    setStatus('success')
  }

  const deleteDraft = async (id) => {
    await supabase.from('drafts').delete().eq('id', id)
    setDraftHistory(prev => prev.filter(d => d.id !== id))
    if (currentDraftId === id) { setGenerated(''); setStatus('idle'); setCurrentDraftId(null) }
  }

  const copyToClipboard = () => { navigator.clipboard.writeText(generated) }

  const handleSendViaGmail = async () => {
    if (!recipientEmail || !generated || !draftSubject) return
    setSending(true)
    const { data } = await supabase.functions.invoke('send-gmail-draft', {
      body: {
        userId: user.id,
        to: recipientEmail,
        subject: draftSubject,
        body: generated,
        threadId: selectedThread?.id ?? null,
      }
    })
    if (data?.success) {
      alert('Email sent via Gmail!')
    } else {
      alert('Failed to send: ' + (data?.error || 'Unknown error'))
    }
    setSending(false)
  }

  return (
    <div style={{ padding: 'var(--space-md)', maxWidth: '1200px', margin: '0 auto' }}>
      <section style={{ marginBottom: 'var(--space-lg)' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'clamp(28px,5vw,56px)', textTransform: 'uppercase', letterSpacing: '-0.02em' }}>
          ONE-CLICK <span style={{ backgroundColor: 'var(--primary-container)', border: '2px solid var(--on-background)', padding: '0 8px' }}>AI DRAFT</span>
        </h1>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '16px', color: 'var(--on-surface-variant)', marginTop: '8px' }}>Powered by Groq AI · Drafts saved automatically to your account.</p>
      </section>

      {/* Type Selector */}
      <section style={{ marginBottom: 'var(--space-lg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 'var(--space-sm)' }}>
          <span style={{ backgroundColor: 'var(--on-background)', color: 'var(--background)', fontWeight: 700, padding: '2px 10px', fontFamily: 'var(--font-display)', fontSize: '16px' }}>01</span>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '24px', textTransform: 'uppercase' }}>SELECT TYPE</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px,1fr))', gap: 'var(--space-sm)' }}>
          {draftTypes.map((dt, i) => (
            <button key={i} onClick={() => setSelected(i)} style={{ backgroundColor: dt.color, border: selected === i ? '4px solid var(--primary)' : '4px solid var(--on-background)', boxShadow: selected === i ? '8px 8px 0px 0px var(--primary)' : '8px 8px 0px 0px #000', padding: 'var(--space-sm)', cursor: 'pointer', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '8px', transition: 'all 0.1s' }}>
              <div style={{ width: '40px', height: '40px', backgroundColor: 'var(--on-background)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="material-symbols-outlined" style={{ color: 'white', fontSize: '20px' }}>{dt.icon}</span>
              </div>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '16px', textTransform: 'uppercase' }}>{dt.title}</span>
              <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', color: 'var(--on-surface-variant)' }}>{dt.desc}</p>
            </button>
          ))}
        </div>
      </section>

      {/* Input + Preview */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px,1fr))', gap: 'var(--space-md)', alignItems: 'start' }}>
        {/* Left: Input */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ backgroundColor: 'var(--on-background)', color: 'var(--background)', fontWeight: 700, padding: '2px 10px', fontFamily: 'var(--font-display)', fontSize: '16px' }}>02</span>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '24px', textTransform: 'uppercase' }}>CONTEXT + TONE</h2>
          </div>
          <div className="brutalist-card" style={{ backgroundColor: 'var(--surface)', padding: 'var(--space-md)', display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              {tones.map(t => (
                <button key={t} onClick={() => setTone(t)} style={{ border: '2px solid var(--on-background)', padding: '4px 12px', backgroundColor: tone === t ? 'var(--on-background)' : 'white', color: tone === t ? 'white' : 'var(--on-background)', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', cursor: 'pointer' }}>
                  {t}
                </button>
              ))}
            </div>
            <textarea
              value={contextInput}
              onChange={e => setContextInput(e.target.value)}
              placeholder="What are we drafting? Be specific..."
              style={{ fontFamily: 'var(--font-body)', fontSize: '14px', width: '100%', height: '140px', backgroundColor: 'white', border: '4px solid var(--on-background)', padding: 'var(--space-sm)', resize: 'vertical', outline: 'none' }}
              onFocus={e => e.target.style.backgroundColor = 'var(--tertiary-fixed-dim)'}
              onBlur={e => e.target.style.backgroundColor = 'white'}
            />
            {draftTypes[selected].value === 'email' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700 }}>Reply Context (Optional)</span>
                <select
                  value={selectedThread?.id || ''}
                  onChange={e => setSelectedThread(recentEmails.find(m => m.id === e.target.value) || null)}
                  style={{ fontFamily: 'var(--font-body)', fontSize: '13px', padding: 'var(--space-xs)', border: '2px solid var(--on-background)', width: '100%' }}
                >
                  <option value="">-- Do not reply to thread --</option>
                  {recentEmails.map(e => (
                    <option key={e.id} value={e.id}>Re: {e.subject} ({e.from})</option>
                  ))}
                </select>
                {selectedThread && (
                  <div style={{ backgroundColor: 'var(--tertiary-fixed)', border: '2px solid var(--on-background)', padding: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--primary)' }}>check_circle</span>
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: '11px', fontWeight: 700 }}>
                      AI will read the original email and generate a contextual reply
                    </span>
                  </div>
                )}
              </div>
            )}
            <button className="brutalist-btn" onClick={handleGenerate} disabled={status === 'loading' || !contextInput.trim()} style={{ backgroundColor: status === 'loading' ? 'var(--outline-variant)' : 'var(--tertiary-container)', color: 'var(--on-tertiary-container)', padding: '12px', fontSize: '14px', cursor: status === 'loading' ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <span className="material-symbols-outlined">{status === 'loading' ? 'hourglass_empty' : 'auto_awesome'}</span>
              {status === 'loading' ? 'GENERATING...' : 'GENERATE NOW'}
            </button>
          </div>

          {/* Draft History */}
          {draftHistory.length > 0 && (
            <div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '16px', textTransform: 'uppercase', marginBottom: '8px' }}>Recent Drafts</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '200px', overflowY: 'auto' }}>
                {draftHistory.map((d) => (
                  <div key={d.id} style={{ backgroundColor: 'white', border: '2px solid var(--on-background)', padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                    onClick={() => loadDraft(d)}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--surface-variant)'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'white'}>
                    <div>
                      <p style={{ fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: '13px', textTransform: 'uppercase' }}>{d.draft_type} · {d.tone}</p>
                      <p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', color: 'var(--outline)' }}>{new Date(d.created_at).toLocaleDateString()}</p>
                    </div>
                    <button onClick={e => { e.stopPropagation(); deleteDraft(d.id) }} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--outline)' }}>delete</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Preview */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ backgroundColor: 'var(--on-background)', color: 'var(--background)', fontWeight: 700, padding: '2px 10px', fontFamily: 'var(--font-display)', fontSize: '16px' }}>03</span>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '24px', textTransform: 'uppercase' }}>LIVE PREVIEW</h2>
          </div>
          {draftTypes[selected].value === 'email' && generated && (
            <div style={{ display: 'flex', gap: '8px', marginBottom: '-8px' }}>
              <input type="text" placeholder="Recipient Email" value={recipientEmail} onChange={e => setRecipientEmail(e.target.value)} style={{ flex: 1, padding: '6px', fontFamily: 'var(--font-body)', fontSize: '13px', border: '2px solid var(--on-background)' }} />
              <input type="text" placeholder="Subject" value={draftSubject} onChange={e => setDraftSubject(e.target.value)} style={{ flex: 1, padding: '6px', fontFamily: 'var(--font-body)', fontSize: '13px', border: '2px solid var(--on-background)' }} />
            </div>
          )}
          <div className="brutalist-card" style={{ height: '480px', backgroundColor: 'white', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ backgroundColor: 'var(--on-background)', padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '6px' }}>
                {['var(--error)', 'var(--tertiary)', 'var(--secondary)'].map((c, i) => (
                  <div key={i} style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: c, border: '1px solid var(--on-background)' }} />
                ))}
              </div>
              {generated && (
                <div style={{ display: 'flex', gap: '8px' }}>
                  {draftTypes[selected].value === 'email' && (
                    <button onClick={handleSendViaGmail} disabled={sending || !recipientEmail || !draftSubject} style={{ fontFamily: 'var(--font-body)', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', background: 'var(--primary)', border: 'none', color: 'white', cursor: sending ? 'not-allowed' : 'pointer', padding: '2px 8px' }}>{sending ? 'Sending...' : 'Send via Gmail'}</button>
                  )}
                  <button onClick={copyToClipboard} style={{ fontFamily: 'var(--font-body)', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', background: 'none', border: 'none', color: 'var(--background)', cursor: 'pointer' }}>Copy</button>
                </div>
              )}
            </div>
            <div style={{ flex: 1, padding: 'var(--space-md)', fontFamily: 'var(--font-body)', fontSize: '13px', overflowY: 'auto', lineHeight: 1.7 }}>
              {status === 'loading' ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '16px' }}>
                  <div style={{ width: '40px', height: '40px', border: '4px solid var(--on-background)', borderTop: '4px solid var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, textTransform: 'uppercase' }}>Generating...</p>
                </div>
              ) : status === 'error' ? (
                <p style={{ color: 'var(--error)', fontStyle: 'italic' }}>AI unavailable. Please try again.</p>
              ) : generated ? (
                <div style={{ whiteSpace: 'pre-wrap' }}>{generated}</div>
              ) : (
                <p style={{ color: 'var(--outline)', fontStyle: 'italic' }}>Your generated draft will appear here...</p>
              )}
            </div>
          </div>
        </div>
      </section>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
