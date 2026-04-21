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
import { ChessIcon, TrophyIcon, EditIcon } from '../components/ui/Icon'
import { usePageTitle } from '../hooks/usePageTitle'
import type { ChessGame } from '../types'

const ACCENT = '#a78bfa'

const TIME_CONTROLS = ['Bullet', 'Blitz', 'Rapid', 'Classical'] as const
const RESULTS = ['win', 'draw', 'loss'] as const

function resultColor(r: string) {
  if (r === 'win')  return '#34d399'
  if (r === 'draw') return '#f59e0b'
  return '#f87171'
}
function resultLabel(r: string) {
  if (r === 'win')  return 'Win'
  if (r === 'draw') return 'Draw'
  return 'Loss'
}

// ── Log form ──────────────────────────────────────────────────────

interface ChessForm {
  date: string
  result: string
  rating_after: string
  time_control: string
  color: string
  opponent: string
  opening: string
  notes: string
}

function LogChessPanel({ onLogged }: { onLogged: () => void }) {
  const [open,  setOpen]  = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const refreshXP       = useStore(s => s.refreshXP)
  const refreshActivity = useStore(s => s.refreshActivity)
  const { register, handleSubmit, reset, watch, formState: { isSubmitting } } = useForm<ChessForm>({
    defaultValues: { date: today(), result: 'win', rating_after: '', time_control: 'Blitz', color: 'White', opponent: '', opening: '', notes: '' },
  })

  const result = watch('result')

  const onSubmit = async (data: ChessForm) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('chess_games').insert({
      user_id:      user.id,
      date:         data.date,
      result:       data.result,
      rating_after: data.rating_after ? parseInt(data.rating_after) : null,
      time_control: data.time_control,
      color:        data.color || null,
      opponent:     data.opponent || null,
      opening:      data.opening  || null,
      notes:        data.notes    || null,
    })
    const xp = XP_RATES.chess_game
      + (data.result === 'win'  ? XP_RATES.chess_win  : 0)
      + (data.result === 'draw' ? XP_RATES.chess_draw : 0)
    if (data.result === 'win')  { playPR();     setToast(`+${xp} XP — ♟️ Checkmate!`) }
    else if (data.result === 'draw') { playXPGain(); setToast(`+${xp} XP — Draw logged`) }
    else                        { playXPGain(); setToast(`+${xp} XP — Game logged`) }
    await refreshXP(); refreshActivity()
    reset({ date: today(), result: 'win', rating_after: '', time_control: 'Blitz', color: 'White', opponent: '', opening: '', notes: '' })
    setOpen(false); onLogged()
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

            {/* Result selector */}
            <div className="flex flex-col gap-2">
              <label className="section-label">Result</label>
              <div className="flex gap-2">
                {RESULTS.map(r => (
                  <label
                    key={r}
                    style={{
                      flex: 1, textAlign: 'center', padding: '8px 4px', borderRadius: 10, cursor: 'pointer',
                      background: result === r ? `${resultColor(r)}20` : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${result === r ? resultColor(r) : 'rgba(255,255,255,0.08)'}`,
                      color: result === r ? resultColor(r) : '#666',
                      fontWeight: result === r ? 700 : 400, fontSize: 13,
                      transition: 'all 0.15s',
                    }}
                  >
                    <input type="radio" value={r} {...register('result')} style={{ display: 'none' }} />
                    {resultLabel(r)}
                  </label>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex flex-col gap-1 flex-1">
                <label className="section-label">Time Control</label>
                <select {...register('time_control')} className="px-3 py-2.5 rounded-lg text-white outline-none" style={{ background: 'var(--input-bg)', border: '1px solid var(--border)' }}>
                  {TIME_CONTROLS.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1 flex-1">
                <label className="section-label">Color</label>
                <select {...register('color')} className="px-3 py-2.5 rounded-lg text-white outline-none" style={{ background: 'var(--input-bg)', border: '1px solid var(--border)' }}>
                  <option>White</option>
                  <option>Black</option>
                </select>
              </div>
            </div>

            <Input label="Rating after game (optional)" type="number" placeholder="1240" {...register('rating_after')} />
            <Input label="Opponent (optional)" type="text" placeholder="GrandmasterFox" {...register('opponent')} />
            <Input label="Opening (optional)" type="text" placeholder="Sicilian Defense" {...register('opening')} />
            <Input label="Notes (optional)" type="text" placeholder="Blundered the queen on move 22…" {...register('notes')} />

            <Button type="submit" fullWidth disabled={isSubmitting}>{isSubmitting ? 'Logging...' : 'Log Game'}</Button>
          </form>
        </div>
      )}
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  )
}

// ── Edit modal ────────────────────────────────────────────────────

function EditChessModal({ game, onClose, onSaved }: { game: ChessGame; onClose: () => void; onSaved: () => void }) {
  const [rating, setRating] = useState(String(game.rating_after ?? ''))
  const [result, setResult] = useState(game.result)
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    await supabase.from('chess_games').update({
      result,
      rating_after: rating ? parseInt(rating) : null,
    }).eq('id', game.id)
    setSaving(false); onSaved(); onClose()
  }
  async function del() {
    await supabase.from('chess_games').delete().eq('id', game.id)
    onSaved(); onClose()
  }

  return (
    <EditModal title={`${formatDate(game.date)} — ${game.time_control}`} onClose={onClose} onDelete={del} onSave={save} saving={saving}>
      <div className="flex flex-col gap-4">
        <div className="flex gap-2">
          {RESULTS.map(r => (
            <button
              key={r} type="button"
              onClick={() => setResult(r)}
              style={{
                flex: 1, padding: '8px 4px', borderRadius: 10, cursor: 'pointer',
                background: result === r ? `${resultColor(r)}20` : 'rgba(255,255,255,0.04)',
                border: `1px solid ${result === r ? resultColor(r) : 'rgba(255,255,255,0.08)'}`,
                color: result === r ? resultColor(r) : '#666',
                fontWeight: result === r ? 700 : 400, fontSize: 13,
              }}
            >{resultLabel(r)}</button>
          ))}
        </div>
        <div className="flex flex-col gap-1">
          <label className="section-label">Rating After</label>
          <input type="number" value={rating} onChange={e => setRating(e.target.value)} className="px-3 py-2.5 rounded-xl outline-none w-full text-sm" style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
        </div>
      </div>
    </EditModal>
  )
}

// ── Main page ─────────────────────────────────────────────────────

const ttStyle = { background: 'rgba(10,10,22,0.97)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, color: '#fff', fontSize: 12 }

export function Chess() {
  usePageTitle('Chess')
  const [games,   setGames]   = useState<ChessGame[]>([])
  const [editing, setEditing] = useState<ChessGame | null>(null)
  const [tcFilter, setTcFilter] = useState<string | null>(null)

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('chess_games').select('*').eq('user_id', user.id).order('date', { ascending: false })
    setGames(data ?? [])
  }
  useEffect(() => { load() }, [])

  const filtered = tcFilter ? games.filter(g => g.time_control === tcFilter) : games
  const wins     = filtered.filter(g => g.result === 'win').length
  const draws    = filtered.filter(g => g.result === 'draw').length
  const losses   = filtered.filter(g => g.result === 'loss').length
  const winRate  = filtered.length ? Math.round((wins / filtered.length) * 100) : 0

  // Rating trend — only games that have rating_after, chronological
  const ratingData = [...games]
    .filter(g => g.rating_after != null)
    .reverse()
    .slice(-20)
    .map(g => ({ label: formatDate(g.date).slice(0, 6), rating: g.rating_after! }))

  const currentRating = ratingData.length ? ratingData[ratingData.length - 1].rating : null
  const peakRating    = ratingData.length ? Math.max(...ratingData.map(d => d.rating)) : null

  // Streak
  const streak = (() => { let s = 0; for (const g of games) { if (g.result === 'win') s++; else break } return s })()

  const usedControls = [...new Set(games.map(g => g.time_control))].filter(Boolean)

  return (
    <>
      <TopBar title="Chess" back />
      <PageWrapper>

        {/* Rating hero */}
        {currentRating && (
          <div className="rounded-2xl p-5 mb-4 text-center" style={{
            background: `linear-gradient(135deg, rgba(167,139,250,0.12) 0%, rgba(139,92,246,0.08) 100%)`,
            border: '1px solid rgba(167,139,250,0.25)',
          }}>
            <p className="section-label mb-1">Current Rating</p>
            <p style={{ fontSize: 52, fontWeight: 900, color: ACCENT, fontFamily: 'Cinzel, serif', lineHeight: 1 }}>
              {currentRating.toLocaleString()}
            </p>
            {peakRating && peakRating > currentRating && (
              <p style={{ fontSize: 12, color: '#666', marginTop: 4 }}>Peak {peakRating.toLocaleString()}</p>
            )}
            {peakRating && peakRating === currentRating && (
              <p style={{ fontSize: 12, color: '#f59e0b', marginTop: 4 }}>⭐ Personal best</p>
            )}
          </div>
        )}

        {/* Stat cards */}
        <div className="grid grid-cols-4 gap-2 mb-3">
          {[
            { label: 'Wins',     value: wins,    color: '#34d399' },
            { label: 'Draws',    value: draws,   color: '#f59e0b' },
            { label: 'Losses',   value: losses,  color: '#f87171' },
            { label: 'Win %',    value: filtered.length ? `${winRate}%` : '—', color: ACCENT },
          ].map(s => (
            <div key={s.label} className="rounded-xl p-2 text-center" style={{ background: 'var(--card-bg)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <p className="text-lg font-bold" style={{ color: s.color, fontFamily: 'Cinzel, serif' }}>{s.value}</p>
              <p className="section-label" style={{ fontSize: 9 }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Streak + summary */}
        {games.length > 0 && (
          <div className="rounded-xl px-4 py-3 mb-4 flex items-center justify-between" style={{ background: 'rgba(167,139,250,0.07)', border: '1px solid rgba(167,139,250,0.2)' }}>
            <span style={{ fontSize: 13, color: '#888' }}>{games.length} games</span>
            {streak > 1 && (
              <span style={{ fontSize: 13, fontWeight: 700, color: '#34d399' }}>🔥 {streak} win streak</span>
            )}
          </div>
        )}

        {/* Time control filter */}
        {usedControls.length > 1 && (
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 8, marginBottom: 12, scrollbarWidth: 'none' }}>
            {[null, ...usedControls].map(tc => (
              <button
                key={tc ?? 'all'}
                onClick={() => setTcFilter(tc)}
                style={{
                  flexShrink: 0, padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                  background: tcFilter === tc ? ACCENT : 'rgba(255,255,255,0.06)',
                  color: tcFilter === tc ? '#0d0d1a' : 'var(--text-secondary)',
                  border: `1px solid ${tcFilter === tc ? ACCENT : 'rgba(255,255,255,0.1)'}`,
                  cursor: 'pointer', transition: 'all 0.12s',
                }}
              >{tc ?? 'All'}</button>
            ))}
          </div>
        )}

        <LogChessPanel onLogged={load} />

        {/* Rating trend */}
        {ratingData.length >= 3 && (
          <div className="rounded-xl p-4 mb-4" style={{ background: 'var(--card-bg)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <p className="font-bold text-white mb-3" style={{ fontFamily: 'Cinzel, serif', fontSize: 15 }}>Rating Trend</p>
            <ResponsiveContainer width="100%" height={150}>
              <LineChart data={ratingData}>
                <CartesianGrid strokeDasharray="3 6" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: '#555', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#555', fontSize: 9 }} axisLine={false} tickLine={false} width={36}
                  domain={['auto', 'auto']} />
                {peakRating && (
                  <ReferenceLine y={peakRating} stroke="rgba(245,158,11,0.3)" strokeDasharray="4 4"
                    label={{ value: 'Peak', fill: '#f59e0b', fontSize: 9, position: 'insideTopRight' }} />
                )}
                <Tooltip contentStyle={ttStyle} formatter={(v: number) => [v, 'Rating']} />
                <Line
                  type="monotone" dataKey="rating" stroke={ACCENT} strokeWidth={2.5}
                  dot={{ r: 3, fill: ACCENT, strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* History */}
        {filtered.length > 0 && <p className="section-label mb-3">Game History</p>}
        {filtered.map(g => (
          <div key={g.id} className="flex items-center justify-between px-4 py-3 rounded-xl mb-2" style={{ background: 'rgba(16,24,52,0.65)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-3">
              <div style={{
                width: 36, height: 36, borderRadius: 10, flexShrink: 0, fontSize: 16,
                background: g.result === 'win' ? 'rgba(52,211,153,0.15)' : g.result === 'draw' ? 'rgba(245,158,11,0.1)' : 'rgba(248,113,113,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {g.result === 'win' ? <TrophyIcon size={16} color="#34d399" /> : <ChessIcon size={16} color={resultColor(g.result)} />}
              </div>
              <div>
                <p style={{ color: 'var(--text-primary)', fontSize: 13, fontWeight: 600 }}>
                  {formatDate(g.date)}
                  <span style={{ marginLeft: 8, fontSize: 11, color: '#555' }}>{g.time_control}</span>
                  {g.color && <span style={{ marginLeft: 6, fontSize: 10, color: g.color === 'White' ? '#ddd' : '#888', background: g.color === 'White' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.4)', padding: '1px 5px', borderRadius: 4 }}>{g.color}</span>}
                </p>
                {g.opening && <p style={{ fontSize: 11, color: '#555', marginTop: 1 }}>{g.opening}</p>}
                {g.opponent && <p style={{ fontSize: 11, color: '#555', marginTop: 1 }}>vs {g.opponent}</p>}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: 14, fontWeight: 800, color: resultColor(g.result) }}>{resultLabel(g.result)}</p>
                {g.rating_after && <p style={{ fontSize: 11, color: '#666', marginTop: 1 }}>{g.rating_after}</p>}
              </div>
              <button onClick={() => setEditing(g)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: 'none', cursor: 'pointer' }}>
                <EditIcon size={13} color="var(--text-muted)" />
              </button>
            </div>
          </div>
        ))}

        {games.length === 0 && (
          <EmptyState
            icon={<ChessIcon size={56} color="var(--text-muted)" />}
            title="No games logged yet"
            sub="Log games and your rating to track your ELO progression over time."
          />
        )}

        {editing && <EditChessModal game={editing} onClose={() => setEditing(null)} onSaved={load} />}
      </PageWrapper>
    </>
  )
}
