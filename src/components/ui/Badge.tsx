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
  const bg = color ?? categoryColors[label] ?? '#555'
  return (
    <span
      className="text-xs font-semibold px-2 py-0.5 rounded-full"
      style={{ background: bg, color: '#fff' }}
    >
      {label}
    </span>
  )
}
