import { Card } from './Card'

interface StatCardProps {
  label: string
  value: string | number
  unit?: string
  highlight?: boolean
}

export function StatCard({ label, value, unit, highlight }: StatCardProps) {
  return (
    <Card className={`card-animate ${highlight ? 'pr-badge' : ''}`}>
      <p className="text-sm font-medium mb-1" style={{ color: '#AAAAAA', fontFamily: 'Cormorant Garamond, serif' }}>
        {label}
      </p>
      <p className="text-2xl font-bold" style={{ color: 'var(--accent)' }}>
        {value}
        {unit && (
          <span className="text-sm font-normal ml-1" style={{ color: '#888888' }}>
            {unit}
          </span>
        )}
      </p>
    </Card>
  )
}
