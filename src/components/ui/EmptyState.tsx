import type { ReactNode } from 'react'

interface EmptyStateProps {
  icon:    ReactNode
  title:   string
  sub:     string
  action?: { label: string; onClick: () => void }
}

export function EmptyState({ icon, title, sub, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6 fade-in">
      <div
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 20, opacity: 0.2,
          filter: 'grayscale(0.3)',
        }}
      >
        {icon}
      </div>

      <p
        className="font-bold mb-2"
        style={{ color: '#555', fontFamily: 'Cinzel, serif', fontSize: 15, letterSpacing: '0.04em' }}
      >
        {title}
      </p>

      <p
        className="text-sm"
        style={{ color: '#444', maxWidth: 230, lineHeight: 1.6 }}
      >
        {sub}
      </p>

      {action && (
        <button
          onClick={action.onClick}
          className="mt-6 px-6 py-2.5 rounded-xl font-semibold text-sm"
          style={{
            background: 'var(--accent)',
            color: 'var(--base-bg)',
            boxShadow: '0 0 20px var(--accent-dim)',
            fontFamily: 'Cinzel, serif',
            letterSpacing: '0.03em',
          }}
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
