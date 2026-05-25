interface BadgeProps {
  label: string
  color?: string
}

const categoryColors: Record<string, string> = {
  Gym:      'var(--badge-gym)',
  Skate:    'var(--badge-skate)',
  Books:    'var(--badge-books)',
  Fortnite: 'var(--badge-fortnite)',
  Sleep:    'var(--badge-sleep)',
  Habits:   'var(--badge-habits)',
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
