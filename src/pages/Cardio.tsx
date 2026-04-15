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
import { today, formatDate } from '../lib/utils'
import { useStore } from '../store/useStore'
import { playXPGain } from '../lib/sounds'
import { ActivityIconComp, EditIcon, ZapIcon } from '../components/ui/Icon'
import { usePageTitle } from '../hooks/usePageTitle'

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

// ── Unified session type ──────────────────────────────────────
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

function sessionXP(s: Session) {
  return s.source === 'skate'
    ? Math.round(s.distance * XP_RATES.skate_per_mile)
    : Math.round(s.distance * XP_RATES.cardio_per_mile)
}

// ── Log form ─────────────────────────────────────────────────
interface CardioForm {
  date: string
  activity: ActivityKey
  distance: string
  duration_mins: string
  fastest_mile: string
  notes: string
}

function LogCardioPanel({ onLogged }: { onLogged: () => void }) {
  const [open, setOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const refreshXP       = useStore(s => s.refreshXP)
  const refreshActivity = useStore(s => s.refreshActivity)
  const { register, handleSubmit, watch, reset, formState: { isSubmitting } } = useForm<CardioForm>({
    defaultValues: { date: today(), activity: 'run', distance: '', duration_mins: '', fastest_mile: '', notes: '' },
  })
  const activity = watch('activity')
  const isSkate  = activity === 'skate'

  const onSubmit = async (data: CardioForm) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const miles = parseFloat(data.distance)

    if (isSkate) {
      await supabase.from('skate_sessions').insert({
        user_id: user.id,
        date: data.date,
        miles,
        duration: data.duration_mins ? `${data.duration_mins}m` : null,
        fastest_mile: data.fastest_mile ? parseFloat(data.fastest_mile) : null,
      })
    } else {
      await supabase.from('cardio_sessions').insert({
        user_id: user.id,
        date: data.date,
        activity: data.activity,
        distance_miles: miles,
        duration_mins: data.duration_mins ? parseInt(data.duration_mins) : null,
        notes: data.notes || null,
      })
    }

    const xp = isSkate
      ? Math.round(miles * XP_RATES.skate_per_mile)
      : Math.round(miles * XP_RATES.cardio_per_mile)
    const { label } = activityMeta(data.activity)
    playXPGain()
    setToast(`+${xp} XP — ${label} logged!`)
    await refreshXP()
    refreshActivity()
    reset({ date: today(), activity: data.activity, distance: '', duration_mins: '', fastest_mile: '', notes: '' })
    setOpen(false)
    onLogged()
  }

  return (
    <div className="mb-4">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all"
        style={{ background: open ? 'var(--accent)' : 'rgba(255,255,255,0.05)', color: open ? 'var(--base-bg)' : 'var(--accent)', border: '1px solid var(--accent)', fontSize: 15 }}
      >
        {open ? '✕ Cancel' : '+ Log Session'}
      </button>
      {open && (
        <div className="mt-3 rounded-xl p-4 pop-in" style={{ background: 'rgba(16,24,52,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <Input label="Date" type="date" {...register('date', { required: true })} />
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium" style={{ color: '#AAAAAA', fontFamily: 'Cormorant Garamond, serif' }}>Activity</label>
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
            {!isSkate && (
              <Input label="Notes (optional)" type="text" placeholder="Morning run…" {...register('notes')} />
            )}
            <Button type="submit" fullWidth disabled={isSubmitting}>{isSubmitting ? 'Logging…' : 'Log Session'}</Button>
          </form>
        </div>
      )}
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  )
}

// ── Edit modal ────────────────────────────────────────────────
function EditSessionModal({ session, onClose, onSaved }: { session: Session; onClose: () => void; onSaved: () => void }) {
  const [miles, setMiles]   = useState(String(session.distance))
  const [mins, setMins]     = useState(String(session.duration_mins ?? ''))
  const [fastest, setFastest] = useState(String(session.fastest_mile ?? ''))
  const [notes, setNotes]   = useState(session.notes ?? '')
  const [saving, setSaving] = useState(false)

  const inputStyle = { background: '#0D1B2A', border: '1px solid rgba(255,255,255,0.1)' }
  const labelStyle = { color: '#AAAAAA', fontFamily: 'Cormorant Garamond, serif' }

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

// ── Main page ─────────────────────────────────────────────────
export function Cardio() {
  usePageTitle('Cardio')
  const [sessions, setSessions] = useState<Session[]>([])
  const [filter, setFilter]     = useState<ActivityKey | 'all'>('all')
  const [editing, setEditing]   = useState<Session | null>(null)

  async function load() {
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

    const all = [...cardioSessions, ...skateSessions].sort((a, b) => b.date.localeCompare(a.date))
    setSessions(all)
  }

  useEffect(() => { load() }, [])

  const filtered  = filter === 'all' ? sessions : sessions.filter(s => s.activity === filter)
  const totalMiles = sessions.reduce((s, r) => s + r.distance, 0)
  const totalXP    = sessions.reduce((s, r) => s + sessionXP(r), 0)

  const chartData = [...filtered]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(s => ({ date: s.date, miles: s.distance }))
  const avgMiles = filtered.length ? filtered.reduce((s, r) => s + r.distance, 0) / filtered.length : 0

  return (
    <>
      <TopBar title="Cardio" />
      <PageWrapper>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            { label: 'Total Miles', value: totalMiles.toFixed(1), unit: 'mi' },
            { label: 'Sessions',    value: sessions.length },
            { label: 'Total XP',    value: totalXP.toLocaleString() },
          ].map(s => (
            <div key={s.label} className="rounded-xl p-3 text-center" style={{ background: 'var(--card-bg)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <p className="text-lg font-bold" style={{ color: 'var(--accent)', fontFamily: 'Cinzel, serif' }}>
                {s.value}{s.unit && <span className="text-xs font-normal ml-0.5" style={{ color: '#888' }}>{s.unit}</span>}
              </p>
              <p className="text-xs mt-0.5" style={{ color: '#888', fontFamily: 'Cormorant Garamond, serif' }}>{s.label}</p>
            </div>
          ))}
        </div>

        <LogCardioPanel onLogged={load} />

        {/* Activity filter tabs */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          {(['all', ...ACTIVITIES.map(a => a.key)] as const).map(k => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className="shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5"
              style={{ background: filter === k ? 'var(--accent)' : 'rgba(255,255,255,0.06)', color: filter === k ? 'var(--base-bg)' : '#888' }}
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
        {chartData.length >= 2 && (
          <div className="rounded-xl p-4 mb-4" style={{ background: 'var(--card-bg)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <p className="font-bold text-white mb-1" style={{ fontFamily: 'Cinzel, serif', fontSize: 15 }}>Distance Trend</p>
            <p className="text-xs mb-3" style={{ color: '#888' }}>Avg {avgMiles.toFixed(1)} mi/session</p>
            <ResponsiveContainer width="100%" height={150}>
              <AreaChart data={chartData} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="cardio-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="var(--accent)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 6" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="date" tickFormatter={(d: string) => formatDate(d)} tick={{ fill: '#666', fontSize: 9 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, (dataMax: number) => Math.ceil(dataMax * 1.25)]} tick={{ fill: '#666', fontSize: 9 }} axisLine={false} tickLine={false} width={30} />
                <Tooltip
                  contentStyle={{ background: 'rgba(10,10,22,0.97)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, color: '#fff', fontSize: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  labelFormatter={(l: any) => typeof l === 'string' ? formatDate(l) : l}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(v: any) => [`${Number(v).toFixed(2)} mi`, 'Distance']}
                  cursor={{ stroke: 'rgba(255,255,255,0.12)', strokeWidth: 1 }}
                />
                <ReferenceLine y={avgMiles} stroke="var(--accent)" strokeDasharray="4 2" strokeOpacity={0.4} />
                <Area type="monotone" dataKey="miles" stroke="var(--accent)" strokeWidth={2.5} fill="url(#cardio-grad)" dot={{ fill: 'var(--accent)', r: 3, fillOpacity: 0.8 }} activeDot={{ r: 5, fill: 'var(--accent)', stroke: 'rgba(255,255,255,0.3)', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Session history */}
        {filtered.length > 0 ? (
          <div className="rounded-xl overflow-hidden" style={{ background: 'var(--card-bg)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <p className="px-4 pt-4 pb-2 font-bold text-white" style={{ fontFamily: 'Cinzel, serif', fontSize: 15 }}>Sessions</p>
            {filtered.map(s => {
              const pace = s.duration_mins && s.distance ? (s.duration_mins / s.distance).toFixed(1) : null
              return (
                <div key={`${s.source}-${s.id}`} className="flex items-center justify-between px-4 py-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
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
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold" style={{ color: 'var(--accent)' }}>+{sessionXP(s)} XP</span>
                    <button
                      onClick={() => setEditing(s)}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: 'none', cursor: 'pointer' }}
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
