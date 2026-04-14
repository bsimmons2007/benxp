import type { CSSProperties, ReactNode } from 'react'

interface CardProps {
  children:    ReactNode
  className?:  string
  style?:      CSSProperties
  /** Highlight with accent border + glow */
  accent?:     boolean
  /** @deprecated use accent */
  goldBorder?: boolean
  /** Remove default padding */
  noPadding?:  boolean
}

export function Card({ children, className = '', style, accent = false, goldBorder = false, noPadding = false }: CardProps) {
  const highlighted = accent || goldBorder
  return (
    <div
      className={`rounded-2xl ${noPadding ? '' : 'p-4'} ${className}`}
      style={{
        background:           'var(--card-bg)',
        backdropFilter:       'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border:     highlighted ? '1px solid var(--accent)' : '1px solid var(--border)',
        boxShadow:  highlighted ? '0 0 20px var(--accent-dim)' : '0 2px 16px rgba(0,0,0,0.2)',
        ...style,
      }}
    >
      {children}
    </div>
  )
}
