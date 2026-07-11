import { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { SECTION_DEFS, loadSectionOrder, loadHiddenSections } from '../../lib/sections'
import { SectionIcon, HomeIcon, DotsIcon } from '../ui/Icon'

export function BottomNav() {
  const [order,  setOrder]  = useState(() => loadSectionOrder())
  const [hidden, setHidden] = useState(() => loadHiddenSections())

  useEffect(() => {
    function onUpdate() {
      setOrder(loadSectionOrder())
      setHidden(loadHiddenSections())
    }
    window.addEventListener('sections-updated', onUpdate)
    return () => window.removeEventListener('sections-updated', onUpdate)
  }, [])

  // Core sections only — the top of the user's section order. Everything else
  // stays reachable via the hamburger drawer (SideNav) and More.
  const CORE_TABS = 3
  const tabs = [
    { to: '/',     label: 'Home', iconKey: '__home' },
    ...order
      .filter(key => !hidden.includes(key))
      .slice(0, CORE_TABS)
      .map(key => ({ to: SECTION_DEFS[key].path, label: SECTION_DEFS[key].label, iconKey: key })),
    { to: '/more', label: 'More', iconKey: '__more' },
  ]

  return (
    <nav
      data-tutorial="bottom-nav"
      className="fixed bottom-0 left-0 right-0 flex justify-around items-start z-40 md:hidden"
      style={{
        background:    'var(--nav-bg)',
        borderTop:     '1px solid var(--border-faint)',
        height:        'calc(60px + env(safe-area-inset-bottom))',
        paddingTop:    6,
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.to === '/'}
          className="flex flex-col items-center gap-0.5 px-1"
          style={({ isActive }) => ({
            color:   isActive ? 'var(--accent)' : 'var(--text-muted)',
            minWidth: 48,
            textDecoration: 'none',
          })}
        >
          {({ isActive }) => (
            <>
              <span style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                height: 30, width: 46, borderRadius: 10,
                background: isActive ? 'var(--accent-subtle, rgba(245,166,35,0.12))' : 'transparent',
                transition: 'background 0.15s ease',
              }}>
                {tab.iconKey === '__home'
                  ? <HomeIcon size={20} />
                  : tab.iconKey === '__more'
                  ? <DotsIcon size={20} />
                  : <SectionIcon sectionKey={tab.iconKey} size={20} />
                }
              </span>
              <span style={{ fontSize: 9, fontWeight: isActive ? 700 : 500, letterSpacing: '0.02em', lineHeight: 1 }}>
                {tab.label}
              </span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
