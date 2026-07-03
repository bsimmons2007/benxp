import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ReferenceLine, BarChart, Bar, Cell, CartesianGrid,
} from 'recharts'
import { TopBar } from '../components/layout/TopBar'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Card } from '../components/ui/Card'
import { EditModal } from '../components/ui/EditModal'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { Toast } from '../components/ui/Toast'
import { EmptyState } from '../components/ui/EmptyState'
import { supabase } from '../lib/supabase'
import { CHART_TOOLTIP_STYLE, today, formatDate, formatDateTooltip } from '../lib/utils'
import { XP_RATES } from '../lib/xp'
import { useStore } from '../store/useStore'
import { playXPGain, playPR } from '../lib/sounds'
import type { FortniteGame } from '../types'
import { TrophyIcon, StarIcon, EditIcon, ZapIcon, GamepadIcon } from '../components/ui/Icon'
import { usePageTitle } from '../hooks/usePageTitle'

// ── Shared constants ───────────────────────────────────────────────

const FN_RANKS = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Elite', 'Champion', 'Unreal'] as const
type FnRank = typeof FN_RANKS[number]

const RANK_COLORS: Record<FnRank, string> = {
  Bronze: '#cd7f32', Silver: '#a8a9ad', Gold: '#ffd700',
  Platinum: '#66d9e8', Diamond: 'var(--cat-cardio)', Elite: '#9b59b6',
  Champion: '#e74c3c', Unreal: '#f5a623',
}

const ACCENT_NORMAL = 'var(--accent)'
const ACCENT_BLITZ  = 'var(--chart-alt)'

const ttStyle  = CHART_TOOLTIP_STYLE
const lblStyle = { color: 'var(--text-muted)' }
const itmStyle = { color: 'var(--text-primary)' }

type FnTab = 'normal' | 'blitz'

// A game belongs to blitz if mode starts with 'Blitz'
const isBlitzMode = (mode: string | null) =>
  mode === 'Blitz' || (typeof mode === 'string' && mode.startsWith('Blitz '))

// Display mode string for blitz (strip prefix, handle legacy)
const blitzDisplayMode = (mode: string | null) => {
  if (!mode || mode === 'Blitz') return '—'
  return mode.replace('Blitz ', '')
}

// ── Chart helpers ──────────────────────────────────────────────────

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

// ── Stat mini-cards ────────────────────────────────────────────────

function StatCards({ items, accent }: { items: { label: string; value: string | number }[]; accent: string }) {
  return (
    <div className="grid grid-cols-3 gap-2 mb-4">
      {items.map(s => (
        <div key={s.label} className="rounded-xl p-3 text-center card-animate" style={{ background: 'var(--surface-1)', border: '1px solid var(--border-subtle)' }}>
          <p style={{ fontSize: 22, fontWeight: 700, color: accent, fontFamily: 'var(--font-mono)', lineHeight: 1 }}>{s.value}</p>
          <p className="section-label mt-1">{s.label}</p>
        </div>
      ))}
    </div>
  )
}

// ── Charts block ───────────────────────────────────────────────────

function FnCharts({ games, accent, gradId }: { games: FortniteGame[]; accent: string; gradId: string }) {
  const sorted = [...games].sort((a, b) => a.date.localeCompare(b.date))
  const monthlyWins    = buildMonthlyWins(sorted)
  const cumulativeWins = buildCumulativeWins(games)
  const killsData      = sorted.map(g => ({ date: g.date, kills: g.kills }))
  const accuracyData   = sorted.filter(g => g.accuracy != null).map(g => ({ date: g.date, accuracy: g.accuracy }))
  const avgKills       = games.length
    ? Math.round((games.reduce((s, g) => s + g.kills, 0) / games.length) * 10) / 10
    : 0
  const maxMonthlyWins = monthlyWins.length ? Math.max(...monthlyWins.map(d => d.wins)) : 1

  return (
    <>
      {cumulativeWins.length >= 3 && (
        <Card className="mb-4">
          <p className="font-bold mb-3" style={{ fontSize: 15, color: 'var(--text-primary)' }}>Cumulative Wins</p>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={cumulativeWins} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id={`${gradId}-cum`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={accent} stopOpacity={0.15} />
                  <stop offset="100%" stopColor={accent} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 6" stroke="var(--border-subtle)" vertical={false} />
              <XAxis dataKey="date" tickFormatter={(d: string) => formatDate(d)} tick={{ fill: 'var(--text-tertiary)', fontSize: 9 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-tertiary)', fontSize: 9 }} axisLine={false} tickLine={false} width={25} />
              <Tooltip contentStyle={ttStyle} labelStyle={lblStyle} itemStyle={itmStyle} cursor={{ stroke: 'var(--border-subtle)', strokeWidth: 1 }} labelFormatter={(l: unknown) => typeof l === 'string' ? formatDateTooltip(l) : String(l)} formatter={(v: unknown) => [v as number, 'Total Wins']} />
              <Area type="monotone" dataKey="wins" stroke={accent} strokeWidth={2.5} fill={`url(#${gradId}-cum)`} dot={false} activeDot={{ r: 5, fill: accent, stroke: 'var(--base-bg)', strokeWidth: 2 }} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      )}

      {monthlyWins.length >= 2 && (
        <Card className="mb-4">
          <p className="font-bold mb-3" style={{ fontSize: 15, color: 'var(--text-primary)' }}>Monthly Wins</p>
          <ResponsiveContainer width="100%" height={130}>
            <BarChart data={monthlyWins} barSize={26} margin={{ top: 4 }}>
              <XAxis dataKey="month" tick={{ fill: 'var(--text-tertiary)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-tertiary)', fontSize: 9 }} axisLine={false} tickLine={false} width={20} allowDecimals={false} />
              <Tooltip contentStyle={ttStyle} labelStyle={lblStyle} itemStyle={itmStyle} cursor={{ fill: 'var(--border-subtle)' }} formatter={(v: unknown) => [v as number, 'Wins']} />
              <Bar dataKey="wins" radius={[4, 4, 0, 0]}>
                {monthlyWins.map((d, i) => {
                  const fraction = maxMonthlyWins > 0 ? d.wins / maxMonthlyWins : 0
                  return <Cell key={i} fill={accent} fillOpacity={0.2 + fraction * 0.8} />
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {killsData.length >= 3 && (
        <Card className="mb-4">
          <p className="font-bold mb-3" style={{ fontSize: 15, color: 'var(--text-primary)' }}>Kills per Game</p>
          <ResponsiveContainer width="100%" height={140}>
            <AreaChart data={killsData} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id={`${gradId}-kills`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--chart-alt)" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="var(--chart-alt)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 6" stroke="var(--border-subtle)" vertical={false} />
              <XAxis dataKey="date" tickFormatter={(d: string) => formatDate(d)} tick={{ fill: 'var(--text-tertiary)', fontSize: 9 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-tertiary)', fontSize: 9 }} axisLine={false} tickLine={false} width={20} />
              <Tooltip contentStyle={ttStyle} labelStyle={lblStyle} itemStyle={itmStyle} cursor={{ stroke: 'var(--border-subtle)', strokeWidth: 1 }} labelFormatter={(l: unknown) => typeof l === 'string' ? formatDateTooltip(l) : String(l)} formatter={(v: unknown) => [v as number, 'Kills']} />
              <ReferenceLine y={avgKills} stroke={accent} strokeDasharray="4 2" strokeOpacity={0.4} />
              <Area type="monotone" dataKey="kills" stroke="var(--chart-alt)" strokeWidth={2.5} fill={`url(#${gradId}-kills)`} dot={{ fill: 'var(--chart-alt)', r: 3, fillOpacity: 0.7 }} activeDot={{ r: 5, fill: 'var(--chart-alt)', stroke: 'var(--base-bg)', strokeWidth: 2 }} />
            </AreaChart>
          </ResponsiveContainer>
          <p className="text-xs mt-1" style={{ color: accent }}>── avg {avgKills}K</p>
        </Card>
      )}

      {accuracyData.length >= 3 && (
        <Card className="mb-4">
          <p className="font-bold mb-3" style={{ fontSize: 15, color: 'var(--text-primary)' }}>Accuracy %</p>
          <ResponsiveContainer width="100%" height={120}>
            <AreaChart data={accuracyData} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id={`${gradId}-acc`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--green)" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="var(--green)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 6" stroke="var(--border-subtle)" vertical={false} />
              <XAxis dataKey="date" tickFormatter={(d: string) => formatDate(d)} tick={{ fill: 'var(--text-tertiary)', fontSize: 9 }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fill: 'var(--text-tertiary)', fontSize: 9 }} axisLine={false} tickLine={false} width={28} />
              <Tooltip contentStyle={ttStyle} labelStyle={lblStyle} itemStyle={itmStyle} cursor={{ stroke: 'var(--border-subtle)', strokeWidth: 1 }} labelFormatter={(l: unknown) => typeof l === 'string' ? formatDateTooltip(l) : String(l)} formatter={(v: unknown) => [`${v}%`, 'Accuracy']} />
              <Area type="monotone" dataKey="accuracy" stroke="var(--green)" strokeWidth={2.5} fill={`url(#${gradId}-acc)`} dot={false} activeDot={{ r: 4, fill: 'var(--green)', stroke: 'var(--base-bg)', strokeWidth: 2 }} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      )}
    </>
  )
}

// ── Edit modal (shared) ────────────────────────────────────────────

function EditFortniteModal({ game, onClose, onSaved }: { game: FortniteGame; onClose: () => void; onSaved: () => void }) {
  const [kills, setKills]       = useState(String(game.kills))
  const [placement, setPlacement] = useState(String(game.placement ?? ''))
  const [accuracy, setAccuracy] = useState(String(game.accuracy ?? ''))
  const [win, setWin]           = useState(game.win)
  const [saving, setSaving]     = useState(false)

  async function save() {
    setSaving(true)
    const { error } = await supabase.from('fortnite_games').update({
      kills: parseInt(kills) || 0,
      placement: placement ? parseInt(placement) : null,
      accuracy: accuracy ? parseFloat(accuracy) : null,
      win,
    }).eq('id', game.id)
    setSaving(false)
    if (!error) { onSaved(); onClose() }
  }
  async function del() {
    const { error } = await supabase.from('fortnite_games').delete().eq('id', game.id)
    if (!error) { onSaved(); onClose() }
  }

  return (
    <EditModal title={`Edit — ${formatDate(game.date)}`} onClose={onClose} onDelete={del} onSave={save} saving={saving}>
      <div className="flex flex-col gap-4">
        <div className="flex gap-3">
          <div className="flex flex-col gap-1 flex-1">
            <label className="text-base font-medium" style={{ color: 'var(--text-muted)' }}>Kills</label>
            <input type="number" value={kills} onChange={e => setKills(e.target.value)} className="px-3 py-3 rounded-lg outline-none text-base" style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
          </div>
          <div className="flex flex-col gap-1 flex-1">
            <label className="text-base font-medium" style={{ color: 'var(--text-muted)' }}>Placement</label>
            <input type="number" value={placement} onChange={e => setPlacement(e.target.value)} className="px-3 py-3 rounded-lg outline-none text-base" style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-base font-medium" style={{ color: 'var(--text-secondary)' }}>Accuracy %</label>
          <input type="number" step="0.1" value={accuracy} onChange={e => setAccuracy(e.target.value)} className="px-3 py-3 rounded-lg outline-none text-base" style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
        </div>
        <button type="button" role="switch" aria-checked={win} aria-label="Win" onClick={() => setWin(w => !w)} className="flex items-center gap-3" style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
          <div className="w-12 h-6 rounded-full transition-colors relative" style={{ background: win ? 'var(--green)' : 'var(--border)' }}>
            <div className="absolute top-0.5 w-5 h-5 rounded-full transition-transform" style={{ background: 'var(--surface-1)', transform: win ? 'translateX(26px)' : 'translateX(2px)' }} />
          </div>
          <span className="font-medium" style={{ color: 'var(--text-primary)' }}>Win</span>
        </button>
      </div>
    </EditModal>
  )
}

// ── Normal log panel ───────────────────────────────────────────────

interface NormalForm {
  date: string
  mode: 'Solos' | 'Duos' | 'Trios' | 'Squads'
  season: string
  placement: string
  kills: string
  accuracy: string
}

function LogNormalPanel({ onLogged }: { onLogged: () => void }) {
  const [open,     setOpen]     = useState(false)
  const [toast,    setToast]    = useState<string | null>(null)
  const [isWin,    setIsWin]    = useState(true)
  const [isRanked, setIsRanked] = useState(false)
  const [rankName, setRankName] = useState<FnRank>('Gold')
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<NormalForm>({
    defaultValues: { date: today(), mode: 'Solos', season: '', placement: '', kills: '', accuracy: '' },
  })
  const refreshXP       = useStore(s => s.refreshXP)
  const refreshActivity = useStore(s => s.refreshActivity)

  const onSubmit = async (data: NormalForm) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase.from('fortnite_games').insert({
      user_id:   user.id,
      date:      data.date,
      mode:      data.mode,
      season:    data.season || null,
      placement: data.placement ? parseInt(data.placement) : null,
      kills:     parseInt(data.kills) || 0,
      accuracy:  data.accuracy ? parseFloat(data.accuracy) : null,
      win:       isWin,
      is_ranked: isRanked,
      rank_name: isRanked ? rankName : null,
    })
    if (error) { setToast('Failed to save — try again'); return }
    if (isWin) {
      playPR()
      setToast(`+${XP_RATES.fortnite_win} XP — Victory Royale!${isRanked ? ` (Ranked ${rankName})` : ''}`)
    } else {
      playXPGain()
      setToast('Game logged — keep grinding!')
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
        style={{ background: open ? ACCENT_NORMAL : 'var(--input-bg)', color: open ? 'var(--base-bg)' : ACCENT_NORMAL, border: `1px solid ${ACCENT_NORMAL}`, fontSize: 15 }}
      >
        {open ? 'Cancel' : 'Log Game'}
      </button>
      {open && (
        <div className="mt-3 rounded-xl p-4 pop-in" style={{ background: 'var(--surface-1)', border: '1px solid var(--border-subtle)' }}>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <Input label="Date" type="date" {...register('date', { required: true })} />

            <div className="flex flex-col gap-1">
              <label className="text-base font-medium" style={{ color: 'var(--text-muted)' }}>Mode</label>
              <select {...register('mode')} className="px-3 py-2 rounded-lg outline-none" style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                <option>Solos</option>
                <option>Duos</option>
                <option>Trios</option>
                <option>Squads</option>
              </select>
            </div>

            <Input label="Season" type="text" placeholder="Chapter 6 S2" {...register('season')} />
            <div className="flex gap-3">
              <Input label="Placement" type="number" placeholder="1"    className="flex-1" {...register('placement')} />
              <Input label="Kills"     type="number" placeholder="0"    className="flex-1" {...register('kills')} />
            </div>
            <Input label="Accuracy %" type="number" step="0.1" placeholder="24.5" {...register('accuracy')} />

            {/* Win toggle */}
            <button type="button" role="switch" aria-checked={isWin} aria-label="Victory Royale" onClick={() => setIsWin(w => !w)} className="flex items-center gap-3" style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
              <div className="w-12 h-6 rounded-full transition-colors relative" style={{ background: isWin ? 'var(--accent)' : 'var(--border)' }}>
                <div className="absolute top-0.5 w-5 h-5 rounded-full transition-transform" style={{ background: 'var(--surface-1)', transform: isWin ? 'translateX(26px)' : 'translateX(2px)' }} />
              </div>
              <span className="font-semibold" style={{ color: isWin ? 'var(--accent)' : 'var(--text-muted)', fontSize: 13 }}>
                {isWin
                  ? <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><TrophyIcon size={14} color="var(--accent)" /> Victory Royale</span>
                  : 'No win'}
              </span>
            </button>

            {/* Ranked toggle */}
            <button type="button" role="switch" aria-checked={isRanked} aria-label="Ranked Match" onClick={() => setIsRanked(r => !r)} className="flex items-center gap-3" style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
              <div className="w-12 h-6 rounded-full transition-colors relative" style={{ background: isRanked ? 'var(--cat-cardio)' : 'var(--border)' }}>
                <div className="absolute top-0.5 w-5 h-5 rounded-full transition-transform" style={{ background: 'var(--surface-1)', transform: isRanked ? 'translateX(26px)' : 'translateX(2px)' }} />
              </div>
              <span className="font-semibold" style={{ color: isRanked ? 'var(--cat-cardio)' : 'var(--text-muted)', fontSize: 13 }}>
                {isRanked
                  ? <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><StarIcon size={14} color="var(--cat-cardio)" /> Ranked Match</span>
                  : 'Casual / Pubs'}
              </span>
            </button>

            {/* Rank selector */}
            {isRanked && (
              <div className="pop-in flex flex-col gap-2">
                <label className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>Current Rank</label>
                <div className="flex flex-wrap gap-2">
                  {FN_RANKS.map(r => (
                    <button key={r} type="button" onClick={() => setRankName(r)} style={{
                      padding: '5px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                      background: rankName === r ? `${RANK_COLORS[r]}22` : 'var(--input-bg)',
                      border: `1.5px solid ${rankName === r ? RANK_COLORS[r] : 'var(--border-subtle)'}`,
                      color: rankName === r ? RANK_COLORS[r] : 'var(--text-muted)', cursor: 'pointer', transition: 'all 0.12s ease',
                    }}>{r}</button>
                  ))}
                </div>
              </div>
            )}

            <Button type="submit" fullWidth loading={isSubmitting} disabled={isSubmitting}>{isSubmitting ? 'Logging...' : 'Log Game'}</Button>
          </form>
        </div>
      )}
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  )
}

// ── Blitz log panel ────────────────────────────────────────────────

interface BlitzForm {
  date: string
  blitzMode: 'Solos' | 'Duos' | 'Squads'
  placement: string
  kills: string
  accuracy: string
}

function LogBlitzPanel({ onLogged }: { onLogged: () => void }) {
  const [open,  setOpen]  = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [isWin, setIsWin] = useState(true)
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<BlitzForm>({
    defaultValues: { date: today(), blitzMode: 'Solos', placement: '', kills: '', accuracy: '' },
  })
  const refreshXP       = useStore(s => s.refreshXP)
  const refreshActivity = useStore(s => s.refreshActivity)

  const onSubmit = async (data: BlitzForm) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase.from('fortnite_games').insert({
      user_id:   user.id,
      date:      data.date,
      mode:      `Blitz ${data.blitzMode}`,   // e.g. "Blitz Solos"
      placement: data.placement ? parseInt(data.placement) : null,
      kills:     parseInt(data.kills) || 0,
      accuracy:  data.accuracy ? parseFloat(data.accuracy) : null,
      win:       isWin,
      is_ranked: false,
      rank_name: null,
    })
    if (error) { setToast('Failed to save — try again'); return }
    if (isWin) {
      playPR()
      setToast(`+${XP_RATES.fortnite_blitz_win} XP — Blitz Victory!`)
    } else {
      playXPGain()
      setToast('Blitz game logged!')
    }
    await refreshXP()
    refreshActivity()
    reset({ date: today(), blitzMode: 'Solos', placement: '', kills: '', accuracy: '' })
    setOpen(false)
    onLogged()
  }

  return (
    <div className="mb-5">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all"
        style={{ background: open ? ACCENT_BLITZ : 'color-mix(in srgb, var(--chart-alt) 8%, transparent)', color: open ? 'var(--base-bg)' : ACCENT_BLITZ, border: `1px solid ${ACCENT_BLITZ}`, fontSize: 15 }}
      >
        {open ? 'Cancel' : 'Log Blitz Game'}
      </button>
      {open && (
        <div className="mt-3 rounded-xl p-4 pop-in" style={{ background: 'var(--surface-1)', border: '1px solid var(--border-subtle)' }}>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <Input label="Date" type="date" {...register('date', { required: true })} />

            <div className="flex flex-col gap-1">
              <label className="text-base font-medium" style={{ color: 'var(--text-muted)' }}>Mode</label>
              <select {...register('blitzMode')} className="px-3 py-2 rounded-lg outline-none" style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                <option>Solos</option>
                <option>Duos</option>
                <option>Squads</option>
              </select>
            </div>

            <div className="flex gap-3">
              <Input label="Placement" type="number" placeholder="1"    className="flex-1" {...register('placement')} />
              <Input label="Kills"     type="number" placeholder="0"    className="flex-1" {...register('kills')} />
            </div>
            <Input label="Accuracy %" type="number" step="0.1" placeholder="24.5" {...register('accuracy')} />

            {/* Win toggle */}
            <button type="button" role="switch" aria-checked={isWin} aria-label="Blitz Win" onClick={() => setIsWin(w => !w)} className="flex items-center gap-3" style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
              <div className="w-12 h-6 rounded-full transition-colors relative" style={{ background: isWin ? ACCENT_BLITZ : 'var(--border)' }}>
                <div className="absolute top-0.5 w-5 h-5 rounded-full transition-transform" style={{ background: 'var(--surface-1)', transform: isWin ? 'translateX(26px)' : 'translateX(2px)' }} />
              </div>
              <span className="font-semibold" style={{ color: isWin ? ACCENT_BLITZ : 'var(--text-muted)', fontSize: 13 }}>
                {isWin
                  ? <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><ZapIcon size={14} color={ACCENT_BLITZ} /> Blitz Win</span>
                  : 'No win'}
              </span>
            </button>

            <Button type="submit" fullWidth loading={isSubmitting} disabled={isSubmitting} style={{ background: ACCENT_BLITZ }}>{isSubmitting ? 'Logging...' : 'Log Blitz Game'}</Button>
          </form>
        </div>
      )}
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  )
}

// ── Normal tab ─────────────────────────────────────────────────────

function NormalTab({ games, onLogged, onEdit }: { games: FortniteGame[]; onLogged: () => void; onEdit: (g: FortniteGame) => void }) {
  const [visible, setVisible] = useState(10)
  const wins      = games.filter(g => g.win).length
  const avgKills  = games.length ? Math.round((games.reduce((s, g) => s + g.kills, 0) / games.length) * 10) / 10 : 0
  const bestKills = games.length ? Math.max(...games.map(g => g.kills)) : 0
  const rankedWins = games.filter(g => g.win && (g as FortniteGame & { is_ranked?: boolean }).is_ranked).length

  return (
    <>
      <StatCards accent={ACCENT_NORMAL} items={[
        { label: 'Wins',       value: wins },
        { label: 'Best Game',  value: bestKills ? `${bestKills}K` : '—' },
        { label: 'Avg Kills',  value: games.length ? avgKills : '—' },
      ]} />

      {rankedWins > 0 && (
        <div className="rounded-xl px-4 py-2.5 mb-4 flex items-center justify-between" style={{ background: 'color-mix(in srgb, var(--cat-cardio) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--cat-cardio) 25%, transparent)' }}>
          <div className="flex items-center gap-2">
            <StarIcon size={14} color="var(--cat-cardio)" />
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--cat-cardio)' }}>Ranked Wins</span>
          </div>
          <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--cat-cardio)' }}>{rankedWins}</span>
        </div>
      )}

      <LogNormalPanel onLogged={onLogged} />
      <FnCharts games={games} accent={ACCENT_NORMAL} gradId="fn-normal" />

      {/* History */}
      {games.length > 0 && (
        <p className="section-label mb-3">History</p>
      )}
      {games.slice(0, visible).map(g => {
        const gExt = g as FortniteGame & { is_ranked?: boolean; rank_name?: string }
        return (
          <div
            key={g.id}
            className="flex items-center justify-between px-4 py-3 rounded-xl mb-2 card-animate"
            style={{ background: 'var(--surface-1)', border: `1px solid ${g.win ? 'var(--accent-dim)' : 'var(--border-subtle)'}` }}
          >
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-10 rounded-full flex-shrink-0" style={{ background: g.win ? ACCENT_NORMAL : 'var(--border-default)' }} />
              <div>
                <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                  {formatDate(g.date)}
                  {g.win && <span className="ml-2 text-xs font-bold px-1.5 py-0.5 rounded" style={{ background: ACCENT_NORMAL, color: 'var(--base-bg)' }}>WIN</span>}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {g.mode}{g.placement ? ` · #${g.placement}` : ''}
                  {gExt.is_ranked && gExt.rank_name && (
                    <span className="ml-2 font-bold px-1.5 py-0.5 rounded" style={{
                      background: `${RANK_COLORS[gExt.rank_name as FnRank] ?? '#888'}22`,
                      border: `1px solid ${RANK_COLORS[gExt.rank_name as FnRank] ?? '#888'}66`,
                      color: RANK_COLORS[gExt.rank_name as FnRank] ?? '#888', fontSize: 10,
                    }}>
                      <StarIcon size={10} color={RANK_COLORS[gExt.rank_name as FnRank] ?? '#888'} style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: 3 }} />
                      {gExt.rank_name}
                    </span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>{g.kills}K</p>
                {g.accuracy != null && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{g.accuracy}%</p>}
              </div>
              <button type="button" aria-label="Edit game" onClick={() => onEdit(g)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 8, background: 'var(--input-bg)', border: 'none', cursor: 'pointer' }}>
                <EditIcon size={13} color="var(--text-muted)" />
              </button>
            </div>
          </div>
        )
      })}
      {games.length > visible && (
        <button
          type="button"
          onClick={() => setVisible(v => v + 20)}
          className="w-full py-3 rounded-xl font-semibold mt-1"
          style={{ background: 'var(--input-bg)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)', fontSize: 14 }}
        >
          Show more ({games.length - visible} left)
        </button>
      )}

      {games.length === 0 && (
        <EmptyState
          icon={<GamepadIcon size={48} color="var(--text-muted)" />}
          title="No normal games yet"
          sub="Log your first Solos, Duos, Trios, or Squads game above."
        />
      )}
    </>
  )
}

// ── Blitz tab ──────────────────────────────────────────────────────

function BlitzTab({ games, onLogged, onEdit }: { games: FortniteGame[]; onLogged: () => void; onEdit: (g: FortniteGame) => void }) {
  const [visible, setVisible] = useState(10)
  const wins      = games.filter(g => g.win).length
  const avgKills  = games.length ? Math.round((games.reduce((s, g) => s + g.kills, 0) / games.length) * 10) / 10 : 0
  const bestKills = games.length ? Math.max(...games.map(g => g.kills)) : 0

  return (
    <>
      <div className="rounded-xl px-4 py-3 mb-4 flex items-center gap-2" style={{ background: 'color-mix(in srgb, var(--chart-alt) 6%, transparent)', border: '1px solid color-mix(in srgb, var(--chart-alt) 18%, transparent)' }}>
        <ZapIcon size={14} color={ACCENT_BLITZ} />
        <p style={{ fontSize: 12, color: ACCENT_BLITZ, opacity: 0.85 }}>
          Blitz: fast-paced rounds with a shrinking storm. Solos, Duos and Squads only — no ranked.
        </p>
      </div>

      <StatCards accent={ACCENT_BLITZ} items={[
        { label: 'Blitz Wins', value: wins },
        { label: 'Best Game',  value: bestKills ? `${bestKills}K` : '—' },
        { label: 'Avg Kills',  value: games.length ? avgKills : '—' },
      ]} />

      <LogBlitzPanel onLogged={onLogged} />
      <FnCharts games={games} accent={ACCENT_BLITZ} gradId="fn-blitz" />

      {/* History */}
      {games.length > 0 && (
        <p className="section-label mb-3">History</p>
      )}
      {games.slice(0, visible).map(g => (
        <div
          key={g.id}
          className="flex items-center justify-between px-4 py-3 rounded-xl mb-2 card-animate"
          style={{ background: 'var(--surface-1)', border: `1px solid ${g.win ? 'color-mix(in srgb, var(--chart-alt) 30%, transparent)' : 'var(--border-subtle)'}` }}
        >
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-10 rounded-full flex-shrink-0" style={{ background: g.win ? ACCENT_BLITZ : 'var(--border-default)' }} />
            <div>
              <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                {formatDate(g.date)}
                {g.win && <span className="ml-2 text-xs font-bold px-1.5 py-0.5 rounded" style={{ background: ACCENT_BLITZ, color: 'var(--text-primary)' }}>WIN</span>}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                Blitz {blitzDisplayMode(g.mode)}{g.placement ? ` · #${g.placement}` : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>{g.kills}K</p>
              {g.accuracy != null && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{g.accuracy}%</p>}
            </div>
            <button type="button" aria-label="Edit game" onClick={() => onEdit(g)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 8, background: 'var(--input-bg)', border: 'none', cursor: 'pointer' }}>
              <EditIcon size={13} color="var(--text-muted)" />
            </button>
          </div>
        </div>
      ))}
      {games.length > visible && (
        <button
          type="button"
          onClick={() => setVisible(v => v + 20)}
          className="w-full py-3 rounded-xl font-semibold mt-1"
          style={{ background: 'var(--input-bg)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)', fontSize: 14 }}
        >
          Show more ({games.length - visible} left)
        </button>
      )}

      {games.length === 0 && (
        <EmptyState
          icon={<ZapIcon size={48} color="var(--text-muted)" />}
          title="No Blitz games yet"
          sub="Log your first Blitz game to start tracking."
        />
      )}
    </>
  )
}

// ── Main page ──────────────────────────────────────────────────────

export function Fortnite() {
  usePageTitle('Fortnite')
  const [tab,     setTab]     = useState<FnTab>('normal')
  const [games,   setGames]   = useState<FortniteGame[]>([])
  const [editing, setEditing] = useState<FortniteGame | null>(null)

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('fortnite_games').select('*').eq('user_id', user.id).order('date', { ascending: false }).limit(1000)
    setGames(data ?? [])
  }
  useEffect(() => { load() }, [])

  const normalGames = games.filter(g => !isBlitzMode(g.mode))
  const blitzGames  = games.filter(g =>  isBlitzMode(g.mode))

  return (
    <>
      <TopBar title="Fortnite" back backTo="/hobbies" />
      <PageWrapper>

        {/* Tab switcher */}
        <div className="flex gap-1 mb-5 p-1 rounded-xl" style={{ background: 'var(--input-bg)', border: '1px solid var(--border-faint)' }}>
          {([['normal', 'Normal', ACCENT_NORMAL], ['blitz', 'Blitz', ACCENT_BLITZ]] as const).map(([t, label, color]) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                flex: 1, padding: '9px 0', borderRadius: 10,
                fontWeight: 700, fontSize: 13,
                cursor: 'pointer', transition: 'all 0.15s', border: 'none',
                background: tab === t ? color : 'transparent',
                color: tab === t ? 'var(--base-bg)' : 'var(--text-muted)',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'normal'
          ? <NormalTab games={normalGames} onLogged={load} onEdit={setEditing} />
          : <BlitzTab  games={blitzGames}  onLogged={load} onEdit={setEditing} />
        }

        {editing && <EditFortniteModal game={editing} onClose={() => setEditing(null)} onSaved={load} />}

      </PageWrapper>
    </>
  )
}
