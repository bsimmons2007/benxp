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
import { EmptyState, FirstUseTip } from '../components/ui/EmptyState'
import { supabase } from '../lib/supabase'
import { today, formatDate, formatDateTooltip, localDateStr } from '../lib/utils'
import { playXPGain, playPR } from '../lib/sounds'
import type { SleepLog } from '../types'
import { MoonIcon, CheckIcon, EditIcon } from '../components/ui/Icon'
import { usePageTitle } from '../hooks/usePageTitle'
import { ChartSkeleton, ChartEmptyState } from '../components/ui/Skeleton'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const DREAMS_KEY = 'youxp-sleep-dreams'
function getDreamsMap(): Record<string, boolean> {
  try { return JSON.parse(localStorage.getItem(DREAMS_KEY) ?? '{}') } catch { return {} }
}
function saveDreamForLog(id: string) {
  const m = getDreamsMap()
  m[id] = true
  localStorage.setItem(DREAMS_KEY, JSON.stringify(m))
}
const SLEEP_GOAL = 8        // hours/night target
const RECOVERY_EXTRA = 1    // extra hours per recovery night
const DEBT_WINDOW = 14      // rolling window for debt (days)

function lerpColor(a: [number,number,number], b: [number,number,number], t: number): string {
  return `rgb(${Math.round(a[0]+(b[0]-a[0])*t)},${Math.round(a[1]+(b[1]-a[1])*t)},${Math.round(a[2]+(b[2]-a[2])*t)})`
}
const SLEEP_GREEN:  [number,number,number] = [46, 204, 113]
const SLEEP_YELLOW: [number,number,number] = [245, 166, 35]
const SLEEP_RED:    [number,number,number] = [233, 69, 96]

function sleepQuality(hours: number | null): { label: string; color: string } {
  if (!hours) return { label: '—', color: 'var(--text-dim)' }
  const clamped = Math.max(5, Math.min(9, hours))
  const color = clamped >= 7
    ? lerpColor(SLEEP_YELLOW, SLEEP_GREEN, (clamped - 7) / 2)
    : lerpColor(SLEEP_RED, SLEEP_YELLOW, (clamped - 5) / 2)
  const label = hours >= 8.5 ? 'Excellent' : hours >= 7.5 ? 'Great' : hours >= 6.5 ? 'Good' : hours >= 5.5 ? 'Fair' : 'Poor'
  return { label, color }
}

/** YYYY-MM-DD for N days ago (0 = today) using the canonical localDateStr from utils */
function nDaysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return localDateStr(d)
}

// â"€â"€ Log form â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

interface SleepForm { date: string; bedtime: string; hours_slept: string; wake_time: string }

function LogSleepPanel({ onLogged }: { onLogged: () => void }) {
  const [open, setOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [hadDream, setHadDream] = useState(false)
  const refreshXP             = useStore((s) => s.refreshXP)
  const refreshActivity       = useStore((s) => s.refreshActivity)
  const addOptimisticActivity = useStore((s) => s.addOptimisticActivity)
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
    const parsedHours = data.hours_slept !== '' ? parseFloat(data.hours_slept) : null
    if (parsedHours !== null && !isFinite(parsedHours)) return
    if (parsedHours !== null && (parsedHours < 1.5 || parsedHours > 18)) {
      setToast('⚠️ Unusual sleep duration — check the hours value before saving.')
      return
    }
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: inserted, error } = await supabase.from('sleep_log').insert({
      user_id: user.id,
      date: data.date,
      bedtime: data.bedtime || null,
      hours_slept: parsedHours,
      wake_time: data.wake_time || null,
    }).select('id').single()
    if (error) { setToast('Failed to save — try again'); return }
    if (inserted && hadDream) saveDreamForLog(inserted.id)
    const hrs = parsedHours ?? 0
    const q   = sleepQuality(hrs)
    const xp  = XP_RATES.sleep_log + (hrs >= 7 ? XP_RATES.sleep_quality_bonus : 0)
    if (hrs >= 8.5) playPR(); else playXPGain()
    setToast(`+${xp} XP — ${q.label} sleep!`)
    addOptimisticActivity({ type: 'sleep', label: `${hrs.toFixed(1)}h sleep`, date: data.date, icon: 'sleep' })
    await refreshXP()
    refreshActivity()
    reset({ date: today(), bedtime: '', hours_slept: '', wake_time: '' })
    setHadDream(false)
    setOpen(false)
    onLogged()
  }

  return (
    <div className="mb-5">
      <button
        data-tutorial="log-sleep-btn"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all"
        style={{ background: open ? 'var(--accent)' : 'var(--input-bg)', color: open ? '#1A1A2E' : 'var(--accent)', border: '1px solid var(--accent)', fontSize: 15 }}
      >
        {open ? 'âœ• Cancel' : '+ Log Sleep'}
      </button>
      {open && (
        <div className="mt-3 rounded-xl p-4 pop-in" style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}>
          <FirstUseTip formKey="sleep" tip="Log bedtime + wake time to auto-calculate hours, or just enter hours directly. 7+ hours earns a quality bonus XP." />
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <Input label="Date"     type="date" {...register('date', { required: true })} />
            <Input label="Bedtime"  type="time" {...register('bedtime')} />
            <Input label="Wake Up"  type="time" {...register('wake_time')} />
            <Input label="Hours Slept (auto-calculated)" type="number" step="0.1" placeholder="7.5"
              {...register('hours_slept', { required: true })}
              style={{ background: 'var(--input-bg)', color: 'var(--accent)' }}
            />
            {/* Dream toggle */}
            <div
              className="flex items-center gap-3 cursor-pointer select-none"
              onClick={() => setHadDream(d => !d)}
            >
              <div className="w-12 h-6 rounded-full transition-colors relative" style={{ background: hadDream ? 'var(--accent)' : 'var(--border)' }}>
                <div className="absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform" style={{ transform: hadDream ? 'translateX(26px)' : 'translateX(2px)' }} />
              </div>
              <span style={{ fontSize: 13, color: hadDream ? 'var(--accent)' : 'var(--text-muted)', fontWeight: 600 }}>
                💭 Had a dream
              </span>
            </div>

            <Button type="submit" fullWidth loading={isSubmitting} disabled={isSubmitting}>{isSubmitting ? 'Logging...' : 'Log Sleep'}</Button>
          </form>
        </div>
      )}
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  )
}

// â"€â"€ Nap log panel â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

function LogNapPanel({ onLogged }: { onLogged: () => void }) {
  const [open,  setOpen]  = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [date,  setDate]  = useState(today())
  const [hours, setHours] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    const napHours = parseFloat(hours)
    if (!isFinite(napHours) || napHours <= 0) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }
    const { error } = await supabase.from('sleep_log').insert({
      user_id: user.id, date, hours_slept: napHours, is_nap: true,
    })
    setSaving(false)
    if (error) { setToast('Failed to save — try again'); return }
    setToast(`Nap logged — ${hours}h`)
    setOpen(false)
    setHours('')
    onLogged()
  }

  return (
    <div className="mb-4">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold transition-all"
        style={{ background: 'var(--input-bg)', color: 'var(--text-muted)', border: '1px solid var(--border)', fontSize: 14 }}
      >
        {open ? 'âœ• Cancel' : 'Log Nap'}
      </button>
      {open && (
        <div className="mt-3 rounded-xl p-4 pop-in" style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}>
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

// â"€â"€ Edit modal â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

function EditSleepModal({ entry, onClose, onSaved }: { entry: SleepLog; onClose: () => void; onSaved: () => void }) {
  const [hours,    setHours]    = useState(String(entry.hours_slept ?? ''))
  const [bedtime,  setBedtime]  = useState(entry.bedtime ?? '')
  const [wakeTime, setWakeTime] = useState(entry.wake_time ?? '')
  const [saving,   setSaving]   = useState(false)

  async function save() {
    const parsedHours = hours !== '' ? parseFloat(hours) : null
    if (parsedHours !== null && !isFinite(parsedHours)) return
    setSaving(true)
    await supabase.from('sleep_log').update({
      hours_slept: parsedHours,
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
        <Input label="Bedtime"     type="time"   value={bedtime}  onChange={e => setBedtime(e.target.value)} />
        <Input label="Hours Slept" type="number" step={0.1} value={hours}    onChange={e => setHours(e.target.value)} />
        <Input label="Wake Time"   type="time"   value={wakeTime} onChange={e => setWakeTime(e.target.value)} />
      </div>
    </EditModal>
  )
}

// â"€â"€ Sleep debt card â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

function SleepDebtCard({ logs }: { logs: SleepLog[] }) {
  const nights = logs.filter(r => !r.is_nap)
  if (nights.length < 3) return null

  const withHours = nights.filter(r => r.hours_slept != null)
  const allNaps   = logs.filter(r => r.is_nap && r.hours_slept != null)

  // 14-night rolling window; surplus capped at RECOVERY_EXTRA/night so you can't bank infinite sleep credit
  const recent14   = withHours.slice(0, DEBT_WINDOW)
  const cutoff14   = recent14.length ? recent14[recent14.length - 1].date : ''
  const naps14hrs  = allNaps.filter(r => r.date >= cutoff14).reduce((s, r) => s + (r.hours_slept ?? 0), 0)
  const raw14      = recent14.reduce((sum, r) => sum + Math.max(-RECOVERY_EXTRA, SLEEP_GOAL - (r.hours_slept ?? 0)), 0)
  const totalDebt  = Math.max(0, raw14 - naps14hrs)

  // Last 7 nights sub-window
  const recent7Nights = withHours.slice(0, 7)
  const cutoffDate    = recent7Nights.length ? recent7Nights[recent7Nights.length - 1].date : ''
  const recentNapHrs  = allNaps.filter(r => r.date >= cutoffDate).reduce((s, r) => s + (r.hours_slept ?? 0), 0)
  const recentRaw     = recent7Nights.reduce((sum, r) => sum + Math.max(-RECOVERY_EXTRA, SLEEP_GOAL - (r.hours_slept ?? 0)), 0)
  const recentDebt    = Math.max(0, recentRaw - recentNapHrs)

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
      <div style={{ height: 6, borderRadius: 3, background: 'var(--input-bg)', overflow: 'hidden', marginBottom: 10 }}>
        <div style={{
          height: '100%', width: `${Math.min(100, (totalDebt / maxBar) * 100).toFixed(0)}%`,
          background: `linear-gradient(90deg, ${debtColor}88, ${debtColor})`,
          borderRadius: 3, transition: 'width 0.6s ease',
        }} />
      </div>

      <div className="flex items-start justify-between gap-3">
        <div>
          <p style={{ color: 'var(--text-muted)', fontSize: 11 }}>Last 7 nights: <span style={{ color: '#ccc', fontWeight: 700 }}>{recentDebt.toFixed(1)}h deficit</span></p>
          <p style={{ color: 'var(--text-muted)', fontSize: 11 }}>14-day rolling: <span style={{ color: debtColor, fontWeight: 700 }}>{totalDebt.toFixed(1)}h</span></p>
        </div>
        <div style={{
          padding: '6px 12px', borderRadius: 8,
          background: 'var(--input-bg)', border: '1px solid var(--border)',
          textAlign: 'center', flexShrink: 0,
        }}>
          <p style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: 18, fontFamily: 'Cinzel, serif', lineHeight: 1 }}>{recoveryNights}</p>
          <p style={{ color: 'var(--text-muted)', fontSize: 10 }}>nights @ 9h</p>
          <p style={{ color: 'var(--text-muted)', fontSize: 10 }}>to recover</p>
        </div>
      </div>
    </div>
  )
}

// â"€â"€ Wake Time Trainer â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

/** Parse "HH:MM" â†’ total minutes since midnight */
function parseTime(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

/** Format minutes-since-midnight â†’ "h:mm AM/PM" */
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
  const todayStr = today()
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

  // Days already on-track: wake time â‰¤ scheduled target for that day
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
            <p className="font-bold text-sm" style={{ color: 'var(--accent)', fontFamily: 'Cinzel, serif' }}>Wake Time Trainer</p>
            <p style={{ color: 'var(--text-muted)', fontSize: 11, marginTop: 2 }}>
              {avgWakeMins !== null
                ? `Avg wake: ${fmtTime(avgWakeMins)} Â· Set a goal wake time`
                : 'Plan a gradual wake time shift with a day-by-day schedule'}
            </p>
          </div>
          <span style={{ color: 'var(--accent)', fontSize: 18 }}>â€º</span>
        </div>
      </button>
    )
  }

  return (
    <div className="rounded-xl mb-4 pop-in" style={{ background: 'rgba(10,12,28,0.95)', border: '1px solid rgba(245,166,35,0.25)' }}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 pb-3" style={{ borderBottom: '1px solid var(--border-faint)' }}>
        <p className="font-bold" style={{ color: 'var(--accent)', fontFamily: 'Cinzel, serif', fontSize: 15 }}>Wake Time Trainer</p>
        <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 18 }}>âœ•</button>
      </div>

      <div className="p-4 flex flex-col gap-4">

        {/* Current vs target */}
        <div className="flex items-center gap-3">
          <div className="flex-1 rounded-lg p-3 text-center" style={{ background: 'var(--input-bg)', border: '1px solid var(--border-faint)' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 4 }}>
              {avgWakeMins !== null ? `Current avg (${wakeTimeLogs.length} nights)` : 'Current (estimated)'}
            </p>
            <p style={{ color: 'var(--text-primary)', fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-serif)' }}>{fmtTime(currentWakeMins)}</p>
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: 22, fontWeight: 300 }}>â†’</div>
          <div className="flex-1 rounded-lg p-3 text-center" style={{ background: 'rgba(245,166,35,0.08)', border: '1px solid rgba(245,166,35,0.3)' }}>
            <p style={{ color: 'var(--accent)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Goal</p>
            <p style={{ color: 'var(--accent)', fontSize: 22, fontWeight: 700, fontFamily: 'Cinzel, serif' }}>{fmtTime(targetWakeMins)}</p>
          </div>
        </div>

        {/* Settings */}
        <div className="flex flex-col gap-3">
          <div>
            <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 6 }}>Target Wake Time</label>
            <input
              type="time"
              value={targetWake}
              onChange={e => setTargetWake(e.target.value)}
              style={{ width: '100%', padding: '9px 12px', borderRadius: 8, background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: 15, outline: 'none' }}
            />
          </div>

          <div className="flex gap-3">
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 6 }}>Sleep Duration (hrs)</label>
              <input
                type="number" step="0.5" min="5" max="10"
                value={sleepHours}
                onChange={e => setSleepHours(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: 15, outline: 'none' }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 6 }}>Shift Speed</label>
              <select
                value={shiftMins}
                onChange={e => setShiftMins(Number(e.target.value))}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, background: 'rgba(10,12,24,0.9)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: 13, outline: 'none' }}
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
            <p style={{ color: '#2ECC71', fontSize: 13, fontWeight: 600 }}>You're already at or ahead of your goal!</p>
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
                <div key={s.label} className="rounded-lg p-3 text-center" style={{ background: 'var(--input-bg)', border: '1px solid var(--border-faint)' }}>
                  <p style={{ color: 'var(--accent)', fontSize: 16, fontWeight: 700, fontFamily: 'Cinzel, serif', lineHeight: 1 }}>{s.value}</p>
                  <p style={{ color: 'var(--text-muted)', fontSize: 9, marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.10em', fontWeight: 600 }}>{s.label}</p>
                </div>
              ))}
            </div>

            {/* Progress bar (if user has started) */}
            {daysOnTrack > 0 && (
              <div>
                <div className="flex justify-between mb-1">
                  <p style={{ color: 'var(--text-muted)', fontSize: 11 }}>Progress</p>
                  <p style={{ color: 'var(--accent)', fontSize: 11, fontWeight: 700 }}>{daysOnTrack}/{daysNeeded} days on track</p>
                </div>
                <div style={{ height: 6, borderRadius: 999, background: 'var(--input-bg)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${progressPct}%`, background: 'var(--accent)', borderRadius: 999, transition: 'width 0.6s ease' }} />
                </div>
              </div>
            )}

            {/* Tonight callout */}
            <div className="rounded-lg p-3" style={{ background: 'rgba(245,166,35,0.1)', border: '1px solid rgba(245,166,35,0.35)' }}>
              <p style={{ color: 'var(--accent)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 4 }}>Tonight</p>
              <div className="flex justify-between items-center">
                <div>
                  <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Go to sleep by</p>
                  <p style={{ color: 'var(--accent)', fontSize: 26, fontWeight: 700, fontFamily: 'Cinzel, serif', lineHeight: 1.1 }}>{schedule[0]?.bed}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Wake up at</p>
                  <p style={{ color: 'var(--text-primary)', fontSize: 20, fontWeight: 700, fontFamily: 'Cinzel, serif', lineHeight: 1.1 }}>{schedule[0]?.wake}</p>
                </div>
              </div>
            </div>

            {/* Day-by-day schedule */}
            <div>
              <p style={{ color: 'var(--text-muted)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8 }}>Full Schedule</p>
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
                          ? <CheckIcon size={14} color="#2ECC71" />
                          : onTrack === true
                            ? <CheckIcon size={14} color="#2ECC71" />
                            : <span style={{ color: isToday ? 'var(--accent)' : '#444', fontSize: 11, fontWeight: 700 }}>D{i + 1}</span>
                        }
                      </div>

                      {/* Date */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ color: isToday ? 'var(--accent)' : isGoalDay ? '#2ECC71' : '#ccc', fontSize: 12, fontWeight: isToday ? 700 : 500 }}>
                          {dayLabel(s.date)} Â· {formatDate(s.date)}
                          {isToday && <span style={{ marginLeft: 6, fontSize: 10, background: 'rgba(245,166,35,0.2)', color: 'var(--accent)', padding: '1px 6px', borderRadius: 4 }}>TODAY</span>}
                          {isGoalDay && <span style={{ marginLeft: 6, fontSize: 10, background: 'rgba(46,204,113,0.15)', color: '#2ECC71', padding: '1px 6px', borderRadius: 4 }}>GOAL</span>}
                        </p>
                        {actualWake?.wake_time && (
                          <p style={{ color: onTrack ? '#2ECC71' : '#E94560', fontSize: 10, marginTop: 1 }}>
                            Actual wake: {fmtTime(parseTime(actualWake.wake_time))} {onTrack ? 'âœ"' : 'âœ—'}
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
            <p style={{ color: 'var(--text-muted)', fontSize: 10, textAlign: 'center', lineHeight: 1.4 }}>
              Based on chronobiology: shifting {shiftMins} min/day is within the body's natural circadian adaptation rate.
              Consistency is key — try to hit your bedtime every night, including weekends.
            </p>
          </>
        )}
      </div>
    </div>
  )
}

// â"€â"€ Main page â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

const ttStyle = {
  background: 'rgba(10,10,22,0.97)',
  border: '1px solid var(--border)',
  borderRadius: 8, color: 'var(--text-primary)', fontSize: 12,
  boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
}
const labelStyle = { color: '#aaa' }
const itemStyle  = { color: 'var(--text-primary)' }

export function Sleep() {
  usePageTitle('Sleep')
  const [logs,      setLogs]      = useState<SleepLog[]>([])
  const [editing,   setEditing]   = useState<SleepLog | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [chartLoading, setChartLoading] = useState(true)
  const [dreamsMap, setDreamsMap] = useState<Record<string, boolean>>(() => getDreamsMap())

  async function load() {
    setLoadError(false)
    const { data, error } = await supabase.from('sleep_log').select('*').order('date', { ascending: false })
    if (error) { setLoadError(true); setChartLoading(false); return }
    setLogs(data ?? [])
    setDreamsMap(getDreamsMap())
    setChartLoading(false)
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
    const todayStr = today()
    const yesterStr = nDaysAgo(1)
    // Start from today if logged, else yesterday
    const startDaysAgo = dateSet.has(todayStr) ? 0 : dateSet.has(yesterStr) ? 1 : null
    if (startDaysAgo === null) return 0
    let s = 0, i = startDaysAgo
    while (dateSet.has(nDaysAgo(i))) { s++; i++ }
    return s
  })()

  // Best streak — longest consecutive run in all sleep logs
  const bestStreak = (() => {
    if (!nightLogs.length) return 0
    const sorted = [...new Set(nightLogs.map(r => r.date))].sort()
    let best = 0, run = 0
    for (let i = 0; i < sorted.length; i++) {
      if (i === 0) { run = 1; continue }
      const prev = new Date(sorted[i - 1] + 'T12:00:00')
      const curr = new Date(sorted[i]     + 'T12:00:00')
      const gap  = Math.round((curr.getTime() - prev.getTime()) / 86400000)
      run = gap === 1 ? run + 1 : 1
      if (run > best) best = run
    }
    return Math.max(best, run)
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

        {loadError && (
          <div className="flex flex-col items-center py-12 gap-3 fade-in">
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Could not load sleep logs</p>
            <button
              onClick={load}
              style={{ padding: '8px 20px', borderRadius: 10, fontSize: 13, fontWeight: 600, background: 'var(--accent)', color: 'var(--base-bg)', border: 'none', cursor: 'pointer' }}
            >
              Try again
            </button>
          </div>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-2 mb-5">
          {[
            { label: 'Avg Hours',   value: avg    ? avg.toFixed(1)  : '—' },
            { label: 'Best Night',  value: best   ? best.toFixed(1) : '—' },
            { label: 'Streak',      value: streak },
            { label: 'Best Streak', value: bestStreak },
          ].map(s => (
            <div key={s.label} className="rounded-xl p-3 text-center card-animate" style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}>
              <p className="text-xl font-bold" style={{ color: 'var(--accent)', fontFamily: 'Cinzel, serif' }}>{s.value}</p>
              <p className="section-label mt-0.5">{s.label}</p>
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
        {chartLoading && <ChartSkeleton height={160} title="Hours Slept" />}
        {!chartLoading && nightLogs.length === 0 && (
          <ChartEmptyState title="Hours Slept" message="Log your first night to start tracking sleep trends" color="#818cf8" />
        )}
        {!chartLoading && sorted.length > 0 && sorted.length < 3 && (
          <div className="rounded-xl p-4 mb-4" style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}>
            <p className="font-bold mb-2" style={{ fontFamily: 'Cinzel, serif', fontSize: 15, color: 'var(--text-primary)' }}>Hours Slept</p>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'center', padding: '16px 0' }}>
              {sorted.map(d => (
                <div key={d.date} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#818cf8', boxShadow: '0 0 8px #818cf8' }} />
                  <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>{d.hours_slept?.toFixed(1)}</p>
                </div>
              ))}
            </div>
            <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-muted)' }}>
              Log {3 - sorted.length} more night{3 - sorted.length > 1 ? 's' : ''} to unlock your trend chart
            </p>
          </div>
        )}
        {!chartLoading && sorted.length >= 3 && (
          <div className="rounded-xl p-4 mb-4" style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}>
            <p className="font-bold text-white mb-3" style={{ fontFamily: 'Cinzel, serif', fontSize: 15 }}>Hours Slept</p>
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={sorted} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="sleep-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#818cf8" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#818cf8" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 6" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="date" tickFormatter={(d: string) => formatDate(d)} tick={{ fill: '#666', fontSize: 9 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 12]} tick={{ fill: '#666', fontSize: 9 }} axisLine={false} tickLine={false} width={25} />
                <Tooltip
                  contentStyle={ttStyle} labelStyle={labelStyle} itemStyle={itemStyle}
                  labelFormatter={(l: unknown) => typeof l === 'string' ? formatDateTooltip(l) : String(l)}
                  formatter={(v: unknown) => [`${v}h`, 'Sleep']}
                  cursor={{ stroke: 'rgba(255,255,255,0.12)', strokeWidth: 1 }}
                />
                <ReferenceLine y={8} stroke="#27AE60" strokeDasharray="4 2" strokeOpacity={0.45} />
                <ReferenceLine y={7} stroke="#818cf8" strokeDasharray="4 2" strokeOpacity={0.35} />
                <Area type="monotone" dataKey="hours_slept" stroke="#818cf8" strokeWidth={2.5}
                  fill="url(#sleep-grad)"
                  dot={{ fill: '#818cf8', r: 3, fillOpacity: 0.8 }}
                  activeDot={{ r: 5, fill: '#818cf8', stroke: 'rgba(255,255,255,0.3)', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
            <div className="flex gap-4 mt-1">
              <span className="text-xs" style={{ color: '#27AE60' }}>â"€â"€ 8h goal</span>
              <span className="text-xs" style={{ color: 'var(--accent)' }}>â"€â"€ 7h min</span>
            </div>
          </div>
        )}

        {/* Day of week breakdown */}
        {nightLogs.length >= 3 && (
          <div className="rounded-xl p-4 mb-4" style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}>
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
        <p className="card-title mb-3">History</p>
        {logs.map(entry => {
          const isNap    = entry.is_nap
          const q        = isNap ? { label: 'Nap', color: '#888' } : sleepQuality(entry.hours_slept)
          const dayLabel = DAYS[new Date(entry.date + 'T12:00:00').getDay()]
          return (
            <div
              key={entry.id}
              className="rounded-xl mb-2 card-animate"
              style={{ background: isNap ? 'var(--input-bg)' : 'var(--card-bg)', border: '1px solid var(--border-faint)', opacity: isNap ? 0.7 : 1 }}
            >
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-10 rounded-full flex-shrink-0" style={{ background: isNap ? 'var(--text-dim)' : q.color }} />
                  <div>
                    <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                      {formatDate(entry.date)} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({dayLabel})</span>
                      {entry.is_nap && <span style={{ marginLeft: 6, fontSize: 10, background: 'var(--input-bg)', color: 'var(--text-muted)', padding: '1px 6px', borderRadius: 4 }}>NAP</span>}
                      {dreamsMap[entry.id] && <span style={{ marginLeft: 6, fontSize: 11 }} title="Had a dream">💭</span>}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {entry.bedtime  && `Bed ${entry.bedtime} Â· `}
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
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 8, background: 'var(--input-bg)', border: 'none', cursor: 'pointer' }}
                  >
                    <EditIcon size={13} color="var(--text-muted)" />
                  </button>
                </div>
              </div>
              {!isNap && entry.bedtime && entry.wake_time && (() => {
                const [bh, bm] = entry.bedtime.split(':').map(Number)
                const [wh, wm] = entry.wake_time.split(':').map(Number)
                const bFrac = (bh * 60 + bm) / 1440
                const wFrac = (wh * 60 + wm) / 1440
                const overnight = bFrac >= wFrac
                return (
                  <div style={{ position: 'relative', height: 3, margin: '0 16px 10px', borderRadius: 2, background: 'var(--input-bg)', overflow: 'hidden' }}>
                    {overnight ? (
                      <>
                        <div style={{ position: 'absolute', left: `${bFrac * 100}%`, right: 0, top: 0, bottom: 0, borderRadius: 2, background: q.color, opacity: 0.4 }} />
                        <div style={{ position: 'absolute', left: 0, width: `${wFrac * 100}%`, top: 0, bottom: 0, borderRadius: 2, background: q.color, opacity: 0.4 }} />
                      </>
                    ) : (
                      <div style={{ position: 'absolute', left: `${bFrac * 100}%`, width: `${(wFrac - bFrac) * 100}%`, top: 0, bottom: 0, borderRadius: 2, background: q.color, opacity: 0.4 }} />
                    )}
                  </div>
                )
              })()}
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
