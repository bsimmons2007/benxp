import { useNavigate } from 'react-router-dom'
import { useEffect, useState, useMemo } from 'react'
import { useNavStore } from '../../store/useNavStore'
import { Wordmark } from '../brand/Wordmark'

const LOGO_ANIMATED_KEY = 'youxp-logo-animated'

interface TopBarProps {
  title?:  string
  back?:   boolean
  backTo?: string
}

export function TopBar({ title, back = false, backTo }: TopBarProps) {
  const navigate      = useNavigate()
  const toggleNav     = useNavStore(s => s.toggleNav)
  const openQuickLog  = useNavStore(s => s.openQuickLog)
  const logoClickable = !title

  const [logoShimmer,    setLogoShimmer]    = useState(false)
  const [logoShimmerKey, setLogoShimmerKey] = useState(0)
  const logoDrawIn = useMemo(() => {
    const done = sessionStorage.getItem(LOGO_ANIMATED_KEY)
    if (!done) { sessionStorage.setItem(LOGO_ANIMATED_KEY, '1'); return true }
    return false
  }, [])

  const [showHint, setShowHint] = useState(false)
  useEffect(() => {
    if (!back && !localStorage.getItem('youxp-nav-opened')) setShowHint(true)
  }, [back])

  function handleLeft() {
    if (back) {
      if (backTo) navigate(backTo)
      else navigate(-1)
    } else {
      toggleNav()
      localStorage.setItem('youxp-nav-opened', '1')
      setShowHint(false)
    }
  }

  return (
    <header
      className="fixed top-0 right-0 left-0 flex items-center justify-between z-40 md:left-16"
      style={{
        height:      'calc(52px + env(safe-area-inset-top))',
        paddingTop:  'env(safe-area-inset-top)',
        paddingLeft: '12px', paddingRight: '12px',
        background:  'var(--nav-bg)',
        borderBottom: '1px solid var(--border-faint)',
      }}
    >
      {/* Left — hamburger on mobile, back arrow when back=true, invisible spacer on desktop */}
      <div
        style={{ position: 'relative', width: 36, height: 36, flexShrink: 0 }}
        className={!back ? 'md:invisible' : ''}
      >
        {showHint && !back && (
          <span style={{
            position: 'absolute', inset: -4, borderRadius: 12, pointerEvents: 'none',
            border: '2px solid var(--accent)', opacity: 0.7,
            animation: 'pulse-ring 1.5s ease-in-out infinite',
          }} />
        )}
        <button
          data-tutorial="menu-btn"
          onClick={handleLeft}
          aria-label={back ? 'Go back' : 'Open menu'}
          className="flex items-center justify-center rounded-lg transition-colors"
          style={{
            width: 36, height: 36, flexShrink: 0,
            background: back ? 'var(--surface-2)' : 'none',
            border: 'none', cursor: 'pointer', borderRadius: 10,
            color: back ? 'var(--text-primary)' : showHint ? 'var(--accent)' : 'var(--text-secondary)',
          }}
        >
          {back ? (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M12 5L7 10L12 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            <svg width="18" height="14" viewBox="0 0 18 14" fill="none">
              <rect y="0"  width="18" height="2" rx="1" fill="currentColor" />
              <rect y="6"  width="12" height="2" rx="1" fill="currentColor" />
              <rect y="12" width="15" height="2" rx="1" fill="currentColor" />
            </svg>
          )}
        </button>
      </div>

      {/* Center — absolutely positioned to stay centered */}
      <button
        data-tutorial="topbar-logo"
        onClick={() => logoClickable && navigate('/')}
        style={{
          background: 'none', border: 'none', padding: 0,
          cursor: logoClickable ? 'pointer' : 'default',
          position: 'absolute', left: '50%', transform: 'translateX(-50%)',
          display: 'flex', alignItems: 'center',
        }}
      >
        {title ? (
          <span style={{
            color: 'var(--text-primary)', fontSize: 14, fontWeight: 700,
            letterSpacing: '0.08em', whiteSpace: 'nowrap',
          }}>
            {title}
          </span>
        ) : (
          <>
            {/* Mobile: full wordmark; desktop: sidebar already has the mark */}
            <span
              className="md:hidden"
              style={{
                ...(logoDrawIn ? { animation: 'splashLogoIn 0.7s cubic-bezier(0.34,1.56,0.64,1) 1.8s both' } : {}),
              }}
              onMouseEnter={() => { setLogoShimmer(true); setLogoShimmerKey(k => k + 1) }}
              onMouseLeave={() => setLogoShimmer(false)}
            >
              <Wordmark size={20} showPulse={false} />
              {logoShimmer && <span key={logoShimmerKey} className="logo-shimmer-sweep" />}
            </span>
            <span className="hidden md:inline-block">
              <Wordmark size={18} showPulse={false} color="var(--text-secondary)" />
            </span>
          </>
        )}
      </button>

      {/* Right — quick log, on every page */}
      <button
        data-tutorial="log-btn"
        onClick={() => openQuickLog('open')}
        aria-label="Quick log activity"
        style={{
          width: 36, height: 36, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'var(--accent)', border: 'none', cursor: 'pointer', borderRadius: 10,
        }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M8 3v10M3 8h10" stroke="var(--base-bg)" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      </button>
    </header>
  )
}
