import { useNavigate } from 'react-router-dom'
import { useEffect, useState, useMemo } from 'react'
import { useNavStore } from '../../store/useNavStore'
import { Wordmark } from '../brand/Wordmark'

const LOGO_ANIMATED_KEY = 'youxp-logo-animated'

interface TopBarProps {
  title?:        string
  hideSettings?: boolean
  back?:         boolean
  backTo?:       string
  logButton?:    boolean
}

export function TopBar({ title, hideSettings = false, back = false, backTo, logButton = false }: TopBarProps) {
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
        onClick={() => logoClickable && navigate('/monthly')}
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

      {/* Right */}
      {logButton ? (
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <button
            data-tutorial="log-btn"
            onClick={() => openQuickLog('open')}
            aria-label="Quick log activity"
            style={{
              width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'var(--accent)', border: 'none', cursor: 'pointer', borderRadius: 10,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 3v10M3 8h10" stroke="var(--base-bg)" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      ) : !hideSettings ? (
        <button
          data-tutorial="settings-btn"
          onClick={() => navigate('/settings')}
          aria-label="Settings"
          className="flex items-center justify-center rounded-lg transition-colors"
          style={{
            width: 36, height: 36, flexShrink: 0,
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-muted)',
          }}
          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)')}
          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = 'var(--text-muted)')}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M9 11.5A2.5 2.5 0 1 0 9 6.5a2.5 2.5 0 0 0 0 5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M14.7 7.3l-.6-1.4.9-1.7-1.2-1.2-1.7.9-1.4-.6L10 1.5H8l-.7 1.8-1.4.6-1.7-.9L3 4.2l.9 1.7-.6 1.4L1.5 8v2l1.8.7.6 1.4-.9 1.7 1.2 1.2 1.7-.9 1.4.6.7 1.8h2l.7-1.8 1.4-.6 1.7.9 1.2-1.2-.9-1.7.6-1.4 1.8-.7V8l-1.8-.7Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
          </svg>
        </button>
      ) : (
        <div style={{ width: 36 }} />
      )}
    </header>
  )
}
