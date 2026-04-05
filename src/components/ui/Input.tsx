import { forwardRef } from 'react'
import type { InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label className="text-sm font-medium" style={{ color: '#888888' }}>
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`px-3 py-2 rounded-lg text-white outline-none ${className}`}
          style={{
            background: '#0D1B2A',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
          onFocus={(e) => {
            e.target.style.border = '1px solid #F5A623'
            props.onFocus?.(e)
          }}
          onBlur={(e) => {
            e.target.style.border = '1px solid rgba(255,255,255,0.1)'
            props.onBlur?.(e)
          }}
          {...props}
        />
        {error && <span className="text-xs" style={{ color: '#E94560' }}>{error}</span>}
      </div>
    )
  }
)
Input.displayName = 'Input'
