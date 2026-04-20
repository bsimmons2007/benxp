import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useUserName } from '../../hooks/useUserName'
import { useNavStore } from '../../store/useNavStore'

interface TopBarProps {
  title?:        string
  hideSettings?: boolean
  back?:         boolean   // show back arrow instead of hamburger
}

export function TopBar({ title, hideSettings = false, back = false }: TopBarProps) {
  const navigate      = useNavigate()
  const userName      = useUserName()
  const toggleNav     = useNavStore(s => s.toggleNav)
  const logoLabel     = title ?? (userName ? `${userName}XP` : 'YouXP')
  const logoClickable = !title

  // Show a one-time hint pulse on the hamburger for new users
  const [showHint, setShowHint] = useState(false)
  useEffect(() => {
    if (!back && !localStorage.getItem('benxp-nav-opened')) {
      setShowHint(true)
    }
  }, [back])

  function handleLeft() {
    if (back) navigate(-1)
    else {
      toggleNav()
      localStorage.setItem('benxp-nav-opened', '1')
      setShowHint(false)
    }
  }


  return (
    <header
      className="fixed top-0 left-0 right-0 flex items-center justify-between z-40"
      style={{
        height:               'calc(52px + env(safe-area-inset-top))',
        paddingTop:           'env(safe-area-inset-top)',
        paddingLeft:          '12px',
        paddingRight:         '12px',
        background:           'rgba(10,12,28,0.92)',
        backdropFilter:       'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom:         '1px solid var(--border-faint)',
      }}
    >
      {/* Left */}
      <div style={{ position: 'relative', width: 36, height: 36, flexShrink: 0 }}>
        {showHint && (
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
          background: 'none', border: 'none', cursor: 'pointer',
          color: showHint ? 'var(--accent)' : 'var(--text-secondary)',
          position: 'relative',
        }}
      >
        {back ? (
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M11 4L6 9L11 14" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
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

      {/* Center — absolutely positioned so it stays centered regardless of side buttons */}
      <button
        onClick={() => logoClickable && navigate('/monthly')}
        style={{
          background: 'none', border: 'none', padding: 0,
          cursor: logoClickable ? 'pointer' : 'default',
          position: 'absolute', left: '50%', transform: 'translateX(-50%)',
        }}
      >
        <span
          style={{
            color:         title ? 'var(--text-primary)' : 'var(--accent)',
            fontFamily:    'Cinzel, serif',
            fontSize:      title ? 14 : 18,
            fontWeight:    700,
            letterSpacing: title ? '0.08em' : '0.04em',
            whiteSpace:    'nowrap',
            transition:    'opacity 0.15s ease',
          }}
          onMouseEnter={e => { if (logoClickable) (e.target as HTMLElement).style.opacity = '0.7' }}
          onMouseLeave={e => { if (logoClickable) (e.target as HTMLElement).style.opacity = '1' }}
        >
          {logoLabel}
        </span>
      </button>

      {/* Right */}
      {!hideSettings ? (
        <button
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
            <path
              d="M9 11.5A2.5 2.5 0 1 0 9 6.5a2.5 2.5 0 0 0 0 5Z"
              stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"
            />
            <path
              d="M14.7 7.3l-.6-1.4.9-1.7-1.2-1.2-1.7.9-1.4-.6L10 1.5H8l-.7 1.8-1.4.6-1.7-.9L3 4.2l.9 1.7-.6 1.4L1.5 8v2l1.8.7.6 1.4-.9 1.7 1.2 1.2 1.7-.9 1.4.6.7 1.8h2l.7-1.8 1.4-.6 1.7.9 1.2-1.2-.9-1.7.6-1.4 1.8-.7V8l-1.8-.7Z"
              stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"
            />
          </svg>
        </button>
      ) : (
        <div style={{ width: 36 }} />
      )}
    </header>
  )
}
