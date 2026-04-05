import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, BarChart, Bar, Cell } from 'recharts'
import { TopBar } from '../components/layout/TopBar'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { Toast } from '../components/ui/Toast'
import { EditModal } from '../components/ui/EditModal'
import { supabase } from '../lib/supabase'
import { today, formatDate } from '../lib/utils'
import type { SleepLog } from '../types'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function sleepQuality(hours: number | null): { label: string; color: string } {
  if (!hours) return { label: '—', color: '#888' }
  if (hours >= 8.5) return { label: 'Excellent', color: '#2ECC71' }
  if (hours >= 7.5) return { label: 'Great',     color: '#27AE60' }
  if (hours >= 6.5) return { label: 'Good',      color: '#F5A623' }
  if (hours >= 5.5) return { label: 'Fair',      color: '#E67E22' }
  return { label: 'Poor', color: '#E94560' }
}

// ── Log form ─────────────────────────────────────────────────

interface SleepForm { date: string; bedtime: string; hours_slept: string; wake_time: string }

function LogSleepPanel({ onLogged }: { onLogged: () => void }) {
  const [open, setOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<SleepForm>({
    defaultValues: { date: today(), bedtime: '', hours_slept: '', wake_time: '' },
  })

  const onSubmit = async (data: SleepForm) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('sleep_log').insert({
      user_id: user.id,
      date: data.date,
      bedtime: data.bedtime || null,
      hours_slept: data.hours_slept ? parseFloat(data.hours_slept) : null,
      wake_time: data.wake_time || null,
    })
    const hrs = parseFloat(data.hours_slept)
    const q = sleepQuality(hrs)
    setToast(`Sleep logged — ${q.label}`)
    reset({ date: today(), bedtime: '', hours_slept: '', wake_time: '' })
    setOpen(false)
    onLogged()
  }

  return (
    <div className="mb-5">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all"
        style={{ background: open ? 'var(--accent)' : 'rgba(255,255,255,0.05)', color: open ? '#1A1A2E' : 'var(--accent)', border: '1px solid var(--accent)', fontSize: 15 }}
      >
        {open ? '✕ Cancel' : '+ Log Sleep'}
      </button>
      {open && (
        <div className="mt-3 rounded-xl p-4 pop-in" style={{ background: 'rgba(16,24,52,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <Input label="Date" type="date" {...register('date', { required: true })} />
            <Input label="Bedtime" type="time" {...register('bedtime')} />
            <Input label="Hours Slept" type="number" step="0.1" placeholder="7.5" {...register('hours_slept', { required: true })} />
            <Input label="Wake Up" type="time" {...register('wake_time')} />
            <Button type="submit" fullWidth disabled={isSubmitting}>{isSubmitting ? 'Logging...' : 'Log Sleep'}</Button>
          </form>
        </div>
      )}
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  )
}

// ── Edit modal ───────────────────────────────────────────────

function EditSleepModal({ entry, onClose, onSaved }: { entry: SleepLog; onClose: () => void; onSaved: () => void }) {
  const [hours, setHours] = useState(String(entry.hours_slept ?? ''))
  const [bedtime, setBedtime] = useState(entry.bedtime ?? '')
  const [wakeTime, setWakeTime] = useState(entry.wake_time ?? '')
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    await supabase.from('sleep_log').update({
      hours_slept: hours ? parseFloat(hours) : null,
      bedtime: bedtime || null,
      wake_time: wakeTime || null,
    }).eq('id', entry.id)
    setSaving(false)
    onSaved()
    onClose()
  }

  async function del() {
    await supabase.from('sleep_log').delete().eq('id', entry.id)
    onSaved()
    onClose()
  }

  return (
    <EditModal title={`Edit — ${formatDate(entry.date)}`} onClose={onClose} onDelete={del} onSave={save} saving={saving}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-base font-medium" style={{ color: '#AAAAAA', fontFamily: 'Cormorant Garamond, serif' }}>Bedtime</label>
          <input type="time" value={bedtime} onChange={(e) => setBedtime(e.target.value)} className="px-3 py-3 rounded-lg text-white outline-none text-base" style={{ background: '#0D1B2A', border: '1px solid rgba(255,255,255,0.1)' }} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-base font-medium" style={{ color: '#AAAAAA', fontFamily: 'Cormorant Garamond, serif' }}>Hours Slept</label>
          <input type="number" step="0.1" value={hours} onChange={(e) => setHours(e.target.value)} className="px-3 py-3 rounded-lg text-white outline-none text-base" style={{ background: '#0D1B2A', border: '1px solid rgba(255,255,255,0.1)' }} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-base font-medium" style={{ color: '#AAAAAA', fontFamily: 'Cormorant Garamond, serif' }}>Wake Time</label>
          <input type="time" value={wakeTime} onChange={(e) => setWakeTime(e.target.value)} className="px-3 py-3 rounded-lg text-white outline-none text-base" style={{ background: '#0D1B2A', border: '1px solid rgba(255,255,255,0.1)' }} />
        </div>
      </div>
    </EditModal>
  )
}

// ── Main page ────────────────────────────────────────────────

export function Sleep() {
  const [logs, setLogs] = useState<SleepLog[]>([])
  const [editing, setEditing] = useState<SleepLog | null>(null)

  async function load() {
    const { data } = await supabase.from('sleep_log').select('*').order('date', { ascending: false })
    setLogs(data ?? [])
  }
  useEffect(() => { load() }, [])

  const sorted = [...logs].sort((a, b) => a.date.localeCompare(b.date))

  // Stats
  const avg = logs.length ? logs.reduce((s, r) => s + (r.hours_slept ?? 0), 0) / logs.filter((r) => r.hours_slept).length : 0
  const best = Math.max(...logs.map((r) => r.hours_slept ?? 0))
  const streak = (() => {
    let s = 0
    const today = new Date()
    for (let i = 0; i < logs.length; i++) {
      const d = new Date(logs[i].date)
      const diff = Math.round((today.getTime() - d.getTime()) / 86400000)
      if (diff === i) s++
      else break
    }
    return s
  })()

  // Day-of-week averages
  const dayTotals: Record<number, { sum: number; count: number }> = {}
  logs.forEach((r) => {
    if (!r.hours_slept) return
    const day = new Date(r.date + 'T12:00:00').getDay()
    if (!dayTotals[day]) dayTotals[day] = { sum: 0, count: 0 }
    dayTotals[day].sum += r.hours_slept
    dayTotals[day].count++
  })
  const dayData = DAYS.map((label, i) => ({
    label,
    avg: dayTotals[i] ? Math.round((dayTotals[i].sum / dayTotals[i].count) * 10) / 10 : 0,
  }))

  return (
    <>
      <TopBar title="Sleep" />
      <PageWrapper>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2 mb-5">
          {[
            { label: 'Avg Hours', value: avg ? avg.toFixed(1) : '—' },
            { label: 'Best Night', value: best ? best.toFixed(1) : '—' },
            { label: 'Day Streak', value: streak },
          ].map((s) => (
            <div key={s.label} className="rounded-xl p-3 text-center card-animate" style={{ background: 'var(--card-bg)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <p className="text-xl font-bold" style={{ color: 'var(--accent)', fontFamily: 'Cinzel, serif' }}>{s.value}</p>
              <p className="text-xs mt-0.5" style={{ color: '#888', fontFamily: 'Cormorant Garamond, serif' }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Log button */}
        <LogSleepPanel onLogged={load} />

        {/* Hours slept trend */}
        {sorted.length >= 2 && (
          <div className="rounded-xl p-4 mb-4" style={{ background: 'var(--card-bg)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <p className="font-bold text-white mb-3" style={{ fontFamily: 'Cinzel, serif', fontSize: 15 }}>Hours Slept</p>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={sorted}>
                <XAxis dataKey="date" tickFormatter={(d: string) => formatDate(d)} tick={{ fill: '#888', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 12]} tick={{ fill: '#888', fontSize: 10 }} axisLine={false} tickLine={false} width={25} />
                <Tooltip
                  contentStyle={{ background: 'var(--bg-mid)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: 12 }}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  labelFormatter={(l: any) => typeof l === 'string' ? formatDate(l) : l}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(v: any) => [`${v}h`, 'Sleep']}
                />
                <ReferenceLine y={8} stroke="#27AE60" strokeDasharray="4 2" strokeOpacity={0.4} />
                <ReferenceLine y={7} stroke="var(--accent)" strokeDasharray="4 2" strokeOpacity={0.3} />
                <Line type="monotone" dataKey="hours_slept" stroke="var(--accent)" strokeWidth={2} dot={{ fill: 'var(--accent)', r: 3 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
            <div className="flex gap-4 mt-1">
              <span className="text-xs" style={{ color: '#27AE60' }}>── 8h goal</span>
              <span className="text-xs" style={{ color: 'var(--accent)' }}>── 7h min</span>
            </div>
          </div>
        )}

        {/* Day of week breakdown */}
        {logs.length >= 3 && (
          <div className="rounded-xl p-4 mb-4" style={{ background: 'var(--card-bg)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <p className="font-bold text-white mb-3" style={{ fontFamily: 'Cinzel, serif', fontSize: 15 }}>By Day of Week</p>
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={dayData} barSize={28}>
                <XAxis dataKey="label" tick={{ fill: '#888', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 12]} tick={{ fill: '#888', fontSize: 10 }} axisLine={false} tickLine={false} width={25} />
                <Tooltip
                  contentStyle={{ background: 'var(--bg-mid)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: 12 }}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(v: any) => [`${v}h avg`, 'Sleep']}
                />
                <Bar dataKey="avg" radius={[4, 4, 0, 0]}>
                  {dayData.map((d, i) => (
                    <Cell key={i} fill={d.avg >= 8 ? '#27AE60' : d.avg >= 7 ? 'var(--accent)' : d.avg >= 6 ? '#E67E22' : d.avg > 0 ? '#E94560' : '#333'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* History */}
        <p className="font-bold text-white mb-3" style={{ fontFamily: 'Cinzel, serif', fontSize: 15 }}>History</p>
        {logs.map((entry) => {
          const q = sleepQuality(entry.hours_slept)
          const dayLabel = DAYS[new Date(entry.date + 'T12:00:00').getDay()]
          return (
            <div
              key={entry.id}
              className="flex items-center justify-between px-4 py-3 rounded-xl mb-2 card-animate"
              style={{ background: 'rgba(16,24,52,0.65)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-10 rounded-full flex-shrink-0" style={{ background: q.color }} />
                <div>
                  <p className="text-white font-semibold text-sm">{formatDate(entry.date)} <span style={{ color: '#666', fontWeight: 400 }}>({dayLabel})</span></p>
                  <p className="text-xs mt-0.5" style={{ color: '#888' }}>
                    {entry.bedtime && `Bed ${entry.bedtime} · `}
                    {entry.wake_time && `Up ${entry.wake_time}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="font-bold" style={{ color: q.color, fontSize: 18 }}>{entry.hours_slept ?? '—'}h</p>
                  <p className="text-xs" style={{ color: q.color }}>{q.label}</p>
                </div>
                <button onClick={() => setEditing(entry)} className="text-lg p-1" style={{ color: '#444' }}>✏️</button>
              </div>
            </div>
          )
        })}
        {logs.length === 0 && <p style={{ color: '#888' }}>No sleep logged yet.</p>}

        {editing && (
          <EditSleepModal entry={editing} onClose={() => setEditing(null)} onSaved={load} />
        )}
      </PageWrapper>
    </>
  )
}
