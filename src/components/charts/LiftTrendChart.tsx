import { useEffect, useState } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, CartesianGrid } from 'recharts'
import { supabase } from '../../lib/supabase'
import { formatDate } from '../../lib/utils'

interface DataPoint {
  date:    string
  est_1rm: number | null
  reps:    number | null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomDot(props: any) {
  const { cx, cy, index, data } = props
  const isLast = index === data.length - 1
  if (!isLast) return <circle cx={cx} cy={cy} r={3} fill="var(--accent)" fillOpacity={0.7} />
  return (
    <g>
      <circle cx={cx} cy={cy} r={7} fill="var(--accent)" fillOpacity={0.18} />
      <circle cx={cx} cy={cy} r={4} fill="var(--accent)" />
    </g>
  )
}

const TT_STYLE = {
  background: 'rgba(10,10,22,0.97)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 8,
  color: '#fff',
  fontSize: 12,
  boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
}

export function LiftTrendChart({ lift, pr, isBWLift = false }: { lift: string; pr: number; isBWLift?: boolean }) {
  const [data, setData] = useState<DataPoint[]>([])

  useEffect(() => {
    if (isBWLift) {
      // For BW lifts: fetch best reps per date
      supabase
        .from('lifting_log')
        .select('date, reps')
        .eq('lift', lift)
        .not('reps', 'is', null)
        .order('date', { ascending: true })
        .then(({ data: rows }) => {
          // Collapse to best reps per date
          const byDate: Record<string, number> = {}
          ;(rows ?? []).forEach((r: { date: string; reps: number }) => {
            if (!byDate[r.date] || r.reps > byDate[r.date]) byDate[r.date] = r.reps
          })
          setData(Object.entries(byDate).sort().map(([date, reps]) => ({ date, est_1rm: null, reps })))
        })
    } else {
      supabase
        .from('lifting_log')
        .select('date, est_1rm')
        .eq('lift', lift)
        .not('est_1rm', 'is', null)
        .order('date', { ascending: true })
        .then(({ data: rows }) => setData((rows ?? []).map(r => ({ ...r, reps: null }))))
    }
  }, [lift, isBWLift])

  if (data.length < 2) return <p className="text-xs py-2" style={{ color: '#888' }}>Need more sessions to show trend.</p>

  const gradId   = `lift-grad-${lift}`
  const dataKey  = isBWLift ? 'reps' : 'est_1rm'
  const maxReps  = isBWLift ? Math.max(...data.map(d => d.reps ?? 0)) : 0
  const color    = isBWLift ? '#4ade80' : 'var(--accent)'

  return (
    <ResponsiveContainer width="100%" height={150}>
      <AreaChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={color} stopOpacity={0.28} />
            <stop offset="100%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 6" stroke="rgba(255,255,255,0.04)" vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={(d: string) => formatDate(d)}
          tick={{ fill: '#666', fontSize: 9 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          domain={['auto', 'auto']}
          tick={{ fill: '#666', fontSize: 9 }}
          axisLine={false}
          tickLine={false}
          width={36}
        />
        <Tooltip
          contentStyle={TT_STYLE}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          labelFormatter={(l: any) => (typeof l === 'string' ? formatDate(l) : l)}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          formatter={(v: any) => isBWLift
            ? [`${Number(v)} reps`, 'Best set']
            : [`${Number(v).toFixed(1)} lbs`, 'Est 1RM']
          }
          cursor={{ stroke: 'rgba(255,255,255,0.12)', strokeWidth: 1 }}
        />
        {/* PR reference line */}
        {isBWLift ? (
          <ReferenceLine
            y={maxReps}
            stroke={color}
            strokeDasharray="5 3"
            strokeOpacity={0.6}
            label={{ value: `Best ${maxReps}`, fill: color, fontSize: 9, position: 'insideTopRight' }}
          />
        ) : (
          <ReferenceLine
            y={pr}
            stroke={color}
            strokeDasharray="5 3"
            strokeOpacity={0.6}
            label={{ value: `PR ${pr.toFixed(0)}`, fill: color, fontSize: 9, position: 'insideTopRight' }}
          />
        )}
        <Area
          type="monotone"
          dataKey={dataKey}
          stroke={color}
          strokeWidth={2.5}
          fill={`url(#${gradId})`}
          dot={<CustomDot data={data} />}
          activeDot={{ r: 5, fill: color, stroke: 'rgba(255,255,255,0.3)', strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
