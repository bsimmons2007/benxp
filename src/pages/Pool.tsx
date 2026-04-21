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
import { supabase } from '../lib/supabase'
import { today, formatDate } from '../lib/utils'
import { useStore } from '../store/useStore'
import { playXPGain, playPR } from '../lib/sounds'
import { XP_RATES } from '../lib/xp'
import { PoolIcon, TrophyIcon, EditIcon } from '../components/ui/Icon'
import { usePageTitle } from '../hooks/usePageTitle'
import type { PoolGame } from '../types'

const ACCENT = '#c084fc'
const GAME_TYPES = ['8-Ball', '9-Ball', '10-Ball', 'Straight Pool', 'One Pocket', 'Bank Pool']

// ── Log form ──────────────────────────────────────────────────────

interface PoolForm {
  date: string
  game_type: string
  opponent: string
  run_count: string
  notes: string
}

function LogPoolPanel({ onLogged }: { onLogged: () => void }) {
  const [open,        setOpen]        = useState(false)
  const [toast,       setToast]       = useState<string | null>(null)
  const [isWin,       setIsWin]       = useState(true)
  const [breakAndRun, setBreakAndRun] = useState(false)
  const refreshXP       = useStore(s => s.refreshXP)
  const refreshActivity = useStore(s => s.refreshActivity)
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<PoolForm>({
    defaultValues: { date: today(), game_type: '8-Ball', opponent: '', run_count: '', notes: '' },
  })

  const onSubmit = async (data: PoolForm) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('pool_games').insert({
      user_id:       user.id,
      date:          data.date,
      win:           isWin,
      game_type:     data.game_type,
      opponent:      data.opponent   || null,
      run_count:     data.run_count  ? parseInt(data.run_count) : null,
      break_and_run: breakAndRun,
      notes:         data.notes      || null,
    })
    const xp = XP_RATES.pool_game
      + (isWin       ? XP_RATES.pool_win           : 0)
      + (breakAndRun ? XP_RATES.pool_break_and_run : 0)
    if (isWin) { playPR();     setToast(`+${xp} XP — 🎱 Rack 'em!`) }
    else        { playXPGain(); setToast(`+${xp} XP — Keep shooting!`) }
    await refreshXP(); refreshActivity()
    reset({ date: today(), game_type: '8-Ball', opponent: '', run_count: '', notes: '' })
    setIsWin(true); setBreakAndRun(false); setOpen(false); onLogged()
  }

  return (
    <div className="mb-5">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all"
        style={{ background: open ? ACCENT : 'rgba(255,255,255,0.05)', color: open ? '#0d0d1a' : ACCENT, border: `1px solid ${ACCENT}`, fontSize: 15 }}
      >
        {open ? '✕ Cancel' : '+ Log Game'}
      </button>
      {open && (
        <div className="mt-3 rounded-xl p-4 pop-in" style={{ background: 'rgba(16,24,52,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <Input label="Date" type="date" {...register('date', { required: true })} />

            <div className="flex flex-col gap-1">
              <label className="section-label">Game Type</label>
              <select {...register('game_type')} className="px-3 py-2.5 rounded-lg text-white outline-none" style={{ background: 'var(--input-bg)', border: '1px solid var(--border)' }}>
                {GAME_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>

            <Input label="Opponent (optional)" type="text" placeholder="Name…"    {...register('opponent')} />
            <Input label="Run Count (optional)" type="number" placeholder="e.g. 5" {...register('run_count')} />
            <Input label="Notes (optional)"    type="text" placeholder="Location, table…" {...register('notes')} />

            {/* Win toggle */}
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => setIsWin(w => !w)}>
              <div className="w-12 h-6 rounded-full transition-colors relative" style={{ background: isWin ? ACCENT : 'rgba(255,255,255,0.15)' }}>
                <div className="absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform" style={{ transform: isWin ? 'translateX(26px)' : 'translateX(2px)' }} />
              </div>
              <span className="font-semibold" style={{ color: isWin ? ACCENT : '#888', fontSize: 13 }}>
                {isWin ? <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><TrophyIcon size={14} color={ACCENT} /> Win</span> : 'Loss'}
              </span>
            </div>

            {/* Break & run toggle */}
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => setBreakAndRun(b => !b)}>
              <div className="w-12 h-6 rounded-full transition-colors relative" style={{ background: breakAndRun ? '#fbbf24' : 'rgba(255,255,255,0.15)' }}>
                <div className="absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform" style={{ transform: breakAndRun ? 'translateX(26px)' : 'translateX(2px)' }} />
              </div>
              <div>
                <span className="font-semibold" style={{ color: breakAndRun ? '#fbbf24' : '#888', fontSize: 13 }}>Break & Run</span>
                {breakAndRun && <span style={{ fontSize: 11, color: '#fbbf24', marginLeft: 6 }}>+{XP_RATES.pool_break_and_run} XP</span>}
              </div>
            </div>

            <Button type="submit" fullWidth disabled={isSubmitting}>{isSubmitting ? 'Logging...' : 'Log Game'}</Button>
          </form>
        </div>
      )}
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  )
}

// ── Edit modal ────────────────────────────────────────────────────

function EditPoolModal({ game, onClose, onSaved }: { game: PoolGame; onClose: () => void; onSaved: () => void }) {
  const [win,         setWin]         = useState(game.win)
  const [breakAndRun, setBreakAndRun] = useState(game.break_and_run)
  const [runCount,    setRunCount]    = useState(String(game.run_count ?? ''))
  const [saving,      setSaving]      = useState(false)

  async function save() {
    setSaving(true)
    await supabase.from('pool_games').update({
      win, break_and_run: breakAndRun,
      run_count: runCount ? parseInt(runCount) : null,
    }).eq('id', game.id)
    setSaving(false); onSaved(); onClose()
  }
  async function del() {
    await supabase.from('pool_games').delete().eq('id', game.id)
    onSaved(); onClose()
  }

  return (
    <EditModal title={`Edit — ${formatDate(game.date)}`} onClose={onClose} onDelete={del} onSave={save} saving={saving}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label className="section-label">Run Count</label>
          <input type="number" value={runCount} onChange={e => setRunCount(e.target.value)} className="px-3 py-2.5 rounded-xl outline-none w-full text-sm" style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
        </div>
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setWin(w => !w)}>
          <div className="w-12 h-6 rounded-full transition-colors relative" style={{ background: win ? ACCENT : 'rgba(255,255,255,0.15)' }}>
            <div className="absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform" style={{ transform: win ? 'translateX(26px)' : 'translateX(2px)' }} />
          </div>
          <span className="font-medium text-white">Win</span>
        </div>
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setBreakAndRun(b => !b)}>
          <div className="w-12 h-6 rounded-full transition-colors relative" style={{ background: breakAndRun ? '#fbbf24' : 'rgba(255,255,255,0.15)' }}>
            <div className="absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform" style={{ transform: breakAndRun ? 'translateX(26px)' : 'translateX(2px)' }} />
          </div>
          <span className="font-medium" style={{ color: breakAndRun ? '#fbbf24' : 'var(--text-muted)' }}>Break &amp; Run</span>
        </div>
      </div>
    </EditModal>
  )
}

// ── Main page ─────────────────────────────────────────────────────

const ttStyle = { background: 'rgba(10,10,22,0.97)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, color: '#fff', fontSize: 12 }

export function Pool() {
  usePageTitle('Pool')
  const [games,   setGames]   = useState<PoolGame[]>([])
  const [editing, setEditing] = useState<PoolGame | null>(null)

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('pool_games').select('*').eq('user_id', user.id).order('date', { ascending: false })
    setGames(data ?? [])
  }
  useEffect(() => { load() }, [])

  const wins        = games.filter(g => g.win).length
  const losses      = games.length - wins
  const winRate     = games.length ? Math.round((wins / games.length) * 100) : 0
  const breakAndRuns = games.filter(g => g.break_and_run).length
  const streak      = (() => { let s = 0; for (const g of games) { if (g.win) s++; else break } return s })()

  // Monthly W/L chart
  const monthMap: Record<string, { wins: number; losses: number }> = {}
  games.forEach(g => {
    const k = g.date.slice(0, 7)
    if (!monthMap[k]) monthMap[k] = { wins: 0, losses: 0 }
    if (g.win) monthMap[k].wins++; else monthMap[k].losses++
  })
  const chartData = Object.entries(monthMap)
    .sort(([a], [b]) => a.localeCompare(b)).slice(-6)
    .map(([month, d]) => ({ month: month.slice(5), ...d }))

  return (
    <>
      <TopBar title="Pool" back />
      <PageWrapper>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          {[
            { label: 'Wins',         value: wins },
            { label: 'Win Rate',     value: games.length ? `${winRate}%` : '—' },
            { label: 'Win Streak',   value: streak || '—' },
            { label: 'Break & Runs', value: breakAndRuns || '—' },
          ].map(s => (
            <div key={s.label} className="rounded-xl p-3 text-center" style={{ background: 'var(--card-bg)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <p className="text-xl font-bold" style={{ color: ACCENT, fontFamily: 'Cinzel, serif' }}>{s.value}</p>
              <p className="text-xs mt-0.5 section-label">{s.label}</p>
            </div>
          ))}
        </div>

        {games.length > 0 && (
          <div className="rounded-xl px-4 py-3 mb-4 flex items-center justify-between" style={{ background: `${ACCENT}10`, border: `1px solid ${ACCENT}30` }}>
            <span style={{ fontSize: 13, color: '#888' }}>{games.length} games</span>
            <div className="flex items-center gap-4">
              <span style={{ fontSize: 14, fontWeight: 700, color: ACCENT }}>{wins}W</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#f87171' }}>{losses}L</span>
            </div>
          </div>
        )}

        <LogPoolPanel onLogged={load} />

        {chartData.length >= 2 && (
          <div className="rounded-xl p-4 mb-4" style={{ background: 'var(--card-bg)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <p className="font-bold text-white mb-3" style={{ fontFamily: 'Cinzel, serif', fontSize: 15 }}>Monthly Record</p>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={chartData} barGap={4}>
                <CartesianGrid strokeDasharray="3 6" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: '#666', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fill: '#666', fontSize: 9 }} axisLine={false} tickLine={false} width={20} />
                <Tooltip contentStyle={ttStyle} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                <Bar dataKey="wins"   name="Wins"   fill={ACCENT}   fillOpacity={0.85} radius={[4, 4, 0, 0]} />
                <Bar dataKey="losses" name="Losses" fill="#f87171"  fillOpacity={0.7}  radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {games.length > 0 && <p className="section-label mb-3">History</p>}
        {games.map(g => (
          <div key={g.id} className="flex items-center justify-between px-4 py-3 rounded-xl mb-2" style={{ background: 'rgba(16,24,52,0.65)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-3">
              <div style={{
                width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                background: g.win ? `${ACCENT}20` : 'rgba(248,113,113,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {g.win
                  ? <TrophyIcon size={16} color={ACCENT} />
                  : <PoolIcon size={16} color="#555" />}
              </div>
              <div>
                <p style={{ color: 'var(--text-primary)', fontSize: 13, fontWeight: 600 }}>
                  {formatDate(g.date)}
                  <span style={{ marginLeft: 8, fontSize: 11, color: '#666' }}>{g.game_type}</span>
                </p>
                {g.break_and_run && (
                  <p style={{ fontSize: 10, color: '#fbbf24', marginTop: 1, fontWeight: 600 }}>✨ Break &amp; Run</p>
                )}
                {g.opponent && !g.break_and_run && (
                  <p style={{ fontSize: 11, color: '#555', marginTop: 1 }}>vs {g.opponent}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <p style={{ fontSize: 11, fontWeight: 600, color: g.win ? ACCENT : '#f87171' }}>
                {g.win ? 'Win' : 'Loss'}
              </p>
              <button onClick={() => setEditing(g)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: 'none', cursor: 'pointer' }}>
                <EditIcon size={13} color="var(--text-muted)" />
              </button>
            </div>
          </div>
        ))}

        {games.length === 0 && (
          <EmptyState
            icon={<PoolIcon size={56} color="var(--text-muted)" />}
            title="No games logged yet"
            sub="Log your first pool game to start tracking wins and break & runs."
          />
        )}

        {editing && <EditPoolModal game={editing} onClose={() => setEditing(null)} onSaved={load} />}
      </PageWrapper>
    </>
  )
}
