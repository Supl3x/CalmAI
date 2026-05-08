import React from 'react'
import { Link } from 'react-router-dom'

const features = [
  { icon: 'psychology', title: 'AI Priority Engine', desc: 'Parse 100+ signals to surface only what truly matters today. Crush the noise.', color: 'var(--secondary-fixed)', link: '/priority' },
  { icon: 'wb_sunny', title: 'Daily Briefing', desc: 'Start every morning with an aggressive AI-curated briefing of your day.', color: 'var(--primary-fixed)', link: '/briefing' },
  { icon: 'auto_awesome', title: 'One-Click AI Draft', desc: 'Generate emails, articles, threads and docs in one brutal click.', color: 'var(--tertiary-fixed)', link: '/draft' },
  { icon: 'self_improvement', title: 'Calm Mode', desc: 'Deep focus timer with AI-optimized Pomodoro sessions and flow vitals.', color: 'var(--surface-container)', link: '/calm' },
  { icon: 'monitoring', title: 'Weekly Report', desc: 'High-contrast analytics on your productivity, flow time, and AI leverage.', color: 'var(--secondary-fixed)', link: '/weekly' },
  { icon: 'psychology_alt', title: 'Open Loop Cleaner', desc: 'Dump every floating thought. AI categorizes and clears your mental cache.', color: 'var(--primary-container)', link: '/open-loop' },
  { icon: 'account_tree', title: 'Micro Task Decomposer', desc: 'Feed a massive goal. Get back a brutally precise sub-task blueprint.', color: 'var(--tertiary-fixed)', link: '/micro-task' },
  { icon: 'timer', title: 'Summary & Timer', desc: 'Real-time focus sprint widget with cognitive load tracking on your dashboard.', color: 'var(--primary-fixed)', link: '/dashboard' },
]

export default function LandingPage() {
  return (
    <div style={{ backgroundColor: 'var(--background)', overflowX: 'hidden' }}>
      {/* Hero */}
      <section style={{
        minHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: 'var(--space-xl) var(--space-md)',
        position: 'relative',
      }}>
        <div style={{ maxWidth: '900px', zIndex: 10 }}>
          {/* Badge */}
          <div style={{
            display: 'inline-block',
            backgroundColor: 'var(--tertiary-fixed)',
            border: '3px solid var(--on-background)',
            boxShadow: '4px 4px 0px 0px #000',
            padding: '6px 16px',
            marginBottom: 'var(--space-md)',
            transform: 'rotate(-1deg)',
          }}>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              ⚡ AI-Powered Workflow Engine
            </span>
          </div>

          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: 'clamp(56px, 10vw, 112px)',
            lineHeight: '0.95',
            textTransform: 'uppercase',
            letterSpacing: '-0.03em',
            marginBottom: 'var(--space-md)',
          }}>
            Aggressively<br />
            <span style={{
              backgroundColor: 'var(--primary-container)',
              border: '4px solid var(--on-background)',
              boxShadow: '6px 6px 0px 0px #000',
              padding: '0 16px',
              display: 'inline-block',
            }}>
              Organized
            </span>
          </h1>

          <p style={{
            fontFamily: 'var(--font-body)',
            fontSize: '18px',
            lineHeight: '1.6',
            maxWidth: '560px',
            marginBottom: 'var(--space-lg)',
            borderLeft: '4px solid var(--tertiary-container)',
            paddingLeft: 'var(--space-sm)',
            fontStyle: 'italic',
            color: 'var(--on-surface-variant)',
          }}>
            AI that stops the chaos. Reclaim your focus with high-impact, brutalist workflows that don't apologize for efficiency.
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-md)' }}>
            <Link to="/dashboard">
              <button className="brutalist-btn" style={{
                backgroundColor: 'var(--primary)',
                color: 'var(--on-primary)',
                padding: 'var(--space-sm) var(--space-lg)',
                fontSize: '16px',
              }}>
                Launch App →
              </button>
            </Link>
            <Link to="/register">
              <button className="brutalist-btn" style={{
                backgroundColor: 'white',
                color: 'var(--on-background)',
                padding: 'var(--space-sm) var(--space-lg)',
                fontSize: '16px',
                boxShadow: '4px 4px 0px 0px #000',
              }}>
                Get Started Free
              </button>
            </Link>
          </div>
        </div>

        {/* Decorative Block */}
        <div style={{
          position: 'absolute',
          right: '5%',
          top: '50%',
          transform: 'translateY(-50%) rotate(3deg)',
          width: 'clamp(200px, 30vw, 400px)',
          height: 'clamp(200px, 30vw, 400px)',
          backgroundColor: 'var(--secondary)',
          border: '4px solid var(--on-background)',
          boxShadow: '12px 12px 0px 0px #000',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }} id="hero-deco">
          <div style={{ textAlign: 'center', color: 'white', padding: 'var(--space-md)' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '80px', marginBottom: '16px', display: 'block', color: 'var(--tertiary-fixed)' }}>psychology</span>
            <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '24px', textTransform: 'uppercase' }}>AI ENGINE</p>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', opacity: 0.8, marginTop: '8px' }}>ACTIVELY ANALYZING</p>
          </div>
        </div>

        {/* SVG Doodle */}
        <svg style={{ position: 'absolute', bottom: '40px', right: '25%', width: '120px', height: '120px', color: 'var(--tertiary-container)', opacity: 0.4, pointerEvents: 'none' }} viewBox="0 0 100 100">
          <path d="M10,10 Q50,90 90,10" fill="none" stroke="currentColor" strokeDasharray="8,8" strokeWidth="4" />
        </svg>

        <style>{`
          @media (max-width: 768px) { #hero-deco { display: none !important; } }
        `}</style>
      </section>

      {/* Features Section */}
      <section style={{
        padding: 'var(--space-xl) var(--space-md)',
        backgroundColor: 'var(--surface-container)',
        borderTop: '4px solid var(--on-background)',
        borderBottom: '4px solid var(--on-background)',
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-lg)' }}>
            <div style={{ flex: 1, height: '4px', backgroundColor: 'var(--on-background)' }} />
            <h2 style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: 'clamp(28px, 5vw, 48px)',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
            }}>8 Core Engines</h2>
            <div style={{ flex: 1, height: '4px', backgroundColor: 'var(--on-background)' }} />
          </div>

          {/* Feature Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 'var(--space-md)',
          }}>
            {features.map((f, i) => (
              <Link key={f.link} to={f.link} style={{ textDecoration: 'none' }}>
                <div
                  className="brutalist-card"
                  style={{
                    backgroundColor: f.color,
                    padding: 'var(--space-md)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--space-xs)',
                    transform: `rotate(${['-1deg', '1.5deg', '-0.5deg', '1deg'][i % 4]})`,
                    cursor: 'pointer',
                    minHeight: '180px',
                  }}
                >
                  <div style={{
                    width: '52px',
                    height: '52px',
                    backgroundColor: 'var(--on-background)',
                    border: '3px solid var(--on-background)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '4px',
                  }}>
                    <span className="material-symbols-outlined" style={{ color: 'white', fontSize: '28px' }}>{f.icon}</span>
                  </div>
                  <h3 style={{
                    fontFamily: 'var(--font-display)',
                    fontWeight: 700,
                    fontSize: '18px',
                    textTransform: 'uppercase',
                    borderBottom: '3px solid var(--on-background)',
                    paddingBottom: '6px',
                  }}>{f.title}</h3>
                  <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', lineHeight: '1.5', color: 'var(--on-surface-variant)' }}>{f.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section style={{
        padding: 'var(--space-xl) var(--space-md)',
        backgroundColor: 'var(--background)',
      }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: 'clamp(28px, 5vw, 48px)',
            textTransform: 'uppercase',
            marginBottom: 'var(--space-xl)',
          }}>The Taming of Chaos</h2>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 'var(--space-lg)',
            alignItems: 'center',
          }}>
            {[
              { num: '01', title: 'Connect', desc: 'Dump all your fragmented tools into the engine.' },
              { num: '02', title: 'Process', desc: 'AI strips away the noise and builds the grid.', color: 'var(--tertiary-container)', textColor: 'var(--on-tertiary-container)' },
              { num: '03', title: 'Execute', desc: 'Flow through tasks with absolute certainty.', color: 'var(--primary-container)', textColor: 'var(--on-primary-container)' },
            ].map((step, i) => (
              <div key={step.num} style={{
                backgroundColor: step.color || 'var(--background)',
                color: step.textColor || 'var(--on-background)',
                border: '4px solid var(--on-background)',
                boxShadow: '6px 6px 0px 0px #000',
                padding: 'var(--space-sm)',
                textAlign: 'center',
                transform: i === 1 ? 'translateY(16px)' : 'none',
              }}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '48px', fontWeight: 700, display: 'block', marginBottom: '8px' }}>{step.num}</span>
                <h4 style={{ fontFamily: 'var(--font-body)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px', fontSize: '14px' }}>{step.title}</h4>
                <p style={{ fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 700, letterSpacing: '0.05em' }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section style={{ padding: 'var(--space-md)', backgroundColor: 'var(--background)', marginBottom: 'var(--space-lg)' }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          backgroundColor: 'var(--on-background)',
          color: 'var(--background)',
          border: '4px solid var(--on-background)',
          boxShadow: '8px 8px 0px 0px #000',
          padding: 'var(--space-lg)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 'var(--space-md)',
        }}>
          <div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'clamp(28px, 5vw, 52px)', textTransform: 'uppercase', lineHeight: 1, marginBottom: 'var(--space-sm)' }}>
              Enough Noise.<br />More Flow.
            </h2>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '16px', opacity: 0.8, borderLeft: '4px solid var(--primary)', paddingLeft: '12px' }}>
              Join 50,000+ aggressively organized humans who mastered the flow.
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)', alignItems: 'center' }}>
            <Link to="/register">
              <button className="brutalist-btn" style={{
                backgroundColor: 'var(--tertiary-container)',
                color: 'var(--on-tertiary-container)',
                border: '4px solid var(--background)',
                padding: 'var(--space-sm) var(--space-xl)',
                fontSize: '16px',
              }}>
                Get Started
              </button>
            </Link>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.5, fontStyle: 'italic' }}>
              Free Forever for Solo Pilots
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        backgroundColor: 'var(--surface)',
        borderTop: '4px solid var(--on-background)',
        padding: 'var(--space-lg) var(--space-md)',
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 'var(--space-lg)', marginBottom: 'var(--space-md)' }}>
          <div>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '18px', textTransform: 'uppercase', display: 'block', marginBottom: 'var(--space-sm)' }}>CalmFlow AI</span>
            <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--on-surface-variant)' }}>Built for the organized few. Designed to dismantle chaos.</p>
          </div>
          {[{ title: 'Product', links: ['Workflows', 'Integrations', 'API Docs'] }, { title: 'Support', links: ['Manifesto', 'System Status', 'Contact'] }].map(col => (
            <div key={col.title}>
              <h5 style={{ fontFamily: 'var(--font-body)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 'var(--space-sm)', borderBottom: '2px solid var(--on-background)', display: 'inline-block' }}>{col.title}</h5>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {col.links.map(l => <li key={l}><a href="#" style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: 'var(--on-surface)', textDecoration: 'none' }}>{l}</a></li>)}
              </ul>
            </div>
          ))}
        </div>
        <div style={{ borderTop: '2px solid var(--on-background)', paddingTop: 'var(--space-md)', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', textTransform: 'uppercase', opacity: 0.6 }}>© 2025 CalmFlow AI. All rights surrendered to the flow.</p>
          <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
            {['Privacy', 'Terms', 'Cookies'].map(l => <a key={l} href="#" style={{ fontFamily: 'var(--font-body)', fontSize: '11px', textTransform: 'uppercase', opacity: 0.6, textDecoration: 'none' }}>{l}</a>)}
          </div>
        </div>
      </footer>
    </div>
  )
}
