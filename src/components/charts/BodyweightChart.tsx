import { useEffect, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { supabase } from '../../lib/supabase'
import { formatDate } from '../../lib/utils'

interface DataPoint {
  date: string
  weight_lbs: number
}

export function BodyweightChart() {
  const [data, setData] = useState<DataPoint[]>([])

  useEffect(() => {
    supabase
      .from('bodyweight_log')
      .select('date, weight_lbs')
      .order('date', { ascending: true })
      .then(({ data }) => setData(data ?? []))
  }, [])

  if (data.length === 0) return <p style={{ color: '#888' }}>No bodyweight data yet.</p>

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data}>
        <XAxis
          dataKey="date"
          tickFormatter={formatDate}
          tick={{ fill: '#888', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          domain={['auto', 'auto']}
          tick={{ fill: '#888', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={40}
        />
        <Tooltip
          contentStyle={{ background: '#16213E', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          labelFormatter={(label: any) => (typeof label === 'string' ? formatDate(label) : label)}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          formatter={(v: any) => [`${v} lbs`, 'Weight']}
        />
        <Line
          type="monotone"
          dataKey="weight_lbs"
          stroke="#F5A623"
          strokeWidth={2}
          dot={{ fill: '#F5A623', r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
