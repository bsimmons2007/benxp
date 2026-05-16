import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, CartesianGrid } from 'recharts'
import { TopBar } from '../components/layout/TopBar'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { Toast } from '../components/ui/Toast'
import { EditModal } from '../components/ui/EditModal'
import { supabase } from '../lib/supabase'
import { XP_RATES } from '../lib/xp'
import { today, formatDate, formatDateTooltip } from '../lib/utils'
import { useStore } from '../store/useStore'
import { playXPGain } from '../lib/sounds'
import { ActivityIconComp, EditIcon, ZapIcon } from '../components/ui/Icon'
import { usePageTitle } from '../hooks/usePageTitle'
import { useStreak } from '../hooks/useStreak'
import { ChartSkeleton, ChartEmptyState } from '../components/ui/Skeleton'
import { FirstUseTip } from '../components/ui/EmptyState'

const SPLITS_KEY = 'youxp-run-splits'
function getSplitsMap(): Record<string, string[]> {
  try { return JSON.parse(localStorage.getItem(SPLITS_KEY) ?? '{}') } catch { return {} }
}
function saveSplitsForSession(id: string, raw: string) {
  const splits = raw.split(',').map(s => s.trim()).filter(Boolean)
  if (!splits.length) return
  const m = getSplitsMap()
  m[id] = splits
  localStorage.setItem(SPLITS_KEY, JSON.stringify(m))
}

const ACTIVITIES = [
  { key: 'run',   label: 'Run'   },
  { key: 'bike',  label: 'Bike'  },
  { key: 'swim',  label: 'Swim'  },
  { key: 'walk',  label: 'Walk'  },
  { key: 'skate', label: 'Skate' },
] as const

type ActivityKey = typeof ACTIVITIES[number]['key']

function activityMeta(key: string) {
  return ACTIVITIES.find(a => a.key === key) ?? { key: 'run', label: 'Run' }
}

// â"€â"€ Unified session type â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
interface Session {
  id: string
  date: string
  activity: ActivityKey
  distance: number
  duration_mins: number | null
  notes: string | null
  source: 'cardio' | 'skate'
  fastest_mile?: number | null
}

function cardioRate(activity: string): number {
  if (activity === 'run')  return XP_RATES.cardio_run_per_mile
  if (activity === 'bike') return XP_RATES.cardio_bike_per_mile
  if (activity === 'swim') return XP_RATES.cardio_swim_per_mile
  if (activity === 'walk') return XP_RATES.cardio_walk_per_mile
  return XP_RATES.cardio_per_mile
}

function sessionXP(s: Session) {
  return s.source === 'skate'
    ? Math.round(s.distance * XP_RATES.skate_per_mile)
    : Math.round(s.distance * cardioRate(s.activity))
}

// â"€â"€ Log form â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
interface CardioForm {
  date: string
  activity: ActivityKey
  distance: string
  duration_mins: string
  fastest_mile: string
  notes: string
  splits: string
}

function LogCardioPanel({ onLogged }: { onLogged: () => void }) {
  const [open, setOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const refreshXP             = useStore(s => s.refreshXP)
  const refreshActivity       = useStore(s => s.refreshActivity)
  const addOptimisticActivity = useStore(s => s.addOptimisticActivity)
  const { register, handleSubmit, watch, reset, formState: { isSubmitting } } = useForm<CardioForm>({
    defaultValues: { date: today(), activity: 'run', distance: '', duration_mins: '', fastest_mile: '', notes: '', splits: '' },
  })
  const activity = watch('activity')
  const isSkate  = activity === 'skate'

  const onSubmit = async (data: CardioForm) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const miles = parseFloat(data.distance)
    // Guard against NaN / negative values from cleared or malformed input (P1-13)
    if (!isFinite(miles) || miles <= 0) return
    if (miles > 100) { setToast('⚠️ That distance looks unusually large — check the value before saving.'); return }

    if (isSkate) {
      const { error } = await supabase.from('skate_sessions').insert({
        user_id: user.id,
        date: data.date,
        miles,
        duration: data.duration_mins ? `${data.duration_mins}m` : null,
        fastest_mile: data.fastest_mile ? parseFloat(data.fastest_mile) : null,
      })
      if (error) { setToast('Failed to save. Please try again.'); return }
    } else {
      const { data: inserted, error } = await supabase.from('cardio_sessions').insert({
        user_id: user.id,
        date: data.date,
        activity: data.activity,
        distance_miles: miles,
        duration_mins: data.duration_mins ? parseInt(data.duration_mins) : null,
        notes: data.notes || null,
      }).select('id').single()
      if (error) { setToast('Failed to save. Please try again.'); return }
      if (inserted && data.splits.trim() && data.activity === 'run') {
        saveSplitsForSession(inserted.id, data.splits)
      }
    }

    const xp = isSkate
      ? Math.round(miles * XP_RATES.skate_per_mile)
      : Math.round(miles * cardioRate(data.activity))
    const { label } = activityMeta(data.activity)
    playXPGain()
    setToast(`+${xp} XP — ${label} logged!`)
    addOptimisticActivity({ type: 'cardio', label: `${miles.toFixed(2)} mi ${label.toLowerCase()}`, date: data.date, icon: data.activity })
    await refreshXP()
    refreshActivity()
    reset({ date: today(), activity: data.activity, distance: '', duration_mins: '', fastest_mile: '', notes: '', splits: '' })
    setOpen(false)
    onLogged()
  }

  return (
    <div className="mb-4">
      <button
        data-tutorial="log-cardio-btn"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all"
        style={{ background: open ? 'var(--accent)' : 'var(--input-bg)', color: open ? 'var(--base-bg)' : 'var(--accent)', border: '1px solid var(--accent)', fontSize: 15 }}
      >
        {open ? 'âœ• Cancel' : '+ Log Session'}
      </button>
      {open && (
        <div className="mt-3 rounded-xl p-4 pop-in" style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}>
          <FirstUseTip formKey="cardio" tip="Each activity has its own XP rate — runs earn more than walks. Log duration to track pace. Each mile brings you closer to your next level." />
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <Input label="Date" type="date" {...register('date', { required: true })} />
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)', fontFamily: 'Cormorant Garamond, serif' }}>Activity</label>
              <div className="grid grid-cols-5 gap-2">
                {ACTIVITIES.map(a => (
                  <label key={a.key} className="flex flex-col items-center gap-1.5 py-2.5 rounded-xl cursor-pointer transition-all" style={{ background: 'var(--input-bg)', border: '1px solid var(--border)' }}>
                    <input type="radio" value={a.key} {...register('activity')} className="sr-only" />
                    <ActivityIconComp activityKey={a.key} size={18} color="var(--text-secondary)" />
                    <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>{a.label}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <Input label="Miles" type="number" step="0.01" placeholder="3.1" className="flex-1" {...register('distance', { required: true })} />
              <Input label="Duration (mins)" type="number" placeholder="30" className="flex-1" {...register('duration_mins')} />
            </div>
            {isSkate && (
              <Input label="Fastest Mile (min/mi)" type="number" step="0.01" placeholder="5.15" {...register('fastest_mile')} />
            )}
            {activity === 'run' && (
              <Input label="Mile Splits (optional)" type="text" placeholder="8:30, 8:15, 8:45…" {...register('splits')} />
            )}
            {!isSkate && (
              <Input label="Notes (optional)" type="text" placeholder="Morning run…" {...register('notes')} />
            )}
            <Button type="submit" fullWidth loading={isSubmitting} disabled={isSubmitting}>{isSubmitting ? 'Logging…' : 'Log Session'}</Button>
          </form>
        </div>
      )}
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  )
}

// â"€â"€ Edit modal â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
function EditSessionModal({ session, onClose, onSaved }: { session: Session; onClose: () => void; onSaved: () => void }) {
  const [miles, setMiles]   = useState(String(session.distance))
  const [mins, setMins]     = useState(String(session.duration_mins ?? ''))
  const [fastest, setFastest] = useState(String(session.fastest_mile ?? ''))
  const [notes, setNotes]   = useState(session.notes ?? '')
  const [saving, setSaving] = useState(false)

  const inputStyle = { background: 'var(--input-bg)', border: '1px solid var(--border)' }
  const labelStyle = { color: 'var(--text-secondary)', fontFamily: 'Cormorant Garamond, serif' }

  async function save() {
    setSaving(true)
    if (session.source === 'skate') {
      await supabase.from('skate_sessions').update({
        miles: parseFloat(miles),
        duration: mins ? `${mins}m` : null,
        fastest_mile: fastest ? parseFloat(fastest) : null,
      }).eq('id', session.id)
    } else {
      await supabase.from('cardio_sessions').update({
        distance_miles: parseFloat(miles),
        duration_mins: mins ? parseInt(mins) : null,
        notes: notes || null,
      }).eq('id', session.id)
    }
    setSaving(false); onSaved(); onClose()
  }

  async function del() {
    const table = session.source === 'skate' ? 'skate_sessions' : 'cardio_sessions'
    await supabase.from(table).delete().eq('id', session.id)
    onSaved(); onClose()
  }

  const { label } = activityMeta(session.activity)
  return (
    <EditModal title={`${label} — ${formatDate(session.date)}`} onClose={onClose} onDelete={del} onSave={save} saving={saving}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-base font-medium" style={labelStyle}>Miles</label>
          <input type="number" step="0.01" value={miles} onChange={e => setMiles(e.target.value)} className="px-3 py-3 rounded-lg text-white outline-none text-base" style={inputStyle} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-base font-medium" style={labelStyle}>Duration (mins)</label>
          <input type="number" value={mins} onChange={e => setMins(e.target.value)} className="px-3 py-3 rounded-lg text-white outline-none text-base" style={inputStyle} />
        </div>
        {session.source === 'skate' && (
          <div className="flex flex-col gap-1">
            <label className="text-base font-medium" style={labelStyle}>Fastest Mile (min/mi)</label>
            <input type="number" step="0.01" value={fastest} onChange={e => setFastest(e.target.value)} className="px-3 py-3 rounded-lg text-white outline-none text-base" style={inputStyle} />
          </div>
        )}
        {session.source === 'cardio' && (
          <div className="flex flex-col gap-1">
            <label className="text-base font-medium" style={labelStyle}>Notes</label>
            <input type="text" value={notes} onChange={e => setNotes(e.target.value)} className="px-3 py-3 rounded-lg text-white outline-none text-base" style={inputStyle} />
          </div>
        )}
      </div>
    </EditModal>
  )
}

// â"€â"€ Main page â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
export function Cardio() {
  usePageTitle('Cardio')
  const streak = useStreak()
  const [sessions, setSessions] = useState<Session[]>([])
  const [filter, setFilter]     = useState<ActivityKey | 'all'>('all')
  const [editing, setEditing]   = useState<Session | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [chartLoading, setChartLoading] = useState(true)
  const [splitsMap, setSplitsMap] = useState<Record<string, string[]>>(() => getSplitsMap())

  async function load() {
    setLoadError(false)
    setSplitsMap(getSplitsMap())
    const [cardio, skate] = await Promise.all([
      supabase.from('cardio_sessions').select('*').order('date', { ascending: false }),
      supabase.from('skate_sessions').select('*').order('date', { ascending: false }),
    ])

    const cardioSessions: Session[] = (cardio.data ?? []).map((r: {
      id: string; date: string; activity: string; distance_miles: number;
      duration_mins: number | null; notes: string | null
    }) => ({
      id: r.id, date: r.date, activity: r.activity as ActivityKey,
      distance: r.distance_miles, duration_mins: r.duration_mins,
      notes: r.notes, source: 'cardio' as const,
    }))

    const skateSessions: Session[] = (skate.data ?? []).map((r: {
      id: string; date: string; miles: number;
      duration: string | null; fastest_mile: number | null
    }) => ({
      id: r.id, date: r.date, activity: 'skate' as ActivityKey,
      distance: r.miles, duration_mins: r.duration ? parseInt(r.duration) : null,
      notes: null, source: 'skate' as const,
      fastest_mile: r.fastest_mile,
    }))

    if (cardio.error || skate.error) { setLoadError(true); setChartLoading(false); return }
    const all = [...cardioSessions, ...skateSessions].sort((a, b) => b.date.localeCompare(a.date))
    setSessions(all)
    setChartLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtered  = filter === 'all' ? sessions : sessions.filter(s => s.activity === filter)
  const totalMiles = sessions.reduce((s, r) => s + r.distance, 0)
  const totalXP    = sessions.reduce((s, r) => s + sessionXP(r), 0)

  const chartData = [...filtered]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(s => ({ date: s.date, miles: s.distance }))
  const avgMiles = filtered.length ? filtered.reduce((s, r) => s + r.distance, 0) / filtered.length : 0

  // Cardio PRs (run sessions only for pace/distance)
  const runSessions = sessions.filter(s => s.activity === 'run')
  const fastestMileVal = runSessions.filter(s => s.fastest_mile).length
    ? Math.min(...runSessions.filter(s => s.fastest_mile).map(s => s.fastest_mile!))
    : null
  const longestRun = runSessions.length
    ? Math.max(...runSessions.map(s => s.distance))
    : null
  const weekTotals: Record<string, number> = {}
  for (const s of sessions) {
    const d = new Date(s.date + 'T12:00:00')
    const jan1 = new Date(d.getFullYear(), 0, 1)
    const week = `${d.getFullYear()}-W${Math.ceil(((d.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7)}`
    weekTotals[week] = (weekTotals[week] ?? 0) + s.distance
  }
  const mostMilesWeek = Object.values(weekTotals).length ? Math.max(...Object.values(weekTotals)) : null

  return (
    <>
      <TopBar title="Cardio" />
      <PageWrapper>

        {loadError && (
          <div className="flex flex-col items-center py-12 gap-3 fade-in">
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Could not load sessions</p>
            <button
              onClick={load}
              style={{ padding: '8px 20px', borderRadius: 10, fontSize: 13, fontWeight: 600, background: 'var(--accent)', color: 'var(--base-bg)', border: 'none', cursor: 'pointer' }}
            >
              Try again
            </button>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            { label: 'Total Miles', value: totalMiles.toFixed(1), unit: 'mi' },
            { label: 'Sessions',    value: sessions.length },
            { label: 'Total XP',    value: totalXP.toLocaleString() },
          ].map(s => (
            <div key={s.label} className="rounded-xl p-3 text-center" style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}>
              <p className="text-lg font-bold" style={{ color: 'var(--accent)', fontFamily: 'Cinzel, serif' }}>
                {s.value}{s.unit && <span className="text-xs font-normal ml-0.5" style={{ color: '#888' }}>{s.unit}</span>}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)', fontFamily: 'Cormorant Garamond, serif' }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Cardio streak */}
        {!streak.loading && (streak.cardioCurrent > 0 || streak.cardioLongest > 0) && (
          <div className="flex items-center justify-between rounded-xl px-4 py-3 mb-4" style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}>
            <div>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'Cormorant Garamond, serif' }}>Cardio Streak</p>
              <p style={{ fontSize: 22, fontWeight: 700, fontFamily: 'Cinzel, serif', color: streak.cardioCurrent > 0 ? '#3b82f6' : 'var(--text-muted)', lineHeight: 1.2 }}>
                {streak.cardioCurrent} <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-muted)' }}>days</span>
              </p>
            </div>
            {streak.cardioLongest > 0 && (
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'Cormorant Garamond, serif' }}>Best</p>
                <p style={{ fontSize: 18, fontWeight: 700, fontFamily: 'Cinzel, serif', color: 'var(--text-secondary)', lineHeight: 1.2 }}>
                  {streak.cardioLongest}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Cardio PRs */}
        {(fastestMileVal !== null || longestRun !== null || mostMilesWeek !== null) && (
          <div className="rounded-xl p-4 mb-4" style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}>
            <p className="font-bold mb-3" style={{ fontFamily: 'Cinzel, serif', fontSize: 15, color: 'var(--text-primary)' }}>Personal Records</p>
            <div className="grid grid-cols-3 gap-2">
              {fastestMileVal !== null && (
                <div className="rounded-lg p-3 text-center" style={{ background: 'var(--input-bg)' }}>
                  <p className="text-base font-bold" style={{ color: '#3b82f6', fontFamily: 'Cinzel, serif' }}>{fastestMileVal.toFixed(2)}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)', fontFamily: 'Cormorant Garamond, serif' }}>Fastest Mile</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>min/mi</p>
                </div>
              )}
              {longestRun !== null && (
                <div className="rounded-lg p-3 text-center" style={{ background: 'var(--input-bg)' }}>
                  <p className="text-base font-bold" style={{ color: '#3b82f6', fontFamily: 'Cinzel, serif' }}>{longestRun.toFixed(1)}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)', fontFamily: 'Cormorant Garamond, serif' }}>Longest Run</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>miles</p>
                </div>
              )}
              {mostMilesWeek !== null && (
                <div className="rounded-lg p-3 text-center" style={{ background: 'var(--input-bg)' }}>
                  <p className="text-base font-bold" style={{ color: '#3b82f6', fontFamily: 'Cinzel, serif' }}>{mostMilesWeek.toFixed(1)}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)', fontFamily: 'Cormorant Garamond, serif' }}>Best Week</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>miles</p>
                </div>
              )}
            </div>
          </div>
        )}

        <LogCardioPanel onLogged={load} />

        {/* Activity filter tabs */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          {(['all', ...ACTIVITIES.map(a => a.key)] as const).map(k => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className="shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5"
              style={{ background: filter === k ? 'var(--accent)' : 'var(--input-bg)', color: filter === k ? 'var(--base-bg)' : 'var(--text-muted)' }}
            >
              {k === 'all' ? 'All' : (
                <>
                  <ActivityIconComp activityKey={k} size={11} color="currentColor" />
                  {activityMeta(k).label}
                </>
              )}
            </button>
          ))}
        </div>

        {/* Distance trend */}
        {chartLoading && <ChartSkeleton height={150} title="Distance Trend" />}
        {!chartLoading && sessions.length === 0 && (
          <ChartEmptyState title="Distance Trend" message="Log your first session to start building your trend chart" color="#3b82f6" />
        )}
        {!chartLoading && chartData.length > 0 && chartData.length < 3 && (
          <div className="rounded-xl p-4 mb-4" style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}>
            <p className="font-bold mb-2" style={{ fontFamily: 'Cinzel, serif', fontSize: 15, color: 'var(--text-primary)' }}>Distance Trend</p>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'center', padding: '16px 0' }}>
              {chartData.map(d => (
                <div key={d.date} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#3b82f6', boxShadow: '0 0 8px #3b82f6' }} />
                  <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>{d.miles.toFixed(1)}</p>
                </div>
              ))}
            </div>
            <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-muted)' }}>
              Log {3 - chartData.length} more session{3 - chartData.length > 1 ? 's' : ''} to unlock your trend chart
            </p>
          </div>
        )}
        {!chartLoading && chartData.length >= 3 && (
          <div className="rounded-xl p-4 mb-4" style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}>
            <p className="font-bold text-white mb-1" style={{ fontFamily: 'Cinzel, serif', fontSize: 15 }}>Distance Trend</p>
            <p className="text-xs mb-3" style={{ color: '#888' }}>Avg {avgMiles.toFixed(1)} mi/session</p>
            <ResponsiveContainer width="100%" height={150}>
              <AreaChart data={chartData} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="cardio-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 6" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="date" tickFormatter={(d: string) => formatDate(d)} tick={{ fill: '#666', fontSize: 9 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, (dataMax: number) => Math.ceil(dataMax * 1.25)]} tick={{ fill: '#666', fontSize: 9 }} axisLine={false} tickLine={false} width={30} />
                <Tooltip
                  contentStyle={{ background: 'rgba(10,10,22,0.97)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  labelFormatter={(l: any) => typeof l === 'string' ? formatDateTooltip(l) : l}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(v: any) => [`${Number(v).toFixed(2)} mi`, 'Distance']}
                  cursor={{ stroke: 'rgba(255,255,255,0.12)', strokeWidth: 1 }}
                />
                <ReferenceLine y={avgMiles} stroke="#3b82f6" strokeDasharray="4 2" strokeOpacity={0.4} />
                <Area type="monotone" dataKey="miles" stroke="#3b82f6" strokeWidth={2.5} fill="url(#cardio-grad)" dot={{ fill: '#3b82f6', r: 3, fillOpacity: 0.8 }} activeDot={{ r: 5, fill: '#3b82f6', stroke: 'rgba(255,255,255,0.3)', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Session history */}
        {filtered.length > 0 ? (
          <div className="rounded-xl overflow-hidden" style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}>
            <p className="px-4 pt-4 pb-2 font-bold text-white" style={{ fontFamily: 'Cinzel, serif', fontSize: 15 }}>Sessions</p>
            {filtered.map(s => {
              const pace = s.duration_mins && s.distance ? (s.duration_mins / s.distance).toFixed(1) : null
              return (
                <div key={`${s.source}-${s.id}`} className="flex items-center justify-between px-4 py-3" style={{ borderTop: '1px solid var(--border-faint)' }}>
                  <div>
                    <p className="text-white text-sm font-semibold flex items-center gap-1.5">
                      <ActivityIconComp activityKey={s.activity} size={14} color="var(--text-secondary)" />
                      {s.distance.toFixed(2)} mi
                      {s.fastest_mile && (
                        <span className="flex items-center gap-1 ml-1 text-xs font-normal" style={{ color: '#2ECC71' }}>
                          <ZapIcon size={11} color="#2ECC71" /> {s.fastest_mile.toFixed(2)} min/mi
                        </span>
                      )}
                      {pace && !s.fastest_mile && <span className="ml-1 text-xs font-normal" style={{ color: '#888' }}>{pace} min/mi</span>}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: '#888' }}>
                      {formatDate(s.date)}
                      {s.duration_mins ? ` · ${s.duration_mins}min` : ''}
                      {s.notes ? ` · ${s.notes}` : ''}
                    </p>
                    {splitsMap[s.id] && s.source === 'cardio' && s.activity === 'run' && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {splitsMap[s.id].map((split, i) => (
                          <span key={i} className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--input-bg)', color: '#3b82f6', fontFamily: 'Space Grotesk, sans-serif' }}>
                            {i + 1}: {split}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold" style={{ color: 'var(--accent)' }}>+{sessionXP(s)} XP</span>
                    <button
                      onClick={() => setEditing(s)}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 8, background: 'var(--input-bg)', border: 'none', cursor: 'pointer' }}
                    >
                      <EditIcon size={13} color="var(--text-muted)" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-center py-8" style={{ color: '#555' }}>
            {sessions.length === 0 ? 'No sessions yet.' : 'No sessions for this activity.'}
          </p>
        )}

        {editing && <EditSessionModal session={editing} onClose={() => setEditing(null)} onSaved={load} />}
      </PageWrapper>
    </>
  )
}
