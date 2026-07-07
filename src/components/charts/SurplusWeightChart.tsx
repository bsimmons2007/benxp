import { useEffect, useMemo, useState } from 'react'
import { ComposedChart, Area, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts'
import { supabase } from '../../lib/supabase'
import { CHART_TOOLTIP_STYLE, CHART_AXIS_TICK_COLOR, formatDate, formatDateTooltip, localDateStr } from '../../lib/utils'
import { useStore } from '../../store/useStore'

interface DayPoint {
  date:          string
  cumSurplus:    number | null
  weight:        number | null
}

const RANGE_DAYS = 90

/** target = current daily calorie target (or null when unavailable). */
export function SurplusWeightChart({ target }: { target: number | null }) {
  const rawRows = useStore(s => s.rawRows)
  const [weights, setWeights] = useState<{ date: string; weight_lbs: number }[]>([])

  useEffect(() => {
    let cancelled = false
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - RANGE_DAYS)
    const cutoffStr = localDateStr(cutoff)
    supabase
      .from('body_measurements')
      .select('date, weight_lbs')
      .not('weight_lbs', 'is', null)
      .gte('date', cutoffStr)
      .order('date', { ascending: true })
      .then(({ data }) => {
        if (cancelled) return
        setWeights((data ?? []) as { date: string; weight_lbs: number }[])
      })
    return () => { cancelled = true }
  }, [])

  const cutoffStr = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() - RANGE_DAYS)
    return localDateStr(d)
  }, [])

  const { data, loggedDays, prDates } = useMemo(() => {
    if (!rawRows) return { data: [] as DayPoint[], loggedDays: 0, prDates: [] as string[] }

    const calsByDate: Record<string, number> = {}
    for (const m of rawRows.mealRows) {
      if (m.date < cutoffStr) continue
      calsByDate[m.date] = (calsByDate[m.date] ?? 0) + (m.calories || 0)
    }

    const weightByDate: Record<string, number> = {}
    for (const w of weights) weightByDate[w.date] = w.weight_lbs

    const dates = new Set<string>([...Object.keys(calsByDate), ...Object.keys(weightByDate)])
    const sorted = [...dates].sort((a, b) => a.localeCompare(b))

    let running = 0
    const rows: DayPoint[] = sorted.map(date => {
      const cals = calsByDate[date]
      if (cals != null && target != null) running += cals - target
      return {
        date,
        cumSurplus: cals != null && target != null ? Math.round(running) : null,
        weight:     weightByDate[date] ?? null,
      }
    })

    const prDates = rawRows.prRows
      .filter(r => r.date >= cutoffStr)
      .map(r => r.date)

    return { data: rows, loggedDays: Object.keys(calsByDate).length, prDates }
  }, [rawRows, weights, target, cutoffStr])

  if (loggedDays < 7) return (
    <p style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>
      Log meals on at least 7 days to chart your cumulative surplus against bodyweight.
    </p>
  )

  const uniquePrDates = [...new Set(prDates)]

  return (
    <ResponsiveContainer width="100%" height={220}>
      <ComposedChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -8 }}>
        <defs>
          <linearGradient id="surplus-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="var(--accent)" stopOpacity={0.18} />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 6" stroke="var(--border-subtle)" vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={formatDate}
          tick={{ fill: CHART_AXIS_TICK_COLOR, fontSize: 9 }}
          axisLine={false}
          tickLine={false}
          minTickGap={24}
        />
        <YAxis
          yAxisId="left"
          tick={{ fill: CHART_AXIS_TICK_COLOR, fontSize: 9 }}
          axisLine={false}
          tickLine={false}
          width={48}
          tickFormatter={(v: number) => Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          domain={['auto', 'auto']}
          tick={{ fill: CHART_AXIS_TICK_COLOR, fontSize: 9 }}
          axisLine={false}
          tickLine={false}
          width={40}
        />
        <Tooltip
          contentStyle={CHART_TOOLTIP_STYLE}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          labelFormatter={(label: any) => typeof label === 'string' ? formatDateTooltip(label) : label}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          formatter={(v: any, name: string) =>
            name === 'cumSurplus'
              ? [`${Number(v).toLocaleString()} cal`, 'Cumulative']
              : [`${v} lbs`, 'Bodyweight']
          }
          cursor={{ stroke: 'var(--border-subtle)', strokeWidth: 1 }}
        />
        <ReferenceLine yAxisId="left" y={0} stroke="var(--border-default)" strokeDasharray="4 2" />
        {uniquePrDates.map(d => (
          <ReferenceLine
            key={d}
            yAxisId="left"
            x={d}
            stroke="var(--chart-alt)"
            strokeOpacity={0.35}
            strokeDasharray="2 4"
          />
        ))}
        <Area
          yAxisId="left"
          type="monotone"
          dataKey="cumSurplus"
          stroke="var(--accent)"
          strokeWidth={2}
          fill="url(#surplus-grad)"
          connectNulls
          dot={false}
        />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="weight"
          stroke="var(--chart-alt)"
          strokeWidth={2}
          dot={false}
          connectNulls
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
