import { NavLink } from 'react-router-dom'

const tabs = [
  { to: '/', label: 'Home', icon: '🏠' },
  { to: '/log', label: 'Log', icon: '➕' },
  { to: '/records', label: 'Records', icon: '📊' },
  { to: '/challenges', label: 'Challenges', icon: '⚔️' },
  { to: '/more', label: 'More', icon: '☰' },
]

export function BottomNav() {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 flex justify-around items-center py-2 z-40"
      style={{ background: '#0F3460', borderTop: '1px solid rgba(255,255,255,0.08)' }}
    >
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.to === '/'}
          className="flex flex-col items-center gap-0.5 px-3 py-1"
          style={({ isActive }) => ({ color: isActive ? '#F5A623' : '#888888' })}
        >
          <span className="text-xl">{tab.icon}</span>
          <span className="text-xs font-medium">{tab.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
