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
      ? { background: '#F5A623', color: '#1A1A2E' }
      : { background: 'transparent', color: '#F5A623', border: '1px solid #F5A623' }

  return (
    <button className={`${base} ${className}`} style={styles} {...props}>
      {children}
    </button>
  )
}
