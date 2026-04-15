import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, BarChart, Bar, Cell,
} from 'recharts'
import { TopBar } from '../components/layout/TopBar'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { Toast } from '../components/ui/Toast'
import { Card } from '../components/ui/Card'
import { supabase } from '../lib/supabase'
import { today, formatDate } from '../lib/utils'
import { useStore } from '../store/useStore'
import { playXPGain, playPR } from '../lib/sounds'
import type { BasketballSession } from '../types'
import { BasketballIcon, TrophyIcon, StarIcon, TrendingIcon, EditIcon } from '../components/ui/Icon'
import { EditModal } from '../components/ui/EditModal'
import { usePageTitle } from '../hooks/usePageTitle'

// ── XP reward ────────────────────────────────────────────────────
const XP_PER_SESSION = 25
const XP_PER_POINT   = 1

// ── Helpers ───────────────────────────────────────────────────────
function pct(made: number, attempted: number) {
  return attempted > 0 ? Math.round((made / attempted) * 1000) / 10 : 0
}
function fmt(n: number, decimals = 1) {
  return n.toFixed(decimals)
}
function localDate(daysAgo = 0) {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  return d.toLocaleDateString('en-CA')
}

// ── Log form ─────────────────────────────────────────────────────
interface BbForm {
  date: string
  fg_made: string; fg_attempted: string
  three_made: string; three_attempted: string
  ft_made: string; ft_attempted: string
  points: string
  assists: string; rebounds: string
  steals: string; blocks: string; turnovers: string
  notes: string
}

function LogBasketballPanel({ onLogged }: { onLogged: () => void }) {
  const [open,        setOpen]        = useState(false)
  const [toast,       setToast]       = useState<string | null>(null)
  const [showShooting, setShowShooting] = useState(true)
  const [showBox,      setShowBox]      = useState(true)
  const refreshXP       = useStore(s => s.refreshXP)
  const refreshActivity = useStore(s => s.refreshActivity)
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<BbForm>({
    defaultValues: {
      date: today(), fg_made: '', fg_attempted: '', three_made: '', three_attempted: '',
      ft_made: '', ft_attempted: '', points: '', assists: '', rebounds: '',
      steals: '', blocks: '', turnovers: '', notes: '',
    },
  })

  const int = (v: string) => parseInt(v) || 0

  const onSubmit = async (data: BbForm) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    if (!showShooting && !showBox) { setToast('Enable at least one section'); return }
    const pts = int(data.points)
    const { error } = await supabase.from('basketball_sessions').insert({
      user_id:         user.id,
      date:            data.date,
      fg_made:         showShooting ? int(data.fg_made)        : 0,
      fg_attempted:    showShooting ? int(data.fg_attempted)   : 0,
      three_made:      showShooting ? int(data.three_made)     : 0,
      three_attempted: showShooting ? int(data.three_attempted): 0,
      ft_made:         showShooting ? int(data.ft_made)        : 0,
      ft_attempted:    showShooting ? int(data.ft_attempted)   : 0,
      points:          showBox ? pts                : 0,
      assists:         showBox ? int(data.assists)  : 0,
      rebounds:        showBox ? int(data.rebounds) : 0,
      steals:          showBox ? int(data.steals)   : 0,
      blocks:          showBox ? int(data.blocks)   : 0,
      turnovers:       showBox ? int(data.turnovers): 0,
      notes:           data.notes || null,
    })
    if (error) { setToast('Error saving session'); return }
    const xp = XP_PER_SESSION + pts * XP_PER_POINT
    if (pts >= 20) playPR(); else playXPGain()
    setToast(`+${xp} XP — session logged!`)
    await refreshXP()
    refreshActivity()
    reset({ date: today(), fg_made: '', fg_attempted: '', three_made: '', three_attempted: '',
      ft_made: '', ft_attempted: '', points: '', assists: '', rebounds: '',
      steals: '', blocks: '', turnovers: '', notes: '' })
    setOpen(false)
    onLogged()
  }

  // toggle pill style
  const pill = (active: boolean) => ({
    padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: 'pointer',
    border: '1px solid var(--accent)',
    background: active ? 'var(--accent)' : 'transparent',
    color: active ? '#1A1A2E' : 'var(--accent)',
    transition: 'all 0.15s',
  } as React.CSSProperties)

  return (
    <div className="mb-5">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all"
        style={{
          background: open ? 'var(--accent)' : 'rgba(255,255,255,0.05)',
          color: open ? '#1A1A2E' : 'var(--accent)',
          border: '1px solid var(--accent)', fontSize: 15,
        }}
      >
        {open ? '✕ Cancel' : '+ Log Session'}
      </button>

      {open && (
        <div className="mt-3 rounded-xl p-4 pop-in" style={{ background: 'rgba(16,24,52,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>

          {/* Section toggles */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <button type="button" style={pill(showShooting)} onClick={() => setShowShooting(s => !s)}>🎯 Shooting</button>
            <button type="button" style={pill(showBox)}      onClick={() => setShowBox(s => !s)}>📋 Box Score</button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <Input label="Date" type="date" {...register('date', { required: true })} />

            {showShooting && (
              <>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: -8 }}>Shooting</p>
                <div className="grid grid-cols-2 gap-3">
                  <Input label="FG Made"       type="number" placeholder="0" {...register('fg_made')} />
                  <Input label="FG Attempted"  type="number" placeholder="0" {...register('fg_attempted')} />
                  <Input label="3PT Made"      type="number" placeholder="0" {...register('three_made')} />
                  <Input label="3PT Attempted" type="number" placeholder="0" {...register('three_attempted')} />
                  <Input label="FT Made"       type="number" placeholder="0" {...register('ft_made')} />
                  <Input label="FT Attempted"  type="number" placeholder="0" {...register('ft_attempted')} />
                </div>
              </>
            )}

            {showBox && (
              <>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: -8 }}>Box Score</p>
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Points"    type="number" placeholder="0" {...register('points')} />
                  <Input label="Assists"   type="number" placeholder="0" {...register('assists')} />
                  <Input label="Rebounds"  type="number" placeholder="0" {...register('rebounds')} />
                  <Input label="Steals"    type="number" placeholder="0" {...register('steals')} />
                  <Input label="Blocks"    type="number" placeholder="0" {...register('blocks')} />
                  <Input label="Turnovers" type="number" placeholder="0" {...register('turnovers')} />
                </div>
              </>
            )}

            <Input label="Notes (optional)" placeholder="e.g. pickup game at the rec" {...register('notes')} />
            <Button type="submit" fullWidth disabled={isSubmitting}>{isSubmitting ? 'Logging...' : 'Log Session'}</Button>
          </form>
        </div>
      )}
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  )
}

// ── Stat pill ─────────────────────────────────────────────────────
function StatPill({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)',
      borderRadius: 12, padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 2,
    }}>
      <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</span>
      <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.1 }}>{value}</span>
      {sub && <span style={{ fontSize: 10, color: 'var(--text-dim)' }}>{sub}</span>}
    </div>
  )
}

// ── Trend chart ──────────────────────────────────────────────────
function TrendChart({ data, dataKey, label, color = 'var(--accent)' }: {
  data: Record<string, unknown>[]
  dataKey: string
  label: string
  color?: string
}) {
  if (data.length < 2) return null
  return (
    <div style={{ marginBottom: 24 }}>
      <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</p>
      <ResponsiveContainer width="100%" height={120}>
        <LineChart data={data} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#888' }} />
          <YAxis tick={{ fontSize: 9, fill: '#888' }} domain={[0, 100]} unit="%" />
          <Tooltip
            contentStyle={{ background: '#1a1a2e', border: '1px solid #333', borderRadius: 8, fontSize: 11 }}
            formatter={(v: unknown) => [`${v}%`, label]}
          />
          <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} dot={{ r: 3, fill: color }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── Edit modal ────────────────────────────────────────────────────
function EditBbModal({ session, onClose, onSaved }: { session: BasketballSession; onClose: () => void; onSaved: () => void }) {
  const [vals, setVals] = useState({
    date: session.date,
    fg_made: String(session.fg_made), fg_attempted: String(session.fg_attempted),
    three_made: String(session.three_made), three_attempted: String(session.three_attempted),
    ft_made: String(session.ft_made), ft_attempted: String(session.ft_attempted),
    points: String(session.points), assists: String(session.assists),
    rebounds: String(session.rebounds), steals: String(session.steals),
    blocks: String(session.blocks), turnovers: String(session.turnovers),
    notes: session.notes ?? '',
  })
  const [saving, setSaving] = useState(false)
  const int = (v: string) => parseInt(v) || 0

  async function save() {
    setSaving(true)
    await supabase.from('basketball_sessions').update({
      date: vals.date,
      fg_made: int(vals.fg_made), fg_attempted: int(vals.fg_attempted),
      three_made: int(vals.three_made), three_attempted: int(vals.three_attempted),
      ft_made: int(vals.ft_made), ft_attempted: int(vals.ft_attempted),
      points: int(vals.points), assists: int(vals.assists),
      rebounds: int(vals.rebounds), steals: int(vals.steals),
      blocks: int(vals.blocks), turnovers: int(vals.turnovers),
      notes: vals.notes || null,
    }).eq('id', session.id)
    setSaving(false)
    onSaved()
    onClose()
  }

  async function del() {
    await supabase.from('basketball_sessions').delete().eq('id', session.id)
    onSaved()
    onClose()
  }

  const field = (label: string, key: keyof typeof vals) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</label>
      <input
        type="number" value={vals[key]}
        onChange={e => setVals(v => ({ ...v, [key]: e.target.value }))}
        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', color: 'var(--text-primary)', fontSize: 14, width: '100%' }}
      />
    </div>
  )

  return (
    <EditModal title={`Edit — ${formatDate(session.date)}`} onClose={onClose} onDelete={del} onSave={save} saving={saving}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Date</label>
          <input type="date" value={vals.date} onChange={e => setVals(v => ({ ...v, date: e.target.value }))}
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', color: 'var(--text-primary)', fontSize: 14, width: '100%' }} />
        </div>
        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Shooting</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {field('FG Made', 'fg_made')}{field('FG Attempted', 'fg_attempted')}
          {field('3PT Made', 'three_made')}{field('3PT Attempted', 'three_attempted')}
          {field('FT Made', 'ft_made')}{field('FT Attempted', 'ft_attempted')}
        </div>
        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Box Score</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {field('Points', 'points')}{field('Assists', 'assists')}
          {field('Rebounds', 'rebounds')}{field('Steals', 'steals')}
          {field('Blocks', 'blocks')}{field('Turnovers', 'turnovers')}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Notes</label>
          <input value={vals.notes} onChange={e => setVals(v => ({ ...v, notes: e.target.value }))}
            placeholder="Optional notes…"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', color: 'var(--text-primary)', fontSize: 14, width: '100%' }} />
        </div>
      </div>
    </EditModal>
  )
}

// ── Main page ─────────────────────────────────────────────────────
export function Basketball() {
  usePageTitle('Basketball')
  const [sessions, setSessions] = useState<BasketballSession[]>([])
  const [loading,  setLoading]  = useState(true)
  const [editing,  setEditing]  = useState<BasketballSession | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('basketball_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(100)
      setSessions((data as BasketballSession[]) ?? [])
    } catch (e) {
      console.error('Basketball load error:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  // ── Derived stats ──────────────────────────────────────────────
  const totalSessions = sessions.length
  const totalPoints   = sessions.reduce((s, r) => s + r.points, 0)
  const totalAssists  = sessions.reduce((s, r) => s + r.assists, 0)
  const totalRebounds = sessions.reduce((s, r) => s + r.rebounds, 0)
  const totalSteals   = sessions.reduce((s, r) => s + r.steals, 0)
  const totalBlocks   = sessions.reduce((s, r) => s + r.blocks, 0)
  const totalTO       = sessions.reduce((s, r) => s + r.turnovers, 0)

  const totalFGA = sessions.reduce((s, r) => s + r.fg_attempted, 0)
  const totalFGM = sessions.reduce((s, r) => s + r.fg_made, 0)
  const total3PA = sessions.reduce((s, r) => s + r.three_attempted, 0)
  const total3PM = sessions.reduce((s, r) => s + r.three_made, 0)
  const totalFTA = sessions.reduce((s, r) => s + r.ft_attempted, 0)
  const totalFTM = sessions.reduce((s, r) => s + r.ft_made, 0)

  const fgPct  = pct(totalFGM, totalFGA)
  const threePct = pct(total3PM, total3PA)
  const ftPct  = pct(totalFTM, totalFTA)

  const ppg    = totalSessions > 0 ? totalPoints / totalSessions : 0
  const ppShot = totalFGA > 0 ? totalPoints / totalFGA : 0

  // sessions this week
  const weekAgo = localDate(7)
  const sessionsThisWeek = sessions.filter(s => s.date >= weekAgo).length

  // streak
  let streak = 0
  const seen = new Set(sessions.map(s => s.date))
  for (let i = 0; ; i++) {
    if (seen.has(localDate(i))) streak++
    else if (i > 0) break
    if (i > 365) break
  }

  // best game
  const best = sessions.length > 0
    ? sessions.reduce((b, s) => s.points > b.points ? s : b, sessions[0])
    : null

  // weakest skill (lowest %)
  const skills = [
    { name: 'FG%',  val: fgPct,    sessions: totalFGA },
    { name: '3PT%', val: threePct, sessions: total3PA },
    { name: 'FT%',  val: ftPct,    sessions: totalFTA },
  ].filter(s => s.sessions >= 3)
  const weakest = skills.length > 0 ? skills.reduce((w, s) => s.val < w.val ? s : w, skills[0]) : null

  // chart data — last 15 sessions reversed (oldest first)
  const chartSessions = [...sessions].reverse().slice(-15)
  const fgTrend   = chartSessions.map((s, i) => ({ label: String(i + 1), fg: pct(s.fg_made, s.fg_attempted) }))
  const threeTrend = chartSessions.map((s, i) => ({ label: String(i + 1), three: pct(s.three_made, s.three_attempted) }))
  const ftTrend   = chartSessions.map((s, i) => ({ label: String(i + 1), ft: pct(s.ft_made, s.ft_attempted) }))
  const shotVolume = chartSessions.map((s, i) => ({ label: String(i + 1), shots: s.fg_attempted }))

  return (
    <>
      <TopBar title="Basketball" />
      <PageWrapper>
        <LogBasketballPanel onLogged={load} />

        {loading && (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 40 }}>Loading…</p>
        )}

        {!loading && totalSessions === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <BasketballIcon size={48} color="var(--text-dim)" />
            <p style={{ color: 'var(--text-muted)', marginTop: 12, fontSize: 14 }}>No sessions yet — log your first game!</p>
          </div>
        )}

        {!loading && totalSessions > 0 && (
          <>
            {/* ── Quick summary bar ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 20 }}>
              <StatPill label="Sessions" value={String(totalSessions)} />
              <StatPill label="This Week" value={String(sessionsThisWeek)} />
              <StatPill label="Streak" value={`${streak}d`} />
            </div>

            {/* ── Shooting percentages ── */}
            <Card style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>Shooting</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                {[
                  { label: 'FG%',  val: fgPct,   made: totalFGM, att: totalFGA },
                  { label: '3PT%', val: threePct, made: total3PM, att: total3PA },
                  { label: 'FT%',  val: ftPct,    made: totalFTM, att: totalFTA },
                ].map(s => (
                  <div key={s.label} style={{ textAlign: 'center', padding: '10px 0' }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: s.val >= 40 ? '#2ECC71' : s.val >= 30 ? '#F5A623' : 'var(--accent)' }}>
                      {fmt(s.val)}%
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{s.label}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 1 }}>{s.made}/{s.att}</div>
                  </div>
                ))}
              </div>
            </Card>

            {/* ── Box score totals ── */}
            <Card style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>Career Totals</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                <StatPill label="Points"    value={String(totalPoints)} sub={`${fmt(ppg)} ppg avg`} />
                <StatPill label="Assists"   value={String(totalAssists)} sub={`${fmt(totalAssists / totalSessions)} apg`} />
                <StatPill label="Rebounds"  value={String(totalRebounds)} sub={`${fmt(totalRebounds / totalSessions)} rpg`} />
                <StatPill label="Steals"    value={String(totalSteals)} sub={`${fmt(totalSteals / totalSessions)} spg`} />
                <StatPill label="Blocks"    value={String(totalBlocks)} sub={`${fmt(totalBlocks / totalSessions)} bpg`} />
                <StatPill label="Turnovers" value={String(totalTO)} sub={`${fmt(totalTO / totalSessions)} topg`} />
              </div>
            </Card>

            {/* ── Efficiency ── */}
            <Card style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>Efficiency</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                <StatPill label="Pts / Shot"   value={fmt(ppShot)} sub="scoring efficiency" />
                <StatPill label="Pts / Game"   value={fmt(ppg)}    sub="rolling avg" />
              </div>
            </Card>

            {/* ── Best game ── */}
            {best && (
              <Card style={{ marginBottom: 16, borderColor: 'rgba(233,69,96,0.3)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <TrophyIcon size={16} color="var(--accent)" />
                  <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Best Game</p>
                  <span style={{ fontSize: 11, color: 'var(--text-dim)', marginLeft: 'auto' }}>{formatDate(best.date)}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, textAlign: 'center' }}>
                  {[
                    { l: 'PTS', v: best.points },
                    { l: 'AST', v: best.assists },
                    { l: 'REB', v: best.rebounds },
                    { l: 'STL', v: best.steals },
                    { l: 'BLK', v: best.blocks },
                    { l: 'TO',  v: best.turnovers },
                    { l: 'FG%', v: `${pct(best.fg_made, best.fg_attempted)}%` },
                    { l: '3%',  v: `${pct(best.three_made, best.three_attempted)}%` },
                  ].map(s => (
                    <div key={s.l}>
                      <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>{s.v}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{s.l}</div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* ── Weakest skill ── */}
            {weakest && (
              <Card style={{ marginBottom: 16, borderColor: 'rgba(245,166,35,0.25)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <StarIcon size={16} color="#F5A623" />
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#F5A623' }}>Focus Area: {weakest.name}</p>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                      Your {weakest.name} is {fmt(weakest.val)}% — lowest of your shooting categories. Put in extra reps here.
                    </p>
                  </div>
                </div>
              </Card>
            )}

            {/* ── Trend charts ── */}
            {chartSessions.length >= 3 && (
              <Card style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <TrendingIcon size={16} color="var(--text-secondary)" />
                  <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Trends</p>
                </div>
                <TrendChart data={fgTrend}   dataKey="fg"    label="FG% trend"   color="var(--accent)" />
                <TrendChart data={threeTrend} dataKey="three" label="3PT% trend"  color="#9B59B6" />
                <TrendChart data={ftTrend}   dataKey="ft"    label="FT% trend"   color="#27AE60" />

                {/* Shot volume bar chart */}
                <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Shots per Session</p>
                <ResponsiveContainer width="100%" height={100}>
                  <BarChart data={shotVolume} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="label" tick={{ fontSize: 9, fill: '#888' }} />
                    <YAxis tick={{ fontSize: 9, fill: '#888' }} />
                    <Tooltip
                      contentStyle={{ background: '#1a1a2e', border: '1px solid #333', borderRadius: 8, fontSize: 11 }}
                      formatter={(v: number) => [v, 'FGA']}
                    />
                    <Bar dataKey="shots" radius={[3, 3, 0, 0]}>
                      {shotVolume.map((_, i) => (
                        <Cell key={i} fill={i === shotVolume.length - 1 ? 'var(--accent)' : 'rgba(233,69,96,0.4)'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            )}

            {/* ── Session history ── */}
            <Card>
              <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>Session History</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {sessions.map(s => (
                  <div key={s.id} style={{
                    padding: '12px 14px', borderRadius: 10,
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid var(--border-faint)',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatDate(s.date)}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--accent)' }}>{s.points} PTS</span>
                        <button onClick={() => setEditing(s)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, opacity: 0.5 }}>
                          <EditIcon size={14} color="var(--text-muted)" />
                        </button>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      {[
                        { l: 'AST', v: s.assists },
                        { l: 'REB', v: s.rebounds },
                        { l: 'STL', v: s.steals },
                        { l: 'BLK', v: s.blocks },
                        { l: 'TO',  v: s.turnovers },
                        { l: 'FG%', v: `${pct(s.fg_made, s.fg_attempted)}%` },
                        { l: '3%',  v: `${pct(s.three_made, s.three_attempted)}%` },
                        { l: 'FT%', v: `${pct(s.ft_made, s.ft_attempted)}%` },
                      ].map(stat => (
                        <div key={stat.l} style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{stat.v}</div>
                          <div style={{ fontSize: 9, color: 'var(--text-dim)', textTransform: 'uppercase' }}>{stat.l}</div>
                        </div>
                      ))}
                    </div>
                    {s.notes && (
                      <p style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 6, fontStyle: 'italic' }}>"{s.notes}"</p>
                    )}
                  </div>
                ))}
              </div>
            </Card>
            {editing && <EditBbModal session={editing} onClose={() => setEditing(null)} onSaved={load} />}
          </>
        )}
      </PageWrapper>
    </>
  )
}
