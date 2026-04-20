import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
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
import { Hobbies } from './pages/Hobbies'
import { Pickleball } from './pages/Pickleball'
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

// ── Keyboard shortcuts ────────────────────────────────────────────────────────
// N = new workout log  |  G = goals  |  H = home  |  ? = show help

const SHORTCUTS: { key: string; path: string; label: string }[] = [
  { key: 'n', path: '/lifting',  label: 'N — New Workout'  },
  { key: 'g', path: '/goals',    label: 'G — Goals'        },
  { key: 'h', path: '/',         label: 'H — Home'         },
]

function useKeyboardShortcuts() {
  const navigate = useNavigate()
  const [helpVisible, setHelpVisible] = useState(false)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // Ignore when typing in inputs
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (e.target as HTMLElement).isContentEditable) return
      if (e.metaKey || e.ctrlKey || e.altKey) return

      if (e.key === '?') { setHelpVisible(h => !h); return }
      if (e.key === 'Escape') { setHelpVisible(false); return }

      const sc = SHORTCUTS.find(s => s.key === e.key.toLowerCase())
      if (sc) { navigate(sc.path); setHelpVisible(false) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navigate])

  return { helpVisible, setHelpVisible }
}

function ShortcutHelp({ onClose }: { onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="pop-in"
        style={{
          background: 'rgba(12,16,36,0.98)', border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 16, padding: '20px 24px', minWidth: 220,
          boxShadow: '0 20px 60px rgba(0,0,0,0.7)',
        }}
      >
        <p style={{ color: '#aaa', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 12, fontFamily: 'Cinzel, serif' }}>
          Keyboard Shortcuts
        </p>
        {SHORTCUTS.map(s => (
          <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <kbd style={{
              display: 'inline-block', width: 24, height: 24, lineHeight: '24px', textAlign: 'center',
              borderRadius: 5, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
              color: 'var(--accent)', fontSize: 12, fontWeight: 700, fontFamily: 'monospace', flexShrink: 0,
            }}>
              {s.key.toUpperCase()}
            </kbd>
            <span style={{ fontSize: 13, color: '#ccc' }}>{s.label.split(' — ')[1]}</span>
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '6px 0' }}>
          <kbd style={{
            display: 'inline-block', width: 24, height: 24, lineHeight: '24px', textAlign: 'center',
            borderRadius: 5, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)',
            color: '#888', fontSize: 11, fontWeight: 700, fontFamily: 'monospace', flexShrink: 0,
          }}>?</kbd>
          <span style={{ fontSize: 13, color: '#888' }}>Toggle this help</span>
        </div>
        <button
          onClick={onClose}
          style={{ marginTop: 14, width: '100%', padding: '8px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: '#888', cursor: 'pointer', fontSize: 12 }}
        >
          Close (Esc)
        </button>
      </div>
    </div>
  )
}

function AppInner() {
  const location = useLocation()
  const showNav = location.pathname !== '/login' && location.pathname !== '/reset-password'
  const { helpVisible, setHelpVisible } = useKeyboardShortcuts()

  return (
    <>
      <LevelUpOverlay />
      {helpVisible && <ShortcutHelp onClose={() => setHelpVisible(false)} />}
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
        <Route path="/hobbies"      element={<ProtectedRoute><Hobbies /></ProtectedRoute>} />
        <Route path="/pickleball"   element={<ProtectedRoute><Pickleball /></ProtectedRoute>} />
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
