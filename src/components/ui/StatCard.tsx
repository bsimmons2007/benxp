import { Card } from './Card'
import { useCountUp } from '../../hooks/useCountUp'

interface StatCardProps {
  label:      string
  value:      string | number
  unit?:      string
  highlight?: boolean
  animate?:   boolean   // count-up animation for numeric values
}

function AnimatedValue({ value, unit }: { value: string | number; unit?: string }) {
  const num      = typeof value === 'number' ? value : parseFloat(String(value))
  const decimals = String(value).includes('.') ? (String(value).split('.')[1]?.length ?? 0) : 0
  const isNum    = !isNaN(num)
  const display  = useCountUp(isNum ? num : 0, 900, decimals)

  return (
    <>
      {isNum ? display : value}
      {unit && <span className="font-normal ml-0.5" style={{ color: '#888888', fontSize: 10 }}>{unit}</span>}
    </>
  )
}

export function StatCard({ label, value, unit, highlight, animate = false }: StatCardProps) {
  return (
    <Card className={`card-animate ${highlight ? 'pr-badge' : ''} !p-3`}>
      <p className="font-medium mb-0.5 truncate" style={{ color: '#AAAAAA', fontFamily: 'Cormorant Garamond, serif', fontSize: 11 }}>
        {label}
      </p>
      <p className="text-lg font-bold leading-tight" style={{ color: 'var(--accent)' }}>
        {animate
          ? <AnimatedValue value={value} unit={unit} />
          : <>
              {value}
              {unit && <span className="font-normal ml-0.5" style={{ color: '#888888', fontSize: 10 }}>{unit}</span>}
            </>
        }
      </p>
    </Card>
  )
}
