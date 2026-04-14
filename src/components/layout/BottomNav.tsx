import { NavLink } from 'react-router-dom'
import { SECTION_DEFS, loadSectionOrder, loadHiddenSections } from '../../lib/sections'
import { SectionIcon, HomeIcon, DotsIcon } from '../ui/Icon'

export function BottomNav() {
  const order  = loadSectionOrder()
  const hidden = loadHiddenSections()

  const tabs = [
    { to: '/',     label: 'Home', iconKey: '__home' },
    ...order
      .filter(key => !hidden.includes(key))
      .map(key => ({ to: SECTION_DEFS[key].path, label: SECTION_DEFS[key].label, iconKey: key })),
    { to: '/more', label: 'More', iconKey: '__more' },
  ]

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 flex justify-around items-center py-1 z-40 md:hidden"
      style={{
        background:           'var(--nav-bg)',
        backdropFilter:       'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop:            '1px solid var(--border-faint)',
        height:               56,
      }}
    >
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.to === '/'}
          className="flex flex-col items-center gap-0.5 px-2 py-1 transition-all relative"
          style={({ isActive }) => ({
            color:     isActive ? 'var(--accent)' : 'var(--text-muted)',
            transform: isActive ? 'translateY(-1px)' : 'none',
            minWidth:  44,
          })}
        >
          {({ isActive }) => (
            <>
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 22 }}>
                {tab.iconKey === '__home'
                  ? <HomeIcon size={20} />
                  : tab.iconKey === '__more'
                  ? <DotsIcon size={20} />
                  : <SectionIcon sectionKey={tab.iconKey} size={20} />
                }
              </span>
              <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.03em', lineHeight: 1 }}>
                {tab.label}
              </span>
              {isActive && <div className="nav-active-dot" />}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
