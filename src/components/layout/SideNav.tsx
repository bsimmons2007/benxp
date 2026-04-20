import { useEffect, useState } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { SECTION_DEFS, loadSectionOrder, loadHiddenSections } from '../../lib/sections'
import { useStore } from '../../store/useStore'
import { useNavStore } from '../../store/useNavStore'
import { getLevelTitle } from '../../lib/xp'
import { SectionIcon, HomeIcon, PersonIcon, TargetIcon, CalendarIcon, DotsIcon } from '../ui/Icon'

const SECONDARY_LINKS = [
  { to: '/profile', label: 'Profile', iconKey: '__person'   },
  { to: '/goals',   label: 'Goals',   iconKey: '__target'   },
  { to: '/weekly',  label: 'Weekly',  iconKey: '__calendar' },
  { to: '/more',    label: 'More',    iconKey: '__more'     },
]

function SecondaryNavIcon({ iconKey, isActive }: { iconKey: string; isActive: boolean }) {
  const color = isActive ? 'var(--accent)' : 'var(--text-secondary)'
  if (iconKey === '__person')   return <PersonIcon   size={16} color={color} />
  if (iconKey === '__target')   return <TargetIcon   size={16} color={color} />
  if (iconKey === '__calendar') return <CalendarIcon size={16} color={color} />
  if (iconKey === '__more')     return <DotsIcon     size={16} color={color} />
  return null
}

const linkStyle = (isActive: boolean) => ({
  display:        'flex',
  alignItems:     'center',
  gap:            10,
  padding:        '8px 12px',
  borderRadius:   10,
  textDecoration: 'none',
  background:     isActive ? 'var(--accent-subtle)' : 'transparent',
  color:          isActive ? 'var(--accent)'        : 'var(--text-secondary)',
  fontWeight:     isActive ? 600                    : 400,
  fontSize:       13,
  transition:     'background 0.15s ease, color 0.15s ease',
} as React.CSSProperties)

export function SideNav() {
  const navigate   = useNavigate()
  const location   = useLocation()
  const [order,  setOrder]  = useState(() => loadSectionOrder())
  const [hidden, setHidden] = useState(() => loadHiddenSections())
  const { level, progress, userName } = useStore()

  useEffect(() => {
    function onUpdate() {
      setOrder(loadSectionOrder())
      setHidden(loadHiddenSections())
    }
    window.addEventListener('sections-updated', onUpdate)
    return () => window.removeEventListener('sections-updated', onUpdate)
  }, [])
  const isOpen     = useNavStore(s => s.navOpen)
  const closeNav   = useNavStore(s => s.closeNav)

  // Close on route change
  useEffect(() => { closeNav() }, [location.pathname]) // eslint-disable-line react-hooks/exhaustive-deps

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') closeNav() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [closeNav])

  const mainTabs = [
    { to: '/', label: 'Home', iconKey: '__home' },
    ...order
      .filter(key => !hidden.includes(key))
      .map(key => ({
        to:      SECTION_DEFS[key].path,
        label:   SECTION_DEFS[key].label,
        iconKey: key,
      })),
  ]

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={closeNav}
        style={{
          position:      'fixed',
          inset:         0,
          zIndex:        48,
          background:    'rgba(0,0,0,0.55)',
          backdropFilter: 'blur(2px)',
          WebkitBackdropFilter: 'blur(2px)',
          opacity:       isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
          transition:    'opacity 0.25s ease',
        }}
      />

      {/* Drawer */}
      <aside
        style={{
          position:             'fixed',
          top:                  0,
          left:                 0,
          height:               '100%',
          width:                240,
          zIndex:               49,
          display:              'flex',
          flexDirection:        'column',
          background:           'rgba(8,10,22,0.98)',
          backdropFilter:       'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderRight:          '1px solid rgba(255,255,255,0.08)',
          transform:            isOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition:           'transform 0.26s cubic-bezier(0.22,1,0.36,1)',
          willChange:           'transform',
        }}
      >
        {/* Brand */}
        <button
          onClick={() => { navigate('/monthly'); closeNav() }}
          style={{
            background:   'none',
            border:       'none',
            textAlign:    'left',
            padding:      '20px 20px 16px',
            cursor:       'pointer',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <p style={{ color: 'var(--accent)', fontFamily: 'Cinzel, serif', fontSize: 20, fontWeight: 700, lineHeight: 1, margin: 0 }}>
            {userName ? `${userName}XP` : 'YouXP'}
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 4, marginBottom: 6, letterSpacing: '0.04em' }}>
            Lv {level} · {getLevelTitle(level)}
          </p>
          {/* XP mini-bar */}
          <div style={{ height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
            <div
              style={{
                height:     '100%',
                width:      `${Math.round(progress * 100)}%`,
                background: 'var(--accent)',
                borderRadius: 2,
                transition: 'width 0.4s ease',
              }}
            />
          </div>
        </button>

        {/* Main nav */}
        <nav
          style={{
            display:       'flex',
            flexDirection: 'column',
            gap:           2,
            padding:       '12px 12px 8px',
            flex:          1,
            overflowY:     'auto',
          }}
        >
          {mainTabs.map(tab => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.to === '/'}
              style={({ isActive }) => linkStyle(isActive)}
            >
              {({ isActive }) => (
                <>
                  {tab.iconKey === '__home'
                    ? <HomeIcon size={16} color={isActive ? 'var(--accent)' : 'var(--text-secondary)'} />
                    : <SectionIcon sectionKey={tab.iconKey} size={16} color={isActive ? 'var(--accent)' : 'var(--text-secondary)'} />
                  }
                  <span style={{ color: isActive ? 'var(--accent)' : 'var(--text-secondary)' }}>
                    {tab.label}
                  </span>
                </>
              )}
            </NavLink>
          ))}

          {/* Separator */}
          <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '8px 4px' }} />

          {SECONDARY_LINKS.map(link => (
            <NavLink
              key={link.to}
              to={link.to}
              style={({ isActive }) => linkStyle(isActive)}
            >
              {({ isActive }) => (
                <>
                  <SecondaryNavIcon iconKey={link.iconKey} isActive={isActive} />
                  <span style={{ color: isActive ? 'var(--accent)' : 'var(--text-secondary)' }}>
                    {link.label}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Bottom: Settings */}
        <div style={{ padding: '10px 12px', borderTop: '1px solid var(--border-faint)' }}>
          <NavLink to="/settings" style={({ isActive }) => linkStyle(isActive)}>
            {({ isActive }) => (
              <>
                <svg width="16" height="16" viewBox="0 0 18 18" fill="none" style={{ flexShrink: 0, color: isActive ? 'var(--accent)' : 'var(--text-secondary)' }}>
                  <path d="M9 11.5A2.5 2.5 0 1 0 9 6.5a2.5 2.5 0 0 0 0 5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  <path d="M14.7 7.3l-.6-1.4.9-1.7-1.2-1.2-1.7.9-1.4-.6L10 1.5H8l-.7 1.8-1.4.6-1.7-.9L3 4.2l.9 1.7-.6 1.4L1.5 8v2l1.8.7.6 1.4-.9 1.7 1.2 1.2 1.7-.9 1.4.6.7 1.8h2l.7-1.8 1.4-.6 1.7.9 1.2-1.2-.9-1.7.6-1.4 1.8-.7V8l-1.8-.7Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
                </svg>
                <span style={{ color: isActive ? 'var(--accent)' : 'var(--text-secondary)' }}>
                  Settings
                </span>
              </>
            )}
          </NavLink>
        </div>
      </aside>
    </>
  )
}
