import type { ReactNode, ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  fullWidth?: boolean
  loading?: boolean
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  disabled = false,
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
    <button className={base} style={{ ...variantStyle, ...style }} disabled={disabled || loading} {...props}>
      {loading && (
        <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3" />
          <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
      )}
      {children}
    </button>
  )
}
