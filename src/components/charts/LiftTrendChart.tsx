import { useEffect, useState } from 'react'
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, CartesianGrid, Legend } from 'recharts'
import { supabase } from '../../lib/supabase'
import { formatDate, formatDateTooltip } from '../../lib/utils'

interface DataPoint {
  date:    string
  est_1rm: number | null
  reps:    number | null
}

interface ComparePoint {
  day:      number
  current:  number | null
  prior:    number | null
}

const todayStr = new Date().toISOString().slice(0, 10)

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomDot(props: any) {
  const { cx, cy, index, data, color: dotColor } = props
  const c = dotColor ?? 'var(--accent)'
  const isLast = index === data.length - 1
  const isToday = isLast && data[index]?.date === todayStr
  if (!isLast) return <circle cx={cx} cy={cy} r={3} fill={c} fillOpacity={0.7} />
  return (
    <g>
      {isToday && <circle cx={cx} cy={cy} r={10} fill={c} fillOpacity={0.1} className="chart-today-pulse" />}
      <circle cx={cx} cy={cy} r={7} fill={c} fillOpacity={0.18} />
      <circle cx={cx} cy={cy} r={4} fill={c} />
    </g>
  )
}

const TT_STYLE = {
  background: 'rgba(10,10,22,0.97)',
  border: '1px solid var(--border)',
  borderRadius: 8,
  color: 'var(--text-primary)',
  fontSize: 12,
  boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
}

function buildCompareData(data: DataPoint[], dataKey: 'est_1rm' | 'reps'): ComparePoint[] {
  const now = new Date()
  const cutoff = new Date(now); cutoff.setDate(cutoff.getDate() - 30)
  const cutoffPrior = new Date(now); cutoffPrior.setDate(cutoffPrior.getDate() - 60)

  const currentRows = data.filter(d => d.date >= cutoff.toISOString().slice(0, 10))
  const priorRows   = data.filter(d => d.date >= cutoffPrior.toISOString().slice(0, 10) && d.date < cutoff.toISOString().slice(0, 10))

  const days = 30
  const points: ComparePoint[] = Array.from({ length: days }, (_, i) => ({ day: i + 1, current: null, prior: null }))

  currentRows.forEach(d => {
    const diff = Math.floor((new Date(now).getTime() - new Date(d.date).getTime()) / 86_400_000)
    const idx = days - 1 - diff
    if (idx >= 0 && idx < days) {
      const val = dataKey === 'reps' ? d.reps : d.est_1rm
      if (val != null && (points[idx].current == null || val > (points[idx].current ?? 0))) points[idx].current = val
    }
  })

  priorRows.forEach(d => {
    const diff = Math.floor((new Date(cutoff).getTime() - new Date(d.date).getTime()) / 86_400_000)
    const idx = days - 1 - diff
    if (idx >= 0 && idx < days) {
      const val = dataKey === 'reps' ? d.reps : d.est_1rm
      if (val != null && (points[idx].prior == null || val > (points[idx].prior ?? 0))) points[idx].prior = val
    }
  })

  return points
}

export function LiftTrendChart({ lift, pr, isBWLift = false }: { lift: string; pr: number; isBWLift?: boolean }) {
  const [data, setData]         = useState<DataPoint[]>([])
  const [compare, setCompare]   = useState(false)

  useEffect(() => {
    if (isBWLift) {
      supabase
        .from('lifting_log')
        .select('date, reps')
        .eq('lift', lift)
        .not('reps', 'is', null)
        .order('date', { ascending: true })
        .then(({ data: rows }) => {
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

  const gradId  = `lift-grad-${lift}`
  const dataKey = isBWLift ? 'reps' : 'est_1rm'
  const maxReps = isBWLift ? Math.max(...data.map(d => d.reps ?? 0)) : 0
  const color   = isBWLift ? '#4ade80' : 'var(--accent)'

  const hasPriorData = data.some(d => {
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 30)
    return d.date < cutoff.toISOString().slice(0, 10)
  })

  if (compare && hasPriorData) {
    const compareData = buildCompareData(data, dataKey as 'est_1rm' | 'reps')
    const unit = isBWLift ? 'reps' : 'lbs'
    return (
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
            <span style={{ color }}><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: color, marginRight: 4 }} />Last 30d</span>
            <span style={{ color: '#94a3b8' }}><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#94a3b8', marginRight: 4 }} />Prior 30d</span>
          </div>
          <button
            onClick={() => setCompare(false)}
            className="text-xs px-2 py-0.5 rounded-md"
            style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
          >
            All time
          </button>
        </div>
        <ResponsiveContainer width="100%" height={150}>
          <LineChart data={compareData} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 6" stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis
              dataKey="day"
              tickFormatter={(d: number) => `D${d}`}
              tick={{ fill: '#666', fontSize: 9 }}
              axisLine={false}
              tickLine={false}
              interval={4}
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
              labelFormatter={(l: number) => `Day ${l}`}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(v: any, name: string) => [`${Number(v).toFixed(1)} ${unit}`, name === 'current' ? 'Last 30d' : 'Prior 30d']}
              cursor={{ stroke: 'rgba(255,255,255,0.12)', strokeWidth: 1 }}
            />
            <Line type="monotone" dataKey="current" stroke={color} strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} connectNulls />
            <Line type="monotone" dataKey="prior" stroke="#94a3b8" strokeWidth={2} strokeDasharray="4 3" dot={false} activeDot={{ r: 4 }} connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </div>
    )
  }

  return (
    <div>
      {hasPriorData && (
        <div className="flex justify-end mb-1">
          <button
            onClick={() => setCompare(true)}
            className="text-xs px-2 py-0.5 rounded-md"
            style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
          >
            Compare periods
          </button>
        </div>
      )}
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
            labelFormatter={(l: any) => (typeof l === 'string' ? formatDateTooltip(l) : l)}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter={(v: any) => isBWLift
              ? [`${Number(v)} reps`, 'Best set']
              : [`${Number(v).toFixed(1)} lbs`, 'Est 1RM']
            }
            cursor={{ stroke: 'rgba(255,255,255,0.12)', strokeWidth: 1 }}
          />
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
    </div>
  )
}
