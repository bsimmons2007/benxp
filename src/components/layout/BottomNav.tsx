import { NavLink } from 'react-router-dom'

const tabs = [
  { to: '/',           label: 'Home',    icon: '🏠' },
  { to: '/log',        label: 'Log',     icon: '➕' },
  { to: '/records',    label: 'Records', icon: '📊' },
  { to: '/books',      label: 'Books',   icon: '📚' },
  { to: '/sleep',      label: 'Sleep',   icon: '😴' },
  { to: '/challenges', label: 'Quests',  icon: '⚔️' },
]

export function BottomNav() {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 flex justify-around items-center py-1.5 z-40"
      style={{ background: 'rgba(8,10,24,0.92)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', borderTop: '1px solid rgba(255,255,255,0.07)' }}
    >
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.to === '/'}
          className="flex flex-col items-center gap-0.5 px-2 py-1 transition-all"
          style={({ isActive }) => ({
            color: isActive ? 'var(--accent)' : '#555',
            transform: isActive ? 'translateY(-2px)' : 'none',
          })}
        >
          <span className="text-lg">{tab.icon}</span>
          <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.02em' }}>{tab.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
