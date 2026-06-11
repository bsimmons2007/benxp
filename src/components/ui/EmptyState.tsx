import { useState } from 'react'
import type { ReactNode } from 'react'

interface EmptyStateProps {
  icon:    ReactNode
  title:   string
  sub:     string
  action?: { label: string; onClick: () => void }
  dashed?: boolean
}

export function EmptyState({ icon, title, sub, action, dashed = true }: EmptyStateProps) {
  return (
    <div
      className="flex flex-col items-center justify-center text-center py-10 px-6 fade-in"
      style={dashed ? {
        border: '1.5px dashed var(--border)',
        borderRadius: 14,
      } : undefined}
    >
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
        style={{ color: 'var(--text-secondary)', fontSize: 15, letterSpacing: '0.04em' }}
      >
        {title}
      </p>

      <p
        className="text-sm"
        style={{ color: 'var(--text-muted)', maxWidth: 230, lineHeight: 1.6 }}
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
            boxShadow: 'var(--shadow-sm)',
            letterSpacing: '0.03em',
          }}
        >
          {action.label}
        </button>
      )}
    </div>
  )
}

const FIRST_USE_KEY_PREFIX = 'youxp-first-use-'

export function FirstUseTip({ formKey, tip }: { formKey: string; tip: string }) {
  const lsKey = FIRST_USE_KEY_PREFIX + formKey
  const [visible, setVisible] = useState(() => !localStorage.getItem(lsKey))

  if (!visible) return null

  function dismiss() {
    localStorage.setItem(lsKey, '1')
    setVisible(false)
  }

  return (
    <div className="flex items-start gap-3 rounded-xl px-3 py-2.5 mb-1 fade-in" style={{
      background: 'var(--accent-subtle)', border: '1px solid var(--accent-dim)',
    }}>
      <span style={{ fontSize: 14, flexShrink: 0 }}>💡</span>
      <p style={{ fontSize: 11, color: 'var(--accent)', lineHeight: 1.5, flex: 1 }}>{tip}</p>
      <button
        onClick={dismiss}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', fontSize: 14, lineHeight: 1, flexShrink: 0, padding: 0, opacity: 0.7 }}
      >✕</button>
    </div>
  )
}
