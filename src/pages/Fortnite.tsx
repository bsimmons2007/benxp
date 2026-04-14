import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ReferenceLine, BarChart, Bar, Cell, CartesianGrid,
} from 'recharts'
import { TopBar } from '../components/layout/TopBar'
import { PageWrapper } from '../components/layout/PageWrapper'
import { EditModal } from '../components/ui/EditModal'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { Toast } from '../components/ui/Toast'
import { supabase } from '../lib/supabase'
import { today, formatDate } from '../lib/utils'
import { XP_RATES } from '../lib/xp'
import { useStore } from '../store/useStore'
import { playXPGain, playPR } from '../lib/sounds'
import type { FortniteGame } from '../types'
import { TrophyIcon, StarIcon, EditIcon } from '../components/ui/Icon'

// ── Log panel ─────────────────────────────────────────────────────

const FN_RANKS = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Elite', 'Champion', 'Unreal'] as const
type FnRank = typeof FN_RANKS[number]

interface FnForm {
  date: string
  mode: 'Solos' | 'Duos' | 'Squads'
  season: string
  placement: string
  kills: string
  accuracy: string
}

const RANK_COLORS: Record<FnRank, string> = {
  Bronze: '#cd7f32', Silver: '#a8a9ad', Gold: '#ffd700',
  Platinum: '#66d9e8', Diamond: '#5c85d6', Elite: '#9b59b6',
  Champion: '#e74c3c', Unreal: '#f5a623',
}

function LogFortnitePanel({ onLogged }: { onLogged: () => void }) {
  const [open,     setOpen]     = useState(false)
  const [toast,    setToast]    = useState<string | null>(null)
  const [isWin,    setIsWin]    = useState(true)
  const [isRanked, setIsRanked] = useState(false)
  const [rankName, setRankName] = useState<FnRank>('Gold')
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<FnForm>({
    defaultValues: { date: today(), mode: 'Solos', season: '', placement: '', kills: '', accuracy: '' },
  })
  const refreshXP       = useStore((s) => s.refreshXP)
  const refreshActivity = useStore((s) => s.refreshActivity)

  const onSubmit = async (data: FnForm) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('fortnite_games').insert({
      user_id: user.id,
      date: data.date,
      mode: data.mode,
      season: data.season || null,
      placement: data.placement ? parseInt(data.placement) : null,
      kills: parseInt(data.kills) || 0,
      accuracy: data.accuracy ? parseFloat(data.accuracy) : null,
      win: isWin,
      is_ranked: isRanked,
      rank_name: isRanked ? rankName : null,
    })
    if (isWin) {
      playPR()
      setToast(`+${XP_RATES.fortnite_win} XP — Victory Royale!${isRanked ? ` (Ranked ${rankName})` : ''}`)
    } else {
      playXPGain()
      setToast(`Game logged — keep grinding!`)
    }
    await refreshXP()
    refreshActivity()
    reset({ date: today(), mode: 'Solos', season: '', placement: '', kills: '', accuracy: '' })
    setOpen(false)
    onLogged()
  }

  return (
    <div className="mb-5">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all"
        style={{ background: open ? 'var(--accent)' : 'rgba(255,255,255,0.05)', color: open ? 'var(--base-bg)' : 'var(--accent)', border: '1px solid var(--accent)', fontSize: 15 }}
      >
        {open ? '✕ Cancel' : '+ Log Game'}
      </button>
      {open && (
        <div className="mt-3 rounded-xl p-4 pop-in" style={{ background: 'rgba(16,24,52,0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <Input label="Date" type="date" {...register('date', { required: true })} />
            <div className="flex flex-col gap-1">
              <label className="text-base font-medium" style={{ color: '#AAAAAA', fontFamily: 'Cormorant Garamond, serif' }}>Mode</label>
              <select {...register('mode')} className="px-3 py-2 rounded-lg text-white outline-none" style={{ background: '#0D1B2A', border: '1px solid rgba(255,255,255,0.1)' }}>
                <option>Solos</option><option>Duos</option><option>Squads</option>
              </select>
            </div>
            <Input label="Season" type="text" placeholder="Chapter 6 S2" {...register('season')} />
            <div className="flex gap-3">
              <Input label="Placement" type="number" placeholder="1" className="flex-1" {...register('placement')} />
              <Input label="Kills"     type="number" placeholder="0" className="flex-1" {...register('kills')} />
            </div>
            <Input label="Accuracy %" type="number" step="0.1" placeholder="24.5" {...register('accuracy')} />

            {/* Win toggle */}
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => setIsWin(w => !w)}>
              <div className="w-12 h-6 rounded-full transition-colors relative" style={{ background: isWin ? '#F5A623' : 'rgba(255,255,255,0.15)' }}>
                <div className="absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform" style={{ transform: isWin ? 'translateX(26px)' : 'translateX(2px)' }} />
              </div>
              <span className="font-semibold" style={{ color: isWin ? 'var(--accent)' : '#888', fontFamily: 'Cinzel, serif', fontSize: 13 }}>
                {isWin ? <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><TrophyIcon size={14} color="var(--accent)" /> Victory Royale</span> : 'No win'}
              </span>
            </div>

            {/* Ranked toggle */}
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => setIsRanked(r => !r)}>
              <div className="w-12 h-6 rounded-full transition-colors relative" style={{ background: isRanked ? '#5c85d6' : 'rgba(255,255,255,0.15)' }}>
                <div className="absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform" style={{ transform: isRanked ? 'translateX(26px)' : 'translateX(2px)' }} />
              </div>
              <span className="font-semibold" style={{ color: isRanked ? '#5c85d6' : '#888', fontFamily: 'Cinzel, serif', fontSize: 13 }}>
                {isRanked ? <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><StarIcon size={14} color="#5c85d6" /> Ranked Match</span> : 'Casual / Pubs'}
              </span>
            </div>

            {/* Rank selector — only shown when ranked */}
            {isRanked && (
              <div className="pop-in flex flex-col gap-2">
                <label className="text-sm font-medium" style={{ color: '#AAAAAA', fontFamily: 'Cormorant Garamond, serif' }}>Current Rank</label>
                <div className="flex flex-wrap gap-2">
                  {FN_RANKS.map(r => (
                    <button
                      key={r} type="button"
                      onClick={() => setRankName(r)}
                      style={{
                        padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                        background: rankName === r ? `${RANK_COLORS[r]}22` : 'rgba(255,255,255,0.04)',
                        border: `1.5px solid ${rankName === r ? RANK_COLORS[r] : 'rgba(255,255,255,0.1)'}`,
                        color: rankName === r ? RANK_COLORS[r] : '#666',
                        cursor: 'pointer', transition: 'all 0.12s ease',
                      }}
                    >{r}</button>
                  ))}
                </div>
              </div>
            )}

            <Button type="submit" fullWidth disabled={isSubmitting}>{isSubmitting ? 'Logging...' : 'Log Game'}</Button>
          </form>
        </div>
      )}
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  )
}

// ── Edit modal ────────────────────────────────────────────────────

function EditFortniteModal({ game, onClose, onSaved }: { game: FortniteGame; onClose: () => void; onSaved: () => void }) {
  const [kills, setKills] = useState(String(game.kills))
  const [placement, setPlacement] = useState(String(game.placement ?? ''))
  const [accuracy, setAccuracy] = useState(String(game.accuracy ?? ''))
  const [win, setWin] = useState(game.win)
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    await supabase.from('fortnite_games').update({
      kills: parseInt(kills) || 0,
      placement: placement ? parseInt(placement) : null,
      accuracy: accuracy ? parseFloat(accuracy) : null,
      win,
    }).eq('id', game.id)
    setSaving(false); onSaved(); onClose()
  }

  async function del() {
    await supabase.from('fortnite_games').delete().eq('id', game.id)
    onSaved(); onClose()
  }

  return (
    <EditModal title={`Edit — ${formatDate(game.date)}`} onClose={onClose} onDelete={del} onSave={save} saving={saving}>
      <div className="flex flex-col gap-4">
        <div className="flex gap-3">
          <div className="flex flex-col gap-1 flex-1">
            <label className="text-base font-medium" style={{ color: '#AAAAAA', fontFamily: 'Cormorant Garamond, serif' }}>Kills</label>
            <input type="number" value={kills} onChange={e => setKills(e.target.value)} className="px-3 py-3 rounded-lg text-white outline-none text-base" style={{ background: '#0D1B2A', border: '1px solid rgba(255,255,255,0.1)' }} />
          </div>
          <div className="flex flex-col gap-1 flex-1">
            <label className="text-base font-medium" style={{ color: '#AAAAAA', fontFamily: 'Cormorant Garamond, serif' }}>Placement</label>
            <input type="number" value={placement} onChange={e => setPlacement(e.target.value)} className="px-3 py-3 rounded-lg text-white outline-none text-base" style={{ background: '#0D1B2A', border: '1px solid rgba(255,255,255,0.1)' }} />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-base font-medium" style={{ color: '#AAAAAA', fontFamily: 'Cormorant Garamond, serif' }}>Accuracy %</label>
          <input type="number" step="0.1" value={accuracy} onChange={e => setAccuracy(e.target.value)} className="px-3 py-3 rounded-lg text-white outline-none text-base" style={{ background: '#0D1B2A', border: '1px solid rgba(255,255,255,0.1)' }} />
        </div>
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setWin(w => !w)}>
          <div className="w-12 h-6 rounded-full transition-colors relative" style={{ background: win ? '#27AE60' : 'rgba(255,255,255,0.15)' }}>
            <div className="absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform" style={{ transform: win ? 'translateX(26px)' : 'translateX(2px)' }} />
          </div>
          <span className="font-medium text-white">Win</span>
        </div>
      </div>
    </EditModal>
  )
}

// ── Chart helpers ─────────────────────────────────────────────────

function buildMonthlyWins(games: FortniteGame[]) {
  const map: Record<string, number> = {}
  games.forEach(g => {
    const k = g.date.slice(0, 7)
    if (!map[k]) map[k] = 0
    if (g.win) map[k]++
  })
  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-8)
    .map(([month, wins]) => ({ month: month.slice(5), wins }))
}

function buildCumulativeWins(games: FortniteGame[]) {
  let count = 0
  return [...games]
    .sort((a, b) => a.date.localeCompare(b.date))
    .filter(g => g.win)
    .map(g => ({ date: g.date, wins: ++count }))
}

// ── Main page ─────────────────────────────────────────────────────

export function Fortnite() {
  const [games, setGames] = useState<FortniteGame[]>([])
  const [editing, setEditing] = useState<FortniteGame | null>(null)

  async function load() {
    const { data } = await supabase.from('fortnite_games').select('*').order('date', { ascending: false })
    setGames(data ?? [])
  }
  useEffect(() => { load() }, [])

  const sorted = [...games].sort((a, b) => a.date.localeCompare(b.date))
  const wins = games.filter(g => g.win).length
  const avgKills = games.length
    ? Math.round((games.reduce((s, g) => s + g.kills, 0) / games.length) * 10) / 10
    : 0
  const bestKills = games.length ? Math.max(...games.map(g => g.kills)) : 0

  const monthlyWins = buildMonthlyWins(sorted)
  const cumulativeWins = buildCumulativeWins(games)
  const killsData = sorted.map(g => ({ date: g.date, kills: g.kills }))
  const accuracyData = sorted.filter(g => g.accuracy != null).map(g => ({ date: g.date, accuracy: g.accuracy }))

  const ttStyle  = { background: 'rgba(10,10,22,0.97)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, color: '#fff', fontSize: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }
  const lblStyle = { color: '#aaa' }
  const itmStyle = { color: '#fff' }
  const maxMonthlyWins = monthlyWins.length ? Math.max(...monthlyWins.map(d => d.wins)) : 1

  return (
    <>
      <TopBar title="Fortnite" />
      <PageWrapper>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mb-5">
          {[
            { label: 'Wins',      value: wins },
            { label: 'Best Game', value: bestKills ? `${bestKills}K` : '—' },
            { label: 'Avg Kills', value: games.length ? avgKills : '—' },
          ].map(s => (
            <div key={s.label} className="rounded-xl p-3 text-center card-animate" style={{ background: 'var(--card-bg)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <p className="text-xl font-bold" style={{ color: 'var(--accent)', fontFamily: 'Cinzel, serif' }}>{s.value}</p>
              <p className="text-xs mt-0.5" style={{ color: '#888', fontFamily: 'Cormorant Garamond, serif' }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Log button */}
        <LogFortnitePanel onLogged={load} />

        {/* Cumulative wins */}
        {cumulativeWins.length >= 2 && (
          <div className="rounded-xl p-4 mb-4" style={{ background: 'var(--card-bg)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <p className="font-bold text-white mb-3" style={{ fontFamily: 'Cinzel, serif', fontSize: 15 }}>Cumulative Wins</p>
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={cumulativeWins} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="fn-wins-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.32} />
                    <stop offset="100%" stopColor="var(--accent)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 6" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="date" tickFormatter={(d: string) => formatDate(d)} tick={{ fill: '#666', fontSize: 9 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#666', fontSize: 9 }} axisLine={false} tickLine={false} width={25} />
                <Tooltip contentStyle={ttStyle} labelStyle={lblStyle} itemStyle={itmStyle} cursor={{ stroke: 'rgba(255,255,255,0.12)', strokeWidth: 1 }} labelFormatter={(l: unknown) => typeof l === 'string' ? formatDate(l) : String(l)} formatter={(v: unknown) => [v as number, 'Total Wins']} />
                <Area type="monotone" dataKey="wins" stroke="var(--accent)" strokeWidth={2.5} fill="url(#fn-wins-grad)" dot={false} activeDot={{ r: 5, fill: 'var(--accent)', stroke: 'rgba(255,255,255,0.3)', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Monthly wins bar */}
        {monthlyWins.length >= 2 && (
          <div className="rounded-xl p-4 mb-4" style={{ background: 'var(--card-bg)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <p className="font-bold text-white mb-3" style={{ fontFamily: 'Cinzel, serif', fontSize: 15 }}>Monthly Wins</p>
            <ResponsiveContainer width="100%" height={130}>
              <BarChart data={monthlyWins} barSize={26} margin={{ top: 4 }}>
                <XAxis dataKey="month" tick={{ fill: '#666', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#666', fontSize: 9 }} axisLine={false} tickLine={false} width={20} allowDecimals={false} />
                <Tooltip contentStyle={ttStyle} labelStyle={lblStyle} itemStyle={itmStyle} cursor={{ fill: 'rgba(255,255,255,0.04)' }} formatter={(v: unknown) => [v as number, 'Wins']} />
                <Bar dataKey="wins" radius={[4, 4, 0, 0]}>
                  {monthlyWins.map((d, i) => {
                    const fraction = maxMonthlyWins > 0 ? d.wins / maxMonthlyWins : 0
                    return <Cell key={i} fill="var(--accent)" fillOpacity={0.2 + fraction * 0.8} />
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Kills trend */}
        {killsData.length >= 3 && (
          <div className="rounded-xl p-4 mb-4" style={{ background: 'var(--card-bg)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <p className="font-bold text-white mb-3" style={{ fontFamily: 'Cinzel, serif', fontSize: 15 }}>Kills per Game</p>
            <ResponsiveContainer width="100%" height={140}>
              <AreaChart data={killsData} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="fn-kills-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7B2FBE" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="#7B2FBE" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 6" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="date" tickFormatter={(d: string) => formatDate(d)} tick={{ fill: '#666', fontSize: 9 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#666', fontSize: 9 }} axisLine={false} tickLine={false} width={20} />
                <Tooltip contentStyle={ttStyle} labelStyle={lblStyle} itemStyle={itmStyle} cursor={{ stroke: 'rgba(255,255,255,0.12)', strokeWidth: 1 }} labelFormatter={(l: unknown) => typeof l === 'string' ? formatDate(l) : String(l)} formatter={(v: unknown) => [v as number, 'Kills']} />
                <ReferenceLine y={avgKills} stroke="var(--accent)" strokeDasharray="4 2" strokeOpacity={0.4} />
                <Area type="monotone" dataKey="kills" stroke="#7B2FBE" strokeWidth={2.5} fill="url(#fn-kills-grad)" dot={{ fill: '#7B2FBE', r: 3, fillOpacity: 0.7 }} activeDot={{ r: 5, fill: '#7B2FBE', stroke: 'rgba(255,255,255,0.3)', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
            <p className="text-xs mt-1" style={{ color: 'var(--accent)' }}>── avg {avgKills}K</p>
          </div>
        )}

        {/* Accuracy trend */}
        {accuracyData.length >= 3 && (
          <div className="rounded-xl p-4 mb-4" style={{ background: 'var(--card-bg)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <p className="font-bold text-white mb-3" style={{ fontFamily: 'Cinzel, serif', fontSize: 15 }}>Accuracy %</p>
            <ResponsiveContainer width="100%" height={120}>
              <AreaChart data={accuracyData} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="fn-acc-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2ECC71" stopOpacity={0.26} />
                    <stop offset="100%" stopColor="#2ECC71" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 6" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="date" tickFormatter={(d: string) => formatDate(d)} tick={{ fill: '#666', fontSize: 9 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fill: '#666', fontSize: 9 }} axisLine={false} tickLine={false} width={28} />
                <Tooltip contentStyle={ttStyle} labelStyle={lblStyle} itemStyle={itmStyle} cursor={{ stroke: 'rgba(255,255,255,0.12)', strokeWidth: 1 }} labelFormatter={(l: unknown) => typeof l === 'string' ? formatDate(l) : String(l)} formatter={(v: unknown) => [`${v}%`, 'Accuracy']} />
                <Area type="monotone" dataKey="accuracy" stroke="#2ECC71" strokeWidth={2.5} fill="url(#fn-acc-grad)" dot={false} activeDot={{ r: 4, fill: '#2ECC71', stroke: 'rgba(255,255,255,0.3)', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* History */}
        <p className="font-bold text-white mb-3" style={{ fontFamily: 'Cinzel, serif', fontSize: 15 }}>History</p>
        {games.length === 0 && <p style={{ color: '#888' }}>No games logged yet.</p>}
        {games.map(g => (
          <div
            key={g.id}
            className="flex items-center justify-between px-4 py-3 rounded-xl mb-2 card-animate"
            style={{ background: 'rgba(16,24,52,0.65)', border: `1px solid ${g.win ? 'rgba(245,166,35,0.3)' : 'rgba(255,255,255,0.06)'}` }}
          >
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-10 rounded-full flex-shrink-0" style={{ background: g.win ? 'var(--accent)' : '#444' }} />
              <div>
                <p className="text-white font-semibold text-sm">
                  {formatDate(g.date)}
                  {g.win && <span className="ml-2 text-xs font-bold px-1.5 py-0.5 rounded" style={{ background: 'var(--accent)', color: 'var(--base-bg)' }}>WIN</span>}
                </p>
                <p className="text-xs mt-0.5" style={{ color: '#888' }}>
                  {g.mode}{g.placement ? ` · #${g.placement}` : ''}{g.season ? ` · ${g.season}` : ''}
                  {(g as FortniteGame & { is_ranked?: boolean; rank_name?: string }).is_ranked && (
                    <span className="ml-2 font-bold px-1.5 py-0.5 rounded" style={{
                      background: `${RANK_COLORS[((g as FortniteGame & { rank_name?: string }).rank_name ?? 'Gold') as FnRank] ?? '#888'}22`,
                      border: `1px solid ${RANK_COLORS[((g as FortniteGame & { rank_name?: string }).rank_name ?? 'Gold') as FnRank] ?? '#888'}66`,
                      color: RANK_COLORS[((g as FortniteGame & { rank_name?: string }).rank_name ?? 'Gold') as FnRank] ?? '#888',
                      fontSize: 10,
                    }}>
                      <StarIcon size={10} color={RANK_COLORS[((g as FortniteGame & { rank_name?: string }).rank_name ?? 'Gold') as FnRank] ?? '#888'} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: 3 }} />{(g as FortniteGame & { rank_name?: string }).rank_name}
                    </span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="font-bold text-white text-base">{g.kills}K</p>
                {g.accuracy != null && <p className="text-xs" style={{ color: '#888' }}>{g.accuracy}%</p>}
              </div>
              <button
                onClick={() => setEditing(g)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: 'none', cursor: 'pointer' }}
              >
                <EditIcon size={13} color="var(--text-muted)" />
              </button>
            </div>
          </div>
        ))}

        {editing && <EditFortniteModal game={editing} onClose={() => setEditing(null)} onSaved={load} />}

      </PageWrapper>
    </>
  )
}
