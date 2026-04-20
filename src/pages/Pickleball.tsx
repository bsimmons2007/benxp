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
import { EditIcon, TrophyIcon } from '../components/ui/Icon'
import { usePageTitle } from '../hooks/usePageTitle'

const XP_PER_GAME = 15
const XP_WIN_BONUS = 20

const ACCENT = '#22c55e'

interface PickleballGame {
  id: string
  created_at: string
  date: string
  win: boolean
  my_score: number | null
  opp_score: number | null
  game_type: string
  opponent: string | null
  notes: string | null
}

// ── Log panel ─────────────────────────────────────────────────────

interface PbForm {
  date: string
  game_type: string
  my_score: string
  opp_score: string
  opponent: string
  notes: string
}

function LogPickleballPanel({ onLogged }: { onLogged: () => void }) {
  const [open,  setOpen]  = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [isWin, setIsWin] = useState(true)
  const refreshXP       = useStore(s => s.refreshXP)
  const refreshActivity = useStore(s => s.refreshActivity)
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<PbForm>({
    defaultValues: { date: today(), game_type: 'Singles', my_score: '', opp_score: '', opponent: '', notes: '' },
  })

  const onSubmit = async (data: PbForm) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('pickleball_games').insert({
      user_id:   user.id,
      date:      data.date,
      win:       isWin,
      my_score:  data.my_score  ? parseInt(data.my_score)  : null,
      opp_score: data.opp_score ? parseInt(data.opp_score) : null,
      game_type: data.game_type,
      opponent:  data.opponent  || null,
      notes:     data.notes     || null,
    })
    const xp = XP_PER_GAME + (isWin ? XP_WIN_BONUS : 0)
    if (isWin) { playPR(); setToast(`+${xp} XP — Dink master!`) }
    else        { playXPGain(); setToast(`+${xp} XP — Keep grinding!`) }
    await refreshXP()
    refreshActivity()
    reset({ date: today(), game_type: 'Singles', my_score: '', opp_score: '', opponent: '', notes: '' })
    setOpen(false)
    onLogged()
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

            {/* Game type */}
            <div className="flex flex-col gap-1">
              <label className="text-base font-medium" style={{ color: '#AAAAAA', fontFamily: 'Cormorant Garamond, serif' }}>Game Type</label>
              <select {...register('game_type')} className="px-3 py-2 rounded-lg text-white outline-none" style={{ background: '#0D1B2A', border: '1px solid rgba(255,255,255,0.1)' }}>
                <option>Singles</option>
                <option>Doubles</option>
              </select>
            </div>

            {/* Score */}
            <div className="flex gap-3">
              <Input label="My Score"  type="number" placeholder="11" className="flex-1" {...register('my_score')} />
              <Input label="Opp Score" type="number" placeholder="9"  className="flex-1" {...register('opp_score')} />
            </div>

            <Input label="Opponent (optional)" type="text" placeholder="John" {...register('opponent')} />
            <Input label="Notes (optional)"    type="text" placeholder="Great drop shots"  {...register('notes')} />

            {/* Win toggle */}
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => setIsWin(w => !w)}>
              <div className="w-12 h-6 rounded-full transition-colors relative" style={{ background: isWin ? ACCENT : 'rgba(255,255,255,0.15)' }}>
                <div className="absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform" style={{ transform: isWin ? 'translateX(26px)' : 'translateX(2px)' }} />
              </div>
              <span className="font-semibold" style={{ color: isWin ? ACCENT : '#888', fontFamily: 'Cinzel, serif', fontSize: 13 }}>
                {isWin
                  ? <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><TrophyIcon size={14} color={ACCENT} /> Win</span>
                  : 'Loss'}
              </span>
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

function EditPickleballModal({ game, onClose, onSaved }: { game: PickleballGame; onClose: () => void; onSaved: () => void }) {
  const [myScore,  setMyScore]  = useState(String(game.my_score  ?? ''))
  const [oppScore, setOppScore] = useState(String(game.opp_score ?? ''))
  const [win,      setWin]      = useState(game.win)
  const [saving,   setSaving]   = useState(false)

  async function save() {
    setSaving(true)
    await supabase.from('pickleball_games').update({
      my_score:  myScore  ? parseInt(myScore)  : null,
      opp_score: oppScore ? parseInt(oppScore) : null,
      win,
    }).eq('id', game.id)
    setSaving(false); onSaved(); onClose()
  }
  async function del() {
    await supabase.from('pickleball_games').delete().eq('id', game.id)
    onSaved(); onClose()
  }

  return (
    <EditModal title={`Edit — ${formatDate(game.date)}`} onClose={onClose} onDelete={del} onSave={save} saving={saving}>
      <div className="flex flex-col gap-4">
        <div className="flex gap-3">
          <div className="flex flex-col gap-1 flex-1">
            <label className="text-base font-medium" style={{ color: '#AAAAAA', fontFamily: 'Cormorant Garamond, serif' }}>My Score</label>
            <input type="number" value={myScore} onChange={e => setMyScore(e.target.value)} className="px-3 py-3 rounded-lg text-white outline-none text-base" style={{ background: '#0D1B2A', border: '1px solid rgba(255,255,255,0.1)' }} />
          </div>
          <div className="flex flex-col gap-1 flex-1">
            <label className="text-base font-medium" style={{ color: '#AAAAAA', fontFamily: 'Cormorant Garamond, serif' }}>Opp Score</label>
            <input type="number" value={oppScore} onChange={e => setOppScore(e.target.value)} className="px-3 py-3 rounded-lg text-white outline-none text-base" style={{ background: '#0D1B2A', border: '1px solid rgba(255,255,255,0.1)' }} />
          </div>
        </div>
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setWin(w => !w)}>
          <div className="w-12 h-6 rounded-full transition-colors relative" style={{ background: win ? ACCENT : 'rgba(255,255,255,0.15)' }}>
            <div className="absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform" style={{ transform: win ? 'translateX(26px)' : 'translateX(2px)' }} />
          </div>
          <span className="font-medium text-white">Win</span>
        </div>
      </div>
    </EditModal>
  )
}

// ── Main page ─────────────────────────────────────────────────────

const ttStyle = { background: 'rgba(10,10,22,0.97)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, color: '#fff', fontSize: 12 }

export function Pickleball() {
  usePageTitle('Pickleball')
  const [games,   setGames]   = useState<PickleballGame[]>([])
  const [editing, setEditing] = useState<PickleballGame | null>(null)

  async function load() {
    const { data } = await supabase.from('pickleball_games').select('*').order('date', { ascending: false })
    setGames(data ?? [])
  }
  useEffect(() => { load() }, [])

  const wins     = games.filter(g => g.win).length
  const losses   = games.length - wins
  const winRate  = games.length ? Math.round((wins / games.length) * 100) : 0
  const streak   = (() => {
    let s = 0
    for (const g of games) { if (g.win) s++; else break }
    return s
  })()

  // Monthly win/loss bar data
  const monthMap: Record<string, { wins: number; losses: number }> = {}
  games.forEach(g => {
    const k = g.date.slice(0, 7)
    if (!monthMap[k]) monthMap[k] = { wins: 0, losses: 0 }
    if (g.win) monthMap[k].wins++; else monthMap[k].losses++
  })
  const monthData = Object.entries(monthMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([month, d]) => ({ month: month.slice(5), ...d }))

  return (
    <>
      <TopBar title="Pickleball" back />
      <PageWrapper>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          {[
            { label: 'Wins',     value: wins },
            { label: 'Win Rate', value: games.length ? `${winRate}%` : '—' },
            { label: 'Streak',   value: streak || '—' },
          ].map(s => (
            <div key={s.label} className="rounded-xl p-3 text-center card-animate" style={{ background: 'var(--card-bg)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <p className="text-xl font-bold" style={{ color: ACCENT, fontFamily: 'Cinzel, serif' }}>{s.value}</p>
              <p className="text-xs mt-0.5" style={{ color: '#888', fontFamily: 'Cormorant Garamond, serif' }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* W/L row */}
        <div className="rounded-xl px-4 py-3 mb-4 flex items-center justify-between" style={{ background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.2)' }}>
          <span style={{ fontSize: 13, color: '#888' }}>{games.length} games</span>
          <div className="flex items-center gap-4">
            <span style={{ fontSize: 14, fontWeight: 700, color: ACCENT }}>{wins}W</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#f87171' }}>{losses}L</span>
          </div>
        </div>

        <LogPickleballPanel onLogged={load} />

        {/* Monthly chart */}
        {monthData.length >= 2 && (
          <div className="rounded-xl p-4 mb-4" style={{ background: 'var(--card-bg)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <p className="font-bold text-white mb-3" style={{ fontFamily: 'Cinzel, serif', fontSize: 15 }}>Monthly Record</p>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={monthData} barGap={4}>
                <CartesianGrid strokeDasharray="3 6" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: '#666', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fill: '#666', fontSize: 9 }} axisLine={false} tickLine={false} width={20} />
                <Tooltip contentStyle={ttStyle} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                <Bar dataKey="wins" name="Wins" fill={ACCENT} fillOpacity={0.85} radius={[4, 4, 0, 0]} />
                <Bar dataKey="losses" name="Losses" fill="#f87171" fillOpacity={0.7} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* History */}
        {games.length > 0 && (
          <p className="section-label mb-3">History</p>
        )}
        {games.map(game => (
          <div
            key={game.id}
            className="flex items-center justify-between px-4 py-3 rounded-xl mb-2 card-animate"
            style={{ background: 'rgba(16,24,52,0.65)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div className="flex items-center gap-3">
              <div style={{
                width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                background: game.win ? `${ACCENT}20` : 'rgba(248,113,113,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16,
              }}>
                {game.win ? '🏆' : '🎾'}
              </div>
              <div>
                <p style={{ color: 'var(--text-primary)', fontSize: 13, fontWeight: 600 }}>
                  {formatDate(game.date)}
                  <span style={{ marginLeft: 8, fontSize: 11, color: '#666' }}>{game.game_type}</span>
                </p>
                {game.opponent && (
                  <p style={{ fontSize: 11, color: '#555', marginTop: 1 }}>vs {game.opponent}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div style={{ textAlign: 'right' }}>
                {(game.my_score != null && game.opp_score != null) && (
                  <p style={{ fontSize: 16, fontWeight: 800, color: game.win ? ACCENT : '#f87171', fontFamily: 'Cinzel, serif' }}>
                    {game.my_score}–{game.opp_score}
                  </p>
                )}
                <p style={{ fontSize: 11, color: game.win ? ACCENT : '#f87171', fontWeight: 600 }}>
                  {game.win ? 'Win' : 'Loss'}
                </p>
              </div>
              <button
                onClick={() => setEditing(game)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: 'none', cursor: 'pointer' }}
              >
                <EditIcon size={13} color="var(--text-muted)" />
              </button>
            </div>
          </div>
        ))}

        {games.length === 0 && (
          <EmptyState
            icon={<span style={{ fontSize: 64 }}>🏓</span>}
            title="No games logged yet"
            sub="Log your first pickleball game to start tracking wins and streaks."
          />
        )}

        {editing && <EditPickleballModal game={editing} onClose={() => setEditing(null)} onSaved={load} />}
      </PageWrapper>
    </>
  )
}
