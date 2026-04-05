import { useNavigate } from 'react-router-dom'
import { useUserName } from '../../hooks/useUserName'

interface TopBarProps {
  title?: string
  hideSettings?: boolean
}

export function TopBar({ title, hideSettings = false }: TopBarProps) {
  const navigate = useNavigate()
  const userName = useUserName()
  const displayTitle = title ?? (userName ? `${userName}XP` : 'YouXP')

  return (
    <header
      className="fixed top-0 left-0 right-0 flex items-center justify-between px-4 py-3 z-40"
      style={{ background: 'rgba(10,12,28,0.85)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,0.07)' }}
    >
      <span className="text-2xl font-bold" style={{ color: 'var(--accent)', fontFamily: 'Cinzel, serif' }}>
        {displayTitle}
      </span>
      {!hideSettings ? (
        <button
          onClick={() => navigate('/settings')}
          className="text-xl p-1"
          style={{ color: '#888888' }}
          aria-label="Settings"
        >
          ⚙️
        </button>
      ) : (
        <div style={{ width: 28 }} />
      )}
    </header>
  )
}
