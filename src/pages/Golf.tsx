import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts'
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
import { GolfIcon, EditIcon, TrophyIcon } from '../components/ui/Icon'
import { usePageTitle } from '../hooks/usePageTitle'
import type { GolfRound } from '../types'

const ACCENT = '#34d399'

// ── Helpers ───────────────────────────────────────────────────────

function vsParLabel(diff: number): string {
  if (diff === 0) return 'E'
  return diff > 0 ? `+${diff}` : String(diff)
}
function vsParColor(diff: number): string {
  if (diff < 0) return '#34d399'   // under par → green
  if (diff === 0) return '#f5a623' // even → gold
  return '#f87171'                  // over par → red
}
function defaultPar(holes: number) {
  return holes === 9 ? 36 : 72
}

// ── Log form ──────────────────────────────────────────────────────

interface GolfForm {
  date: string
  course: string
  holes: string
  score: string
  par: string
  putts: string
  fairways_hit: string
  fairways_possible: string
  notes: string
}

function LogGolfPanel({ onLogged }: { onLogged: () => void }) {
  const [open,  setOpen]  = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const refreshXP       = useStore(s => s.refreshXP)
  const refreshActivity = useStore(s => s.refreshActivity)
  const { register, handleSubmit, reset, watch, setValue, formState: { isSubmitting } } = useForm<GolfForm>({
    defaultValues: { date: today(), course: '', holes: '18', score: '', par: '72', putts: '', fairways_hit: '', fairways_possible: '', notes: '' },
  })

  const holes = watch('holes')
  // Auto-update par when holes changes
  useEffect(() => {
    setValue('par', String(defaultPar(parseInt(holes) || 18)))
  }, [holes, setValue])

  const onSubmit = async (data: GolfForm) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const score = parseInt(data.score)
    const par   = parseInt(data.par) || defaultPar(parseInt(data.holes) || 18)
    const diff  = score - par
    await supabase.from('golf_rounds').insert({
      user_id:           user.id,
      date:              data.date,
      course:            data.course,
      holes:             parseInt(data.holes) || 18,
      score,
      par,
      putts:             data.putts             ? parseInt(data.putts)             : null,
      fairways_hit:      data.fairways_hit      ? parseInt(data.fairways_hit)      : null,
      fairways_possible: data.fairways_possible ? parseInt(data.fairways_possible) : null,
      notes:             data.notes             || null,
    })
    const underParBonus = diff < 0 ? Math.abs(diff) * XP_RATES.golf_under_par : 0
    const xp = XP_RATES.golf_round + underParBonus
    if (diff < 0) { playPR(); setToast(`+${xp} XP — ${vsParLabel(diff)} 🏌️ Under par!`) }
    else          { playXPGain(); setToast(`+${xp} XP — Round logged (${vsParLabel(diff)})`) }
    await refreshXP(); refreshActivity()
    reset({ date: today(), course: '', holes: '18', score: '', par: '72', putts: '', fairways_hit: '', fairways_possible: '', notes: '' })
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
            <Input label="Course" type="text" placeholder="Papago Golf Course" {...register('course', { required: true })} />

            {/* Holes + Par */}
            <div className="flex gap-3">
              <div className="flex flex-col gap-1 flex-1">
                <label className="section-label">Holes</label>
                <select {...register('holes')} className="px-3 py-2.5 rounded-lg text-white outline-none" style={{ background: 'var(--input-bg)', border: '1px solid var(--border)' }}>
                  <option value="9">9</option>
                  <option value="18">18</option>
                </select>
              </div>
              <Input label="Par" type="number" placeholder="72" className="flex-1" {...register('par')} />
              <Input label="Score" type="number" placeholder="82" className="flex-1" {...register('score', { required: true })} />
            </div>

            {/* Optional stats */}
            <div className="flex gap-3">
              <Input label="Putts (opt)" type="number" placeholder="32" className="flex-1" {...register('putts')} />
              <Input label="FWY Hit" type="number" placeholder="8" className="flex-1" {...register('fairways_hit')} />
              <Input label="FWY Tot" type="number" placeholder="14" className="flex-1" {...register('fairways_possible')} />
            </div>

            <Input label="Notes (optional)" type="text" placeholder="Windy, back nine was tough…" {...register('notes')} />
            <Button type="submit" fullWidth disabled={isSubmitting}>{isSubmitting ? 'Logging...' : 'Log Round'}</Button>
          </form>
        </div>
      )}
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  )
}

// ── Edit modal ────────────────────────────────────────────────────

function EditGolfModal({ round, onClose, onSaved }: { round: GolfRound; onClose: () => void; onSaved: () => void }) {
  const [score, setScore] = useState(String(round.score))
  const [putts, setPutts] = useState(String(round.putts ?? ''))
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    await supabase.from('golf_rounds').update({
      score: parseInt(score) || round.score,
      putts: putts ? parseInt(putts) : null,
    }).eq('id', round.id)
    setSaving(false); onSaved(); onClose()
  }
  async function del() {
    await supabase.from('golf_rounds').delete().eq('id', round.id)
    onSaved(); onClose()
  }

  return (
    <EditModal title={`${round.course} — ${formatDate(round.date)}`} onClose={onClose} onDelete={del} onSave={save} saving={saving}>
      <div className="flex flex-col gap-4">
        <div className="flex gap-3">
          <div className="flex flex-col gap-1 flex-1">
            <label className="section-label">Score</label>
            <input type="number" value={score} onChange={e => setScore(e.target.value)} className="px-3 py-2.5 rounded-xl outline-none w-full text-sm" style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
          </div>
          <div className="flex flex-col gap-1 flex-1">
            <label className="section-label">Putts</label>
            <input type="number" value={putts} onChange={e => setPutts(e.target.value)} className="px-3 py-2.5 rounded-xl outline-none w-full text-sm" style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
          </div>
        </div>
      </div>
    </EditModal>
  )
}

// ── Main page ─────────────────────────────────────────────────────

const ttStyle = { background: 'rgba(10,10,22,0.97)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, color: '#fff', fontSize: 12 }

export function Golf() {
  usePageTitle('Golf')
  const [rounds,  setRounds]  = useState<GolfRound[]>([])
  const [editing, setEditing] = useState<GolfRound | null>(null)

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('golf_rounds').select('*').eq('user_id', user.id).order('date', { ascending: false })
    setRounds(data ?? [])
  }
  useEffect(() => { load() }, [])

  const diffs = rounds.map(r => r.score - r.par)
  const bestDiff  = rounds.length ? Math.min(...diffs) : null
  const avgDiff   = rounds.length ? Math.round((diffs.reduce((a, b) => a + b, 0) / diffs.length) * 10) / 10 : null

  // Trend chart data — most recent 10 rounds reversed to chronological
  const chartData = [...rounds].reverse().slice(-12).map(r => ({
    label: formatDate(r.date).slice(0, 6),
    vsPar: r.score - r.par,
  }))

  // Fairway % from latest round that has it
  const latestWithFwy = rounds.find(r => r.fairways_hit != null && r.fairways_possible != null)
  const fwyPct = latestWithFwy
    ? Math.round((latestWithFwy.fairways_hit! / latestWithFwy.fairways_possible!) * 100)
    : null

  return (
    <>
      <TopBar title="Golf" back />
      <PageWrapper>

        {/* Stat cards */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          {[
            { label: 'Rounds',   value: rounds.length || '—' },
            { label: 'Best',     value: bestDiff !== null ? vsParLabel(bestDiff) : '—', color: bestDiff !== null ? vsParColor(bestDiff) : undefined },
            { label: 'Avg',      value: avgDiff  !== null ? vsParLabel(Math.round(avgDiff)) : '—', color: avgDiff !== null ? vsParColor(Math.round(avgDiff)) : undefined },
          ].map(s => (
            <div key={s.label} className="rounded-xl p-3 text-center" style={{ background: 'var(--card-bg)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <p className="text-xl font-bold" style={{ color: s.color ?? ACCENT, fontFamily: 'Cinzel, serif' }}>{s.value}</p>
              <p className="text-xs mt-0.5 section-label">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Summary bar */}
        {rounds.length > 0 && (
          <div className="rounded-xl px-4 py-3 mb-4 flex items-center justify-between" style={{ background: 'rgba(52,211,153,0.07)', border: `1px solid rgba(52,211,153,0.2)` }}>
            <span style={{ fontSize: 13, color: '#888' }}>{rounds.length} round{rounds.length !== 1 ? 's' : ''}</span>
            <div className="flex items-center gap-4">
              {fwyPct !== null && <span style={{ fontSize: 13, color: '#888' }}>FWY {fwyPct}%</span>}
              {latestWithFwy?.putts != null && <span style={{ fontSize: 13, color: ACCENT, fontWeight: 700 }}>{latestWithFwy.putts} putts</span>}
            </div>
          </div>
        )}

        <LogGolfPanel onLogged={load} />

        {/* Score vs Par trend */}
        {chartData.length >= 2 && (
          <div className="rounded-xl p-4 mb-4" style={{ background: 'var(--card-bg)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <p className="font-bold text-white mb-1" style={{ fontFamily: 'Cinzel, serif', fontSize: 15 }}>Score vs Par</p>
            <p className="section-label mb-3">Lower is better · green = under par</p>
            <ResponsiveContainer width="100%" height={140}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 6" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: '#555', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#555', fontSize: 9 }} axisLine={false} tickLine={false} width={24}
                  tickFormatter={v => vsParLabel(v)} />
                <ReferenceLine y={0} stroke="rgba(245,166,35,0.4)" strokeDasharray="4 4" />
                <Tooltip
                  contentStyle={ttStyle}
                  formatter={(v: number) => [vsParLabel(v), 'vs Par']}
                />
                <Line
                  type="monotone" dataKey="vsPar" stroke={ACCENT} strokeWidth={2}
                  dot={{ r: 3, fill: ACCENT, strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: ACCENT }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Round history */}
        {rounds.length > 0 && <p className="section-label mb-3">Round History</p>}
        {rounds.map(r => {
          const diff = r.score - r.par
          return (
            <div
              key={r.id}
              className="flex items-center justify-between px-4 py-3 rounded-xl mb-2"
              style={{ background: 'rgba(16,24,52,0.65)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div className="flex items-center gap-3">
                <div style={{
                  width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                  background: diff <= 0 ? `${ACCENT}20` : 'rgba(248,113,113,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {diff <= 0
                    ? <TrophyIcon size={16} color={ACCENT} />
                    : <GolfIcon size={16} color="#555" />}
                </div>
                <div>
                  <p style={{ color: 'var(--text-primary)', fontSize: 13, fontWeight: 600 }}>{r.course}</p>
                  <p style={{ fontSize: 11, color: '#555', marginTop: 1 }}>
                    {formatDate(r.date)} · {r.holes}H
                    {r.putts != null && <span style={{ marginLeft: 6 }}>{r.putts} putts</span>}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: 18, fontWeight: 800, color: vsParColor(diff), fontFamily: 'Cinzel, serif', lineHeight: 1 }}>
                    {vsParLabel(diff)}
                  </p>
                  <p style={{ fontSize: 11, color: '#555', marginTop: 1 }}>{r.score} / {r.par}</p>
                </div>
                <button
                  onClick={() => setEditing(r)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: 'none', cursor: 'pointer' }}
                >
                  <EditIcon size={13} color="var(--text-muted)" />
                </button>
              </div>
            </div>
          )
        })}

        {rounds.length === 0 && (
          <EmptyState
            icon={<GolfIcon size={56} color="var(--text-muted)" />}
            title="No rounds logged yet"
            sub="Log your first round to start tracking your score vs par trend."
          />
        )}

        {editing && <EditGolfModal round={editing} onClose={() => setEditing(null)} onSaved={load} />}
      </PageWrapper>
    </>
  )
}
