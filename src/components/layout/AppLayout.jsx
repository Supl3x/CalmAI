import React, { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'
import Sidebar from './Sidebar'
import Footer from './Footer'

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content offset for navbar + sidebar */}
      <main style={{
        flex: 1,
        marginTop: '72px',
        marginLeft: '256px',
        minHeight: 'calc(100vh - 72px)',
        backgroundColor: 'var(--background)',
      }} id="app-main">
        <Outlet />
      </main>

      <div style={{ marginLeft: '256px' }}>
        <Footer />
      </div>

      <style>{`
        @media (max-width: 1023px) {
          #app-main, #app-main + div {
            margin-left: 0 !important;
          }
        }
      `}</style>
    </div>
  )
}
