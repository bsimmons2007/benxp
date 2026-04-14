import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { BottomNav } from './components/layout/BottomNav'
import { SideNav } from './components/layout/SideNav'
import { Home } from './pages/Home'
import { Records } from './pages/Records'
import { Challenges } from './pages/Challenges'
import { Books } from './pages/Books'
import { Sleep } from './pages/Sleep'
import { Skate } from './pages/Skate'
import { Fortnite } from './pages/Fortnite'
import { More } from './pages/More'
import { Settings } from './pages/Settings'
import { Login } from './pages/Login'
import { Profile } from './pages/Profile'
import { Weekly } from './pages/Weekly'
import { Monthly } from './pages/Monthly'
import { Mood } from './pages/Mood'
import { DevSettings } from './pages/DevSettings'
import { ShareCard } from './pages/ShareCard'
import { XPHistory } from './pages/XPHistory'
import { Goals } from './pages/Goals'
import { Cardio } from './pages/Cardio'
import { Water } from './pages/Water'
import { PRFeed } from './pages/PRFeed'
import { Strength } from './pages/Strength'
import { Measurements } from './pages/Measurements'
import { ResetPassword } from './pages/ResetPassword'
import { Basketball } from './pages/Basketball'
import { LevelUpOverlay } from './components/ui/LevelUpOverlay'
import { applyTimeOrSavedTheme } from './lib/theme'
import { useAuth } from './hooks/useAuth'

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session, loading, error } = useAuth()
  if (loading) {
    return (
      <div style={{ background: 'var(--base-bg)', minHeight: '100dvh' }} />
    )
  }
  if (error || !session) return <Navigate to="/login" replace />
  return <>{children}</>
}

function AppInner() {
  const location = useLocation()
  const showNav = location.pathname !== '/login' && location.pathname !== '/reset-password'

  return (
    <>
      <LevelUpOverlay />
      <Routes>
        <Route path="/login"         element={<Login />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/"           element={<ProtectedRoute><Home /></ProtectedRoute>} />
        <Route path="/lifting"    element={<ProtectedRoute><Records /></ProtectedRoute>} />
        <Route path="/records"    element={<Navigate to="/lifting" replace />} />
        <Route path="/challenges" element={<ProtectedRoute><Challenges /></ProtectedRoute>} />
        <Route path="/books"      element={<ProtectedRoute><Books /></ProtectedRoute>} />
        <Route path="/sleep"      element={<ProtectedRoute><Sleep /></ProtectedRoute>} />
        <Route path="/skate"      element={<ProtectedRoute><Skate /></ProtectedRoute>} />
        <Route path="/fortnite"   element={<ProtectedRoute><Fortnite /></ProtectedRoute>} />
        <Route path="/more"       element={<ProtectedRoute><More /></ProtectedRoute>} />
        <Route path="/settings"   element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="/profile"    element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/weekly"     element={<ProtectedRoute><Weekly /></ProtectedRoute>} />
        <Route path="/monthly"    element={<ProtectedRoute><Monthly /></ProtectedRoute>} />
        <Route path="/mood"       element={<ProtectedRoute><Mood /></ProtectedRoute>} />
        <Route path="/dev"        element={<ProtectedRoute><DevSettings /></ProtectedRoute>} />
        <Route path="/share"      element={<ProtectedRoute><ShareCard /></ProtectedRoute>} />
        <Route path="/xp-history" element={<ProtectedRoute><XPHistory /></ProtectedRoute>} />
        <Route path="/goals"      element={<ProtectedRoute><Goals /></ProtectedRoute>} />
        <Route path="/cardio"     element={<ProtectedRoute><Cardio /></ProtectedRoute>} />
        <Route path="/water"      element={<ProtectedRoute><Water /></ProtectedRoute>} />
        <Route path="/pr-feed"    element={<ProtectedRoute><PRFeed /></ProtectedRoute>} />
        <Route path="/strength"      element={<ProtectedRoute><Strength /></ProtectedRoute>} />
        <Route path="/measurements" element={<ProtectedRoute><Measurements /></ProtectedRoute>} />
        <Route path="/basketball"   element={<ProtectedRoute><Basketball /></ProtectedRoute>} />
      </Routes>
      {showNav && <BottomNav />}
      {showNav && <SideNav />}

    </>
  )
}

export default function App() {
  useEffect(() => {
    applyTimeOrSavedTheme()

    let id: ReturnType<typeof setInterval> | null = null

    function startTimer() {
      if (id === null) id = setInterval(applyTimeOrSavedTheme, 60_000)
    }
    function stopTimer() {
      if (id !== null) { clearInterval(id); id = null }
    }
    function onVisibilityChange() {
      if (document.hidden) stopTimer()
      else { applyTimeOrSavedTheme(); startTimer() }
    }

    document.addEventListener('visibilitychange', onVisibilityChange)
    if (!document.hidden) startTimer()

    return () => {
      stopTimer()
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [])

  return (
    <BrowserRouter>
      <AppInner />
    </BrowserRouter>
  )
}
