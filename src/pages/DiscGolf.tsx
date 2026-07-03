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
import { Card } from '../components/ui/Card'
import { supabase } from '../lib/supabase'
import { CHART_TOOLTIP_STYLE, today, formatDate } from '../lib/utils'
import { useStore } from '../store/useStore'
import { playXPGain, playPR } from '../lib/sounds'
import { XP_RATES } from '../lib/xp'
import { DiscIcon, EditIcon } from '../components/ui/Icon'
import { usePageTitle } from '../hooks/usePageTitle'
import type { DiscGolfRound } from '../types'

const PAGE_SIZE = 10
const LOAD_MORE = 20

// ── Helpers ───────────────────────────────────────────────────────

function vsParLabel(diff: number): string {
  if (diff === 0) return 'E'
  return diff > 0 ? `+${diff}` : String(diff)
}
function vsParColor(diff: number): string {
  if (diff < 0) return 'var(--green)'
  if (diff === 0) return 'var(--warning)'
  return 'var(--red)'
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
    const { error } = await supabase.from('disc_golf_rounds').insert({
      user_id: user.id,
      date:    data.date,
      course:  data.course,
      holes:   parseInt(data.holes) || 18,
      score,
      par,
      notes:   data.notes || null,
    })
    if (error) { setToast('Failed to save — try again'); return }
    const underParBonus = diff < 0 ? Math.abs(diff) * XP_RATES.disc_golf_under_par : 0
    const xp = XP_RATES.disc_golf_round + underParBonus
    if (diff < 0) { playPR(); setToast(`+${xp} XP — ${vsParLabel(diff)} Under par!`) }
    else          { playXPGain(); setToast(`+${xp} XP — Round logged (${vsParLabel(diff)})`) }
    await refreshXP(); refreshActivity()
    reset({ date: today(), course: '', holes: '18', score: '', par: '54', notes: '' })
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
        {open ? 'Cancel' : 'Log Round'}
      </button>
      {open && (
        <div className="mt-3 rounded-xl p-4 pop-in" style={{ background: 'var(--surface-1)', border: '1px solid var(--border-subtle)' }}>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <Input label="Date" type="date" {...register('date', { required: true })} />
            <Input label="Course" type="text" placeholder="Papago Disc Golf" {...register('course', { required: true })} />
            <div className="flex gap-3">
              <div className="flex flex-col gap-1 flex-1">
                <label className="section-label">Holes</label>
                <select {...register('holes')} className="px-3 py-2.5 rounded-lg outline-none" style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                  <option value="9">9</option>
                  <option value="18">18</option>
                </select>
              </div>
              <Input label="Par" type="number" placeholder="54" className="flex-1" {...register('par')} />
              <Input label="Score" type="number" placeholder="56" className="flex-1" {...register('score', { required: true })} />
            </div>
            <Input label="Notes (optional)" type="text" placeholder="Wooded course, great weather…" {...register('notes')} />
            <Button type="submit" fullWidth loading={isSubmitting} disabled={isSubmitting}>{isSubmitting ? 'Logging...' : 'Log Round'}</Button>
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
    const { error } = await supabase.from('disc_golf_rounds').update({ score: parseInt(score) || round.score }).eq('id', round.id)
    setSaving(false)
    if (!error) { onSaved(); onClose() }
  }
  async function del() {
    const { error } = await supabase.from('disc_golf_rounds').delete().eq('id', round.id)
    if (!error) { onSaved(); onClose() }
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

const ttStyle = CHART_TOOLTIP_STYLE

export function DiscGolf() {
  usePageTitle('Disc Golf')
  const [rounds,  setRounds]  = useState<DiscGolfRound[]>([])
  const [editing, setEditing] = useState<DiscGolfRound | null>(null)
  const [visible, setVisible] = useState(PAGE_SIZE)

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
      <TopBar title="Disc Golf" back backTo="/hobbies" />
      <PageWrapper>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          {[
            { label: 'Rounds',    value: rounds.length || '—' },
            { label: 'Best',      value: bestDiff !== null ? vsParLabel(bestDiff) : '—', color: bestDiff !== null ? vsParColor(bestDiff) : undefined },
            { label: 'Under Par', value: underPar || '—', color: 'var(--green)' },
          ].map(s => (
            <div key={s.label} className="rounded-xl p-3 text-center" style={{ background: 'var(--surface-1)', border: '1px solid var(--border-subtle)' }}>
              <p style={{ fontSize: 22, fontWeight: 700, color: s.color ?? 'var(--accent)', fontFamily: 'var(--font-mono)', lineHeight: 1 }}>{s.value}</p>
              <p className="section-label mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {rounds.length > 0 && (
          <div className="rounded-xl px-4 py-3 mb-4 flex items-center justify-between" style={{ background: 'var(--accent-subtle)', border: '1px solid var(--accent-dim)' }}>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{rounds.length} round{rounds.length !== 1 ? 's' : ''}</span>
            {avgDiff !== null && (
              <span style={{ fontSize: 14, fontWeight: 700, color: vsParColor(Math.round(avgDiff)) }}>
                Avg {vsParLabel(Math.round(avgDiff))}
              </span>
            )}
          </div>
        )}

        <LogDiscGolfPanel onLogged={load} />

        {/* Score vs Par chart */}
        {rounds.length > 0 && (
          <Card className="mb-4">
            <p className="font-bold mb-1" style={{ fontSize: 15, color: 'var(--text-primary)' }}>Score vs Par</p>
            <p className="section-label mb-3">Green = under par</p>
            {chartData.length >= 2 ? (
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={chartData} barSize={22}>
                  <CartesianGrid strokeDasharray="3 6" stroke="var(--border-subtle)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: 'var(--text-tertiary)', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'var(--text-tertiary)', fontSize: 9 }} axisLine={false} tickLine={false} width={24} tickFormatter={v => vsParLabel(v)} />
                  <ReferenceLine y={0} stroke="color-mix(in srgb, var(--warning) 40%, transparent)" strokeDasharray="4 4" />
                  <Tooltip contentStyle={ttStyle} formatter={(v: number) => [vsParLabel(v), 'vs Par']} />
                  <Bar dataKey="vsPar" radius={[4, 4, 4, 4]}>
                    {chartData.map((d, i) => (
                      <Cell key={i} fill={d.vsPar < 0 ? 'var(--green)' : d.vsPar === 0 ? 'var(--warning)' : 'var(--red)'} fillOpacity={0.8} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p style={{ fontSize: 13, color: 'var(--text-muted)', padding: '8px 0' }}>
                Score vs par trend unlocks after your second round.
              </p>
            )}
          </Card>
        )}

        {/* History */}
        {rounds.length > 0 && <p className="section-label mb-3">Round History</p>}
        {rounds.slice(0, visible).map(r => {
          const diff = r.score - r.par
          return (
            <Card key={r.id} className="flex items-center justify-between mb-2" style={{ padding: '12px 16px' }}>
              <div className="flex items-center gap-3">
                <div style={{
                  width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                  background: diff <= 0 ? 'color-mix(in srgb, var(--green) 15%, transparent)' : 'var(--input-bg)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <DiscIcon size={18} color={diff <= 0 ? 'var(--green)' : 'var(--text-muted)'} />
                </div>
                <div>
                  <p style={{ color: 'var(--text-primary)', fontSize: 13, fontWeight: 600 }}>{r.course}</p>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{formatDate(r.date)} · {r.holes}H</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: 18, fontWeight: 700, color: vsParColor(diff), lineHeight: 1 }}>{vsParLabel(diff)}</p>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{r.score} / {r.par}</p>
                </div>
                <button type="button" aria-label="Edit round" onClick={() => setEditing(r)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 8, background: 'var(--input-bg)', border: 'none', cursor: 'pointer' }}>
                  <EditIcon size={13} color="var(--text-muted)" />
                </button>
              </div>
            </Card>
          )
        })}

        {rounds.length > visible && (
          <button
            type="button"
            onClick={() => setVisible(v => v + LOAD_MORE)}
            className="w-full py-3 rounded-xl font-semibold mt-1"
            style={{ background: 'var(--input-bg)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)', fontSize: 14 }}
          >
            Show more ({rounds.length - visible} left)
          </button>
        )}

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
