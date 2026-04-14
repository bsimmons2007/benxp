import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts'
import { supabase } from '../../lib/supabase'

interface WeekPoint {
  week:   string
  volume: number
}

function getMondayKey(dateStr: string): string {
  const d   = new Date(dateStr + 'T12:00:00')
  const day  = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d.toISOString().slice(0, 10)
}

function formatWeekLabel(weekKey: string): string {
  const d = new Date(weekKey + 'T12:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const TT_STYLE = {
  background: 'rgba(10,10,22,0.97)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 8,
  color: '#fff',
  fontSize: 11,
  boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomBar(props: any) {
  const { x, y, width, height, fraction } = props
  const opacity = 0.22 + fraction * 0.78
  return (
    <rect
      x={x}
      y={y}
      width={width}
      height={height}
      rx={4}
      ry={4}
      fill="var(--accent)"
      fillOpacity={opacity}
      style={{ transition: 'fill-opacity 0.3s ease' }}
    />
  )
}

export function VolumeTrendChart() {
  const [data, setData] = useState<WeekPoint[]>([])

  useEffect(() => {
    supabase
      .from('lifting_log')
      .select('date, weight, sets, reps')
      .not('weight', 'is', null)
      .order('date', { ascending: true })
      .then(({ data: rows }) => {
        if (!rows?.length) { setData([]); return }

        const byWeek: Record<string, number> = {}
        for (const r of rows as { date: string; weight: number; sets: number; reps: number }[]) {
          if (!r.weight || !r.sets || !r.reps) continue
          const week = getMondayKey(r.date)
          byWeek[week] = (byWeek[week] ?? 0) + r.weight * r.sets * r.reps
        }

        setData(
          Object.entries(byWeek)
            .sort(([a], [b]) => a.localeCompare(b))
            .slice(-10)
            .map(([week, volume]) => ({ week: formatWeekLabel(week), volume: Math.round(volume) }))
        )
      })
  }, [])

  if (data.length < 2) return (
    <p style={{ color: '#888', fontSize: 13 }}>Need more sessions to show volume trend.</p>
  )

  const maxVol = Math.max(...data.map(d => d.volume))
  const avgVol = Math.round(data.reduce((s, d) => s + d.volume, 0) / data.length)

  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={data} barSize={20} margin={{ left: -10, top: 4 }}>
        <XAxis
          dataKey="week"
          tick={{ fill: '#666', fontSize: 9 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: '#666', fontSize: 9 }}
          axisLine={false}
          tickLine={false}
          width={44}
          tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
        />
        <Tooltip
          contentStyle={TT_STYLE}
          formatter={(v: number) => [`${v.toLocaleString()} lbs`, 'Volume']}
          cursor={{ fill: 'rgba(255,255,255,0.04)' }}
        />
        <ReferenceLine y={avgVol} stroke="rgba(255,255,255,0.18)" strokeDasharray="4 2" />
        <Bar dataKey="volume" radius={[4, 4, 0, 0]} shape={(props: object) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const p = props as any
          const fraction = maxVol > 0 ? p.volume / maxVol : 0
          return <CustomBar {...p} fraction={fraction} />
        }}>
          {data.map((_, i) => <Cell key={i} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
