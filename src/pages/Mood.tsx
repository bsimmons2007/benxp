import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useForm, type UseFormRegister } from 'react-hook-form'
import { animate } from 'animejs'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { TopBar } from '../components/layout/TopBar'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { Toast } from '../components/ui/Toast'
import { supabase } from '../lib/supabase'
import { CHART_TOOLTIP_STYLE, today, formatDate, formatDateTooltip } from '../lib/utils'
import { playXPGain } from '../lib/sounds'
import { XP_RATES } from '../lib/xp'
import { useStore } from '../store/useStore'
import type { MoodLog } from '../types'
import { HeartIcon, ZapIcon, ActivityIcon, EditIcon } from '../components/ui/Icon'
import { MoodFaceGauge, moodFaceColor } from '../components/ui/MoodFace'
import { usePageTitle } from '../hooks/usePageTitle'
import { EditModal } from '../components/ui/EditModal'
import { ChartSkeleton, ChartEmptyState } from '../components/ui/Skeleton'

interface MoodForm {
  date: string
  mood: string
  energy: string
  stress: string
  activities: string
  notes: string
}


const MOOD_WORDS = ['', 'Really low', 'Low', 'Down', 'Off', 'Neutral', 'Okay', 'Good', 'Great', 'Excellent', 'Amazing']

function moodLabel(v: number) {
  if (v >= 9) return 'Excellent'
  if (v >= 7) return 'Good'
  if (v >= 5) return 'Okay'
  if (v >= 3) return 'Low'
  return 'Rough'
}

// Slider row with spring bounce on the value number when it changes
function SliderRow({
  label, name, val, color, register,
}: {
  label: string
  name: keyof MoodForm
  val: number
  color: string
  register: UseFormRegister<MoodForm>
}) {
  const numRef  = useRef<HTMLSpanElement>(null)
  const prevVal = useRef(val)

  useEffect(() => {
    if (prevVal.current === val || !numRef.current) { prevVal.current = val; return }
    prevVal.current = val
    animate(numRef.current, {
      scale:    [1.6, 1],
      duration: 360,
      ease:     'spring(1, 100, 10, 0)',
    })
  }, [val])

  const fillPct = ((val - 1) / 9) * 100
  return (
    <div className="flex flex-col gap-1">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <label style={{ color: 'var(--text-secondary)', fontSize: 15, fontWeight: 500 }}>
          {label}
        </label>
        <span ref={numRef} style={{ color, fontWeight: 700, fontSize: 16, minWidth: 20, textAlign: 'right', display: 'inline-block' }}>
          {val}
        </span>
      </div>
      <input
        type="range" min="1" max="10" step="1"
        {...register(name)}
        style={{
          '--slider-fill': color,
          background: `linear-gradient(to right, ${color} 0%, ${color} ${fillPct}%, var(--surface-2) ${fillPct}%, var(--surface-2) 100%)`,
        } as React.CSSProperties}
        className="w-full"
      />
    </div>
  )
}

export function Mood() {
  usePageTitle('Mood')
  const { register, handleSubmit, watch, reset, formState: { isSubmitting } } = useForm<MoodForm>({
    defaultValues: { date: today(), mood: '7', energy: '7', stress: '5', activities: '', notes: '' },
  })
  const [recent,       setRecent]       = useState<MoodLog[]>([])
  const [toast,        setToast]        = useState<string | null>(null)
  const [editEntry,    setEditEntry]    = useState<MoodLog | null>(null)
  const [editVals,     setEditVals]     = useState({ mood: '7', energy: '7', stress: '5', activities: '', notes: '' })
  const [saving,       setSaving]       = useState(false)
  const [chartLoading, setChartLoading] = useState(true)
  const [visibleLines, setVisibleLines] = useState({ mood: true, energy: true, stress: true })
  const refreshXP = useStore(s => s.refreshXP)

  const moodVal   = parseInt(watch('mood')   ?? '7')
  const energyVal = parseInt(watch('energy') ?? '7')

  async function loadRecent() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setChartLoading(false); return }
    const { data } = await supabase.from('mood_log').select('*').eq('user_id', user.id).order('date', { ascending: false }).limit(30)
    setRecent(data ?? [])
    setChartLoading(false)
  }

  useEffect(() => { loadRecent() }, [])

  function openEdit(r: MoodLog) {
    setEditVals({
      mood: String(r.mood ?? 7), energy: String(r.energy ?? 7),
      stress: String(r.stress ?? 5), activities: r.activities ?? '', notes: r.notes ?? '',
    })
    setEditEntry(r)
  }

  async function saveMoodEdit() {
    if (!editEntry) return
    setSaving(true)
    const { error } = await supabase.from('mood_log').update({
      mood:       parseInt(editVals.mood),
      energy:     parseInt(editVals.energy),
      stress:     parseInt(editVals.stress),
      activities: editVals.activities || null,
      notes:      editVals.notes || null,
    }).eq('id', editEntry.id)
    setSaving(false)
    if (!error) { setEditEntry(null); loadRecent() }
  }

  async function deleteMoodEntry() {
    if (!editEntry) return
    const { error } = await supabase.from('mood_log').delete().eq('id', editEntry.id)
    if (!error) { setEditEntry(null); loadRecent() }
  }

  const onSubmit = async (data: MoodForm) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase.from('mood_log').insert({
      user_id: user.id,
      date: data.date,
      mood: parseInt(data.mood),
      energy: parseInt(data.energy),
      stress: parseInt(data.stress),
      activities: data.activities || null,
      notes: data.notes || null,
    })
    if (error) { setToast('Failed to save — try again'); return }
    playXPGain()
    setToast(`+${XP_RATES.mood_log} XP · Check-in logged ${moodLabel(parseInt(data.mood))}`)
    refreshXP()
    reset({ date: today(), mood: '7', energy: '7', stress: '5', activities: '', notes: '' })
    loadRecent()
  }

  const avgMood   = recent.length ? Math.round(recent.reduce((s, r) => s + (r.mood ?? 5), 0) / recent.length * 10) / 10 : null
  const avgEnergy = recent.length ? Math.round(recent.reduce((s, r) => s + (r.energy ?? 5), 0) / recent.length * 10) / 10 : null
  const avgStress = recent.length ? Math.round(recent.reduce((s, r) => s + (r.stress ?? 5), 0) / recent.length * 10) / 10 : null

  // Chart data — oldest first
  const chartData = [...recent].reverse().map(r => ({
    date:   r.date,
    mood:   r.mood ?? 5,
    energy: r.energy ?? 5,
    stress: r.stress ?? 5,
  }))

  return (
    <>
      <TopBar title="Mood" />
      <PageWrapper>

        {/* Stat summary */}
        {recent.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mb-5">
            {([
              { label: 'Avg Mood',   value: avgMood?.toFixed(1)   ?? '—', color: 'var(--accent)', icon: <HeartIcon   size={18} color="var(--accent)" /> as ReactNode },
              { label: 'Avg Energy', value: avgEnergy?.toFixed(1) ?? '—', color: '#4ade80',       icon: <ZapIcon     size={18} color="#4ade80"       /> as ReactNode },
              { label: 'Avg Stress', value: avgStress?.toFixed(1) ?? '—', color: '#f87171',       icon: <ActivityIcon size={18} color="#f87171"      /> as ReactNode },
            ] as { label: string; value: string; color: string; icon: ReactNode }[]).map(s => (
              <div
                key={s.label}
                className="rounded-xl p-3 text-center card-animate"
                style={{ background: 'var(--surface-1)', border: '1px solid var(--border-subtle)' }}
              >
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 3 }}>{s.icon}</div>
                <p className="font-mono" style={{ color: s.color, fontSize: 22, fontWeight: 700, lineHeight: 1 }}>
                  {s.value}
                </p>
                <p className="section-label mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Trend chart */}
        {chartLoading && <ChartSkeleton height={160} title="Mood Trends" />}
        {!chartLoading && recent.length === 0 && (
          <ChartEmptyState title="Mood Trends" message="Log your first mood entry to start tracking trends" color="#f472b6" />
        )}
        {!chartLoading && chartData.length > 0 && chartData.length < 3 && (
          <Card className="mb-5">
            <p className="card-title mb-2">Mood Trends</p>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'center', padding: '12px 0' }}>
              {chartData.map(d => (
                <div key={d.date} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#f472b6' }} />
                  <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>{d.mood}</p>
                </div>
              ))}
            </div>
            <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-muted)' }}>
              Log {3 - chartData.length} more {3 - chartData.length > 1 ? 'entries' : 'entry'} to unlock your trend chart
            </p>
          </Card>
        )}
        {!chartLoading && chartData.length >= 3 && (
          <Card className="mb-5">
            <p className="card-title mb-3">Mood Trends</p>
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={chartData} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="mood-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#f472b6" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#f472b6" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="energy-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#4ade80" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#4ade80" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="stress-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#f87171" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#f87171" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 6" stroke="var(--border-subtle)" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={(d: string) => formatDate(d)}
                  tick={{ fill: 'var(--text-tertiary)', fontSize: 8 }}
                  axisLine={false} tickLine={false}
                />
                <YAxis domain={[1, 10]} tick={{ fill: 'var(--text-tertiary)', fontSize: 9 }} axisLine={false} tickLine={false} width={20} />
                <Tooltip
                  contentStyle={CHART_TOOLTIP_STYLE}
                  labelFormatter={(l: unknown) => typeof l === 'string' ? formatDateTooltip(l) : String(l)}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(v: any, name: string) => [v, name.charAt(0).toUpperCase() + name.slice(1)]}
                  cursor={{ stroke: 'var(--border-subtle)', strokeWidth: 1 }}
                />
                {visibleLines.mood   && <Area type="monotone" dataKey="mood"   stroke="#f472b6" strokeWidth={2}   fill="url(#mood-grad)"   dot={false} animationBegin={0} animationDuration={1100} />}
                {visibleLines.energy && <Area type="monotone" dataKey="energy" stroke="#4ade80" strokeWidth={1.5} fill="url(#energy-grad)" dot={false} animationBegin={0} animationDuration={1100} />}
                {visibleLines.stress && <Area type="monotone" dataKey="stress" stroke="#f87171" strokeWidth={1.5} fill="url(#stress-grad)" dot={false} animationBegin={0} animationDuration={1100} />}
              </AreaChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 8, flexWrap: 'wrap' }}>
              {([
                { key: 'mood'   as const, label: 'Mood',   color: '#f472b6' },
                { key: 'energy' as const, label: 'Energy', color: '#4ade80' },
                { key: 'stress' as const, label: 'Stress', color: '#f87171' },
              ]).map(({ key, label, color }) => (
                <button
                  key={key}
                  onClick={() => setVisibleLines(v => ({ ...v, [key]: !v[key] }))}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px',
                    borderRadius: 4, display: 'flex', alignItems: 'center', gap: 5,
                    opacity: visibleLines[key] ? 1 : 0.35, transition: 'opacity 0.15s',
                  }}
                >
                  <span style={{ display: 'inline-block', width: 20, height: 2, background: color, borderRadius: 1 }} />
                  <span style={{ fontSize: 10, color, fontWeight: 600 }}>{label}</span>
                </button>
              ))}
            </div>
          </Card>
        )}

        {/* Log form */}
        <Card className="mb-5" style={{ padding: 0, overflow: 'hidden' }}>
          {/* Hero header — tinted by mood color */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 18,
            padding: '18px 18px 14px',
            background: `color-mix(in srgb, ${moodFaceColor(moodVal)} 11%, transparent)`,
            transition: 'background 0.25s ease',
          }}>
            <div key={moodVal} style={{ flexShrink: 0, animation: 'facepop 0.28s ease both' }}>
              <MoodFaceGauge value={moodVal} size={88} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p className="section-label" style={{ marginBottom: 4 }}>Daily Check-in</p>
              <p style={{ fontWeight: 800, fontSize: 26, color: 'var(--text-primary)', lineHeight: 1, marginBottom: 6, letterSpacing: '-0.02em' }}>
                {MOOD_WORDS[moodVal]}
              </p>
              <p className="font-mono" style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                Mood <span style={{ color: moodFaceColor(moodVal), fontWeight: 700 }}>{moodVal}</span> / 10
              </p>
            </div>
          </div>

          <div style={{ padding: '12px 18px 18px' }}>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <Input label="Date" type="date" {...register('date', { required: true })} />

            <SliderRow label="Mood"   name="mood"   val={moodVal}                                  color="var(--accent)" register={register} />
            <SliderRow label="Energy" name="energy" val={energyVal}                                color="#4ade80"       register={register} />
            <SliderRow label="Stress" name="stress" val={parseInt(watch('stress') ?? '5')}         color="#f87171"       register={register} />

            <Input label="Activities" type="text" placeholder="Gym, reading, skating…" {...register('activities')} />
            <div className="flex flex-col gap-1">
              <label style={{ color: 'var(--text-secondary)', fontSize: 15, fontWeight: 500 }}>
                Notes
              </label>
              <textarea
                {...register('notes')}
                rows={3}
                className="px-3 py-2 rounded-lg outline-none resize-none"
                style={{ background: 'var(--surface-2)', border: '1px solid var(--border-default)', fontSize: 14, color: 'var(--text-primary)' }}
                placeholder="How was today?"
              />
            </div>
            <Button type="submit" fullWidth loading={isSubmitting} disabled={isSubmitting}>
              {isSubmitting ? 'Logging…' : 'Log Check-in'}
            </Button>
          </form>
          </div>
        </Card>

        {/* Recent entries */}
        {recent.length > 0 && (
          <Card>
            <p className="card-title mb-3">Recent Entries</p>
            <div className="flex flex-col gap-1">
              {recent.slice(0, 14).map(r => (
                <div
                  key={r.id}
                  style={{
                    padding: '9px 10px', borderRadius: 8, marginBottom: 2,
                    background: 'var(--input-bg)',
                    border: '1px solid var(--border-faint)',
                  }}
                >
                  <div className="flex justify-between items-center">
                    <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{formatDate(r.date)}</p>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <span style={{ color: 'var(--accent)', fontSize: 12, fontWeight: 700 }}>{moodLabel(r.mood ?? 5)} {r.mood}</span>
                      <span style={{ color: '#4ade80',       fontSize: 12 }}>E:{r.energy}</span>
                      <span style={{ color: '#f87171',       fontSize: 12 }}>S:{r.stress}</span>
                      <button onClick={() => openEdit(r)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, opacity: 0.5 }}>
                        <EditIcon size={12} color="var(--text-muted)" />
                      </button>
                    </div>
                  </div>
                  {r.notes && (
                    <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4, fontStyle: 'italic' }}>"{r.notes}"</p>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}

        {toast && <Toast message={toast} onDone={() => setToast(null)} />}
      </PageWrapper>

      {editEntry && (
        <EditModal
          title={`Edit — ${formatDate(editEntry.date)}`}
          onClose={() => setEditEntry(null)}
          onDelete={deleteMoodEntry}
          onSave={saveMoodEdit}
          saving={saving}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {([
              { label: 'Mood',   key: 'mood'   as const, color: 'var(--accent)' },
              { label: 'Energy', key: 'energy' as const, color: '#4ade80' },
              { label: 'Stress', key: 'stress' as const, color: '#f87171' },
            ]).map(({ label, key, color }) => (
              <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <label style={{ fontSize: 13, color: 'var(--text-muted)' }}>{label}</label>
                  <span style={{ fontSize: 14, fontWeight: 700, color }}>{editVals[key]}</span>
                </div>
                <input type="range" min="1" max="10" step="1"
                  value={editVals[key]}
                  onChange={e => setEditVals(v => ({ ...v, [key]: e.target.value }))}
                  style={(() => {
                    const fp = ((parseInt(editVals[key]) - 1) / 9) * 100
                    return {
                      '--slider-fill': color,
                      background: `linear-gradient(to right, ${color} 0%, ${color} ${fp}%, var(--surface-2) ${fp}%, var(--surface-2) 100%)`,
                    } as React.CSSProperties
                  })()}
                  className="w-full"
                />
              </div>
            ))}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 13, color: 'var(--text-muted)' }}>Activities</label>
              <input value={editVals.activities} onChange={e => setEditVals(v => ({ ...v, activities: e.target.value }))}
                placeholder="Gym, reading…"
                style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', color: 'var(--text-primary)', fontSize: 14, width: '100%' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 13, color: 'var(--text-muted)' }}>Notes</label>
              <textarea value={editVals.notes} onChange={e => setEditVals(v => ({ ...v, notes: e.target.value }))}
                rows={3} placeholder="How was today?"
                style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', color: 'var(--text-primary)', fontSize: 14, width: '100%', resize: 'none' }} />
            </div>
          </div>
        </EditModal>
      )}
    </>
  )
}
