import { useEffect, useState, type FormEvent } from 'react'
import { useForm } from 'react-hook-form'
import { XP_RATES } from '../lib/xp'
import { useStore } from '../store/useStore'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, BarChart, Bar, Cell, CartesianGrid } from 'recharts'
import { TopBar } from '../components/layout/TopBar'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { Toast } from '../components/ui/Toast'
import { EditModal } from '../components/ui/EditModal'
import { EmptyState, FirstUseTip } from '../components/ui/EmptyState'
import { ErrorState } from '../components/ui/ErrorState'
import { supabase } from '../lib/supabase'
import { CHART_TOOLTIP_STYLE, today, formatDate, formatDateTooltip, localDateStr } from '../lib/utils'
import { playXPGain, playPR } from '../lib/sounds'
import type { SleepLog } from '../types'
import { MoonIcon, CheckIcon, EditIcon, CloseIcon } from '../components/ui/Icon'
import { usePageTitle } from '../hooks/usePageTitle'
import { ChartSkeleton, ChartEmptyState } from '../components/ui/Skeleton'
import { HistoryControls, useHistoryFilter } from '../components/ui/HistoryControls'

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

// ── Log form ──────────────────────────────────────────────────────────────────

interface SleepForm { date: string; bedtime: string; hours_slept: string; wake_time: string }

function LogSleepPanel({ onLogged }: { onLogged: () => void }) {
  const [open, setOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [undo,  setUndo]  = useState<(() => void) | null>(null)
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
    if (error || !inserted) { setToast('Failed to save — try again'); return }
    if (hadDream) saveDreamForLog(inserted.id)
    const hrs = parsedHours ?? 0
    const q   = sleepQuality(hrs)
    const xp  = XP_RATES.sleep_log + (hrs >= 7 ? XP_RATES.sleep_quality_bonus : 0)
    if (hrs >= 8.5) playPR(); else playXPGain()
    const insertedId = inserted.id
    setUndo(() => async () => {
      await supabase.from('sleep_log').delete().eq('id', insertedId)
      await refreshXP(); refreshActivity(); onLogged()
    })
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
        type="button"
        data-tutorial="log-sleep-btn"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all"
        style={{ background: open ? 'var(--accent)' : 'var(--input-bg)', color: open ? 'var(--base-bg)' : 'var(--accent)', border: '1px solid var(--accent)', fontSize: 15 }}
      >
        {open ? 'Cancel' : 'Log Sleep'}
      </button>
      {open && (
        <Card className="mt-3 pop-in">
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
                Had a dream
              </span>
            </div>

            <Button type="submit" fullWidth loading={isSubmitting} disabled={isSubmitting}>{isSubmitting ? 'Logging...' : 'Log Sleep'}</Button>
          </form>
        </Card>
      )}
      {toast && <Toast message={toast} onUndo={undo ?? undefined} onDone={() => { setToast(null); setUndo(null) }} />}
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
        {open ? 'Cancel' : 'Log Nap'}
      </button>
      {open && (
        <Card className="mt-3 pop-in">
          <form onSubmit={submit} className="flex flex-col gap-4">
            <Input label="Date" type="date" value={date} onChange={e => setDate(e.target.value)} />
            <Input label="Nap Length (hours)" type="number" step="0.25" placeholder="1.5" value={hours} onChange={e => setHours(e.target.value)} required />
            <Button type="submit" fullWidth disabled={saving}>{saving ? 'Logging...' : 'Log Nap'}</Button>
          </form>
        </Card>
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
    const parsedHours = hours !== '' ? parseFloat(hours) : null
    if (parsedHours !== null && !isFinite(parsedHours)) return
    setSaving(true)
    const { error } = await supabase.from('sleep_log').update({
      hours_slept: parsedHours,
      bedtime: bedtime || null,
      wake_time: wakeTime || null,
    }).eq('id', entry.id)
    setSaving(false)
    if (!error) { onSaved(); onClose() }
  }

  async function del() {
    const { error } = await supabase.from('sleep_log').delete().eq('id', entry.id)
    if (!error) { onSaved(); onClose() }
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

// ── Sleep debt card ───────────────────────────────────────────────────────────

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
      <div className="rounded-xl p-4 mb-4 flex items-center gap-3" style={{ background: 'var(--surface-1)', border: '1px solid var(--border-subtle)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, borderRadius: 9, background: 'var(--surface-2)', flexShrink: 0 }}>
          <CheckIcon size={16} color="#4ade80" />
        </div>
        <div>
          <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>No sleep debt</p>
          <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>You've been hitting your sleep goals.</p>
        </div>
      </div>
    )
  }

  const recoveryNights = Math.ceil(recentDebt / RECOVERY_EXTRA)
  const debtColor = totalDebt >= 10 ? '#ef4444' : totalDebt >= 5 ? '#f97316' : '#f59e0b'
  const maxBar = Math.max(totalDebt, 10)

  return (
    <div className="rounded-xl mb-4" style={{ background: 'var(--surface-1)', border: '1px solid var(--border-default)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <div className="flex items-center gap-2">
          <MoonIcon size={16} color={debtColor} />
          <span className="font-bold" style={{ color: 'var(--text-primary)', fontSize: 15 }}>Sleep Debt</span>
        </div>
        <span className="font-bold font-mono" style={{ color: debtColor, fontSize: 20 }}>
          {totalDebt.toFixed(1)}h
        </span>
      </div>

      {/* Debt bar — full width flush */}
      <div style={{ height: 6, background: 'var(--surface-2)' }}>
        <div style={{
          height: '100%', width: `${Math.min(100, (totalDebt / maxBar) * 100).toFixed(0)}%`,
          background: debtColor, transition: 'width 0.6s ease',
        }} />
      </div>

      {/* Three stat chips */}
      <div className="grid grid-cols-3 gap-px p-4" style={{ gap: 8 }}>
        {[
          { label: '7-night deficit', value: `${recentDebt.toFixed(1)}h`, color: debtColor },
          { label: '14-day rolling',  value: `${totalDebt.toFixed(1)}h`,  color: debtColor },
          { label: 'Nights to clear', value: String(recoveryNights),       color: 'var(--text-primary)' },
        ].map(s => (
          <div key={s.label} className="rounded-lg text-center" style={{ background: 'var(--surface-2)', border: '1px solid var(--border-default)', padding: '10px 6px 8px' }}>
            <p className="font-bold font-mono" style={{ color: s.color, fontSize: 20, lineHeight: 1 }}>{s.value}</p>
            <p className="section-label" style={{ fontSize: 9, marginTop: 5 }}>{s.label}</p>
          </div>
        ))}
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

// ── Wake schedule math (ported from wake-shared.jsx) ─────────────────────────

interface ScheduleNight {
  idx:       number
  wake:      number   // minutes since midnight
  sleep:     number   // bedtime minutes
  atGoal:    boolean
  dateLabel: string   // "May 30"
  dow:       string
  label:     string   // "Tonight" | "Tomorrow" | "Sat"
  dateStr:   string   // YYYY-MM-DD for log matching
}

const MON_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const DOW_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

function buildWakeSchedule(
  startWake: number, goalWake: number, drift: number,
  sleepDur: number, todayStr: string,
): ScheduleNight[] {
  const out: ScheduleNight[] = []
  let wake = startWake
  const dir = goalWake < startWake ? -1 : 1
  for (let i = 0; i < 21; i++) {
    const atGoal = (goalWake - wake) * dir <= 0.0001
    const d = new Date(todayStr + 'T12:00:00')
    d.setDate(d.getDate() + i)
    out.push({
      idx: i, wake, sleep: wake - sleepDur * 60, atGoal,
      dateLabel: `${MON_SHORT[d.getMonth()]} ${d.getDate()}`,
      dow: DOW_SHORT[d.getDay()],
      label: i === 0 ? 'Tonight' : i === 1 ? 'Tomorrow' : DOW_SHORT[d.getDay()],
      dateStr: localDateStr(d),
    })
    if (atGoal) {
      if (out.filter(n => n.atGoal).length >= 3) break
      wake = goalWake
    } else {
      wake = dir < 0 ? Math.max(goalWake, wake - drift) : Math.min(goalWake, wake + drift)
    }
  }
  return out
}

// ── Ramp SVG (ported from wake-ramp.jsx) ─────────────────────────────────────

function WakeRamp({ schedule, startWake, goalWake }: {
  schedule: ScheduleNight[]; startWake: number; goalWake: number
}) {
  if (schedule.length < 2) return null
  const W = 560, H = 148, pL = 8, pR = 14, pT = 20, pB = 28
  const iW = W - pL - pR, iH = H - pT - pB
  const hi = startWake + 18, lo = goalWake - 18
  const xf = (i: number) => pL + (iW * i) / (schedule.length - 1)
  const yf = (m: number) => pT + iH * (1 - (m - lo) / (hi - lo))

  const pts = schedule.map((n, i) => [xf(i), yf(n.wake)] as [number, number])
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ')
  const area = `${line} L${pts[pts.length-1][0].toFixed(1)} ${(pT+iH).toFixed(1)} L${pts[0][0].toFixed(1)} ${(pT+iH).toFixed(1)} Z`
  const goalY  = yf(goalWake)
  const goalIdx = schedule.findIndex(n => n.atGoal)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block', overflow: 'visible' }}>
      <defs>
        <linearGradient id="wt-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--text-primary)" stopOpacity="0.07" />
          <stop offset="100%" stopColor="var(--text-primary)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* goal floor dashed line */}
      <line x1={pL} y1={goalY} x2={W-pR} y2={goalY}
        stroke="var(--accent)" strokeWidth="1.5" strokeDasharray="2 5" opacity="0.9" />
      <text x={W-pR} y={goalY-7} textAnchor="end"
        fontFamily="var(--font-mono)" fontSize="10" letterSpacing="0.04em" fill="var(--accent)">
        GOAL {fmtTime(goalWake)}
      </text>
      {/* area fill + line */}
      <path d={area} fill="url(#wt-grad)" />
      <path d={line} fill="none" stroke="var(--text-primary)" strokeWidth="2.4"
        strokeLinejoin="round" strokeLinecap="round" />
      {/* nodes */}
      {schedule.map((n, i) => {
        const isFirst = i === 0
        const isGoal  = i === goalIdx
        const r     = isFirst ? 5.5 : 3.2
        const fill  = (isFirst || isGoal) ? 'var(--accent)' : 'var(--surface-1)'
        const stroke = (isFirst || n.atGoal) ? 'var(--accent)' : 'var(--text-primary)'
        return <circle key={i} cx={xf(i)} cy={yf(n.wake)} r={r} fill={fill} stroke={stroke} strokeWidth="2" />
      })}
      {/* tonight time label above first node */}
      <text x={pts[0][0]} y={pts[0][1]-12} textAnchor="start"
        fontFamily="var(--font-mono)" fontSize="10" fontWeight="700" fill="var(--accent)">
        {fmtTime(startWake)}
      </text>
      {/* x-axis labels */}
      <text x={pts[0][0]} y={H-5} textAnchor="start"
        fontFamily="var(--font-mono)" fontSize="9" letterSpacing="0.07em" fill="var(--text-muted)">
        TONIGHT
      </text>
      {goalIdx > 0 && (
        <text x={xf(goalIdx)} y={H-5} textAnchor="middle"
          fontFamily="var(--font-mono)" fontSize="9" letterSpacing="0.07em" fill="var(--text-muted)">
          {schedule[goalIdx].dateLabel.toUpperCase()}
        </text>
      )}
    </svg>
  )
}

// ── Wake Time Trainer ─────────────────────────────────────────────────────────

const DRIFT_OPTIONS = [
  { label: 'Gentle',   value: 10, sub: '10 min/day' },
  { label: 'Moderate', value: 20, sub: '20 min/day' },
  { label: 'Fast',     value: 30, sub: '30 min/day' },
]

function WakeTimeTrainer({ logs }: { logs: SleepLog[] }) {
  const [open,         setOpen]        = useState(false)
  const [targetMins,   setTargetMins]  = useState(8 * 60)   // default 8:00 AM
  const [drift,        setDrift]       = useState(20)
  const [showSchedule, setShowSchedule] = useState(false)

  const wakeTimeLogs    = logs.filter(l => l.wake_time && l.wake_time.length >= 4).slice(0, 14)
  const avgWakeMins: number | null = wakeTimeLogs.length >= 2
    ? Math.round(wakeTimeLogs.reduce((s, l) => s + parseTime(l.wake_time!), 0) / wakeTimeLogs.length)
    : null
  const currentWakeMins = avgWakeMins ?? parseTime('11:00')
  const alreadyAtGoal   = currentWakeMins <= targetMins

  const todayStr  = today()
  const nNeeded   = alreadyAtGoal ? 0 : Math.ceil((currentWakeMins - targetMins) / drift)
  const schedule  = buildWakeSchedule(currentWakeMins, targetMins, drift, 8, todayStr)
  const goalNight = schedule.find(n => n.atGoal)

  const adjustTarget = (delta: number) => setTargetMins(m => (((m + delta) % 1440) + 1440) % 1440)

  // ── Closed ──
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-xl mb-4 text-left"
        style={{ background: 'var(--surface-1)', border: '1px solid var(--border-default)', cursor: 'pointer', padding: '14px 16px' }}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="font-bold" style={{ color: 'var(--accent)', fontSize: 15 }}>Wake Time Trainer</p>
            <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 3 }}>
              {avgWakeMins !== null ? (
                <>
                  Goal <span className="font-mono" style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{fmtTime(targetMins)}</span>
                  {' · '}
                  {alreadyAtGoal
                    ? 'Already at goal'
                    : `${nNeeded} night${nNeeded === 1 ? '' : 's'} to go`}
                </>
              ) : 'Set a gradual wake-time goal — night by night'}
            </p>
          </div>
          <span style={{ color: 'var(--accent)', fontSize: 20, fontWeight: 300 }}>›</span>
        </div>
      </button>
    )
  }

  // ── Open ──
  return (
    <Card className="mb-4 pop-in">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <p className="font-bold" style={{ color: 'var(--text-primary)', fontSize: 15 }}>Wake Time Trainer</p>
        <button type="button" aria-label="Close" onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}><CloseIcon size={16} /></button>
      </div>

      <div className="p-4 flex flex-col gap-4">

        {/* Zone 1 — Now → Goal */}
        <div className="flex items-center gap-3">
          <div className="flex-1 rounded-lg p-3 text-center" style={{ background: 'var(--surface-2)', border: '1px solid var(--border-subtle)' }}>
            <p className="section-label mb-1">{avgWakeMins !== null ? `Avg · ${wakeTimeLogs.length} nights` : 'Current'}</p>
            <p className="font-bold font-mono" style={{ color: 'var(--text-primary)', fontSize: 21 }}>{fmtTime(currentWakeMins)}</p>
          </div>
          <span style={{ color: 'var(--text-muted)', fontSize: 18 }}>→</span>
          <div className="flex-1 rounded-lg p-3 text-center" style={{ background: 'var(--surface-2)', border: '1px solid var(--accent)' }}>
            <p className="section-label mb-1" style={{ color: 'var(--accent)' }}>Goal</p>
            <p className="font-bold font-mono" style={{ color: 'var(--accent)', fontSize: 21 }}>{fmtTime(targetMins)}</p>
          </div>
        </div>

        {/* Status line */}
        {alreadyAtGoal ? (
          <div className="rounded-lg p-3 flex items-center gap-2" style={{ background: 'var(--surface-2)', border: '1px solid var(--border-subtle)' }}>
            <CheckIcon size={15} color="#4ade80" />
            <p style={{ color: 'var(--text-primary)', fontSize: 13, fontWeight: 600 }}>Already at or ahead of goal</p>
          </div>
        ) : (
          <p style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center' }}>
            <span className="font-bold font-mono" style={{ color: 'var(--text-primary)' }}>{nNeeded} night{nNeeded !== 1 ? 's' : ''}</span>
            {' to reach your goal'}
            {goalNight && <> · <span style={{ color: 'var(--text-secondary)' }}>by {goalNight.dateLabel}</span></>}
          </p>
        )}

        {/* Zone 2 — Controls */}
        {/* Target wake stepper */}
        <div>
          <p className="section-label mb-2">Target wake time</p>
          <div className="flex items-center justify-between rounded-lg" style={{ background: 'var(--surface-2)', border: '1px solid var(--border-subtle)', padding: '8px 12px' }}>
            <button
              onClick={() => adjustTarget(-15)}
              style={{ width: 34, height: 34, borderRadius: 8, border: 'none', background: 'var(--surface-1)', cursor: 'pointer', fontWeight: 700, fontSize: 20, color: 'var(--text-primary)', lineHeight: 1, boxShadow: 'var(--shadow-sm)' }}
            >−</button>
            <p className="font-bold font-mono" style={{ fontSize: 24, color: 'var(--accent)' }}>{fmtTime(targetMins)}</p>
            <button
              onClick={() => adjustTarget(+15)}
              style={{ width: 34, height: 34, borderRadius: 8, border: 'none', background: 'var(--surface-1)', cursor: 'pointer', fontWeight: 700, fontSize: 20, color: 'var(--text-primary)', lineHeight: 1, boxShadow: 'var(--shadow-sm)' }}
            >+</button>
          </div>
        </div>

        {/* Drift speed segmented control */}
        <div>
          <p className="section-label mb-2">Shift speed</p>
          <div className="flex rounded-lg" style={{ background: 'var(--surface-2)', border: '1px solid var(--border-subtle)', padding: 3, gap: 3 }}>
            {DRIFT_OPTIONS.map(o => (
              <button
                key={o.value}
                onClick={() => setDrift(o.value)}
                style={{
                  flex: 1, padding: '7px 4px', borderRadius: 7, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                  background: drift === o.value ? 'var(--surface-1)' : 'transparent',
                  color: drift === o.value ? 'var(--text-primary)' : 'var(--text-muted)',
                  fontWeight: drift === o.value ? 700 : 500,
                  fontSize: 12, lineHeight: 1.2,
                  boxShadow: drift === o.value ? 'var(--shadow-sm)' : 'none',
                  transition: 'background 0.15s, color 0.15s',
                }}
              >
                {o.label}
                <span style={{ display: 'block', fontSize: 9, marginTop: 2, fontFamily: 'var(--font-mono)', opacity: 0.55, fontWeight: 400 }}>{o.sub}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Zone 3 — Ramp chart + schedule */}
        {!alreadyAtGoal && (
          <div>
            <div style={{ margin: '2px 0 6px' }}>
              <WakeRamp schedule={schedule} startWake={currentWakeMins} goalWake={targetMins} />
            </div>

            {/* Tonight callout */}
            <div className="rounded-lg" style={{ background: 'var(--surface-2)', border: '1px solid var(--border-default)', padding: '10px 14px', marginBottom: 8 }}>
              <p className="section-label mb-2">Tonight</p>
              <div className="flex justify-between items-end">
                <div>
                  <p style={{ color: 'var(--text-muted)', fontSize: 11 }}>Bed by</p>
                  <p className="font-bold font-mono" style={{ color: 'var(--accent)', fontSize: 22, lineHeight: 1.1 }}>{fmtTime(schedule[0]?.sleep)}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ color: 'var(--text-muted)', fontSize: 11 }}>Wake at</p>
                  <p className="font-bold font-mono" style={{ color: 'var(--text-primary)', fontSize: 18, lineHeight: 1.1 }}>{fmtTime(schedule[0]?.wake)}</p>
                </div>
              </div>
            </div>

            {/* Collapsible full schedule */}
            <button
              onClick={() => setShowSchedule(s => !s)}
              style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '4px 0 2px', color: 'var(--text-muted)', fontSize: 12 }}
            >
              <span className="section-label" style={{ pointerEvents: 'none' }}>Full schedule</span>
              <span style={{ fontSize: 14, display: 'inline-block', transform: showSchedule ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}>›</span>
            </button>

            {showSchedule && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 6, maxHeight: 260, overflowY: 'auto' }}>
                {schedule
                  .filter((n, _, arr) => !n.atGoal || n === arr.find(x => x.atGoal))
                  .map(n => {
                    const actual   = logs.find(l => l.date === n.dateStr)
                    const onTrack  = actual?.wake_time ? parseTime(actual.wake_time) <= n.wake + 15 : null
                    const isFirst  = n.idx === 0

                    return (
                      <div
                        key={n.idx}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '6px 10px', borderRadius: 8,
                          background: isFirst ? 'var(--surface-2)' : 'transparent',
                          border: `1px solid ${isFirst ? 'var(--border-default)' : 'transparent'}`,
                        }}
                      >
                        <div style={{ width: 22, textAlign: 'center', flexShrink: 0 }}>
                          {onTrack === true
                            ? <CheckIcon size={12} color="#4ade80" />
                            : n.atGoal
                              ? <CheckIcon size={12} color="var(--accent)" />
                              : <span className="font-mono" style={{ color: isFirst ? 'var(--accent)' : 'var(--text-muted)', fontSize: 10, fontWeight: 700 }}>D{n.idx+1}</span>
                          }
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ color: n.atGoal ? 'var(--accent)' : isFirst ? 'var(--text-primary)' : 'var(--text-secondary)', fontSize: 12, fontWeight: isFirst ? 700 : 500 }}>
                            {n.label}
                            {n.idx > 1 && <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}> · {n.dateLabel}</span>}
                            {isFirst && <span className="font-mono" style={{ marginLeft: 6, fontSize: 9, background: 'var(--accent)', color: 'var(--base-bg)', padding: '1px 5px', borderRadius: 3 }}>TODAY</span>}
                            {n.atGoal && <span className="font-mono" style={{ marginLeft: 6, fontSize: 9, color: 'var(--accent)', padding: '1px 5px', borderRadius: 3, border: '1px solid var(--border-subtle)' }}>GOAL</span>}
                          </span>
                          {actual?.wake_time && (
                            <p style={{ color: onTrack ? '#4ade80' : 'var(--text-muted)', fontSize: 10, marginTop: 1 }}>
                              Actual {fmtTime(parseTime(actual.wake_time))} {onTrack ? '✓' : '✗'}
                            </p>
                          )}
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <p className="font-mono" style={{ color: 'var(--text-muted)', fontSize: 10 }}>{fmtTime(n.sleep)}</p>
                          <p className="font-mono" style={{ color: n.atGoal ? 'var(--accent)' : 'var(--text-secondary)', fontSize: 11, fontWeight: 700 }}>{fmtTime(n.wake)}</p>
                        </div>
                      </div>
                    )
                  })}
              </div>
            )}
          </div>
        )}

        <p style={{ color: 'var(--text-muted)', fontSize: 10, textAlign: 'center', lineHeight: 1.5 }}>
          Shifting {drift} min/day matches the body's natural circadian adaptation rate.
          Consistency every night, including weekends, is key.
        </p>

      </div>
    </Card>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

const ttStyle = CHART_TOOLTIP_STYLE
const labelStyle = { color: 'var(--text-muted)' }
const itemStyle  = { color: 'var(--text-primary)' }

export function Sleep() {
  usePageTitle('Sleep')
  const [logs,      setLogs]      = useState<SleepLog[]>([])
  const [editing,   setEditing]   = useState<SleepLog | null>(null)
  const [visible,   setVisible]   = useState(10)
  const [loadError, setLoadError] = useState(false)
  const [chartLoading, setChartLoading] = useState(true)
  const [dreamsMap, setDreamsMap] = useState<Record<string, boolean>>(() => getDreamsMap())

  async function load() {
    setLoadError(false)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setChartLoading(false); return }
    const { data, error } = await supabase.from('sleep_log').select('*').eq('user_id', user.id).order('date', { ascending: false }).limit(500)
    if (error) { setLoadError(true); setChartLoading(false); return }
    setLogs(data ?? [])
    setDreamsMap(getDreamsMap())
    setChartLoading(false)
  }
  useEffect(() => { load() }, [])

  const nightLogs = logs.filter(r => !r.is_nap)
  const sorted = [...nightLogs].sort((a, b) => a.date.localeCompare(b.date))
  const sorted30 = (() => {
    const cutoff = nDaysAgo(29)
    return sorted.filter(r => r.date >= cutoff)
  })()

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

  const { search: historySearch, setSearch: setHistorySearch, range: historyRange, setRange: setHistoryRange, filtered: historyFiltered } = useHistoryFilter(logs, ['bedtime', 'wake_time'])

  return (
    <>
      <TopBar title="Sleep" />
      <PageWrapper>

        {loadError && (
          <ErrorState
            icon={<MoonIcon size={56} color="var(--text-muted)" />}
            title="Could not load sleep logs"
            sub="Check your connection and try again."
            onRetry={load}
          />
        )}

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-2 mb-5">
          {[
            { label: 'Avg Hours',   value: avg    ? avg.toFixed(1)  : '—' },
            { label: 'Best Night',  value: best   ? best.toFixed(1) : '—' },
            { label: 'Streak',      value: streak },
            { label: 'Best Streak', value: bestStreak },
          ].map(s => (
            <div key={s.label} className="rounded-xl p-3 text-center card-animate" style={{ background: 'var(--surface-1)', border: '1px solid var(--border-subtle)' }}>
              <p style={{ fontSize: 22, fontWeight: 700, color: 'var(--accent)', fontFamily: 'var(--font-mono)', lineHeight: 1 }}>{s.value}</p>
              <p className="section-label mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Sleep debt */}
        <SleepDebtCard logs={logs} />

        {/* Wake time trainer */}
        <WakeTimeTrainer logs={nightLogs} />

        {/* Log buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '4px 0 14px' }}>
          <div style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
          <span style={{ fontSize: 10, color: 'var(--text-disabled)', fontWeight: 600, textTransform: 'uppercase', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em' }}>Log</span>
          <div style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
        </div>
        <LogSleepPanel onLogged={load} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '4px 0 8px' }}>
          <div style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
          <span style={{ fontSize: 10, color: 'var(--text-disabled)', fontWeight: 600, textTransform: 'uppercase', fontFamily: 'var(--font-mono)', letterSpacing: '0.1em' }}>or</span>
          <div style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
        </div>
        <LogNapPanel onLogged={load} />

        {/* Hours slept trend */}
        {chartLoading && <ChartSkeleton height={160} title="Hours Slept" />}
        {!chartLoading && nightLogs.length === 0 && (
          <ChartEmptyState title="Hours Slept" message="Log your first night to start tracking sleep trends" color="#818cf8" />
        )}
        {!chartLoading && sorted.length > 0 && sorted.length < 3 && (
          <Card className="mb-4">
            <p className="font-bold mb-2" style={{ fontSize: 15, color: 'var(--text-primary)' }}>Hours Slept</p>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'center', padding: '16px 0' }}>
              {sorted.map(d => (
                <div key={d.date} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#818cf8' }} />
                  <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>{d.hours_slept?.toFixed(1)}</p>
                </div>
              ))}
            </div>
            <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-muted)' }}>
              Log {3 - sorted.length} more night{3 - sorted.length > 1 ? 's' : ''} to unlock your trend chart
            </p>
          </Card>
        )}
        {!chartLoading && sorted.length >= 3 && (
          <Card className="mb-4">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <p className="font-bold" style={{ fontSize: 15, color: 'var(--text-primary)' }}>Hours Slept</p>
              <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>Last 30 days</span>
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={sorted30.length >= 2 ? sorted30 : sorted} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="sleep-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#818cf8" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#818cf8" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 6" stroke="var(--border-subtle)" vertical={false} />
                <XAxis dataKey="date" tickFormatter={(d: string) => formatDate(d)} tick={{ fill: 'var(--text-tertiary)', fontSize: 9 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 12]} tick={{ fill: 'var(--text-tertiary)', fontSize: 9 }} axisLine={false} tickLine={false} width={25} />
                <Tooltip
                  contentStyle={ttStyle} labelStyle={labelStyle} itemStyle={itemStyle}
                  labelFormatter={(l: unknown) => typeof l === 'string' ? formatDateTooltip(l) : String(l)}
                  formatter={(v: unknown) => [`${v}h`, 'Sleep']}
                  cursor={{ stroke: 'var(--border-default)', strokeWidth: 1 }}
                />
                <ReferenceLine y={8} stroke="#27AE60" strokeDasharray="4 2" strokeOpacity={0.45} />
                <ReferenceLine y={7} stroke="#818cf8" strokeDasharray="4 2" strokeOpacity={0.35} />
                <Area type="monotone" dataKey="hours_slept" stroke="#818cf8" strokeWidth={2.5}
                  fill="url(#sleep-grad)"
                  dot={{ fill: '#818cf8', r: 3, fillOpacity: 0.8 }}
                  activeDot={{ r: 5, fill: '#818cf8', stroke: 'var(--base-bg)', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
            <div className="flex gap-4 mt-1">
              <span className="text-xs" style={{ color: '#27AE60' }}>── 8h goal</span>
              <span className="text-xs" style={{ color: 'var(--accent)' }}>── 7h min</span>
            </div>
          </Card>
        )}

        {/* Day of week breakdown */}
        {nightLogs.length >= 3 && (
          <Card className="mb-4">
            <p className="font-bold mb-3" style={{ fontSize: 15, color: 'var(--text-primary)' }}>By Day of Week</p>
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={dayData} barSize={28}>
                <XAxis dataKey="label" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 12]} tick={{ fill: 'var(--text-tertiary)', fontSize: 9 }} axisLine={false} tickLine={false} width={25} />
                <Tooltip
                  contentStyle={ttStyle} labelStyle={labelStyle} itemStyle={itemStyle}
                  formatter={(v: unknown) => [`${v}h avg`, 'Sleep']}
                  cursor={{ fill: 'var(--border-subtle)' }}
                />
                <Bar dataKey="avg" radius={[4, 4, 0, 0]}>
                  {dayData.map((d, i) => (
                    <Cell key={i} fill={d.avg >= 8.5 ? '#15803d' : d.avg >= 7.5 ? '#4ade80' : d.avg >= 6.5 ? '#fbbf24' : d.avg >= 5.5 ? '#f97316' : d.avg > 0 ? '#ef4444' : 'var(--border-subtle)'} fillOpacity={d.avg > 0 ? 0.9 : 1} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        )}

        {/* History */}
        <p className="card-title mb-3">History</p>
        <HistoryControls search={historySearch} onSearch={setHistorySearch} range={historyRange} onRange={setHistoryRange} placeholder="Search bedtime, wake time..." />
        {historyFiltered.slice(0, visible).map(entry => {
          const isNap    = entry.is_nap
          const q        = isNap ? { label: 'Nap', color: '#888' } : sleepQuality(entry.hours_slept)
          const dayLabel = DAYS[new Date(entry.date + 'T12:00:00').getDay()]
          return (
            <Card
              key={entry.id}
              className="mb-2 card-animate"
              style={{ background: isNap ? 'var(--input-bg)' : undefined, opacity: isNap ? 0.7 : 1, padding: 0 }}
            >
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-10 rounded-full flex-shrink-0" style={{ background: isNap ? 'var(--text-dim)' : q.color }} />
                  <div>
                    <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                      {formatDate(entry.date)} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>({dayLabel})</span>
                      {entry.is_nap && <span style={{ marginLeft: 6, fontSize: 10, background: 'var(--input-bg)', color: 'var(--text-muted)', padding: '1px 6px', borderRadius: 4 }}>NAP</span>}
                      {dreamsMap[entry.id] && <span style={{ marginLeft: 6, fontSize: 9, fontWeight: 700, color: 'var(--text-tertiary)', background: 'var(--surface-2)', padding: '1px 5px', borderRadius: 4, fontFamily: 'var(--font-mono)', letterSpacing: '0.05em' }}>dream</span>}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
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
            </Card>
          )
        })}
        {historyFiltered.length > visible && (
          <button
            type="button"
            onClick={() => setVisible(v => v + 20)}
            className="w-full py-3 rounded-xl font-semibold mt-1"
            style={{ background: 'var(--input-bg)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)', fontSize: 14 }}
          >
            Show more ({historyFiltered.length - visible} left)
          </button>
        )}
        {nightLogs.length === 0 && (
          <EmptyState icon={<MoonIcon size={64} color="var(--text-muted)" />} title="No sleep logged"
            sub="Start tracking your sleep to unlock trends, weekly averages, and quality scores." />
        )}

        {editing && <EditSleepModal entry={editing} onClose={() => setEditing(null)} onSaved={load} />}
      </PageWrapper>
    </>
  )
}
