interface TopBarProps {
  title?: string
}

export function TopBar({ title = 'BenXP' }: TopBarProps) {
  return (
    <header
      className="fixed top-0 left-0 right-0 flex items-center justify-between px-4 py-3 z-40"
      style={{ background: '#1A1A2E', borderBottom: '1px solid rgba(255,255,255,0.08)' }}
    >
      <span className="text-lg font-bold" style={{ color: '#F5A623' }}>
        {title}
      </span>
      <button style={{ color: '#888888' }} aria-label="Settings">
        ⚙️
      </button>
    </header>
  )
}
