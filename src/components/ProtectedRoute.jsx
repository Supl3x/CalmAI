import React from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--background)',
        flexDirection: 'column',
        gap: '16px',
      }}>
        <div style={{
          width: '60px',
          height: '60px',
          border: '4px solid var(--on-background)',
          borderTop: '4px solid var(--primary)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '16px', textTransform: 'uppercase' }}>
          Loading Flow...
        </p>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />
  // If used as wrapper with children (like AppLayout)
  return children ? children : <Outlet />
}
