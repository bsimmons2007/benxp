import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { TopBar } from '../components/layout/TopBar'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { Toast } from '../components/ui/Toast'
import { EmptyState } from '../components/ui/EmptyState'
import { RulerIcon } from '../components/ui/Icon'
import { supabase } from '../lib/supabase'
import { today, formatDate } from '../lib/utils'
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts'
import { usePageTitle } from '../hooks/usePageTitle'

// ── Types ─────────────────────────────────────────────────────
interface Measurement {
  id:            string
  date:          string
  weight_lbs:    number | null
  chest_in:      number | null
  waist_in:      number | null
  hips_in:       number | null
  neck_in:       number | null
  shoulders_in:  number | null
  bicep_l_in:    number | null
  bicep_r_in:    number | null
  forearm_in:    number | null
  thigh_l_in:    number | null
  thigh_r_in:    number | null
  calf_in:       number | null
  body_fat_pct:  number | null
  notes:         string | null
}

type MeasureForm = {
  date:          string
  weight_lbs:    string
  chest_in:      string
  waist_in:      string
  hips_in:       string
  neck_in:       string
  shoulders_in:  string
  bicep_l_in:    string
  bicep_r_in:    string
  forearm_in:    string
  thigh_l_in:    string
  thigh_r_in:    string
  calf_in:       string
  body_fat_pct:  string
  notes:         string
}

// ── Field groups for the form ──────────────────────────────────
const FIELD_GROUPS = [
  {
    label: 'Body Weight & Composition',
    fields: [
      { key: 'weight_lbs',   label: 'Weight',      unit: 'lbs' },
      { key: 'body_fat_pct', label: 'Body Fat',     unit: '%'   },
    ],
  },
  {
    label: 'Upper Body',
    fields: [
      { key: 'chest_in',     label: 'Chest',        unit: 'in' },
      { key: 'shoulders_in', label: 'Shoulders',    unit: 'in' },
      { key: 'neck_in',      label: 'Neck',         unit: 'in' },
      { key: 'bicep_l_in',   label: 'Bicep (L)',    unit: 'in' },
      { key: 'bicep_r_in',   label: 'Bicep (R)',    unit: 'in' },
      { key: 'forearm_in',   label: 'Forearm',      unit: 'in' },
    ],
  },
  {
    label: 'Lower Body',
    fields: [
      { key: 'waist_in',     label: 'Waist',        unit: 'in' },
      { key: 'hips_in',      label: 'Hips',         unit: 'in' },
      { key: 'thigh_l_in',   label: 'Thigh (L)',    unit: 'in' },
      { key: 'thigh_r_in',   label: 'Thigh (R)',    unit: 'in' },
      { key: 'calf_in',      label: 'Calf',         unit: 'in' },
    ],
  },
]

// ── Trend chart ────────────────────────────────────────────────
function MiniTrend({ data, color }: { data: { date: string; v: number }[]; color?: string }) {
  if (data.length < 2) return null
  return (
    <ResponsiveContainer width="100%" height={52}>
      <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={color ?? 'var(--accent)'} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color ?? 'var(--accent)'} stopOpacity={0}    />
          </linearGradient>
        </defs>
        <XAxis dataKey="date" hide />
        <YAxis domain={['auto', 'auto']} hide />
        <Tooltip
          contentStyle={{ background: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: 8, fontSize: 11 }}
          labelFormatter={(l: string) => formatDate(l)}
          formatter={(v: number) => [v.toFixed(1), '']}
        />
        <Area type="monotone" dataKey="v" stroke={color ?? 'var(--accent)'} strokeWidth={2} fill="url(#trendGrad)" dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

// ── Snapshot row ───────────────────────────────────────────────
function SnapshotStat({
  label, latest, prev, unit,
}: { label: string; latest: number; prev?: number; unit: string }) {
  const delta = prev != null ? latest - prev : null
  return (
    <div className="flex flex-col">
      <p style={{ color: '#444', fontSize: 10, marginBottom: 2 }}>{label}</p>
      <p className="font-bold" style={{ color: 'var(--accent)', fontSize: 16 }}>
        {latest.toFixed(1)}<span style={{ color: '#444', fontSize: 10, marginLeft: 2 }}>{unit}</span>
      </p>
      {delta != null && (
        <p style={{ fontSize: 10, color: delta < 0 ? '#4ade80' : delta > 0 ? '#f87171' : '#888', marginTop: 1 }}>
          {delta > 0 ? '+' : ''}{delta.toFixed(1)}
        </p>
      )}
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────
export function Measurements() {
  usePageTitle('Measurements')
  const [rows, setRows]         = useState<Measurement[]>([])
  const [loading, setLoading]   = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving]     = useState(false)
  const [toast, setToast]       = useState('')
  const [activeChart, setActiveChart] = useState<keyof Measurement>('weight_lbs')

  const { register, handleSubmit, reset } = useForm<MeasureForm>({
    defaultValues: { date: today() },
  })

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('body_measurements')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(60)
    setRows((data ?? []) as Measurement[])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function onSubmit(form: MeasureForm) {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }

    const payload: Record<string, unknown> = { user_id: user.id, date: form.date }
    for (const k of Object.keys(form) as (keyof MeasureForm)[]) {
      if (k === 'date' || k === 'notes') continue
      const v = parseFloat(form[k])
      if (!isNaN(v)) payload[k] = v
    }
    if (form.notes.trim()) payload['notes'] = form.notes.trim()

    await supabase.from('body_measurements').insert(payload)
    reset({ date: today() })
    setShowForm(false)
    setToast('Measurements saved ✓')
    load()
    setSaving(false)
  }

  // Build chart data for selected metric
  const chartData = [...rows]
    .reverse()
    .filter(r => r[activeChart] != null)
    .map(r => ({ date: r.date, v: r[activeChart] as number }))

  const latest = rows[0]
  const prev   = rows[1]

  const CHART_OPTIONS: Array<{ key: keyof Measurement; label: string; unit: string }> = [
    { key: 'weight_lbs',   label: 'Weight',    unit: 'lbs' },
    { key: 'waist_in',     label: 'Waist',     unit: 'in'  },
    { key: 'chest_in',     label: 'Chest',     unit: 'in'  },
    { key: 'bicep_l_in',   label: 'Bicep',     unit: 'in'  },
    { key: 'body_fat_pct', label: 'Body Fat',  unit: '%'   },
  ]

  return (
    <>
      <TopBar title="Measurements" />
      <PageWrapper>

        {/* Add button */}
        <div className="flex justify-end mb-3">
          <Button onClick={() => setShowForm(s => !s)} className="text-sm px-3 py-1.5">
            {showForm ? '✕ Cancel' : '+ Log measurements'}
          </Button>
        </div>

        {/* Form */}
        {showForm && (
          <Card className="mb-4 pop-in">
            <form onSubmit={handleSubmit(onSubmit)}>
              <p className="text-xs uppercase tracking-widest mb-3" style={{ color: '#444' }}>New Entry</p>
              <Input type="date" {...register('date')} className="mb-4" style={{ width: '100%' }} />

              {FIELD_GROUPS.map(group => (
                <div key={group.label} className="mb-4">
                  <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#555' }}>{group.label}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {group.fields.map(f => (
                      <div key={f.key}>
                        <p style={{ color: '#888', fontSize: 11, marginBottom: 3 }}>{f.label} <span style={{ color: '#555' }}>({f.unit})</span></p>
                        <Input
                          type="number"
                          step="0.1"
                          placeholder="—"
                          {...register(f.key as keyof MeasureForm)}
                          style={{ width: '100%' }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              <div className="mb-4">
                <p style={{ color: '#888', fontSize: 11, marginBottom: 3 }}>Notes</p>
                <Input placeholder="Optional notes…" {...register('notes')} style={{ width: '100%' }} />
              </div>

              <Button type="submit" disabled={saving} className="w-full">
                {saving ? 'Saving…' : 'Save Entry'}
              </Button>
            </form>
          </Card>
        )}

        {loading ? null : rows.length === 0 ? (
          <EmptyState
            icon={<RulerIcon size={64} color="var(--text-muted)" />}
            title="No measurements yet"
            sub="Track your body composition over time. Log your first entry to start seeing trends."
            action={{ label: 'Log now', onClick: () => setShowForm(true) }}
          />
        ) : (
          <>
            {/* Latest snapshot */}
            <Card className="mb-3">
              <p className="text-xs uppercase tracking-widest mb-3" style={{ color: '#444' }}>Latest · {formatDate(latest.date)}</p>
              <div className="grid grid-cols-3 gap-3 mb-4">
                {[
                  { key: 'weight_lbs'  as const, label: 'Weight',   unit: 'lbs' },
                  { key: 'waist_in'    as const, label: 'Waist',    unit: 'in'  },
                  { key: 'chest_in'    as const, label: 'Chest',    unit: 'in'  },
                  { key: 'bicep_l_in'  as const, label: 'Bicep L',  unit: 'in'  },
                  { key: 'thigh_l_in'  as const, label: 'Thigh L',  unit: 'in'  },
                  { key: 'body_fat_pct'as const, label: 'Body Fat', unit: '%'   },
                ]
                  .filter(f => latest[f.key] != null)
                  .map(f => (
                    <SnapshotStat
                      key={f.key}
                      label={f.label}
                      latest={latest[f.key] as number}
                      prev={prev?.[f.key] as number | undefined}
                      unit={f.unit}
                    />
                  ))}
              </div>

              {/* Chart picker */}
              <div className="flex gap-1.5 flex-wrap mb-2">
                {CHART_OPTIONS.filter(o => chartData.length >= 2 || rows.some(r => r[o.key] != null)).map(o => (
                  <button
                    key={o.key}
                    onClick={() => setActiveChart(o.key)}
                    className="px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
                    style={{
                      background: activeChart === o.key ? 'var(--accent)' : 'rgba(255,255,255,0.06)',
                      color:      activeChart === o.key ? 'var(--base-bg)' : '#888',
                    }}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
              <MiniTrend data={chartData} />
            </Card>

            {/* History */}
            <p className="text-xs uppercase tracking-widest mb-2" style={{ color: '#555' }}>History</p>
            <div className="flex flex-col gap-2">
              {rows.map((row, i) => (
                <Card key={row.id} className="card-animate">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-semibold text-sm text-white">{formatDate(row.date)}</p>
                    {i === 0 && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>Latest</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    {[
                      { key: 'weight_lbs'   as const, label: 'Wt',    unit: 'lbs' },
                      { key: 'body_fat_pct' as const, label: 'BF',    unit: '%'   },
                      { key: 'chest_in'     as const, label: 'Chest', unit: '"'   },
                      { key: 'waist_in'     as const, label: 'Waist', unit: '"'   },
                      { key: 'bicep_l_in'   as const, label: 'Bicep', unit: '"'   },
                      { key: 'thigh_l_in'   as const, label: 'Thigh', unit: '"'   },
                    ]
                      .filter(f => row[f.key] != null)
                      .map(f => (
                        <span key={f.key} style={{ color: '#888', fontSize: 12 }}>
                          <span style={{ color: '#444' }}>{f.label} </span>
                          <span style={{ color: 'var(--accent)', fontWeight: 700 }}>{(row[f.key] as number).toFixed(1)}</span>
                          <span style={{ color: '#555', fontSize: 10 }}>{f.unit}</span>
                        </span>
                      ))}
                  </div>
                  {row.notes && <p className="mt-1.5 text-xs italic" style={{ color: '#555' }}>{row.notes}</p>}
                </Card>
              ))}
            </div>
          </>
        )}

        {toast && <Toast message={toast} onDone={() => setToast('')} />}
      </PageWrapper>
    </>
  )
}
