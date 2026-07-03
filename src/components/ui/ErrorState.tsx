import type { ReactNode } from 'react'

interface ErrorStateProps {
  icon?:  ReactNode
  title?: string
  sub?:   string
  onRetry: () => void
}

/** Mirrors EmptyState's shape but signals a failed fetch with a Retry action,
 *  so a network error no longer looks like "no data yet". */
export function ErrorState({ icon, title = 'Could not load', sub = 'Something went wrong fetching your data.', onRetry }: ErrorStateProps) {
  return (
    <div
      className="flex flex-col items-center justify-center text-center py-10 px-6 fade-in"
      style={{ border: '1.5px dashed var(--border)', borderRadius: 14 }}
    >
      {icon && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, opacity: 0.25 }}>
          {icon}
        </div>
      )}
      <p className="font-bold mb-2" style={{ color: 'var(--text-secondary)', fontSize: 15, letterSpacing: '0.04em' }}>
        {title}
      </p>
      <p className="text-sm" style={{ color: 'var(--text-muted)', maxWidth: 230, lineHeight: 1.6 }}>
        {sub}
      </p>
      <button
        onClick={onRetry}
        className="mt-6 px-6 py-2.5 rounded-xl font-semibold text-sm"
        style={{ background: 'var(--accent)', color: 'var(--base-bg)', boxShadow: 'var(--shadow-sm)', letterSpacing: '0.03em', border: 'none', cursor: 'pointer' }}
      >
        Try again
      </button>
    </div>
  )
}
