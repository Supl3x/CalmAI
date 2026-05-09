import React from 'react'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    this.setState({
      error,
      errorInfo
    })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'var(--background)',
          padding: 'var(--space-md)'
        }}>
          <div style={{
            maxWidth: '600px',
            backgroundColor: 'var(--error-container)',
            border: '4px solid var(--error)',
            padding: 'var(--space-lg)',
            boxShadow: '8px 8px 0px 0px #000'
          }}>
            <h1 style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: '32px',
              textTransform: 'uppercase',
              color: 'var(--error)',
              marginBottom: 'var(--space-md)'
            }}>
              ⚠️ Something Went Wrong
            </h1>
            <p style={{
              fontFamily: 'var(--font-body)',
              fontSize: '16px',
              color: 'var(--on-error-container)',
              marginBottom: 'var(--space-md)',
              lineHeight: 1.6
            }}>
              The application encountered an unexpected error. This might be due to:
            </p>
            <ul style={{
              fontFamily: 'var(--font-body)',
              fontSize: '14px',
              color: 'var(--on-error-container)',
              marginBottom: 'var(--space-md)',
              paddingLeft: '20px'
            }}>
              <li>Session expired - try signing out and back in</li>
              <li>Network connection issues</li>
              <li>Database connection problems</li>
              <li>Google API rate limiting</li>
            </ul>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button
                onClick={() => window.location.reload()}
                className="brutalist-btn"
                style={{
                  backgroundColor: 'var(--primary)',
                  color: 'white',
                  padding: 'var(--space-sm) var(--space-md)',
                  fontSize: '14px'
                }}
              >
                Reload Page
              </button>
              <button
                onClick={() => window.location.href = '/login'}
                className="brutalist-btn"
                style={{
                  backgroundColor: 'var(--secondary)',
                  color: 'var(--on-secondary)',
                  padding: 'var(--space-sm) var(--space-md)',
                  fontSize: '14px'
                }}
              >
                Go to Login
              </button>
            </div>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details style={{
                marginTop: 'var(--space-md)',
                padding: 'var(--space-sm)',
                backgroundColor: 'rgba(0,0,0,0.1)',
                border: '2px solid var(--error)',
                fontFamily: 'monospace',
                fontSize: '12px'
              }}>
                <summary style={{ cursor: 'pointer', fontWeight: 700 }}>
                  Error Details (Development Only)
                </summary>
                <pre style={{ marginTop: '8px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
