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
        background: '#16213E',
        border: goldBorder ? '1px solid #F5A623' : '1px solid rgba(255,255,255,0.08)',
      }}
    >
      {children}
    </div>
  )
}
