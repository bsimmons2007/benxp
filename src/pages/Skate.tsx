import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
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
import type { SkateSession } from '../types'

// ── Log form ─────────────────────────────────────────────────

interface SkateForm { date: string; miles: string; duration: string; fastest_mile: string }

function LogSkatePanel({ onLogged }: { onLogged: () => void }) {
  const [open, setOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<SkateForm>({
    defaultValues: { date: today(), miles: '', duration: '', fastest_mile: '' },
  })
  const refreshXP = useStore((s) => s.refreshXP)

  const onSubmit = async (data: SkateForm) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const miles = parseFloat(data.miles)
    await supabase.from('skate_sessions').insert({
      user_id: user.id,
      date: data.date,
      miles,
      duration: data.duration || null,
      fastest_mile: data.fastest_mile ? parseFloat(data.fastest_mile) : null,
    })
    const xp = Math.round(miles * XP_RATES.skate_per_mile)
    setToast(`+${xp} XP — Session logged! 🛼`)
    await refreshXP()
    reset({ date: today(), miles: '', duration: '', fastest_mile: '' })
    setOpen(false)
    onLogged()
  }

  return (
    <div className="mb-4">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all"
        style={{ background: open ? 'var(--accent)' : 'rgba(255,255,255,0.05)', color: open ? 'var(--base-bg)' : 'var(--accent)', border: '1px solid var(--accent)', fontSize: 15 }}
      >
        {open ? '✕ Cancel' : '+ Log a Session'}
      </button>
      {open && (
        <div className="mt-3 rounded-xl p-4 pop-in" style={{ background: 'rgba(16,24,52,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <Input label="Date" type="date" {...register('date', { required: true })} />
            <Input label="Miles" type="number" step="0.01" placeholder="5.5" {...register('miles', { required: true })} />
            <div className="flex gap-3">
              <Input label="Duration (e.g. 45m)" type="text" placeholder="45m" className="flex-1" {...register('duration')} />
              <Input label="Fastest Mile (min/mi)" type="number" step="0.01" placeholder="5.15" className="flex-1" {...register('fastest_mile')} />
            </div>
            <Button type="submit" fullWidth disabled={isSubmitting}>
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
    await supabase.from('skate_sessions').update({
      miles: miles ? parseFloat(miles) : null,
      duration: duration || null,
      fastest_mile: fastest ? parseFloat(fastest) : null,
    }).eq('id', row.id)
    setSaving(false); onSaved(); onClose()
  }

  async function del() {
    await supabase.from('skate_sessions').delete().eq('id', row.id)
    onSaved(); onClose()
  }

  return (
    <EditModal title={`Skate — ${formatDate(row.date)}`} onClose={onClose} onDelete={del} onSave={save} saving={saving}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-base font-medium" style={{ color: '#AAAAAA', fontFamily: 'Cormorant Garamond, serif' }}>Miles</label>
          <input type="number" step="0.01" value={miles} onChange={(e) => setMiles(e.target.value)} className="px-3 py-3 rounded-lg text-white outline-none text-base" style={{ background: '#0D1B2A', border: '1px solid rgba(255,255,255,0.1)' }} />
        </div>
        <div className="flex gap-3">
          <div className="flex flex-col gap-1 flex-1">
            <label className="text-base font-medium" style={{ color: '#AAAAAA', fontFamily: 'Cormorant Garamond, serif' }}>Duration</label>
            <input type="text" value={duration} onChange={(e) => setDuration(e.target.value)} className="px-3 py-3 rounded-lg text-white outline-none text-base" style={{ background: '#0D1B2A', border: '1px solid rgba(255,255,255,0.1)' }} />
          </div>
          <div className="flex flex-col gap-1 flex-1">
            <label className="text-base font-medium" style={{ color: '#AAAAAA', fontFamily: 'Cormorant Garamond, serif' }}>Fastest Mile</label>
            <input type="number" step="0.01" value={fastest} onChange={(e) => setFastest(e.target.value)} className="px-3 py-3 rounded-lg text-white outline-none text-base" style={{ background: '#0D1B2A', border: '1px solid rgba(255,255,255,0.1)' }} />
          </div>
        </div>
      </div>
    </EditModal>
  )
}

// ── Main page ─────────────────────────────────────────────────

export function Skate() {
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
            <div key={s.label} className="rounded-xl p-3" style={{ background: 'var(--card-bg)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <p style={{ color: '#888', fontSize: 11, fontFamily: 'Cormorant Garamond, serif' }}>{s.label}</p>
              <p className="text-lg font-bold" style={{ color: 'var(--accent)' }}>
                {s.value}
                {s.unit && <span className="text-xs font-normal ml-0.5" style={{ color: '#888' }}>{s.unit}</span>}
              </p>
            </div>
          ))}
        </div>

        {/* Log form */}
        <LogSkatePanel onLogged={load} />

        {/* Miles trend */}
        {milesTrend.length >= 2 && (
          <div className="rounded-xl p-4 mb-4" style={{ background: 'var(--card-bg)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <p className="font-bold text-white mb-1" style={{ fontFamily: 'Cinzel, serif', fontSize: 15 }}>Miles per Session</p>
            <p className="text-xs mb-3" style={{ color: '#888' }}>
              Avg {avgMiles.toFixed(1)} mi/session
            </p>
            <ResponsiveContainer width="100%" height={150}>
              <LineChart data={milesTrend}>
                <XAxis dataKey="date" tickFormatter={(d: string) => formatDate(d)} tick={{ fill: '#888', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis domain={['auto', 'auto']} tick={{ fill: '#888', fontSize: 10 }} axisLine={false} tickLine={false} width={30} />
                <Tooltip
                  contentStyle={{ background: 'var(--bg-mid)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: 12 }}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  labelFormatter={(l: any) => typeof l === 'string' ? formatDate(l) : l}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(v: any) => [`${Number(v).toFixed(2)} mi`, 'Miles']}
                />
                <ReferenceLine y={avgMiles} stroke="var(--accent)" strokeDasharray="4 2" strokeOpacity={0.4} />
                <Line type="monotone" dataKey="miles" stroke="var(--accent)" strokeWidth={2} dot={{ fill: 'var(--accent)', r: 3 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
            <p className="text-xs mt-1" style={{ color: 'var(--accent)' }}>── avg</p>
          </div>
        )}

        {/* Fastest mile trend */}
        {fastestTrend.length >= 2 && (
          <div className="rounded-xl p-4 mb-4" style={{ background: 'var(--card-bg)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <p className="font-bold text-white mb-1" style={{ fontFamily: 'Cinzel, serif', fontSize: 15 }}>Fastest Mile Trend</p>
            <p className="text-xs mb-3" style={{ color: '#888' }}>Lower is faster</p>
            <ResponsiveContainer width="100%" height={150}>
              <LineChart data={fastestTrend}>
                <XAxis dataKey="date" tickFormatter={(d: string) => formatDate(d)} tick={{ fill: '#888', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis domain={['auto', 'auto']} tick={{ fill: '#888', fontSize: 10 }} axisLine={false} tickLine={false} width={35} />
                <Tooltip
                  contentStyle={{ background: 'var(--bg-mid)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: 12 }}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  labelFormatter={(l: any) => typeof l === 'string' ? formatDate(l) : l}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(v: any) => [`${Number(v).toFixed(2)} min/mi`, 'Fastest Mile']}
                />
                {fastestMile && <ReferenceLine y={fastestMile} stroke="#2ECC71" strokeDasharray="4 2" strokeOpacity={0.5} />}
                <Line type="monotone" dataKey="fastest_mile" stroke="#2ECC71" strokeWidth={2} dot={{ fill: '#2ECC71', r: 3 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
            {fastestMile && <p className="text-xs mt-1" style={{ color: '#2ECC71' }}>── PR {fastestMile.toFixed(2)} min/mi</p>}
          </div>
        )}

        {/* Session history */}
        {sessions.length > 0 && (
          <div className="rounded-xl overflow-hidden" style={{ background: 'var(--card-bg)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <p className="px-4 pt-4 pb-2 font-bold text-white" style={{ fontFamily: 'Cinzel, serif', fontSize: 15 }}>Sessions</p>
            {sessions.map((s) => (
              <div key={s.id} className="flex items-center justify-between px-4 py-3" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <div>
                  <p className="text-white text-sm font-semibold">
                    {s.miles.toFixed(2)} mi
                    {s.fastest_mile && <span className="ml-2 text-xs font-normal" style={{ color: '#2ECC71' }}>⚡ {s.fastest_mile.toFixed(2)} min/mi</span>}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: '#888' }}>
                    {formatDate(s.date)}{s.duration ? ` · ${s.duration}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold" style={{ color: 'var(--accent)' }}>
                    +{Math.round(s.miles * XP_RATES.skate_per_mile)} XP
                  </span>
                  <button
                    onClick={() => setEditing(s)}
                    className="text-xs px-1.5 py-0.5 rounded"
                    style={{ color: '#888', background: 'rgba(255,255,255,0.06)' }}
                  >
                    ✏️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {editing && (
          <EditSkateModal row={editing} onClose={() => setEditing(null)} onSaved={load} />
        )}

      </PageWrapper>
    </>
  )
}
