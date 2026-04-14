import { forwardRef } from 'react'
import type { InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className = '', id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="section-label"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`w-full px-3 py-2.5 rounded-xl text-sm font-medium outline-none transition-all ${className}`}
          style={{
            background: 'var(--input-bg)',
            border: `1px solid ${error ? 'var(--error)' : 'var(--border)'}`,
            color: 'var(--text-primary)',
          }}
          {...props}
        />
        {error && (
          <span className="text-xs font-medium" style={{ color: 'var(--error)' }}>
            {error}
          </span>
        )}
        {hint && !error && (
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {hint}
          </span>
        )}
      </div>
    )
  }
)
Input.displayName = 'Input'
