interface ProgressBarProps {
  value: number // 0 to 1
  color?: string
}

export function ProgressBar({ value, color = '#F5A623' }: ProgressBarProps) {
  const pct = Math.min(Math.max(value * 100, 0), 100)
  return (
    <div
      className="w-full rounded-full overflow-hidden"
      style={{ height: 12, background: 'rgba(255,255,255,0.1)' }}
    >
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  )
}
