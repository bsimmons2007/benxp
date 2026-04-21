import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine, Cell } from 'recharts'
import { TopBar } from '../components/layout/TopBar'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { Toast } from '../components/ui/Toast'
import { EditModal } from '../components/ui/EditModal'
import { EmptyState } from '../components/ui/EmptyState'
import { supabase } from '../lib/supabase'
import { today, formatDate } from '../lib/utils'
import { useStore } from '../store/useStore'
import { playXPGain, playPR } from '../lib/sounds'
import { XP_RATES } from '../lib/xp'
import { DiscIcon, EditIcon } from '../components/ui/Icon'
import { usePageTitle } from '../hooks/usePageTitle'
import type { DiscGolfRound } from '../types'

const ACCENT = '#f59e0b'

// ── Helpers ───────────────────────────────────────────────────────

function vsParLabel(diff: number): string {
  if (diff === 0) return 'E'
  return diff > 0 ? `+${diff}` : String(diff)
}
function vsParColor(diff: number): string {
  if (diff < 0) return '#34d399'
  if (diff === 0) return ACCENT
  return '#f87171'
}
function defaultPar(holes: number) { return holes === 9 ? 27 : 54 }

// ── Log form ──────────────────────────────────────────────────────

interface DgForm {
  date: string
  course: string
  holes: string
  score: string
  par: string
  notes: string
}

function LogDiscGolfPanel({ onLogged }: { onLogged: () => void }) {
  const [open,  setOpen]  = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const refreshXP       = useStore(s => s.refreshXP)
  const refreshActivity = useStore(s => s.refreshActivity)
  const { register, handleSubmit, reset, watch, setValue, formState: { isSubmitting } } = useForm<DgForm>({
    defaultValues: { date: today(), course: '', holes: '18', score: '', par: '54', notes: '' },
  })

  const holes = watch('holes')
  useEffect(() => {
    setValue('par', String(defaultPar(parseInt(holes) || 18)))
  }, [holes, setValue])

  const onSubmit = async (data: DgForm) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const score = parseInt(data.score)
    const par   = parseInt(data.par) || defaultPar(parseInt(data.holes) || 18)
    const diff  = score - par
    await supabase.from('disc_golf_rounds').insert({
      user_id: user.id,
      date:    data.date,
      course:  data.course,
      holes:   parseInt(data.holes) || 18,
      score,
      par,
      notes:   data.notes || null,
    })
    const underParBonus = diff < 0 ? Math.abs(diff) * XP_RATES.disc_golf_under_par : 0
    const xp = XP_RATES.disc_golf_round + underParBonus
    if (diff < 0) { playPR(); setToast(`+${xp} XP — ${vsParLabel(diff)} 🥏 Under par!`) }
    else          { playXPGain(); setToast(`+${xp} XP — Round logged (${vsParLabel(diff)})`) }
    await refreshXP(); refreshActivity()
    reset({ date: today(), course: '', holes: '18', score: '', par: '54', notes: '' })
    setOpen(false); onLogged()
  }

  return (
    <div className="mb-5">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all"
        style={{ background: open ? ACCENT : 'rgba(255,255,255,0.05)', color: open ? '#0d0d1a' : ACCENT, border: `1px solid ${ACCENT}`, fontSize: 15 }}
      >
        {open ? '✕ Cancel' : '+ Log Round'}
      </button>
      {open && (
        <div className="mt-3 rounded-xl p-4 pop-in" style={{ background: 'rgba(16,24,52,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <Input label="Date" type="date" {...register('date', { required: true })} />
            <Input label="Course" type="text" placeholder="Papago Disc Golf" {...register('course', { required: true })} />
            <div className="flex gap-3">
              <div className="flex flex-col gap-1 flex-1">
                <label className="section-label">Holes</label>
                <select {...register('holes')} className="px-3 py-2.5 rounded-lg text-white outline-none" style={{ background: 'var(--input-bg)', border: '1px solid var(--border)' }}>
                  <option value="9">9</option>
                  <option value="18">18</option>
                </select>
              </div>
              <Input label="Par" type="number" placeholder="54" className="flex-1" {...register('par')} />
              <Input label="Score" type="number" placeholder="56" className="flex-1" {...register('score', { required: true })} />
            </div>
            <Input label="Notes (optional)" type="text" placeholder="Wooded course, great weather…" {...register('notes')} />
            <Button type="submit" fullWidth disabled={isSubmitting}>{isSubmitting ? 'Logging...' : 'Log Round'}</Button>
          </form>
        </div>
      )}
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  )
}

// ── Edit modal ────────────────────────────────────────────────────

function EditDiscGolfModal({ round, onClose, onSaved }: { round: DiscGolfRound; onClose: () => void; onSaved: () => void }) {
  const [score, setScore] = useState(String(round.score))
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    await supabase.from('disc_golf_rounds').update({ score: parseInt(score) || round.score }).eq('id', round.id)
    setSaving(false); onSaved(); onClose()
  }
  async function del() {
    await supabase.from('disc_golf_rounds').delete().eq('id', round.id)
    onSaved(); onClose()
  }

  return (
    <EditModal title={`${round.course} — ${formatDate(round.date)}`} onClose={onClose} onDelete={del} onSave={save} saving={saving}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label className="section-label">Score</label>
          <input type="number" value={score} onChange={e => setScore(e.target.value)} className="px-3 py-2.5 rounded-xl outline-none w-full text-sm" style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
        </div>
      </div>
    </EditModal>
  )
}

// ── Main page ─────────────────────────────────────────────────────

const ttStyle = { background: 'rgba(10,10,22,0.97)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, color: '#fff', fontSize: 12 }

export function DiscGolf() {
  usePageTitle('Disc Golf')
  const [rounds,  setRounds]  = useState<DiscGolfRound[]>([])
  const [editing, setEditing] = useState<DiscGolfRound | null>(null)

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('disc_golf_rounds').select('*').eq('user_id', user.id).order('date', { ascending: false })
    setRounds(data ?? [])
  }
  useEffect(() => { load() }, [])

  const diffs    = rounds.map(r => r.score - r.par)
  const bestDiff = rounds.length ? Math.min(...diffs) : null
  const avgDiff  = rounds.length ? Math.round((diffs.reduce((a, b) => a + b, 0) / diffs.length) * 10) / 10 : null
  const underPar = diffs.filter(d => d < 0).length

  const chartData = [...rounds].reverse().slice(-10).map(r => ({
    label: formatDate(r.date).slice(0, 6),
    vsPar: r.score - r.par,
  }))

  return (
    <>
      <TopBar title="Disc Golf" back />
      <PageWrapper>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          {[
            { label: 'Rounds',    value: rounds.length || '—' },
            { label: 'Best',      value: bestDiff !== null ? vsParLabel(bestDiff) : '—', color: bestDiff !== null ? vsParColor(bestDiff) : undefined },
            { label: 'Under Par', value: underPar || '—', color: '#34d399' },
          ].map(s => (
            <div key={s.label} className="rounded-xl p-3 text-center" style={{ background: 'var(--card-bg)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <p className="text-xl font-bold" style={{ color: s.color ?? ACCENT, fontFamily: 'Cinzel, serif' }}>{s.value}</p>
              <p className="text-xs mt-0.5 section-label">{s.label}</p>
            </div>
          ))}
        </div>

        {rounds.length > 0 && (
          <div className="rounded-xl px-4 py-3 mb-4 flex items-center justify-between" style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.2)' }}>
            <span style={{ fontSize: 13, color: '#888' }}>{rounds.length} round{rounds.length !== 1 ? 's' : ''}</span>
            {avgDiff !== null && (
              <span style={{ fontSize: 14, fontWeight: 700, color: vsParColor(Math.round(avgDiff)) }}>
                Avg {vsParLabel(Math.round(avgDiff))}
              </span>
            )}
          </div>
        )}

        <LogDiscGolfPanel onLogged={load} />

        {/* Score vs Par chart */}
        {chartData.length >= 2 && (
          <div className="rounded-xl p-4 mb-4" style={{ background: 'var(--card-bg)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <p className="font-bold text-white mb-1" style={{ fontFamily: 'Cinzel, serif', fontSize: 15 }}>Score vs Par</p>
            <p className="section-label mb-3">Green = under par</p>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={chartData} barSize={22}>
                <CartesianGrid strokeDasharray="3 6" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: '#555', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#555', fontSize: 9 }} axisLine={false} tickLine={false} width={24} tickFormatter={v => vsParLabel(v)} />
                <ReferenceLine y={0} stroke="rgba(245,158,11,0.4)" strokeDasharray="4 4" />
                <Tooltip contentStyle={ttStyle} formatter={(v: number) => [vsParLabel(v), 'vs Par']} />
                <Bar dataKey="vsPar" radius={[4, 4, 4, 4]}>
                  {chartData.map((d, i) => (
                    <Cell key={i} fill={d.vsPar < 0 ? '#34d399' : d.vsPar === 0 ? ACCENT : '#f87171'} fillOpacity={0.8} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* History */}
        {rounds.length > 0 && <p className="section-label mb-3">Round History</p>}
        {rounds.map(r => {
          const diff = r.score - r.par
          return (
            <div key={r.id} className="flex items-center justify-between px-4 py-3 rounded-xl mb-2" style={{ background: 'rgba(16,24,52,0.65)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex items-center gap-3">
                <div style={{
                  width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                  background: diff <= 0 ? 'rgba(52,211,153,0.15)' : 'rgba(255,255,255,0.04)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <DiscIcon size={18} color={diff <= 0 ? '#34d399' : '#555'} />
                </div>
                <div>
                  <p style={{ color: 'var(--text-primary)', fontSize: 13, fontWeight: 600 }}>{r.course}</p>
                  <p style={{ fontSize: 11, color: '#555', marginTop: 1 }}>{formatDate(r.date)} · {r.holes}H</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: 18, fontWeight: 800, color: vsParColor(diff), fontFamily: 'Cinzel, serif', lineHeight: 1 }}>{vsParLabel(diff)}</p>
                  <p style={{ fontSize: 11, color: '#555', marginTop: 1 }}>{r.score} / {r.par}</p>
                </div>
                <button onClick={() => setEditing(r)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: 'none', cursor: 'pointer' }}>
                  <EditIcon size={13} color="var(--text-muted)" />
                </button>
              </div>
            </div>
          )
        })}

        {rounds.length === 0 && (
          <EmptyState
            icon={<DiscIcon size={56} color="var(--text-muted)" />}
            title="No rounds logged yet"
            sub="Log your first disc golf round to start tracking scores."
          />
        )}

        {editing && <EditDiscGolfModal round={editing} onClose={() => setEditing(null)} onSaved={load} />}
      </PageWrapper>
    </>
  )
}
