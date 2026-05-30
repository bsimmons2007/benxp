import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { createContext, useContext, useEffect, useRef, useState, lazy, Suspense } from 'react'
import type { ReactNode } from 'react'
import { BottomNav } from './components/layout/BottomNav'
import { SideNav } from './components/layout/SideNav'
// Critical routes — always in the main bundle
import { Home } from './pages/Home'
import { Login } from './pages/Login'
import { ResetPassword } from './pages/ResetPassword'
import { AuthCallback } from './pages/AuthCallback'
// All other pages — code-split into their own chunks
const Records      = lazy(() => import('./pages/Records').then(m => ({ default: m.Records })))
const Challenges   = lazy(() => import('./pages/Challenges').then(m => ({ default: m.Challenges })))
const Books        = lazy(() => import('./pages/Books').then(m => ({ default: m.Books })))
const Sleep        = lazy(() => import('./pages/Sleep').then(m => ({ default: m.Sleep })))
const Skate        = lazy(() => import('./pages/Skate').then(m => ({ default: m.Skate })))
const Fortnite     = lazy(() => import('./pages/Fortnite').then(m => ({ default: m.Fortnite })))
const More         = lazy(() => import('./pages/More').then(m => ({ default: m.More })))
const Settings     = lazy(() => import('./pages/Settings').then(m => ({ default: m.Settings })))
const Profile      = lazy(() => import('./pages/Profile').then(m => ({ default: m.Profile })))
const Weekly       = lazy(() => import('./pages/Weekly').then(m => ({ default: m.Weekly })))
const Monthly      = lazy(() => import('./pages/Monthly').then(m => ({ default: m.Monthly })))
const Mood         = lazy(() => import('./pages/Mood').then(m => ({ default: m.Mood })))
const DevSettings  = lazy(() => import('./pages/DevSettings').then(m => ({ default: m.DevSettings })))
const ShareCard    = lazy(() => import('./pages/ShareCard').then(m => ({ default: m.ShareCard })))
const XPHistory    = lazy(() => import('./pages/XPHistory').then(m => ({ default: m.XPHistory })))
const Goals        = lazy(() => import('./pages/Goals').then(m => ({ default: m.Goals })))
const Cardio       = lazy(() => import('./pages/Cardio').then(m => ({ default: m.Cardio })))
const Water        = lazy(() => import('./pages/Water').then(m => ({ default: m.Water })))
const PRFeed       = lazy(() => import('./pages/PRFeed').then(m => ({ default: m.PRFeed })))
const Strength     = lazy(() => import('./pages/Strength').then(m => ({ default: m.Strength })))
const Measurements = lazy(() => import('./pages/Measurements').then(m => ({ default: m.Measurements })))
const Basketball   = lazy(() => import('./pages/Basketball').then(m => ({ default: m.Basketball })))
const Hobbies      = lazy(() => import('./pages/Hobbies').then(m => ({ default: m.Hobbies })))
const Pickleball   = lazy(() => import('./pages/Pickleball').then(m => ({ default: m.Pickleball })))
const Terms        = lazy(() => import('./pages/Terms').then(m => ({ default: m.Terms })))
const Privacy      = lazy(() => import('./pages/Privacy').then(m => ({ default: m.Privacy })))
const Golf         = lazy(() => import('./pages/Golf').then(m => ({ default: m.Golf })))
const DiscGolf     = lazy(() => import('./pages/DiscGolf').then(m => ({ default: m.DiscGolf })))
const Hiking       = lazy(() => import('./pages/Hiking').then(m => ({ default: m.Hiking })))
const TableTennis  = lazy(() => import('./pages/TableTennis').then(m => ({ default: m.TableTennis })))
const Chess        = lazy(() => import('./pages/Chess').then(m => ({ default: m.Chess })))
const Volleyball   = lazy(() => import('./pages/Volleyball').then(m => ({ default: m.Volleyball })))
const Spikeball    = lazy(() => import('./pages/Spikeball').then(m => ({ default: m.Spikeball })))
const Pool         = lazy(() => import('./pages/Pool').then(m => ({ default: m.Pool })))
const Leaderboard  = lazy(() => import('./pages/Leaderboard').then(m => ({ default: m.Leaderboard })))
const Log          = lazy(() => import('./pages/Log').then(m => ({ default: m.Log })))
const NotFound     = lazy(() => import('./pages/NotFound').then(m => ({ default: m.NotFound })))
const LevelUpOverlay  = lazy(() => import('./components/ui/LevelUpOverlay').then(m => ({ default: m.LevelUpOverlay })))
const TutorialOverlay = lazy(() => import('./components/ui/TutorialOverlay').then(m => ({ default: m.TutorialOverlay })))
import { applyTimeOrSavedTheme } from './lib/theme'
import { setupOfflineQueue } from './lib/offlineQueue'
import { isTutorialDone } from './lib/tutorial'
import { checkDailyReminder } from './lib/notifications'
import { useAuth } from './hooks/useAuth'
import { useStore } from './store/useStore'

// Auth state is resolved once at the App root and shared via context so that
// navigating between routes doesn't create a new getSession() call each time.
const AuthContext = createContext<ReturnType<typeof useAuth>>(null as never)

function AppShellSkeleton() {
  return (
    <div style={{ background: 'var(--surface-0)', minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      {/* TopBar placeholder */}
      <div style={{ height: 56, background: 'var(--surface-1)', borderBottom: '1px solid var(--border-subtle)', flexShrink: 0 }} />
      {/* Content shimmer */}
      <div style={{ flex: 1, padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ height: 160, borderRadius: 16, background: 'var(--surface-1)', border: '1px solid var(--border-subtle)', animation: 'shimmer 1.4s ease-in-out infinite', backgroundSize: '200% 100%', backgroundImage: 'linear-gradient(90deg, var(--surface-1) 25%, var(--surface-2) 50%, var(--surface-1) 75%)' }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {[1,2,3,4].map(i => (
            <div key={i} style={{ height: 72, borderRadius: 12, backgroundImage: 'linear-gradient(90deg, var(--surface-1) 25%, var(--surface-2) 50%, var(--surface-1) 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s ease-in-out infinite', animationDelay: `${i * 0.1}s` }} />
          ))}
        </div>
      </div>
      {/* BottomNav placeholder */}
      <div style={{ height: 60, background: 'var(--surface-1)', borderTop: '1px solid var(--border-subtle)', flexShrink: 0 }} />
    </div>
  )
}

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session, loading, error } = useContext(AuthContext)
  if (loading) return <AppShellSkeleton />
  if (error || !session) return <Navigate to="/login" replace />
  return <ErrorBoundary inline>{children}</ErrorBoundary>
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
        position: 'fixed', inset: 0, zIndex: 'var(--z-modal)',
        background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="pop-in"
        style={{
          background: 'var(--surface-3)', border: '1px solid var(--border)',
          borderRadius: 16, padding: '20px 24px', minWidth: 220,
          boxShadow: '0 20px 60px rgba(0,0,0,0.7)',
        }}
      >
        <p style={{ color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase', fontFamily: 'var(--font-mono)', letterSpacing: '0.12em', marginBottom: 12 }}>
          Keyboard Shortcuts
        </p>
        {SHORTCUTS.map(s => (
          <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '6px 0', borderBottom: '1px solid var(--border-faint)' }}>
            <kbd style={{
              display: 'inline-block', width: 24, height: 24, lineHeight: '24px', textAlign: 'center',
              borderRadius: 5, background: 'var(--input-bg)', border: '1px solid var(--border)',
              color: 'var(--accent)', fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-mono)', flexShrink: 0,
            }}>
              {s.key.toUpperCase()}
            </kbd>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{s.label.split(' — ')[1]}</span>
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '6px 0' }}>
          <kbd style={{
            display: 'inline-block', width: 24, height: 24, lineHeight: '24px', textAlign: 'center',
            borderRadius: 5, background: 'var(--input-bg)', border: '1px solid var(--border)',
            color: 'var(--text-muted)', fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-mono)', flexShrink: 0,
          }}>?</kbd>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Toggle this help</span>
        </div>
        <button
          onClick={onClose}
          style={{ marginTop: 14, width: '100%', padding: '8px', borderRadius: 8, border: '1px solid var(--border-faint)', background: 'var(--input-bg)', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 12 }}
        >
          Close (Esc)
        </button>
      </div>
    </div>
  )
}

const SPLASH_KEY = 'youxp-splashed'

function SplashScreen({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 900)
    return () => clearTimeout(t)
  }, [onDone])

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 'var(--z-splash)',
      background: 'var(--base-bg)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      animation: 'splashFadeOut 0.9s ease forwards',
      pointerEvents: 'none',
    }}>
      {/* Glow orb */}
      <div style={{
        position: 'absolute', width: 280, height: 280, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(245,166,35,0.12) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      <p style={{ fontSize: 42, fontWeight: 700,
        color: 'var(--accent)', letterSpacing: '0.05em',
        animation: 'splashLogoIn 0.5s cubic-bezier(0.34,1.56,0.64,1) both',
        marginBottom: 8,
      }}>
        YouXP
      </p>
      <p style={{ fontSize: 14,
        color: 'var(--text-muted)', letterSpacing: '0.18em', textTransform: 'uppercase', fontFamily: 'var(--font-mono)',
        animation: 'splashSubIn 0.6s ease both',
      }}>
        Level up your life
      </p>
      {/* Loading bar */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, background: 'var(--border)' }}>
        <div style={{
          height: '100%', background: 'var(--accent)',
          animation: 'splashBarFill 0.85s cubic-bezier(0.4,0,0.2,1) forwards',
        }} />
      </div>
    </div>
  )
}

function OfflineBanner() {
  const [offline, setOffline] = useState(!navigator.onLine)
  const [show, setShow] = useState(!navigator.onLine)

  useEffect(() => {
    function onOffline() { setOffline(true); setShow(true) }
    function onOnline()  { setOffline(false); setTimeout(() => setShow(false), 2000) }
    window.addEventListener('offline', onOffline)
    window.addEventListener('online',  onOnline)
    return () => {
      window.removeEventListener('offline', onOffline)
      window.removeEventListener('online',  onOnline)
    }
  }, [])

  if (!show) return null

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 'var(--z-banner)',
      padding: '10px 16px',
      background: offline ? 'color-mix(in srgb, var(--red) 12%, var(--surface-1))' : 'color-mix(in srgb, var(--green) 12%, var(--surface-1))',
      borderBottom: `1px solid ${offline ? 'color-mix(in srgb, var(--red) 35%, transparent)' : 'color-mix(in srgb, var(--green) 35%, transparent)'}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      transition: 'background 0.3s ease',
    }}>
      <div style={{
        width: 7, height: 7, borderRadius: '50%',
        background: offline ? 'var(--red)' : 'var(--green)',
        boxShadow: `0 0 8px ${offline ? 'var(--red)' : 'var(--green)'}`,
        flexShrink: 0,
      }} />
      <p style={{ fontSize: 12, fontWeight: 600, color: offline ? 'var(--red)' : 'var(--green)', letterSpacing: '0.04em' }}>
        {offline ? 'You\'re offline — changes will sync when reconnected' : 'Back online'}
      </p>
    </div>
  )
}

function TopLoadBar() {
  const loading = useStore(s => s.loading)
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, height: 2,
      zIndex: 'var(--z-loadbar)', pointerEvents: 'none', overflow: 'hidden',
      opacity: loading ? 1 : 0,
      transition: 'opacity 0.4s ease',
    }}>
      <div className="top-load-bar" style={{ height: '100%', background: 'var(--accent)' }} />
    </div>
  )
}

function AppInner() {
  const location = useLocation()
  const showNav = location.pathname !== '/login' && location.pathname !== '/reset-password' && location.pathname !== '/auth/callback'
  const { helpVisible, setHelpVisible } = useKeyboardShortcuts()
  const isAuthRoute = location.pathname === '/login' || location.pathname === '/reset-password'
  const refreshXP  = useStore(s => s.refreshXP)
  const initialized = useStore(s => s.initialized)

  // Refresh data when network comes back online
  const lastOnlineAt = useRef<number>(0)
  useEffect(() => {
    function onOnline() {
      if (!initialized) return
      const now = Date.now()
      if (now - lastOnlineAt.current < 10000) return  // debounce 10s
      lastOnlineAt.current = now
      refreshXP()
    }
    window.addEventListener('online', onOnline)
    return () => window.removeEventListener('online', onOnline)
  }, [initialized, refreshXP])

  const [showSplash,   setShowSplash]   = useState(() => {
    if (isAuthRoute) return false
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false
    const seen = sessionStorage.getItem(SPLASH_KEY)
    if (!seen) { sessionStorage.setItem(SPLASH_KEY, '1'); return true }
    return false
  })
  const [showTutorial, setShowTutorial] = useState(
    () => !isAuthRoute && !isTutorialDone() && location.pathname === '/'
  )

  useEffect(() => {
    if (isAuthRoute) return
    if (!isTutorialDone() && location.pathname === '/') setShowTutorial(true)
    checkDailyReminder()

    function onReset() {
      setShowTutorial(true)
    }
    window.addEventListener('tutorial-reset', onReset)
    return () => window.removeEventListener('tutorial-reset', onReset)
  }, [isAuthRoute]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      {showSplash && <SplashScreen onDone={() => setShowSplash(false)} />}
      <OfflineBanner />
      <TopLoadBar />
      <Suspense fallback={null}><LevelUpOverlay /></Suspense>
      {showTutorial && !isAuthRoute && (
        <Suspense fallback={null}>
          <TutorialOverlay onDone={() => setShowTutorial(false)} />
        </Suspense>
      )}
      {helpVisible && <ShortcutHelp onClose={() => setHelpVisible(false)} />}
      <Suspense fallback={<div style={{ background: 'var(--base-bg)', minHeight: '100dvh' }} />}>
      <Routes>
        <Route path="/login"         element={<Login />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/auth/callback"  element={<AuthCallback />} />
        <Route path="/"           element={<ProtectedRoute><Home /></ProtectedRoute>} />
        <Route path="/lifting"    element={<ProtectedRoute><Records /></ProtectedRoute>} />
        <Route path="/records"    element={<Navigate to="/lifting" replace />} />
        <Route path="/challenges" element={<ProtectedRoute><Challenges /></ProtectedRoute>} />
        <Route path="/quests"     element={<Navigate to="/challenges" replace />} />
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
        <Route path="/terms"        element={<Terms />} />
        <Route path="/privacy"      element={<Privacy />} />
        <Route path="/golf"          element={<ProtectedRoute><Golf /></ProtectedRoute>} />
        <Route path="/disc-golf"    element={<ProtectedRoute><DiscGolf /></ProtectedRoute>} />
        <Route path="/hiking"       element={<ProtectedRoute><Hiking /></ProtectedRoute>} />
        <Route path="/table-tennis" element={<ProtectedRoute><TableTennis /></ProtectedRoute>} />
        <Route path="/chess"        element={<ProtectedRoute><Chess /></ProtectedRoute>} />
        <Route path="/volleyball"   element={<ProtectedRoute><Volleyball /></ProtectedRoute>} />
        <Route path="/spikeball"    element={<ProtectedRoute><Spikeball /></ProtectedRoute>} />
        <Route path="/pool"         element={<ProtectedRoute><Pool /></ProtectedRoute>} />
        <Route path="/leaderboard"  element={<ProtectedRoute><Leaderboard /></ProtectedRoute>} />
        <Route path="/log"           element={<ProtectedRoute><Log /></ProtectedRoute>} />
        <Route path="*"              element={<NotFound />} />
      </Routes>
      </Suspense>
      {showNav && <BottomNav />}
      {showNav && <SideNav />}

    </>
  )
}

export default function App() {
  const auth = useAuth()

  useEffect(() => {
    applyTimeOrSavedTheme()
    setupOfflineQueue()

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
    <AuthContext.Provider value={auth}>
      <BrowserRouter>
        <AppInner />
      </BrowserRouter>
    </AuthContext.Provider>
  )
}
