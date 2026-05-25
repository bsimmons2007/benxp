interface BadgeProps {
  label: string
  color?: string
}

const categoryColors: Record<string, string> = {
  Gym: '#27AE60',
  Skate: '#1ABC9C',
  Books: '#7B2FBE',
  Fortnite: '#0F3460',
  Sleep: '#3498DB',
  Habits: '#E67E22',
}

export function Badge({ label, color }: BadgeProps) {
  const bg = color ?? categoryColors[label] ?? 'var(--surface-2)'
  return (
    <span
      className="text-xs font-semibold px-2 py-1 rounded-full"
      style={{ background: bg, color: 'var(--text-primary)' }}
    >
      {label}
    </span>
  )
}
