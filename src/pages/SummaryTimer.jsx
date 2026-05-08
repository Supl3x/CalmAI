import React, { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { Link } from 'react-router-dom'

export default function SummaryTimer() {
  const { user } = useAuth()
  const [inputText, setInputText] = useState('')
  const [recentEmails, setRecentEmails] = useState([])
  const [driveFiles, setDriveFiles] = useState([])
  const [showDrivePicker, setShowDrivePicker] = useState(false)
  const [showEmailPicker, setShowEmailPicker] = useState(false)
  const [summary, setSummary] = useState('')

  const loadEmailsForSummary = async () => {
    const { data } = await supabase.functions.invoke('fetch-gmail-threads', {
      body: { userId: user.id, maxResults: 5 }
    })
    setRecentEmails(data?.emails ?? [])
    setShowEmailPicker(true)
  }

  const importEmailBody = async (messageId) => {
    const { data } = await supabase.functions.invoke('fetch-email-body', {
      body: { userId: user.id, messageId }
    })
    setInputText(data?.body ?? '')
    setShowEmailPicker(false)
  }

  const loadDriveFiles = async () => {
    const { data } = await supabase.functions.invoke('list-drive-files', { body: { userId: user.id } })
    setDriveFiles(data?.files ?? [])
    setShowDrivePicker(true)
  }

  const importDriveDocForSummary = async (fileId) => {
    const { data } = await supabase.functions.invoke('fetch-drive-doc', {
      body: { userId: user.id, fileId }
    })
    setInputText(data?.content ?? '')
    setShowDrivePicker(false)
  }

  return (
    <div style={{ padding: 'var(--space-md)', maxWidth: '1200px', margin: '0 auto' }}>
      <section style={{ marginBottom: 'var(--space-lg)' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'clamp(28px,5vw,56px)', textTransform: 'uppercase', letterSpacing: '-0.02em' }}>
          SUMMARY + <span style={{ color: 'var(--primary)' }}>TIMER</span>
        </h1>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '16px', color: 'var(--on-surface-variant)', marginTop: '8px' }}>Import content to summarize or set a timer for deep focus.</p>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--space-md)' }}>
        <div className="brutalist-card" style={{ backgroundColor: 'white', padding: 'var(--space-md)' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '20px', marginBottom: '8px' }}>Content Summarizer</h2>
          
          <div style={{ display: 'flex', gap: '8px', marginBottom: 'var(--space-md)' }}>
            <button onClick={loadEmailsForSummary} style={{ background: 'none', border: '2px solid var(--on-background)', padding: '4px 12px', fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
              📧 Pick from Gmail
            </button>
            <button onClick={loadDriveFiles} style={{ background: 'none', border: '2px solid var(--on-background)', padding: '4px 12px', fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
              📄 Pick from Drive
            </button>
          </div>

          {showEmailPicker && (
            <div style={{ border: '2px solid var(--on-background)', padding: '8px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontWeight: 700, fontSize: '12px' }}>Select an Email</span>
                <button onClick={() => setShowEmailPicker(false)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}>Close</button>
              </div>
              {recentEmails.map(e => (
                <button key={e.id} onClick={() => importEmailBody(e.id)} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '4px', border: '1px solid var(--outline)', marginBottom: '4px', cursor: 'pointer', fontSize: '12px' }}>
                  {e.subject} ({e.from})
                </button>
              ))}
            </div>
          )}

          {showDrivePicker && (
            <div style={{ border: '2px solid var(--on-background)', padding: '8px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontWeight: 700, fontSize: '12px' }}>Select a Document</span>
                <button onClick={() => setShowDrivePicker(false)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}>Close</button>
              </div>
              {driveFiles.map(f => (
                <button key={f.id} onClick={() => importDriveDocForSummary(f.id)} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '4px', border: '1px solid var(--outline)', marginBottom: '4px', cursor: 'pointer', fontSize: '12px' }}>
                  {f.name}
                </button>
              ))}
            </div>
          )}

          <textarea
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            placeholder="Content to summarize..."
            style={{ width: '100%', height: '150px', padding: '8px', border: '4px solid var(--on-background)', resize: 'vertical', fontFamily: 'var(--font-body)' }}
          />
        </div>

        <div className="brutalist-card" style={{ backgroundColor: 'var(--primary-container)', padding: 'var(--space-md)' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '20px', marginBottom: '8px', color: 'var(--on-primary-container)' }}>Focus Timer</h2>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', marginBottom: '16px' }}>Launch calm mode to start your deep work session.</p>
          <Link to="/calm">
            <button className="brutalist-btn" style={{ backgroundColor: 'var(--on-background)', color: 'white', padding: '8px 16px', fontSize: '14px' }}>
              Launch Calm Mode
            </button>
          </Link>
        </div>
      </div>
    </div>
  )
}
