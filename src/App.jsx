import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ErrorBoundary from './components/ErrorBoundary'
import ProtectedRoute from './components/ProtectedRoute'
import AppLayout from './components/layout/AppLayout'
import PublicLayout from './components/layout/PublicLayout'
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import AuthCallback from './pages/AuthCallback'
import Dashboard from './pages/Dashboard'
import PriorityEngine from './pages/PriorityEngine'
import DailyBriefing from './pages/DailyBriefing'
import AIDraft from './pages/AIDraft'
import CalmMode from './pages/CalmMode'
import WeeklyReport from './pages/WeeklyReport'
import OpenLoopCleaner from './pages/OpenLoopCleaner'
import MicroTaskDecomposer from './pages/MicroTaskDecomposer'

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Auth Callback */}
            <Route path="/auth/callback" element={<AuthCallback />} />

            {/* Public Routes */}
            <Route element={<PublicLayout />}>
              <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
          </Route>

          {/* Protected App Routes */}
          <Route element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/priority" element={<PriorityEngine />} />
            <Route path="/briefing" element={<DailyBriefing />} />
            <Route path="/draft" element={<AIDraft />} />
            <Route path="/calm" element={<CalmMode />} />
            <Route path="/weekly" element={<WeeklyReport />} />
            <Route path="/open-loop" element={<OpenLoopCleaner />} />
            <Route path="/micro-task" element={<MicroTaskDecomposer />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
    </ErrorBoundary>
  )
}
