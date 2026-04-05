import { Card } from './Card'

interface StatCardProps {
  label: string
  value: string | number
  unit?: string
}

export function StatCard({ label, value, unit }: StatCardProps) {
  return (
    <Card>
      <p className="text-xs font-medium mb-1" style={{ color: '#888888' }}>
        {label}
      </p>
      <p className="text-2xl font-bold" style={{ color: '#F5A623' }}>
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
