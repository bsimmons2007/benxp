import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { TopBar } from '../components/layout/TopBar'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { Toast } from '../components/ui/Toast'
import { EditModal } from '../components/ui/EditModal'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorState } from '../components/ui/ErrorState'
import { Card } from '../components/ui/Card'
import { supabase } from '../lib/supabase'
import { CHART_TOOLTIP_STYLE, today, formatDate } from '../lib/utils'
import { useStore } from '../store/useStore'
import { playXPGain } from '../lib/sounds'
import { XP_RATES } from '../lib/xp'
import { MountainIcon, EditIcon, ArrowUpIcon } from '../components/ui/Icon'
import { usePageTitle } from '../hooks/usePageTitle'
import type { HikingSession } from '../types'

const PAGE_SIZE = 10
const LOAD_MORE = 20

// ── Helpers ───────────────────────────────────────────────────────

const DIFFICULTIES = ['Easy', 'Moderate', 'Hard', 'Expert'] as const
function diffColor(d: string | null): string {
  if (d === 'Easy')     return 'var(--green)'
  if (d === 'Moderate') return 'var(--warning)'
  if (d === 'Hard')     return 'var(--red)'
  if (d === 'Expert')   return 'var(--chart-alt)'
  return 'var(--accent)'
}
function fmtDuration(mins: number | null): string {
  if (!mins) return ''
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return h > 0 ? `${h}h ${m > 0 ? `${m}m` : ''}`.trim() : `${m}m`
}

// ── Log form ──────────────────────────────────────────────────────

interface HikeForm {
  date: string
  trail: string
  distance_miles: string
  elevation_gain_ft: string
  duration_mins: string
  difficulty: string
  notes: string
}

function LogHikingPanel({ onLogged }: { onLogged: () => void }) {
  const [open,  setOpen]  = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [undo,  setUndo]  = useState<(() => void) | null>(null)
  const refreshXP       = useStore(s => s.refreshXP)
  const refreshActivity = useStore(s => s.refreshActivity)
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<HikeForm>({
    defaultValues: { date: today(), trail: '', distance_miles: '', elevation_gain_ft: '', duration_mins: '', difficulty: 'Moderate', notes: '' },
  })

  const onSubmit = async (data: HikeForm) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const miles  = parseFloat(data.distance_miles) || 0
    const elevFt = data.elevation_gain_ft ? parseInt(data.elevation_gain_ft) : null
    const { data: inserted, error } = await supabase.from('hiking_sessions').insert({
      user_id:           user.id,
      date:              data.date,
      trail:             data.trail,
      distance_miles:    miles,
      elevation_gain_ft: elevFt,
      duration_mins:     data.duration_mins ? parseInt(data.duration_mins) : null,
      difficulty:        data.difficulty || null,
      notes:             data.notes || null,
    }).select('id').single()
    if (error || !inserted) { setToast('Failed to save — try again'); return }
    const milesXP = miles * XP_RATES.hiking_per_mile
    const elevXP  = Math.floor((elevFt ?? 0) / 500) * XP_RATES.hiking_per_500ft
    const xp = Math.round(milesXP + elevXP)
    playXPGain()
    setToast(`+${xp} XP — ${miles} mi${elevFt ? ` · ${elevFt.toLocaleString()} ft gain` : ''}`)
    const insertedId = inserted.id
    setUndo(() => async () => {
      await supabase.from('hiking_sessions').delete().eq('id', insertedId)
      await refreshXP(); refreshActivity(); onLogged()
    })
    await refreshXP(); refreshActivity()
    reset({ date: today(), trail: '', distance_miles: '', elevation_gain_ft: '', duration_mins: '', difficulty: 'Moderate', notes: '' })
    setOpen(false); onLogged()
  }

  return (
    <div className="mb-5">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all"
        style={{ background: open ? 'var(--accent)' : 'var(--input-bg)', color: open ? 'var(--base-bg)' : 'var(--accent)', border: '1px solid var(--accent)', fontSize: 15 }}
      >
        {open ? 'Cancel' : 'Log Hike'}
      </button>
      {open && (
        <div className="mt-3 rounded-xl p-4 pop-in" style={{ background: 'var(--surface-1)', border: '1px solid var(--border-subtle)' }}>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <Input label="Date" type="date" {...register('date', { required: true })} />
            <Input label="Trail" type="text" placeholder="Camelback Mountain — Echo Canyon" {...register('trail', { required: true })} />

            <div className="flex gap-3">
              <Input label="Distance (mi)" type="number" step="0.1" placeholder="3.2" className="flex-1" {...register('distance_miles', { required: true })} />
              <Input label="Elev Gain (ft)" type="number" placeholder="1480" className="flex-1" {...register('elevation_gain_ft')} />
            </div>

            <div className="flex gap-3">
              <Input label="Duration (min)" type="number" placeholder="95" className="flex-1" {...register('duration_mins')} />
              <div className="flex flex-col gap-1 flex-1">
                <label className="section-label">Difficulty</label>
                <select {...register('difficulty')} className="px-3 py-2.5 rounded-lg outline-none" style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                  {DIFFICULTIES.map(d => <option key={d}>{d}</option>)}
                </select>
              </div>
            </div>

            <Input label="Notes (optional)" type="text" placeholder="Sunrise hike, packed lunch…" {...register('notes')} />
            <Button type="submit" fullWidth loading={isSubmitting} disabled={isSubmitting}>{isSubmitting ? 'Logging...' : 'Log Hike'}</Button>
          </form>
        </div>
      )}
      {toast && <Toast message={toast} onUndo={undo ?? undefined} onDone={() => { setToast(null); setUndo(null) }} />}
    </div>
  )
}

// ── Edit modal ────────────────────────────────────────────────────

function EditHikingModal({ session, onClose, onSaved }: { session: HikingSession; onClose: () => void; onSaved: () => void }) {
  const [distance,   setDistance]   = useState(String(session.distance_miles))
  const [elevation,  setElevation]  = useState(String(session.elevation_gain_ft ?? ''))
  const [duration,   setDuration]   = useState(String(session.duration_mins ?? ''))
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    const { error } = await supabase.from('hiking_sessions').update({
      distance_miles:    parseFloat(distance) || session.distance_miles,
      elevation_gain_ft: elevation ? parseInt(elevation) : null,
      duration_mins:     duration  ? parseInt(duration)  : null,
    }).eq('id', session.id)
    setSaving(false)
    if (!error) { onSaved(); onClose() }
  }
  async function del() {
    const { error } = await supabase.from('hiking_sessions').delete().eq('id', session.id)
    if (!error) { onSaved(); onClose() }
  }

  return (
    <EditModal title={`${session.trail} — ${formatDate(session.date)}`} onClose={onClose} onDelete={del} onSave={save} saving={saving}>
      <div className="flex flex-col gap-4">
        <div className="flex gap-3">
          <div className="flex flex-col gap-1 flex-1">
            <label className="section-label">Distance (mi)</label>
            <input type="number" step="0.1" value={distance} onChange={e => setDistance(e.target.value)} className="px-3 py-2.5 rounded-xl outline-none w-full text-sm" style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
          </div>
          <div className="flex flex-col gap-1 flex-1">
            <label className="section-label">Elev Gain (ft)</label>
            <input type="number" value={elevation} onChange={e => setElevation(e.target.value)} className="px-3 py-2.5 rounded-xl outline-none w-full text-sm" style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label className="section-label">Duration (min)</label>
          <input type="number" value={duration} onChange={e => setDuration(e.target.value)} className="px-3 py-2.5 rounded-xl outline-none w-full text-sm" style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
        </div>
      </div>
    </EditModal>
  )
}

// ── Main page ─────────────────────────────────────────────────────

const ttStyle = CHART_TOOLTIP_STYLE

export function Hiking() {
  usePageTitle('Hiking')
  const [sessions, setSessions] = useState<HikingSession[]>([])
  const [editing,  setEditing]  = useState<HikingSession | null>(null)
  const [visible,  setVisible]  = useState(PAGE_SIZE)
  const [loadError, setLoadError] = useState(false)

  async function load() {
    setLoadError(false)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data, error } = await supabase.from('hiking_sessions').select('*').eq('user_id', user.id).order('date', { ascending: false })
    if (error) { setLoadError(true); return }
    setSessions(data ?? [])
  }
  useEffect(() => { load() }, [])

  const totalMiles  = sessions.reduce((s, h) => s + Number(h.distance_miles), 0)
  const totalElev   = sessions.reduce((s, h) => s + (h.elevation_gain_ft ?? 0), 0)
  const longestHike = sessions.length ? Math.max(...sessions.map(h => Number(h.distance_miles))) : null

  // Monthly miles bar chart
  const monthMap: Record<string, number> = {}
  sessions.forEach(h => {
    const k = h.date.slice(0, 7)
    monthMap[k] = (monthMap[k] ?? 0) + Number(h.distance_miles)
  })
  const chartData = Object.entries(monthMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([month, miles]) => ({ month: month.slice(5), miles: Math.round(miles * 10) / 10 }))

  return (
    <>
      <TopBar title="Hiking" back backTo="/hobbies" />
      <PageWrapper>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          {[
            { label: 'Hikes',    value: sessions.length || '—' },
            { label: 'Total mi', value: totalMiles > 0 ? totalMiles.toFixed(1) : '—' },
            { label: 'Total ft', value: totalElev > 0 ? `${(totalElev / 1000).toFixed(1)}k` : '—' },
          ].map(s => (
            <div key={s.label} className="rounded-xl p-3 text-center" style={{ background: 'var(--surface-1)', border: '1px solid var(--border-subtle)' }}>
              <p style={{ fontSize: 22, fontWeight: 700, color: 'var(--accent)', fontFamily: 'var(--font-mono)', lineHeight: 1 }}>{s.value}</p>
              <p className="section-label mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {sessions.length > 0 && (
          <div className="rounded-xl px-4 py-3 mb-4 flex items-center justify-between" style={{ background: 'var(--accent-subtle)', border: '1px solid var(--accent-dim)' }}>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{sessions.length} hike{sessions.length !== 1 ? 's' : ''}</span>
            {longestHike !== null && (
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)' }}>
                Longest {longestHike.toFixed(1)} mi
              </span>
            )}
          </div>
        )}

        <LogHikingPanel onLogged={load} />

        {/* Monthly miles chart */}
        {sessions.length > 0 && (
          <Card className="mb-4">
            <p className="font-bold mb-3" style={{ fontSize: 15, color: 'var(--text-primary)' }}>Miles / Month</p>
            {chartData.length >= 2 ? (
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={chartData} barSize={24}>
                  <CartesianGrid strokeDasharray="3 6" stroke="var(--border-subtle)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fill: 'var(--text-tertiary)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'var(--text-tertiary)', fontSize: 9 }} axisLine={false} tickLine={false} width={28} />
                  <Tooltip contentStyle={ttStyle} formatter={(v: number) => [`${v} mi`, 'Miles']} />
                  <Bar dataKey="miles" fill="var(--accent)" fillOpacity={0.8} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p style={{ fontSize: 13, color: 'var(--text-muted)', padding: '8px 0' }}>
                Monthly miles chart unlocks after your second month of hikes.
              </p>
            )}
          </Card>
        )}

        {/* History */}
        {sessions.length > 0 && <p className="section-label mb-3">Hike Log</p>}
        {sessions.slice(0, visible).map(h => (
          <Card key={h.id} className="flex items-center justify-between mb-2" style={{ padding: '12px 16px' }}>
            <div className="flex items-center gap-3 min-w-0">
              <div style={{
                width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                background: `${diffColor(h.difficulty)}18`,
                border: `1px solid ${diffColor(h.difficulty)}40`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <MountainIcon size={18} color={diffColor(h.difficulty)} />
              </div>
              <div className="min-w-0">
                <p style={{ color: 'var(--text-primary)', fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.trail}</p>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
                  {formatDate(h.date)}
                  {h.difficulty && <span style={{ marginLeft: 6, color: diffColor(h.difficulty) }}>{h.difficulty}</span>}
                  {h.duration_mins && <span style={{ marginLeft: 6 }}>{fmtDuration(h.duration_mins)}</span>}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: 17, fontWeight: 700, color: 'var(--accent)', lineHeight: 1 }}>
                  {Number(h.distance_miles).toFixed(1)}
                  <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 2 }}>mi</span>
                </p>
                {h.elevation_gain_ft != null && (
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1, display: 'inline-flex', alignItems: 'center', gap: 2 }}><ArrowUpIcon size={11} color="var(--text-muted)" /> {h.elevation_gain_ft.toLocaleString()} ft</p>
                )}
              </div>
              <button type="button" aria-label="Edit hike" onClick={() => setEditing(h)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 8, background: 'var(--input-bg)', border: 'none', cursor: 'pointer' }}>
                <EditIcon size={13} color="var(--text-muted)" />
              </button>
            </div>
          </Card>
        ))}

        {sessions.length > visible && (
          <button
            type="button"
            onClick={() => setVisible(v => v + LOAD_MORE)}
            className="w-full py-3 rounded-xl font-semibold mt-1"
            style={{ background: 'var(--input-bg)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)', fontSize: 14 }}
          >
            Show more ({sessions.length - visible} left)
          </button>
        )}

        {loadError && sessions.length === 0 && (
          <ErrorState
            icon={<MountainIcon size={56} color="var(--text-muted)" />}
            title="Could not load hikes"
            sub="Check your connection and try again."
            onRetry={load}
          />
        )}

        {!loadError && sessions.length === 0 && (
          <EmptyState
            icon={<MountainIcon size={56} color="var(--text-muted)" />}
            title="No hikes logged yet"
            sub="Log Camelback, South Mountain, or any trail to start tracking your elevation and miles."
          />
        )}

        {editing && <EditHikingModal session={editing} onClose={() => setEditing(null)} onSaved={load} />}
      </PageWrapper>
    </>
  )
}
