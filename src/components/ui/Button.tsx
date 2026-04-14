import type { ReactNode, ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  fullWidth?: boolean
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className = '',
  style,
  ...props
}: ButtonProps) {
  const sizeClasses = {
    sm: 'h-8 px-3 text-xs',
    md: 'h-10 px-5 text-sm',
    lg: 'h-12 px-6 text-base',
  }[size]

  const base = [
    'inline-flex items-center justify-center gap-2 rounded-xl font-semibold',
    'transition-all duration-150 select-none',
    'disabled:opacity-40 disabled:cursor-not-allowed',
    'not-disabled:hover:-translate-y-px',
    sizeClasses,
    fullWidth ? 'w-full' : '',
    className,
  ].filter(Boolean).join(' ')

  const variantStyle: React.CSSProperties =
    variant === 'primary'
      ? {
          background: 'var(--accent)',
          color: '#1A1A2E',
          boxShadow: '0 2px 12px var(--accent-dim)',
        }
      : variant === 'secondary'
      ? {
          background: 'transparent',
          color: 'var(--accent)',
          border: '1px solid rgba(245,166,35,0.35)',
        }
      : {
          background: 'transparent',
          color: 'var(--text-secondary)',
          border: '1px solid var(--border)',
        }

  return (
    <button className={base} style={{ ...variantStyle, ...style }} {...props}>
      {children}
    </button>
  )
}
