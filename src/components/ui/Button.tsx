import type { ReactNode, ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  variant?: 'primary' | 'secondary'
  fullWidth?: boolean
}

export function Button({ children, variant = 'primary', fullWidth = false, className = '', ...props }: ButtonProps) {
  const base = `px-4 py-2 rounded-lg font-semibold transition-opacity disabled:opacity-50 ${fullWidth ? 'w-full' : ''}`
  const styles =
    variant === 'primary'
      ? { background: 'var(--accent)', color: 'var(--base-bg)' }
      : { background: 'transparent', color: 'var(--accent)', border: '1px solid var(--accent)' }

  return (
    <button className={`${base} ${className}`} style={styles} {...props}>
      {children}
    </button>
  )
}
