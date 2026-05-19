import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, CartesianGrid } from 'recharts'
import { TopBar } from '../components/layout/TopBar'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { Toast } from '../components/ui/Toast'
import { EditModal } from '../components/ui/EditModal'
import { EmptyState } from '../components/ui/EmptyState'
import { Card } from '../components/ui/Card'
import { supabase } from '../lib/supabase'
import { XP_RATES } from '../lib/xp'
import { today, formatDate, formatDateTooltip } from '../lib/utils'
import { useStore } from '../store/useStore'
import type { SkateSession } from '../types'
import { ZapIcon, EditIcon, SkateIcon } from '../components/ui/Icon'
import { usePageTitle } from '../hooks/usePageTitle'

// ── Log form ─────────────────────────────────────────────────

interface SkateForm { date: string; miles: string; duration: string; fastest_mile: string }

function LogSkatePanel({ onLogged }: { onLogged: () => void }) {
  const [open, setOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<SkateForm>({
    defaultValues: { date: today(), miles: '', duration: '', fastest_mile: '' },
  })
  const refreshXP       = useStore((s) => s.refreshXP)
  const refreshActivity = useStore((s) => s.refreshActivity)

  const onSubmit = async (data: SkateForm) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const miles = parseFloat(data.miles)
    if (!miles || miles <= 0) return
    const { error } = await supabase.from('skate_sessions').insert({
      user_id: user.id,
      date: data.date,
      miles,
      duration: data.duration || null,
      fastest_mile: data.fastest_mile ? parseFloat(data.fastest_mile) : null,
    })
    if (error) {
      setToast('Failed to save session. Please try again.')
      return
    }
    const xp = Math.round(miles * XP_RATES.skate_per_mile)
    setToast(`+${xp} XP — Session logged!`)
    await refreshXP()
    refreshActivity()
    reset({ date: today(), miles: '', duration: '', fastest_mile: '' })
    setOpen(false)
    onLogged()
  }

  return (
    <div className="mb-4">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all"
        style={{ background: open ? 'var(--accent)' : 'var(--input-bg)', color: open ? 'var(--base-bg)' : 'var(--accent)', border: '1px solid var(--accent)', fontSize: 15 }}
      >
        {open ? '✕ Cancel' : '+ Log a Session'}
      </button>
      {open && (
        <div className="mt-3 rounded-xl p-4 pop-in" style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <Input label="Date" type="date" {...register('date', { required: true })} />
            <Input label="Miles" type="number" step="0.01" placeholder="5.5" {...register('miles', { required: true })} />
            <div className="flex gap-3">
              <Input label="Duration (e.g. 45m)" type="text" placeholder="45m" className="flex-1" {...register('duration')} />
              <Input label="Fastest Mile (min/mi)" type="number" step="0.01" placeholder="5.15" className="flex-1" {...register('fastest_mile')} />
            </div>
            <Button type="submit" fullWidth loading={isSubmitting} disabled={isSubmitting}>
              {isSubmitting ? 'Logging...' : 'Log Session'}
            </Button>
          </form>
        </div>
      )}
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  )
}

// ── Edit modal ────────────────────────────────────────────────

function EditSkateModal({ row, onClose, onSaved }: { row: SkateSession; onClose: () => void; onSaved: () => void }) {
  const [miles, setMiles] = useState(String(row.miles ?? ''))
  const [duration, setDuration] = useState(row.duration ?? '')
  const [fastest, setFastest] = useState(String(row.fastest_mile ?? ''))
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    const { error } = await supabase.from('skate_sessions').update({
      miles: miles ? parseFloat(miles) : null,
      duration: duration || null,
      fastest_mile: fastest ? parseFloat(fastest) : null,
    }).eq('id', row.id)
    setSaving(false)
    if (!error) { onSaved(); onClose() }
  }

  async function del() {
    const { error } = await supabase.from('skate_sessions').delete().eq('id', row.id)
    if (!error) { onSaved(); onClose() }
  }

  return (
    <EditModal title={`Skate — ${formatDate(row.date)}`} onClose={onClose} onDelete={del} onSave={save} saving={saving}>
      <div className="flex flex-col gap-4">
        <Input label="Miles" type="number" step="0.01" value={miles} onChange={e => setMiles(e.target.value)} />
        <div className="flex gap-3">
          <div className="flex-1"><Input label="Duration" type="text" value={duration} onChange={e => setDuration(e.target.value)} /></div>
          <div className="flex-1"><Input label="Fastest Mile" type="number" step="0.01" value={fastest} onChange={e => setFastest(e.target.value)} /></div>
        </div>
      </div>
    </EditModal>
  )
}

// ── Main page ─────────────────────────────────────────────────

export function Skate() {
  usePageTitle('Skate')
  const [sessions, setSessions] = useState<SkateSession[]>([])
  const [editing, setEditing] = useState<SkateSession | null>(null)

  async function load() {
    const { data } = await supabase
      .from('skate_sessions')
      .select('*')
      .order('date', { ascending: false })
    setSessions(data ?? [])
  }

  useEffect(() => { load() }, [])

  const totalMiles = sessions.reduce((sum, s) => sum + s.miles, 0)
  const fastestMile = sessions.reduce((best, s) => {
    if (!s.fastest_mile) return best
    return best === null || s.fastest_mile < best ? s.fastest_mile : best
  }, null as number | null)
  const avgMiles = sessions.length > 0 ? totalMiles / sessions.length : 0

  // Chart data — chronological for trend lines
  const sorted = [...sessions].sort((a, b) => a.date.localeCompare(b.date))
  const milesTrend = sorted.map((s) => ({ date: s.date, miles: s.miles }))
  const fastestTrend = sorted
    .filter((s) => s.fastest_mile != null)
    .map((s) => ({ date: s.date, fastest_mile: s.fastest_mile }))

  return (
    <>
      <TopBar title="Skate" />
      <PageWrapper>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            { label: 'Total Miles', value: totalMiles.toFixed(1), unit: 'mi' },
            { label: 'Sessions', value: sessions.length },
            { label: 'Fastest Mile', value: fastestMile ? fastestMile.toFixed(2) : '—', unit: fastestMile ? 'min' : '' },
          ].map((s) => (
            <div key={s.label} className="rounded-xl p-3" style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}>
              <p className="section-label">{s.label}</p>
              <p className="text-lg font-bold" style={{ color: 'var(--accent)' }}>
                {s.value}
                {s.unit && <span className="text-xs font-normal ml-0.5" style={{ color: 'var(--text-muted)' }}>{s.unit}</span>}
              </p>
            </div>
          ))}
        </div>

        {/* Log form */}
        <LogSkatePanel onLogged={load} />

        {/* Miles trend */}
        {milesTrend.length > 0 && milesTrend.length < 3 && (
          <div style={{ textAlign: 'center', padding: '14px 0 8px', color: 'var(--text-muted)', fontSize: 12 }}>
            Log {3 - milesTrend.length} more session{3 - milesTrend.length > 1 ? 's' : ''} to unlock your trend chart
          </div>
        )}
        {milesTrend.length >= 3 && (
          <Card className="mb-4">
            <p className="font-bold mb-1" style={{ fontSize: 15, color: 'var(--text-primary)' }}>Miles per Session</p>
            <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
              Avg {avgMiles.toFixed(1)} mi/session
            </p>
            <ResponsiveContainer width="100%" height={150}>
              <AreaChart data={milesTrend} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="skate-miles-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="var(--accent)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 6" stroke="var(--border-subtle)" vertical={false} />
                <XAxis dataKey="date" tickFormatter={(d: string) => formatDate(d)} tick={{ fill: 'var(--text-tertiary)', fontSize: 9 }} axisLine={false} tickLine={false} />
                <YAxis domain={['auto', 'auto']} tick={{ fill: 'var(--text-tertiary)', fontSize: 9 }} axisLine={false} tickLine={false} width={30} />
                <Tooltip
                  contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  labelFormatter={(l: any) => typeof l === 'string' ? formatDateTooltip(l) : l}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(v: any) => [`${Number(v).toFixed(2)} mi`, 'Miles']}
                  cursor={{ stroke: 'rgba(255,255,255,0.12)', strokeWidth: 1 }}
                />
                <ReferenceLine y={avgMiles} stroke="var(--accent)" strokeDasharray="4 2" strokeOpacity={0.4} />
                <Area type="monotone" dataKey="miles" stroke="var(--accent)" strokeWidth={2.5} fill="url(#skate-miles-grad)" dot={{ fill: 'var(--accent)', r: 3, fillOpacity: 0.8 }} activeDot={{ r: 5, fill: 'var(--accent)', stroke: 'rgba(255,255,255,0.3)', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
            <p className="text-xs mt-1" style={{ color: 'var(--accent)' }}>── avg</p>
          </Card>
        )}

        {/* Fastest mile trend */}
        {fastestTrend.length >= 3 && (
          <Card className="mb-4">
            <p className="font-bold mb-1" style={{ fontSize: 15, color: 'var(--text-primary)' }}>Fastest Mile Trend</p>
            <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>Lower is faster</p>
            <ResponsiveContainer width="100%" height={150}>
              <AreaChart data={fastestTrend} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="skate-speed-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2ECC71" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="#2ECC71" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 6" stroke="var(--border-subtle)" vertical={false} />
                <XAxis dataKey="date" tickFormatter={(d: string) => formatDate(d)} tick={{ fill: 'var(--text-tertiary)', fontSize: 9 }} axisLine={false} tickLine={false} />
                <YAxis domain={['auto', 'auto']} tick={{ fill: 'var(--text-tertiary)', fontSize: 9 }} axisLine={false} tickLine={false} width={35} />
                <Tooltip
                  contentStyle={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  labelFormatter={(l: any) => typeof l === 'string' ? formatDateTooltip(l) : l}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(v: any) => [`${Number(v).toFixed(2)} min/mi`, 'Fastest Mile']}
                  cursor={{ stroke: 'rgba(255,255,255,0.12)', strokeWidth: 1 }}
                />
                {fastestMile && <ReferenceLine y={fastestMile} stroke="#2ECC71" strokeDasharray="4 2" strokeOpacity={0.55} />}
                <Area type="monotone" dataKey="fastest_mile" stroke="#2ECC71" strokeWidth={2.5} fill="url(#skate-speed-grad)" dot={{ fill: '#2ECC71', r: 3, fillOpacity: 0.8 }} activeDot={{ r: 5, fill: '#2ECC71', stroke: 'rgba(255,255,255,0.3)', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
            {fastestMile && <p className="text-xs mt-1" style={{ color: '#2ECC71' }}>── PR {fastestMile.toFixed(2)} min/mi</p>}
          </Card>
        )}

        {sessions.length === 0 && (
          <EmptyState
            icon={<SkateIcon size={64} color="var(--text-muted)" />}
            title="No sessions yet"
            sub="Log your first skate session to start tracking distance and pace trends."
          />
        )}

        {/* Session history */}
        {sessions.length > 0 && (
          <Card noPadding className="overflow-hidden">
            <p className="px-4 pt-4 pb-2 font-bold" style={{ fontSize: 15, color: 'var(--text-primary)' }}>Sessions</p>
            {sessions.map((s) => (
              <div key={s.id} className="flex items-center justify-between px-4 py-3" style={{ borderTop: '1px solid var(--border-faint)' }}>
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {s.miles.toFixed(2)} mi
                    {s.fastest_mile && (
                      <span className="ml-2 flex items-center gap-1 text-xs font-normal" style={{ color: '#2ECC71' }}>
                        <ZapIcon size={11} color="#2ECC71" /> {s.fastest_mile.toFixed(2)} min/mi
                      </span>
                    )}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {formatDate(s.date)}{s.duration ? ` · ${s.duration}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold" style={{ color: 'var(--accent)' }}>
                    +{Math.round(s.miles * XP_RATES.skate_per_mile)} XP
                  </span>
                  <button
                    onClick={() => setEditing(s)}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 8, background: 'var(--input-bg)', border: 'none', cursor: 'pointer' }}
                  >
                    <EditIcon size={13} color="var(--text-muted)" />
                  </button>
                </div>
              </div>
            ))}
          </Card>
        )}

        {editing && (
          <EditSkateModal row={editing} onClose={() => setEditing(null)} onSaved={load} />
        )}

      </PageWrapper>
    </>
  )
}
