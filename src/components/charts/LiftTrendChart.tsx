import { useEffect, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { supabase } from '../../lib/supabase'
import { formatDate } from '../../lib/utils'
import type { LiftType } from '../../types'

interface DataPoint {
  date: string
  est_1rm: number
}

export function LiftTrendChart({ lift, pr }: { lift: LiftType; pr: number }) {
  const [data, setData] = useState<DataPoint[]>([])

  useEffect(() => {
    supabase
      .from('lifting_log')
      .select('date, est_1rm')
      .eq('lift', lift)
      .not('est_1rm', 'is', null)
      .order('date', { ascending: true })
      .then(({ data }) => setData(data ?? []))
  }, [lift])

  if (data.length < 2) return <p className="text-xs py-2" style={{ color: '#888' }}>Need more sessions to show trend.</p>

  return (
    <ResponsiveContainer width="100%" height={140}>
      <LineChart data={data}>
        <XAxis
          dataKey="date"
          tickFormatter={(d: string) => formatDate(d)}
          tick={{ fill: '#888', fontSize: 10 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          domain={['auto', 'auto']}
          tick={{ fill: '#888', fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          width={38}
        />
        <Tooltip
          contentStyle={{ background: 'var(--bg-mid)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: 12 }}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          labelFormatter={(l: any) => (typeof l === 'string' ? formatDate(l) : l)}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          formatter={(v: any) => [`${Number(v).toFixed(1)} lbs`, 'Est 1RM']}
        />
        <ReferenceLine y={pr} stroke="var(--accent)" strokeDasharray="4 2" strokeOpacity={0.5} />
        <Line
          type="monotone"
          dataKey="est_1rm"
          stroke="var(--accent)"
          strokeWidth={2}
          dot={{ fill: 'var(--accent)', r: 3 }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
