import type { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  goldBorder?: boolean
}

export function Card({ children, className = '', goldBorder = false }: CardProps) {
  return (
    <div
      className={`rounded-xl p-4 ${className}`}
      style={{
        background: 'rgba(16, 24, 52, 0.65)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: goldBorder ? '1px solid var(--accent)' : '1px solid rgba(255,255,255,0.07)',
        boxShadow: goldBorder ? '0 0 24px var(--accent-dim)' : '0 4px 24px rgba(0,0,0,0.3)',
      }}
    >
      {children}
    </div>
  )
}
