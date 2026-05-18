import { useEffect, useState } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { SECTION_DEFS, loadSectionOrder, loadHiddenSections } from '../../lib/sections'
import { useStore } from '../../store/useStore'
import { useNavStore } from '../../store/useNavStore'
import { getLevelTitle } from '../../lib/xp'
import { SectionIcon, HomeIcon, PersonIcon, TargetIcon, CalendarIcon, DotsIcon } from '../ui/Icon'

const SECONDARY_LINKS = [
  { to: '/profile', label: 'Profile',  iconKey: '__person'   },
  { to: '/goals',   label: 'Goals',    iconKey: '__target'   },
  { to: '/weekly',  label: 'Weekly',   iconKey: '__calendar' },
  { to: '/more',    label: 'More',     iconKey: '__more'     },
]

export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
      <rect width="28" height="28" rx="7" fill="var(--accent)" />
      <path
        d="M9 7.5l5 6.5 5-6.5M14 14v6.5"
        stroke="white" strokeWidth="2.2"
        strokeLinecap="round" strokeLinejoin="round"
      />
    </svg>
  )
}

function NavIcon({ iconKey, color, size = 18 }: { iconKey: string; color: string; size?: number }) {
  if (iconKey === '__home')     return <HomeIcon     size={size} color={color} />
  if (iconKey === '__person')   return <PersonIcon   size={size} color={color} />
  if (iconKey === '__target')   return <TargetIcon   size={size} color={color} />
  if (iconKey === '__calendar') return <CalendarIcon size={size} color={color} />
  if (iconKey === '__more')     return <DotsIcon     size={size} color={color} />
  return <SectionIcon sectionKey={iconKey} size={size} color={color} />
}

function DesktopNavItem({ to, label, iconKey }: { to: string; label: string; iconKey: string }) {
  return (
    <div className="sidenav-item">
      <NavLink
        to={to}
        end={to === '/'}
        className="sidenav-icon-btn"
        style={({ isActive }) => ({
          color:      isActive ? 'var(--accent)' : 'var(--text-secondary)',
          background: isActive ? 'var(--accent-subtle, rgba(245,166,35,0.1))' : 'transparent',
        })}
      >
        {({ isActive }) => (
          <NavIcon iconKey={iconKey} color={isActive ? 'var(--accent)' : 'var(--text-secondary)'} />
        )}
      </NavLink>
      <span className="sidenav-flyout">{label}</span>
    </div>
  )
}

const mobileLink = (isActive: boolean): React.CSSProperties => ({
  display: 'flex', alignItems: 'center', gap: 10,
  padding: '8px 12px', borderRadius: 10, textDecoration: 'none',
  background: isActive ? 'var(--accent-subtle, rgba(245,166,35,0.1))' : 'transparent',
  color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
  fontWeight: isActive ? 600 : 400, fontSize: 13,
  transition: 'background 0.15s ease',
})

export function SideNav() {
  const navigate   = useNavigate()
  const location   = useLocation()
  const [order,  setOrder]  = useState(() => loadSectionOrder())
  const [hidden, setHidden] = useState(() => loadHiddenSections())
  const { level, progress, userName } = useStore()
  const isOpen   = useNavStore(s => s.navOpen)
  const closeNav = useNavStore(s => s.closeNav)

  useEffect(() => {
    function onUpdate() {
      setOrder(loadSectionOrder())
      setHidden(loadHiddenSections())
    }
    window.addEventListener('sections-updated', onUpdate)
    return () => window.removeEventListener('sections-updated', onUpdate)
  }, [])

  useEffect(() => { closeNav() }, [location.pathname]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') closeNav() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [closeNav])

  const mainTabs = [
    { to: '/', label: 'Home', iconKey: '__home' },
    ...order.filter(k => !hidden.includes(k)).map(k => ({
      to: SECTION_DEFS[k].path, label: SECTION_DEFS[k].label, iconKey: k,
    })),
  ]

  return (
    <>
      {/* ── DESKTOP: persistent 64px icon strip ─────────────── */}
      <aside
        className="hidden md:flex"
        style={{
          position: 'fixed', top: 0, left: 0, height: '100%', width: 64,
          zIndex: 49, flexDirection: 'column', alignItems: 'center',
          background: 'var(--nav-bg)', borderRight: '1px solid var(--border-faint)',
          paddingTop: 10, paddingBottom: 12,
        }}
      >
        {/* Logo mark */}
        <div className="sidenav-item" style={{ marginBottom: 2 }}>
          <button
            onClick={() => navigate('/monthly')}
            aria-label="YouXP home"
            className="sidenav-icon-btn"
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <LogoMark size={28} />
          </button>
          <span className="sidenav-flyout" style={{ fontWeight: 600 }}>
            Lv {level} · {getLevelTitle(level)}
          </span>
        </div>

        {/* XP mini-bar */}
        <div style={{ width: 32, height: 2, borderRadius: 1, background: 'var(--border)', overflow: 'hidden', marginBottom: 10 }}>
          <div style={{ height: '100%', width: `${Math.round(progress * 100)}%`, background: 'var(--accent)', transition: 'width 0.4s ease' }} />
        </div>

        {/* Main nav items */}
        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, width: '100%' }}>
          {mainTabs.map(tab => (
            <DesktopNavItem key={tab.to} to={tab.to} label={tab.label} iconKey={tab.iconKey} />
          ))}

          <div style={{ height: 1, width: 32, background: 'var(--border-faint)', margin: '6px auto' }} />

          {SECONDARY_LINKS.map(link => (
            <DesktopNavItem key={link.to} to={link.to} label={link.label} iconKey={link.iconKey} />
          ))}
        </nav>

        {/* Settings */}
        <div className="sidenav-item">
          <NavLink
            to="/settings"
            className="sidenav-icon-btn"
            style={({ isActive }) => ({
              color:      isActive ? 'var(--accent)' : 'var(--text-secondary)',
              background: isActive ? 'var(--accent-subtle, rgba(245,166,35,0.1))' : 'transparent',
            })}
          >
            {({ isActive }) => (
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ color: isActive ? 'var(--accent)' : 'var(--text-secondary)' }}>
                <path d="M9 11.5A2.5 2.5 0 1 0 9 6.5a2.5 2.5 0 0 0 0 5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M14.7 7.3l-.6-1.4.9-1.7-1.2-1.2-1.7.9-1.4-.6L10 1.5H8l-.7 1.8-1.4.6-1.7-.9L3 4.2l.9 1.7-.6 1.4L1.5 8v2l1.8.7.6 1.4-.9 1.7 1.2 1.2 1.7-.9 1.4.6.7 1.8h2l.7-1.8 1.4-.6 1.7.9 1.2-1.2-.9-1.7.6-1.4 1.8-.7V8l-1.8-.7Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
              </svg>
            )}
          </NavLink>
          <span className="sidenav-flyout">Settings</span>
        </div>
      </aside>

      {/* ── MOBILE: backdrop ────────────────────────────────── */}
      <div
        onClick={closeNav}
        className="md:hidden"
        style={{
          position: 'fixed', inset: 0, zIndex: 48,
          background: 'rgba(0,0,0,0.5)',
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
          transition: 'opacity 0.25s ease',
        }}
      />

      {/* ── MOBILE: slide-in drawer ──────────────────────────── */}
      <aside
        className="md:hidden"
        style={{
          position: 'fixed', top: 0, left: 0, height: '100%', width: 240,
          zIndex: 49, display: 'flex', flexDirection: 'column',
          background: 'var(--nav-bg)', borderRight: '1px solid var(--border)',
          transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.26s cubic-bezier(0.22,1,0.36,1)',
          willChange: 'transform',
        }}
      >
        {/* Brand */}
        <button
          onClick={() => { navigate('/monthly'); closeNav() }}
          style={{
            background: 'none', border: 'none', textAlign: 'left',
            padding: '20px 20px 16px', cursor: 'pointer',
            borderBottom: '1px solid var(--border-faint)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <LogoMark size={24} />
            <p style={{ color: 'var(--text-primary)', fontSize: 16, fontWeight: 700, lineHeight: 1, margin: 0 }}>
              {userName ? `${userName}XP` : 'YouXP'}
            </p>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: 11, marginBottom: 6, letterSpacing: '0.04em' }}>
            Lv {level} · {getLevelTitle(level)}
          </p>
          <div style={{ height: 3, borderRadius: 2, background: 'var(--border)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${Math.round(progress * 100)}%`, background: 'var(--accent)', borderRadius: 2, transition: 'width 0.4s ease' }} />
          </div>
        </button>

        {/* Nav */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '12px 12px 8px', flex: 1, overflowY: 'auto' }}>
          {mainTabs.map(tab => (
            <NavLink key={tab.to} to={tab.to} end={tab.to === '/'} style={({ isActive }) => mobileLink(isActive)}>
              {({ isActive }) => (
                <>
                  <NavIcon iconKey={tab.iconKey} color={isActive ? 'var(--accent)' : 'var(--text-secondary)'} size={16} />
                  <span>{tab.label}</span>
                </>
              )}
            </NavLink>
          ))}

          <div style={{ height: 1, background: 'var(--border-faint)', margin: '8px 4px' }} />

          {SECONDARY_LINKS.map(link => (
            <NavLink key={link.to} to={link.to} style={({ isActive }) => mobileLink(isActive)}>
              {({ isActive }) => (
                <>
                  <NavIcon iconKey={link.iconKey} color={isActive ? 'var(--accent)' : 'var(--text-secondary)'} size={16} />
                  <span>{link.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div style={{ padding: '10px 12px', borderTop: '1px solid var(--border-faint)' }}>
          <NavLink to="/settings" style={({ isActive }) => mobileLink(isActive)}>
            {({ isActive }) => (
              <>
                <svg width="16" height="16" viewBox="0 0 18 18" fill="none" style={{ flexShrink: 0, color: isActive ? 'var(--accent)' : 'var(--text-secondary)' }}>
                  <path d="M9 11.5A2.5 2.5 0 1 0 9 6.5a2.5 2.5 0 0 0 0 5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  <path d="M14.7 7.3l-.6-1.4.9-1.7-1.2-1.2-1.7.9-1.4-.6L10 1.5H8l-.7 1.8-1.4.6-1.7-.9L3 4.2l.9 1.7-.6 1.4L1.5 8v2l1.8.7.6 1.4-.9 1.7 1.2 1.2 1.7-.9 1.4.6.7 1.8h2l.7-1.8 1.4-.6 1.7.9 1.2-1.2-.9-1.7.6-1.4 1.8-.7V8l-1.8-.7Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
                </svg>
                <span>Settings</span>
              </>
            )}
          </NavLink>
        </div>
      </aside>
    </>
  )
}
