import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { BottomNav } from './components/layout/BottomNav'
import { Home } from './pages/Home'
import { Log } from './pages/Log'
import { Records } from './pages/Records'
import { Challenges } from './pages/Challenges'
import { Books } from './pages/Books'
import { Sleep } from './pages/Sleep'
import { More } from './pages/More'
import { Settings } from './pages/Settings'
import { Login } from './pages/Login'
import { loadTheme, applyTheme } from './lib/theme'
import { useAuth } from './hooks/useAuth'

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth()
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--base-bg)' }}>
        <p className="text-2xl font-bold glow-pulse" style={{ color: 'var(--accent)', fontFamily: 'Cinzel, serif' }}>BenXP</p>
      </div>
    )
  }
  if (!session) return <Navigate to="/login" replace />
  return <>{children}</>
}

function AppInner() {
  const location = useLocation()
  const showNav = location.pathname !== '/login'

  return (
    <>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
        <Route path="/log" element={<ProtectedRoute><Log /></ProtectedRoute>} />
        <Route path="/records" element={<ProtectedRoute><Records /></ProtectedRoute>} />
        <Route path="/challenges" element={<ProtectedRoute><Challenges /></ProtectedRoute>} />
        <Route path="/books" element={<ProtectedRoute><Books /></ProtectedRoute>} />
        <Route path="/sleep" element={<ProtectedRoute><Sleep /></ProtectedRoute>} />
        <Route path="/more" element={<ProtectedRoute><More /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      </Routes>
      {showNav && <BottomNav />}
    </>
  )
}

export default function App() {
  useEffect(() => {
    applyTheme(loadTheme())
  }, [])

  return (
    <BrowserRouter>
      <AppInner />
    </BrowserRouter>
  )
}
