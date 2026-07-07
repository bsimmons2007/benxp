import { useMemo } from 'react'
import { ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'
import { CHART_TOOLTIP_STYLE, CHART_AXIS_TICK_COLOR } from '../../lib/utils'
import { mondayKey } from '../../lib/nutrition'
import { useStore } from '../../store/useStore'

interface WeekPoint {
  week:     string
  volume:   number
  avgCals:  number | null
}

function formatWeekLabel(weekKey: string): string {
  const d = new Date(weekKey + 'T12:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function CalorieVolumeChart() {
  const rawRows = useStore(s => s.rawRows)

  const data = useMemo<WeekPoint[]>(() => {
    if (!rawRows) return []

    const volumeByWeek: Record<string, number> = {}
    for (const r of rawRows.liftingRows) {
      if (r.weight == null || r.sets == null || r.reps == null) continue
      const week = mondayKey(r.date)
      volumeByWeek[week] = (volumeByWeek[week] ?? 0) + r.weight * r.sets * r.reps
    }

    const calsByWeek: Record<string, number> = {}
    const daysByWeek: Record<string, Set<string>> = {}
    for (const m of rawRows.mealRows) {
      const week = mondayKey(m.date)
      calsByWeek[week] = (calsByWeek[week] ?? 0) + (m.calories || 0)
      ;(daysByWeek[week] ??= new Set()).add(m.date)
    }

    const weeks = new Set<string>([...Object.keys(volumeByWeek), ...Object.keys(calsByWeek)])
    return [...weeks]
      .sort((a, b) => a.localeCompare(b))
      .slice(-12)
      .map(week => {
        const distinctDays = daysByWeek[week]?.size ?? 0
        return {
          week:    formatWeekLabel(week),
          volume:  Math.round(volumeByWeek[week] ?? 0),
          avgCals: distinctDays > 0 ? Math.round((calsByWeek[week] ?? 0) / distinctDays) : null,
        }
      })
  }, [rawRows])

  const weeksWithBoth = data.filter(d => d.volume > 0 && d.avgCals != null).length
  if (weeksWithBoth < 2) return (
    <p style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>
      Log lifting and meals across at least 2 weeks to see how your calories track your training volume.
    </p>
  )

  return (
    <ResponsiveContainer width="100%" height={200}>
      <ComposedChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -8 }}>
        <CartesianGrid strokeDasharray="3 6" stroke="var(--border-subtle)" vertical={false} />
        <XAxis
          dataKey="week"
          tick={{ fill: CHART_AXIS_TICK_COLOR, fontSize: 9 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          yAxisId="left"
          tick={{ fill: CHART_AXIS_TICK_COLOR, fontSize: 9 }}
          axisLine={false}
          tickLine={false}
          width={44}
          tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          tick={{ fill: CHART_AXIS_TICK_COLOR, fontSize: 9 }}
          axisLine={false}
          tickLine={false}
          width={40}
        />
        <Tooltip
          contentStyle={CHART_TOOLTIP_STYLE}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          formatter={(v: any, name: string) =>
            name === 'volume'
              ? [`${Number(v).toLocaleString()} lbs`, 'Volume']
              : [`${Number(v).toLocaleString()} cal/day`, 'Avg calories']
          }
          cursor={{ fill: 'var(--border-subtle)' }}
        />
        <Legend
          wrapperStyle={{ fontSize: 11 }}
          formatter={(value: string) => value === 'volume' ? 'Weekly volume' : 'Avg daily calories'}
        />
        <Bar
          yAxisId="left"
          dataKey="volume"
          fill="var(--accent)"
          fillOpacity={0.7}
          radius={[4, 4, 0, 0]}
          barSize={18}
        />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="avgCals"
          stroke="var(--chart-alt)"
          strokeWidth={2.5}
          dot={{ r: 3, fill: 'var(--chart-alt)' }}
          connectNulls={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
