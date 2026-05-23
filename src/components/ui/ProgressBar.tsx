interface ProgressBarProps {
  value: number // 0 to 1
  color?: string
  height?: number
  glow?: boolean
}

export function ProgressBar({ value, color = 'var(--accent)', height = 12, glow = false }: ProgressBarProps) {
  const pct = Math.min(Math.max(value * 100, 0), 100)
  return (
    <div
      className="w-full rounded-full overflow-hidden"
      style={{ height, background: 'var(--surface-2)', border: '1px solid var(--border-subtle)' }}
    >
      <div
        className="h-full rounded-full progress-bar-fill relative overflow-hidden"
        style={{
          width: `${pct}%`,
          background: `linear-gradient(90deg, ${color}cc 0%, ${color} 100%)`,
          boxShadow: glow ? `0 0 10px ${color}, 0 0 20px ${color}55` : undefined,
          transition: 'width 0.9s cubic-bezier(0.22,1,0.36,1)',
          minWidth: pct > 0 ? 4 : 0,
        }}
      >
        {/* shimmer sweep */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.25) 50%, transparent 100%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 2.2s ease-in-out infinite',
        }} />
      </div>
    </div>
  )
}
