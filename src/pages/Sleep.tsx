import { useEffect, useState, type FormEvent } from 'react'
import { useForm } from 'react-hook-form'
import { XP_RATES } from '../lib/xp'
import { useStore } from '../store/useStore'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, BarChart, Bar, Cell, CartesianGrid } from 'recharts'
import { TopBar } from '../components/layout/TopBar'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { Toast } from '../components/ui/Toast'
import { EditModal } from '../components/ui/EditModal'
import { EmptyState } from '../components/ui/EmptyState'
import { supabase } from '../lib/supabase'
import { today, formatDate } from '../lib/utils'
import { playXPGain, playPR } from '../lib/sounds'
import type { SleepLog } from '../types'
import { MoonIcon, CheckIcon, EditIcon } from '../components/ui/Icon'
import { usePageTitle } from '../hooks/usePageTitle'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const SLEEP_GOAL = 8        // hours/night target
const RECOVERY_EXTRA = 1    // extra hours per recovery night

function sleepQuality(hours: number | null): { label: string; color: string } {
  if (!hours) return { label: '—', color: '#888' }
  if (hours >= 8.5) return { label: 'Excellent', color: '#2ECC71' }
  if (hours >= 7.5) return { label: 'Great',     color: '#27AE60' }
  if (hours >= 6.5) return { label: 'Good',      color: '#F5A623' }
  if (hours >= 5.5) return { label: 'Fair',      color: '#E67E22' }
  return { label: 'Poor', color: '#E94560' }
}

/** Local YYYY-MM-DD, i days ago (0 = today) */
function localDateStr(daysAgo = 0): string {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  return d.toLocaleDateString('en-CA')
}

// ── Log form ──────────────────────────────────────────────────────────────────

interface SleepForm { date: string; bedtime: string; hours_slept: string; wake_time: string }

function LogSleepPanel({ onLogged }: { onLogged: () => void }) {
  const [open, setOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const refreshXP       = useStore((s) => s.refreshXP)
  const refreshActivity = useStore((s) => s.refreshActivity)
  const { register, handleSubmit, reset, watch, setValue, formState: { isSubmitting } } = useForm<SleepForm>({
    defaultValues: { date: today(), bedtime: '', hours_slept: '', wake_time: '' },
  })

  // Auto-calculate hours slept whenever bedtime or wake_time changes
  const watchedBedtime  = watch('bedtime')
  const watchedWakeTime = watch('wake_time')
  useEffect(() => {
    if (watchedBedtime && watchedWakeTime) {
      const [bh, bm] = watchedBedtime.split(':').map(Number)
      const [wh, wm] = watchedWakeTime.split(':').map(Number)
      let bedMins  = bh * 60 + bm
      let wakeMins = wh * 60 + wm
      if (wakeMins <= bedMins) wakeMins += 24 * 60   // crossed midnight
      setValue('hours_slept', ((wakeMins - bedMins) / 60).toFixed(1))
    }
  }, [watchedBedtime, watchedWakeTime, setValue])

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
    const q   = sleepQuality(hrs)
    const xp  = XP_RATES.sleep_log + (hrs >= 7 ? XP_RATES.sleep_quality_bonus : 0)
    if (hrs >= 8.5) playPR(); else playXPGain()
    setToast(`+${xp} XP — ${q.label} sleep!`)
    await refreshXP()
    refreshActivity()
    reset({ date: today(), bedtime: '', hours_slept: '', wake_time: '' })
    setOpen(false)
    onLogged()
  }

  return (
    <div className="mb-5">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all"
        style={{ background: open ? 'var(--accent)' : 'rgba(255,255,255,0.05)', color: open ? '#1A1A2E' : 'var(--accent)', border: '1px solid var(--accent)', fontSize: 15 }}
      >
        {open ? '✕ Cancel' : '+ Log Sleep'}
      </button>
      {open && (
        <div className="mt-3 rounded-xl p-4 pop-in" style={{ background: 'rgba(16,24,52,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <Input label="Date"     type="date" {...register('date', { required: true })} />
            <Input label="Bedtime"  type="time" {...register('bedtime')} />
            <Input label="Wake Up"  type="time" {...register('wake_time')} />
            <Input label="Hours Slept (auto-calculated)" type="number" step="0.1" placeholder="7.5"
              {...register('hours_slept', { required: true })}
              style={{ background: 'rgba(255,255,255,0.03)', color: 'var(--accent)' }}
            />
            <Button type="submit" fullWidth disabled={isSubmitting}>{isSubmitting ? 'Logging...' : 'Log Sleep'}</Button>
          </form>
        </div>
      )}
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  )
}

// ── Nap log panel ─────────────────────────────────────────────────────────────

function LogNapPanel({ onLogged }: { onLogged: () => void }) {
  const [open,  setOpen]  = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [date,  setDate]  = useState(today())
  const [hours, setHours] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!hours) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }
    await supabase.from('sleep_log').insert({
      user_id: user.id, date, hours_slept: parseFloat(hours), is_nap: true,
    })
    setSaving(false)
    setToast(`💤 Nap logged — ${hours}h`)
    setOpen(false)
    setHours('')
    onLogged()
  }

  return (
    <div className="mb-4">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold transition-all"
        style={{ background: 'rgba(255,255,255,0.04)', color: '#888', border: '1px solid rgba(255,255,255,0.1)', fontSize: 14 }}
      >
        {open ? '✕ Cancel' : '💤 Log Nap'}
      </button>
      {open && (
        <div className="mt-3 rounded-xl p-4 pop-in" style={{ background: 'rgba(16,24,52,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <form onSubmit={submit} className="flex flex-col gap-4">
            <Input label="Date" type="date" value={date} onChange={e => setDate(e.target.value)} />
            <Input label="Nap Length (hours)" type="number" step="0.25" placeholder="1.5" value={hours} onChange={e => setHours(e.target.value)} required />
            <Button type="submit" fullWidth disabled={saving}>{saving ? 'Logging...' : 'Log Nap'}</Button>
          </form>
        </div>
      )}
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  )
}

// ── Edit modal ────────────────────────────────────────────────────────────────

function EditSleepModal({ entry, onClose, onSaved }: { entry: SleepLog; onClose: () => void; onSaved: () => void }) {
  const [hours,    setHours]    = useState(String(entry.hours_slept ?? ''))
  const [bedtime,  setBedtime]  = useState(entry.bedtime ?? '')
  const [wakeTime, setWakeTime] = useState(entry.wake_time ?? '')
  const [saving,   setSaving]   = useState(false)

  async function save() {
    setSaving(true)
    await supabase.from('sleep_log').update({
      hours_slept: hours ? parseFloat(hours) : null,
      bedtime: bedtime || null,
      wake_time: wakeTime || null,
    }).eq('id', entry.id)
    setSaving(false); onSaved(); onClose()
  }

  async function del() {
    await supabase.from('sleep_log').delete().eq('id', entry.id)
    onSaved(); onClose()
  }

  return (
    <EditModal title={`Edit — ${formatDate(entry.date)}`} onClose={onClose} onDelete={del} onSave={save} saving={saving}>
      <div className="flex flex-col gap-4">
        {[
          { label: 'Bedtime',     type: 'time',   val: bedtime,  set: setBedtime  },
          { label: 'Hours Slept', type: 'number', val: hours,    set: setHours    },
          { label: 'Wake Time',   type: 'time',   val: wakeTime, set: setWakeTime },
        ].map(({ label, type, val, set }) => (
          <div key={label} className="flex flex-col gap-1">
            <label className="text-base font-medium" style={{ color: '#AAAAAA', fontFamily: 'Cormorant Garamond, serif' }}>{label}</label>
            <input type={type} step={type === 'number' ? 0.1 : undefined} value={val}
              onChange={e => set(e.target.value)}
              className="px-3 py-3 rounded-lg text-white outline-none text-base"
              style={{ background: '#0D1B2A', border: '1px solid rgba(255,255,255,0.1)' }} />
          </div>
        ))}
      </div>
    </EditModal>
  )
}

// ── Sleep debt card ───────────────────────────────────────────────────────────

function SleepDebtCard({ logs }: { logs: SleepLog[] }) {
  const nights = logs.filter(r => !r.is_nap)
  if (nights.length < 3) return null

  // Accumulate deficit over ALL logged nights (goal = 8h), naps reduce debt
  const withHours = nights.filter(r => r.hours_slept != null)
  const napTotal  = logs.filter(r => r.is_nap && r.hours_slept != null).reduce((s, r) => s + (r.hours_slept ?? 0), 0)
  const rawDebt   = withHours.reduce((sum, r) => sum + Math.max(0, SLEEP_GOAL - (r.hours_slept ?? 0)), 0)
  const totalDebt = Math.max(0, rawDebt - napTotal)
  const recentNaps = logs.filter(r => r.is_nap && r.hours_slept != null).slice(0, 7).reduce((s, r) => s + (r.hours_slept ?? 0), 0)
  const recentDebt = Math.max(0, withHours.slice(0, 7).reduce((sum, r) => sum + Math.max(0, SLEEP_GOAL - (r.hours_slept ?? 0)), 0) - recentNaps)

  if (totalDebt < 0.1) {
    return (
      <div className="rounded-xl p-4 mb-4 flex items-center gap-3" style={{ background: 'rgba(46,204,113,0.08)', border: '1px solid rgba(46,204,113,0.25)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 10, background: 'rgba(46,204,113,0.15)', flexShrink: 0 }}>
          <CheckIcon size={18} color="#2ECC71" />
        </div>
        <div>
          <p className="font-bold text-sm" style={{ color: '#2ECC71' }}>No sleep debt!</p>
          <p style={{ color: '#888', fontSize: 12 }}>You've been hitting your sleep goals.</p>
        </div>
      </div>
    )
  }

  const recoveryNights = Math.ceil(recentDebt / RECOVERY_EXTRA)
  const debtColor = totalDebt >= 10 ? '#E94560' : totalDebt >= 5 ? '#E67E22' : '#F5A623'
  const maxBar = Math.max(totalDebt, 10)

  return (
    <div className="rounded-xl p-4 mb-4" style={{ background: 'rgba(233,69,96,0.06)', border: `1px solid ${debtColor}33` }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <MoonIcon size={18} color={debtColor} />
          <p className="font-bold text-sm" style={{ color: debtColor, fontFamily: 'Cinzel, serif' }}>Sleep Debt</p>
        </div>
        <span className="font-bold text-lg" style={{ color: debtColor, fontFamily: 'Cinzel, serif' }}>
          {totalDebt.toFixed(1)}h
        </span>
      </div>

      {/* Debt bar */}
      <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.06)', overflow: 'hidden', marginBottom: 10 }}>
        <div style={{
          height: '100%', width: `${Math.min(100, (totalDebt / maxBar) * 100).toFixed(0)}%`,
          background: `linear-gradient(90deg, ${debtColor}88, ${debtColor})`,
          borderRadius: 3, transition: 'width 0.6s ease',
        }} />
      </div>

      <div className="flex items-start justify-between gap-3">
        <div>
          <p style={{ color: '#888', fontSize: 11 }}>Last 7 nights: <span style={{ color: '#ccc', fontWeight: 700 }}>{recentDebt.toFixed(1)}h deficit</span></p>
          <p style={{ color: '#888', fontSize: 11 }}>Total accumulated: <span style={{ color: debtColor, fontWeight: 700 }}>{totalDebt.toFixed(1)}h</span></p>
        </div>
        <div style={{
          padding: '6px 12px', borderRadius: 8,
          background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
          textAlign: 'center', flexShrink: 0,
        }}>
          <p style={{ color: '#fff', fontWeight: 700, fontSize: 18, fontFamily: 'Cinzel, serif', lineHeight: 1 }}>{recoveryNights}</p>
          <p style={{ color: '#444', fontSize: 10 }}>nights @ 9h</p>
          <p style={{ color: '#444', fontSize: 10 }}>to recover</p>
        </div>
      </div>
    </div>
  )
}

// ── Wake Time Trainer ────────────────────────────────────────────────────────

/** Parse "HH:MM" → total minutes since midnight */
function parseTime(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

/** Format minutes-since-midnight → "h:mm AM/PM" */
function fmtTime(mins: number): string {
  const wrapped = ((mins % 1440) + 1440) % 1440          // handle < 0 or > 1440
  const h = Math.floor(wrapped / 60)
  const m = wrapped % 60
  const ampm = h < 12 ? 'AM' : 'PM'
  const h12  = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`
}

/** Add N days to a YYYY-MM-DD string */
function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() + n)
  return d.toLocaleDateString('en-CA')
}

function dayLabel(dateStr: string): string {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  return days[new Date(dateStr + 'T12:00:00').getDay()]
}

function WakeTimeTrainer({ logs }: { logs: SleepLog[] }) {
  const [open,          setOpen]         = useState(false)
  const [targetWake,    setTargetWake]   = useState('08:00')
  const [sleepHours,    setSleepHours]   = useState('8')
  const [shiftMins,     setShiftMins]    = useState(20)

  // Derive current average wake time from actual log data
  const wakeTimeLogs = logs.filter(l => l.wake_time && l.wake_time.length >= 4).slice(0, 14)
  const avgWakeMins: number | null = wakeTimeLogs.length >= 2
    ? Math.round(wakeTimeLogs.reduce((s, l) => s + parseTime(l.wake_time!), 0) / wakeTimeLogs.length)
    : null

  // What user is currently waking up at (default: 11am if no data)
  const currentWakeMins = avgWakeMins ?? parseTime('11:00')
  const targetWakeMins  = parseTime(targetWake)
  const deltaMinutes    = currentWakeMins - targetWakeMins     // how many minutes earlier to shift

  const sleepDuration   = Math.max(6, Math.min(10, parseFloat(sleepHours) || 8))
  const daysNeeded      = deltaMinutes <= 0 ? 0 : Math.ceil(deltaMinutes / shiftMins)

  // Build the day-by-day schedule starting from today
  const todayStr = localDateStr(0)
  const schedule = Array.from({ length: daysNeeded + 1 }, (_, i) => {
    const wakeMin  = currentWakeMins - i * shiftMins
    const bedMin   = wakeMin - sleepDuration * 60
    return {
      date:     addDays(todayStr, i),
      day:      i,
      wakeMins: wakeMin,
      bedMins:  bedMin,
      wake:     fmtTime(wakeMin),
      bed:      fmtTime(bedMin),
      isGoal:   wakeMin <= targetWakeMins,
    }
  })

  // Check actual progress — how many recent wake times match or beat the plan?
  const recentWakes = logs
    .filter(l => l.wake_time && l.date >= todayStr)
    .map(l => ({ date: l.date, mins: parseTime(l.wake_time!) }))

  // Days already on-track: wake time ≤ scheduled target for that day
  const daysOnTrack = recentWakes.filter(w => {
    const dayNum = Math.round((new Date(w.date + 'T12:00:00').getTime() - new Date(todayStr + 'T12:00:00').getTime()) / 86400000)
    const planned = currentWakeMins - dayNum * shiftMins
    return w.mins <= planned + 15   // 15-min grace
  }).length

  const progressPct = daysNeeded > 0 ? Math.min(100, Math.round((daysOnTrack / daysNeeded) * 100)) : 100

  // Estimate completion date
  const goalDate = daysNeeded > 0 ? addDays(todayStr, daysNeeded - 1) : todayStr

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-xl p-4 mb-4 text-left"
        style={{ background: 'rgba(245,166,35,0.06)', border: '1px solid rgba(245,166,35,0.2)', cursor: 'pointer' }}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="font-bold text-sm" style={{ color: 'var(--accent)', fontFamily: 'Cinzel, serif' }}>⏰ Wake Time Trainer</p>
            <p style={{ color: '#888', fontSize: 11, marginTop: 2 }}>
              {avgWakeMins !== null
                ? `Avg wake: ${fmtTime(avgWakeMins)} · Set a goal wake time`
                : 'Plan a gradual wake time shift with a day-by-day schedule'}
            </p>
          </div>
          <span style={{ color: 'var(--accent)', fontSize: 18 }}>›</span>
        </div>
      </button>
    )
  }

  return (
    <div className="rounded-xl mb-4 pop-in" style={{ background: 'rgba(10,12,28,0.95)', border: '1px solid rgba(245,166,35,0.25)' }}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 pb-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <p className="font-bold" style={{ color: 'var(--accent)', fontFamily: 'Cinzel, serif', fontSize: 15 }}>⏰ Wake Time Trainer</p>
        <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 18 }}>✕</button>
      </div>

      <div className="p-4 flex flex-col gap-4">

        {/* Current vs target */}
        <div className="flex items-center gap-3">
          <div className="flex-1 rounded-lg p-3 text-center" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <p style={{ color: '#444', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
              {avgWakeMins !== null ? `Current avg (${wakeTimeLogs.length} nights)` : 'Current (estimated)'}
            </p>
            <p style={{ color: '#ccc', fontSize: 22, fontWeight: 700, fontFamily: 'Cinzel, serif' }}>{fmtTime(currentWakeMins)}</p>
          </div>
          <div style={{ color: '#555', fontSize: 22, fontWeight: 300 }}>→</div>
          <div className="flex-1 rounded-lg p-3 text-center" style={{ background: 'rgba(245,166,35,0.08)', border: '1px solid rgba(245,166,35,0.3)' }}>
            <p style={{ color: 'var(--accent)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Goal</p>
            <p style={{ color: 'var(--accent)', fontSize: 22, fontWeight: 700, fontFamily: 'Cinzel, serif' }}>{fmtTime(targetWakeMins)}</p>
          </div>
        </div>

        {/* Settings */}
        <div className="flex flex-col gap-3">
          <div>
            <label style={{ display: 'block', color: '#888', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Target Wake Time</label>
            <input
              type="time"
              value={targetWake}
              onChange={e => setTargetWake(e.target.value)}
              style={{ width: '100%', padding: '9px 12px', borderRadius: 8, background: 'var(--input-bg)', border: '1px solid var(--border)', color: '#fff', fontSize: 15, outline: 'none' }}
            />
          </div>

          <div className="flex gap-3">
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', color: '#888', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Sleep Duration (hrs)</label>
              <input
                type="number" step="0.5" min="5" max="10"
                value={sleepHours}
                onChange={e => setSleepHours(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, background: 'var(--input-bg)', border: '1px solid var(--border)', color: '#fff', fontSize: 15, outline: 'none' }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', color: '#888', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Shift Speed</label>
              <select
                value={shiftMins}
                onChange={e => setShiftMins(Number(e.target.value))}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, background: 'rgba(10,12,24,0.9)', border: '1px solid var(--border)', color: '#fff', fontSize: 13, outline: 'none' }}
              >
                <option value={10}>Slow (10 min/day)</option>
                <option value={15}>Gentle (15 min/day)</option>
                <option value={20}>Moderate (20 min/day)</option>
                <option value={30}>Fast (30 min/day)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Already at goal */}
        {deltaMinutes <= 0 && (
          <div className="rounded-lg p-3 flex items-center gap-2" style={{ background: 'rgba(46,204,113,0.08)', border: '1px solid rgba(46,204,113,0.2)' }}>
            <CheckIcon size={16} color="#2ECC71" />
            <p style={{ color: '#2ECC71', fontSize: 13, fontWeight: 600 }}>You're already at or ahead of your goal! 🎉</p>
          </div>
        )}

        {/* Summary card */}
        {deltaMinutes > 0 && (
          <>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Days needed',   value: String(daysNeeded)               },
                { label: 'Shift per day', value: `${shiftMins}m earlier`          },
                { label: 'Goal by',       value: formatDate(goalDate)              },
              ].map(s => (
                <div key={s.label} className="rounded-lg p-3 text-center" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <p style={{ color: 'var(--accent)', fontSize: 16, fontWeight: 700, fontFamily: 'Cinzel, serif', lineHeight: 1 }}>{s.value}</p>
                  <p style={{ color: '#555', fontSize: 9, marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</p>
                </div>
              ))}
            </div>

            {/* Progress bar (if user has started) */}
            {daysOnTrack > 0 && (
              <div>
                <div className="flex justify-between mb-1">
                  <p style={{ color: '#888', fontSize: 11 }}>Progress</p>
                  <p style={{ color: 'var(--accent)', fontSize: 11, fontWeight: 700 }}>{daysOnTrack}/{daysNeeded} days on track</p>
                </div>
                <div style={{ height: 6, borderRadius: 999, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${progressPct}%`, background: 'var(--accent)', borderRadius: 999, transition: 'width 0.6s ease' }} />
                </div>
              </div>
            )}

            {/* Tonight callout */}
            <div className="rounded-lg p-3" style={{ background: 'rgba(245,166,35,0.1)', border: '1px solid rgba(245,166,35,0.35)' }}>
              <p style={{ color: 'var(--accent)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Tonight</p>
              <div className="flex justify-between items-center">
                <div>
                  <p style={{ color: '#e8e8e8', fontSize: 13 }}>Go to sleep by</p>
                  <p style={{ color: 'var(--accent)', fontSize: 26, fontWeight: 700, fontFamily: 'Cinzel, serif', lineHeight: 1.1 }}>{schedule[0]?.bed}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ color: '#888', fontSize: 13 }}>Wake up at</p>
                  <p style={{ color: '#ccc', fontSize: 20, fontWeight: 700, fontFamily: 'Cinzel, serif', lineHeight: 1.1 }}>{schedule[0]?.wake}</p>
                </div>
              </div>
            </div>

            {/* Day-by-day schedule */}
            <div>
              <p style={{ color: '#555', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Full Schedule</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 280, overflowY: 'auto' }}>
                {schedule.map((s, i) => {
                  const isToday    = s.date === todayStr
                  const isGoalDay  = i === daysNeeded
                  const actualWake = logs.find(l => l.date === s.date)
                  const onTrack    = actualWake?.wake_time
                    ? parseTime(actualWake.wake_time) <= s.wakeMins + 15
                    : null

                  return (
                    <div
                      key={s.date}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '8px 10px', borderRadius: 8,
                        background: isToday ? 'rgba(245,166,35,0.08)' : isGoalDay ? 'rgba(46,204,113,0.06)' : 'rgba(255,255,255,0.02)',
                        border: isToday ? '1px solid rgba(245,166,35,0.3)' : isGoalDay ? '1px solid rgba(46,204,113,0.2)' : '1px solid transparent',
                      }}
                    >
                      {/* Day number */}
                      <div style={{ width: 28, textAlign: 'center', flexShrink: 0 }}>
                        {isGoalDay
                          ? <span style={{ fontSize: 16 }}>🏁</span>
                          : onTrack === true
                            ? <CheckIcon size={14} color="#2ECC71" />
                            : <span style={{ color: isToday ? 'var(--accent)' : '#444', fontSize: 11, fontWeight: 700 }}>D{i + 1}</span>
                        }
                      </div>

                      {/* Date */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ color: isToday ? 'var(--accent)' : isGoalDay ? '#2ECC71' : '#ccc', fontSize: 12, fontWeight: isToday ? 700 : 500 }}>
                          {dayLabel(s.date)} · {formatDate(s.date)}
                          {isToday && <span style={{ marginLeft: 6, fontSize: 10, background: 'rgba(245,166,35,0.2)', color: 'var(--accent)', padding: '1px 6px', borderRadius: 4 }}>TODAY</span>}
                          {isGoalDay && <span style={{ marginLeft: 6, fontSize: 10, background: 'rgba(46,204,113,0.15)', color: '#2ECC71', padding: '1px 6px', borderRadius: 4 }}>GOAL</span>}
                        </p>
                        {actualWake?.wake_time && (
                          <p style={{ color: onTrack ? '#2ECC71' : '#E94560', fontSize: 10, marginTop: 1 }}>
                            Actual wake: {fmtTime(parseTime(actualWake.wake_time))} {onTrack ? '✓' : '✗'}
                          </p>
                        )}
                      </div>

                      {/* Bedtime & Wake */}
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <p style={{ color: '#888', fontSize: 10 }}>Sleep <span style={{ color: '#ccc', fontWeight: 600 }}>{s.bed}</span></p>
                        <p style={{ color: '#888', fontSize: 10 }}>Wake <span style={{ color: isGoalDay ? '#2ECC71' : 'var(--accent)', fontWeight: 700 }}>{s.wake}</span></p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Science note */}
            <p style={{ color: '#3a3a4a', fontSize: 10, textAlign: 'center', lineHeight: 1.4 }}>
              Based on chronobiology: shifting {shiftMins} min/day is within the body's natural circadian adaptation rate.
              Consistency is key — try to hit your bedtime every night, including weekends.
            </p>
          </>
        )}
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

const ttStyle = {
  background: 'rgba(10,10,22,0.97)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 8, color: '#fff', fontSize: 12,
  boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
}
const labelStyle = { color: '#aaa' }
const itemStyle  = { color: '#fff' }

export function Sleep() {
  usePageTitle('Sleep')
  const [logs,    setLogs]    = useState<SleepLog[]>([])
  const [editing, setEditing] = useState<SleepLog | null>(null)

  async function load() {
    const { data } = await supabase.from('sleep_log').select('*').order('date', { ascending: false })
    setLogs(data ?? [])
  }
  useEffect(() => { load() }, [])

  const nightLogs = logs.filter(r => !r.is_nap)
  const sorted = [...nightLogs].sort((a, b) => a.date.localeCompare(b.date))

  // Stats (nights only)
  const withHours = nightLogs.filter(r => r.hours_slept != null)
  const avg  = withHours.length ? withHours.reduce((s, r) => s + (r.hours_slept ?? 0), 0) / withHours.length : 0
  const best = withHours.length ? Math.max(...withHours.map(r => r.hours_slept ?? 0)) : 0

  // Streak — fixed: use local date strings, handle today-not-logged case
  const streak = (() => {
    if (!nightLogs.length) return 0
    const dateSet = new Set(nightLogs.map(r => r.date))
    const todayStr = localDateStr(0)
    const yesterStr = localDateStr(1)
    // Start from today if logged, else yesterday
    const startDaysAgo = dateSet.has(todayStr) ? 0 : dateSet.has(yesterStr) ? 1 : null
    if (startDaysAgo === null) return 0
    let s = 0, i = startDaysAgo
    while (dateSet.has(localDateStr(i))) { s++; i++ }
    return s
  })()

  // Day-of-week averages (nights only)
  const dayTotals: Record<number, { sum: number; count: number }> = {}
  nightLogs.forEach(r => {
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
            { label: 'Avg Hours',  value: avg    ? avg.toFixed(1)  : '—' },
            { label: 'Best Night', value: best   ? best.toFixed(1) : '—' },
            { label: 'Day Streak', value: streak },
          ].map(s => (
            <div key={s.label} className="rounded-xl p-3 text-center card-animate" style={{ background: 'var(--card-bg)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <p className="text-xl font-bold" style={{ color: 'var(--accent)', fontFamily: 'Cinzel, serif' }}>{s.value}</p>
              <p className="text-xs mt-0.5" style={{ color: '#888', fontFamily: 'Cormorant Garamond, serif' }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Sleep debt */}
        <SleepDebtCard logs={logs} />

        {/* Wake time trainer */}
        <WakeTimeTrainer logs={nightLogs} />

        {/* Log buttons */}
        <LogSleepPanel onLogged={load} />
        <LogNapPanel onLogged={load} />

        {/* Hours slept trend */}
        {sorted.length > 0 && sorted.length < 3 && (
          <div style={{ textAlign: 'center', padding: '14px 0 8px', color: 'var(--text-muted)', fontSize: 12 }}>
            📈 Log {3 - sorted.length} more night{3 - sorted.length > 1 ? 's' : ''} to unlock your trend chart
          </div>
        )}
        {sorted.length >= 3 && (
          <div className="rounded-xl p-4 mb-4" style={{ background: 'var(--card-bg)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <p className="font-bold text-white mb-3" style={{ fontFamily: 'Cinzel, serif', fontSize: 15 }}>Hours Slept</p>
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={sorted} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="sleep-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="var(--accent)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 6" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="date" tickFormatter={(d: string) => formatDate(d)} tick={{ fill: '#666', fontSize: 9 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 12]} tick={{ fill: '#666', fontSize: 9 }} axisLine={false} tickLine={false} width={25} />
                <Tooltip
                  contentStyle={ttStyle} labelStyle={labelStyle} itemStyle={itemStyle}
                  labelFormatter={(l: unknown) => typeof l === 'string' ? formatDate(l) : String(l)}
                  formatter={(v: unknown) => [`${v}h`, 'Sleep']}
                  cursor={{ stroke: 'rgba(255,255,255,0.12)', strokeWidth: 1 }}
                />
                <ReferenceLine y={8} stroke="#27AE60" strokeDasharray="4 2" strokeOpacity={0.45} />
                <ReferenceLine y={7} stroke="var(--accent)" strokeDasharray="4 2" strokeOpacity={0.35} />
                <Area type="monotone" dataKey="hours_slept" stroke="var(--accent)" strokeWidth={2.5}
                  fill="url(#sleep-grad)"
                  dot={{ fill: 'var(--accent)', r: 3, fillOpacity: 0.8 }}
                  activeDot={{ r: 5, fill: 'var(--accent)', stroke: 'rgba(255,255,255,0.3)', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
            <div className="flex gap-4 mt-1">
              <span className="text-xs" style={{ color: '#27AE60' }}>── 8h goal</span>
              <span className="text-xs" style={{ color: 'var(--accent)' }}>── 7h min</span>
            </div>
          </div>
        )}

        {/* Day of week breakdown */}
        {nightLogs.length >= 3 && (
          <div className="rounded-xl p-4 mb-4" style={{ background: 'var(--card-bg)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <p className="font-bold text-white mb-3" style={{ fontFamily: 'Cinzel, serif', fontSize: 15 }}>By Day of Week</p>
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={dayData} barSize={28}>
                <XAxis dataKey="label" tick={{ fill: '#888', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 12]} tick={{ fill: '#666', fontSize: 9 }} axisLine={false} tickLine={false} width={25} />
                <Tooltip
                  contentStyle={ttStyle} labelStyle={labelStyle} itemStyle={itemStyle}
                  formatter={(v: unknown) => [`${v}h avg`, 'Sleep']}
                  cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                />
                <Bar dataKey="avg" radius={[4, 4, 0, 0]}>
                  {dayData.map((d, i) => (
                    <Cell key={i} fill={d.avg >= 8 ? '#27AE60' : d.avg >= 7 ? 'var(--accent)' : d.avg >= 6 ? '#E67E22' : d.avg > 0 ? '#E94560' : 'rgba(255,255,255,0.06)'} fillOpacity={d.avg > 0 ? 0.85 : 1} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* History */}
        <p className="font-bold text-white mb-3" style={{ fontFamily: 'Cinzel, serif', fontSize: 15 }}>History</p>
        {logs.map(entry => {
          const isNap    = entry.is_nap
          const q        = isNap ? { label: 'Nap', color: '#888' } : sleepQuality(entry.hours_slept)
          const dayLabel = DAYS[new Date(entry.date + 'T12:00:00').getDay()]
          return (
            <div
              key={entry.id}
              className="flex items-center justify-between px-4 py-3 rounded-xl mb-2 card-animate"
              style={{ background: isNap ? 'rgba(255,255,255,0.02)' : 'rgba(16,24,52,0.65)', border: '1px solid rgba(255,255,255,0.06)', opacity: isNap ? 0.7 : 1 }}
            >
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-10 rounded-full flex-shrink-0" style={{ background: isNap ? '#555' : q.color }} />
                <div>
                  <p className="text-white font-semibold text-sm">
                    {formatDate(entry.date)} <span style={{ color: '#555', fontWeight: 400 }}>({dayLabel})</span>
                    {entry.is_nap && <span style={{ marginLeft: 6, fontSize: 10, background: 'rgba(255,255,255,0.06)', color: '#888', padding: '1px 6px', borderRadius: 4 }}>NAP</span>}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: '#444' }}>
                    {entry.bedtime  && `Bed ${entry.bedtime} · `}
                    {entry.wake_time && `Up ${entry.wake_time}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="font-bold" style={{ color: q.color, fontSize: 18 }}>{entry.hours_slept ?? '—'}h</p>
                  <p className="text-xs" style={{ color: q.color }}>{q.label}</p>
                </div>
                <button
                  onClick={() => setEditing(entry)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: 'none', cursor: 'pointer' }}
                >
                  <EditIcon size={13} color="var(--text-muted)" />
                </button>
              </div>
            </div>
          )
        })}
        {nightLogs.length === 0 && (
          <EmptyState icon={<MoonIcon size={64} color="var(--text-muted)" />} title="No sleep logged"
            sub="Start tracking your sleep to unlock trends, weekly averages, and quality scores." />
        )}

        {editing && <EditSleepModal entry={editing} onClose={() => setEditing(null)} onSaved={load} />}
      </PageWrapper>
    </>
  )
}
