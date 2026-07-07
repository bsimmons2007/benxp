import { useMemo, useState } from 'react'
import { ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'
import { CHART_TOOLTIP_STYLE, CHART_AXIS_TICK_COLOR } from '../../lib/utils'
import { mondayKey } from '../../lib/nutrition'
import { useStore } from '../../store/useStore'

type Overlay = 'sleep' | 'mood'

interface WeekPoint {
  week:     string
  avgCals:  number | null
  avgSleep: number | null
  avgMood:  number | null
}

function formatWeekLabel(weekKey: string): string {
  const d = new Date(weekKey + 'T12:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function NutritionWellnessChart() {
  const rawRows = useStore(s => s.rawRows)
  const [overlay, setOverlay] = useState<Overlay>('sleep')

  const data = useMemo<WeekPoint[]>(() => {
    if (!rawRows) return []

    const calsByWeek: Record<string, number> = {}
    const daysByWeek: Record<string, Set<string>> = {}
    for (const m of rawRows.mealRows) {
      const week = mondayKey(m.date)
      calsByWeek[week] = (calsByWeek[week] ?? 0) + (m.calories || 0)
      ;(daysByWeek[week] ??= new Set()).add(m.date)
    }

    const sleepSumByWeek: Record<string, number> = {}
    const sleepCountByWeek: Record<string, number> = {}
    for (const s of rawRows.sleepRows) {
      if (s.hours_slept == null) continue
      const week = mondayKey(s.date)
      sleepSumByWeek[week] = (sleepSumByWeek[week] ?? 0) + s.hours_slept
      sleepCountByWeek[week] = (sleepCountByWeek[week] ?? 0) + 1
    }

    const moodSumByWeek: Record<string, number> = {}
    const moodCountByWeek: Record<string, number> = {}
    for (const m of rawRows.moodRows) {
      if (m.mood == null) continue
      const week = mondayKey(m.date)
      moodSumByWeek[week] = (moodSumByWeek[week] ?? 0) + m.mood
      moodCountByWeek[week] = (moodCountByWeek[week] ?? 0) + 1
    }

    const weeks = new Set<string>([
      ...Object.keys(calsByWeek),
      ...Object.keys(sleepSumByWeek),
      ...Object.keys(moodSumByWeek),
    ])

    return [...weeks]
      .sort((a, b) => a.localeCompare(b))
      .slice(-12)
      .map(week => {
        const distinctDays = daysByWeek[week]?.size ?? 0
        const sleepCount = sleepCountByWeek[week] ?? 0
        const moodCount = moodCountByWeek[week] ?? 0
        return {
          week:     formatWeekLabel(week),
          avgCals:  distinctDays > 0 ? Math.round((calsByWeek[week] ?? 0) / distinctDays) : null,
          avgSleep: sleepCount > 0 ? Math.round((sleepSumByWeek[week] / sleepCount) * 10) / 10 : null,
          avgMood:  moodCount > 0 ? Math.round((moodSumByWeek[week] / moodCount) * 10) / 10 : null,
        }
      })
  }, [rawRows])

  const overlayKey = overlay === 'sleep' ? 'avgSleep' : 'avgMood'
  const weeksWithBoth = data.filter(d => d.avgCals != null && d[overlayKey] != null).length

  if (weeksWithBoth < 2) return (
    <p style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>
      Log meals and sleep or mood across at least 2 weeks to see how your fueling tracks your recovery.
    </p>
  )

  return (
    <div>
      <div style={{ display: 'flex', gap: 4, marginBottom: 8, justifyContent: 'flex-end' }}>
        <button
          type="button"
          aria-label="Show sleep overlay"
          onClick={() => setOverlay('sleep')}
          style={{
            padding: '4px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700,
            fontFamily: 'var(--font-mono)',
            background: overlay === 'sleep' ? 'var(--chart-alt)' : 'var(--input-bg)',
            color: overlay === 'sleep' ? 'var(--base-bg)' : 'var(--text-muted)',
            border: `1px solid ${overlay === 'sleep' ? 'var(--chart-alt)' : 'var(--border)'}`,
            cursor: 'pointer',
          }}
        >
          Sleep
        </button>
        <button
          type="button"
          aria-label="Show mood overlay"
          onClick={() => setOverlay('mood')}
          style={{
            padding: '4px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700,
            fontFamily: 'var(--font-mono)',
            background: overlay === 'mood' ? 'var(--chart-alt)' : 'var(--input-bg)',
            color: overlay === 'mood' ? 'var(--base-bg)' : 'var(--text-muted)',
            border: `1px solid ${overlay === 'mood' ? 'var(--chart-alt)' : 'var(--border)'}`,
            cursor: 'pointer',
          }}
        >
          Mood
        </button>
      </div>

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
            width={32}
            domain={overlay === 'mood' ? [0, 10] : undefined}
          />
          <Tooltip
            contentStyle={CHART_TOOLTIP_STYLE}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter={(v: any, name: string) => {
              if (name === 'avgCals') return [`${Number(v).toLocaleString()} cal/day`, 'Avg calories']
              if (name === 'avgSleep') return [`${Number(v).toFixed(1)} hrs`, 'Avg sleep']
              return [`${Number(v).toFixed(1)} / 10`, 'Avg mood']
            }}
            cursor={{ fill: 'var(--border-subtle)' }}
          />
          <Legend
            wrapperStyle={{ fontSize: 11 }}
            formatter={(value: string) => {
              if (value === 'avgCals') return 'Avg daily calories'
              return value === 'avgSleep' ? 'Avg sleep' : 'Avg mood'
            }}
          />
          <Bar
            yAxisId="left"
            dataKey="avgCals"
            fill="var(--accent)"
            fillOpacity={0.7}
            radius={[4, 4, 0, 0]}
            barSize={18}
          />
          {overlay === 'sleep' ? (
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="avgSleep"
              stroke="var(--chart-alt)"
              strokeWidth={2.5}
              dot={{ r: 3, fill: 'var(--chart-alt)' }}
              connectNulls={false}
            />
          ) : (
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="avgMood"
              stroke="var(--chart-alt)"
              strokeWidth={2.5}
              dot={{ r: 3, fill: 'var(--chart-alt)' }}
              connectNulls={false}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
