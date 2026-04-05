import { Card } from './Card'

interface StatCardProps {
  label: string
  value: string | number
  unit?: string
  highlight?: boolean
}

export function StatCard({ label, value, unit, highlight }: StatCardProps) {
  return (
    <Card className={`card-animate ${highlight ? 'pr-badge' : ''} !p-3`}>
      <p className="font-medium mb-0.5 truncate" style={{ color: '#AAAAAA', fontFamily: 'Cormorant Garamond, serif', fontSize: 11 }}>
        {label}
      </p>
      <p className="text-lg font-bold leading-tight" style={{ color: 'var(--accent)' }}>
        {value}
        {unit && (
          <span className="font-normal ml-0.5" style={{ color: '#888888', fontSize: 10 }}>
            {unit}
          </span>
        )}
      </p>
    </Card>
  )
}
