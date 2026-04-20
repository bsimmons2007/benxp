import { useEffect, useState } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, CartesianGrid } from 'recharts'
import { supabase } from '../../lib/supabase'
import { formatDate } from '../../lib/utils'

const BW_GOAL_KEY = 'youxp-bw-goal'

interface DataPoint {
  date:       string
  bodyweight: number
}

const TT_STYLE = {
  background: 'rgba(10,10,22,0.97)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 8,
  color: '#fff',
  fontSize: 12,
  boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomDot(props: any) {
  const { cx, cy, index, data } = props
  const isLast = index === (data?.length ?? 0) - 1
  if (!isLast) return <circle cx={cx} cy={cy} r={3} fill="var(--accent)" fillOpacity={0.7} />
  return (
    <g>
      <circle cx={cx} cy={cy} r={8} fill="var(--accent)" fillOpacity={0.15} />
      <circle cx={cx} cy={cy} r={4} fill="var(--accent)" />
    </g>
  )
}

export function BodyweightChart() {
  const [data, setData]       = useState<DataPoint[]>([])
  const [goal, setGoal]       = useState<number | null>(() => {
    const v = localStorage.getItem(BW_GOAL_KEY)
    return v ? parseFloat(v) : null
  })
  const [editingGoal, setEditingGoal] = useState(false)
  const [goalInput, setGoalInput]     = useState('')

  function saveGoal() {
    const v = parseFloat(goalInput)
    if (!isNaN(v) && v > 0) {
      localStorage.setItem(BW_GOAL_KEY, String(v))
      setGoal(v)
    }
    setEditingGoal(false)
  }

  function clearGoal() {
    localStorage.removeItem(BW_GOAL_KEY)
    setGoal(null)
    setEditingGoal(false)
  }

  useEffect(() => {
    supabase
      .from('lifting_log')
      .select('date, bodyweight')
      .not('bodyweight', 'is', null)
      .order('date', { ascending: true })
      .then(({ data: rows }) => {
        if (!rows?.length) return

        // One entry per day — take the last logged bodyweight for each date
        const byDate: Record<string, number> = {}
        rows.forEach((r: { date: string; bodyweight: number }) => {
          byDate[r.date] = r.bodyweight
        })

        setData(
          Object.entries(byDate)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, bodyweight]) => ({ date, bodyweight }))
        )
      })
  }, [])

  const latest = data.length ? data[data.length - 1].bodyweight : null
  const diff   = goal && latest ? (latest - goal).toFixed(1) : null

  if (data.length === 0) return (
    <p style={{ color: '#888', fontSize: 13 }}>
      No bodyweight logged yet — enter it when logging a set.
    </p>
  )

  // Determine area color based on goal progress
  const areaColor = goal && latest
    ? (latest <= goal ? '#4ade80' : 'var(--accent)')
    : 'var(--accent)'

  return (
    <div>
      {/* Goal row */}
      <div className="flex items-center justify-between mb-3">
        <div>
          {goal ? (
            <div className="flex items-center gap-2">
              <span style={{ color: '#888', fontSize: 12 }}>Goal: <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{goal} lbs</span></span>
              {diff && (
                <span style={{ fontSize: 11, color: parseFloat(diff) <= 0 ? '#4ade80' : '#f97316' }}>
                  ({parseFloat(diff) > 0 ? '+' : ''}{diff} lbs)
                </span>
              )}
            </div>
          ) : (
            <span style={{ color: '#777', fontSize: 12 }}>No goal set</span>
          )}
        </div>
        <button
          onClick={() => { setGoalInput(goal ? String(goal) : ''); setEditingGoal(e => !e) }}
          style={{ fontSize: 11, color: 'var(--accent)', background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 6, padding: '3px 10px', cursor: 'pointer' }}
        >
          {editingGoal ? 'Cancel' : goal ? 'Edit Goal' : 'Set Goal'}
        </button>
      </div>

      {/* Goal input */}
      {editingGoal && (
        <div className="flex gap-2 mb-3">
          <input
            type="number"
            step="0.1"
            placeholder="Target weight (lbs)"
            value={goalInput}
            onChange={e => setGoalInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') saveGoal() }}
            autoFocus
            style={{
              flex: 1, padding: '6px 12px', borderRadius: 8, fontSize: 13,
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
              color: '#fff', outline: 'none',
            }}
          />
          <button onClick={saveGoal} style={{ padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700, background: 'var(--accent)', color: 'var(--base-bg)', border: 'none', cursor: 'pointer' }}>Save</button>
          {goal && <button onClick={clearGoal} style={{ padding: '6px 10px', borderRadius: 8, fontSize: 12, color: '#888', background: 'rgba(255,255,255,0.04)', border: 'none', cursor: 'pointer' }}>Clear</button>}
        </div>
      )}

      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="bw-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={areaColor} stopOpacity={0.28} />
              <stop offset="100%" stopColor={areaColor} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 6" stroke="rgba(255,255,255,0.04)" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            tick={{ fill: '#666', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={['auto', 'auto']}
            tick={{ fill: '#666', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={40}
          />
          <Tooltip
            contentStyle={TT_STYLE}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            labelFormatter={(label: any) => (typeof label === 'string' ? formatDate(label) : label)}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter={(v: any) => [`${v} lbs`, 'Bodyweight']}
            cursor={{ stroke: 'rgba(255,255,255,0.12)', strokeWidth: 1 }}
          />
          {goal && (
            <ReferenceLine
              y={goal}
              stroke="#4ade80"
              strokeDasharray="5 3"
              strokeOpacity={0.7}
              label={{ value: `Goal ${goal}`, fill: '#4ade80', fontSize: 9, position: 'insideTopRight' }}
            />
          )}
          <Area
            type="monotone"
            dataKey="bodyweight"
            stroke={areaColor}
            strokeWidth={2.5}
            fill="url(#bw-grad)"
            dot={<CustomDot data={data} />}
            activeDot={{ r: 5, fill: areaColor, stroke: 'rgba(255,255,255,0.3)', strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
