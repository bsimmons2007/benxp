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
import { Card } from '../components/ui/Card'
import { supabase } from '../lib/supabase'
import { CHART_TOOLTIP_STYLE, today, formatDate } from '../lib/utils'
import { useStore } from '../store/useStore'
import { playXPGain, playPR } from '../lib/sounds'
import { XP_RATES } from '../lib/xp'
import { VolleyballIcon, TrophyIcon, EditIcon } from '../components/ui/Icon'
import { usePageTitle } from '../hooks/usePageTitle'
import type { VolleyballSession } from '../types'

const ACCENT = '#f472b6'

// ── Indoor form ───────────────────────────────────────────────────

interface IndoorForm {
  date: string
  sets_won: string
  sets_lost: string
  aces: string
  kills: string
  blocks: string
  digs: string
  assists: string
  opponent: string
  notes: string
}

function LogIndoorPanel({ onLogged }: { onLogged: () => void }) {
  const [open,  setOpen]  = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [isWin, setIsWin] = useState(true)
  const refreshXP       = useStore(s => s.refreshXP)
  const refreshActivity = useStore(s => s.refreshActivity)
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<IndoorForm>({
    defaultValues: { date: today(), sets_won: '', sets_lost: '', aces: '', kills: '', blocks: '', digs: '', assists: '', opponent: '', notes: '' },
  })

  const onSubmit = async (data: IndoorForm) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase.from('volleyball_sessions').insert({
      user_id:   user.id,
      date:      data.date,
      format:    'Indoor',
      win:       isWin,
      sets_won:  data.sets_won  ? parseInt(data.sets_won)  : null,
      sets_lost: data.sets_lost ? parseInt(data.sets_lost) : null,
      aces:      data.aces      ? parseInt(data.aces)      : null,
      kills:     data.kills     ? parseInt(data.kills)     : null,
      blocks:    data.blocks    ? parseInt(data.blocks)    : null,
      digs:      data.digs      ? parseInt(data.digs)      : null,
      assists:   data.assists   ? parseInt(data.assists)   : null,
      opponent:  data.opponent  || null,
      notes:     data.notes     || null,
    })
    if (error) { setToast('Failed to save — try again'); return }
    const xp = XP_RATES.volleyball_game + (isWin ? XP_RATES.volleyball_win : 0)
    if (isWin) { playPR();     setToast(`+${xp} XP — Spike!`) }
    else        { playXPGain(); setToast(`+${xp} XP — Keep grinding!`) }
    await refreshXP(); refreshActivity()
    reset({ date: today(), sets_won: '', sets_lost: '', aces: '', kills: '', blocks: '', digs: '', assists: '', opponent: '', notes: '' })
    setIsWin(true); setOpen(false); onLogged()
  }

  return (
    <div className="mb-4">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all"
        style={{ background: open ? ACCENT : 'var(--input-bg)', color: open ? '#0d0d1a' : ACCENT, border: `1px solid ${ACCENT}`, fontSize: 15 }}
      >
        {open ? '✕ Cancel' : '+ Log Game'}
      </button>
      {open && (
        <div className="mt-3 rounded-xl p-4 pop-in" style={{ background: 'var(--surface-1)', border: '1px solid var(--border-subtle)' }}>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <Input label="Date" type="date" {...register('date', { required: true })} />
            <div className="flex gap-3">
              <Input label="Sets Won"  type="number" placeholder="3" className="flex-1" {...register('sets_won')} />
              <Input label="Sets Lost" type="number" placeholder="1" className="flex-1" {...register('sets_lost')} />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Input label="Aces"    type="number" placeholder="0" {...register('aces')} />
              <Input label="Kills"   type="number" placeholder="0" {...register('kills')} />
              <Input label="Blocks"  type="number" placeholder="0" {...register('blocks')} />
              <Input label="Digs"    type="number" placeholder="0" {...register('digs')} />
              <Input label="Assists" type="number" placeholder="0" {...register('assists')} />
            </div>
            <Input label="Opponent (optional)" type="text" placeholder="Team name…" {...register('opponent')} />
            <Input label="Notes (optional)"    type="text" placeholder="Gym, tournament…" {...register('notes')} />

            {/* Win toggle */}
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => setIsWin(w => !w)}>
              <div className="w-12 h-6 rounded-full transition-colors relative" style={{ background: isWin ? ACCENT : 'var(--border)' }}>
                <div className="absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform" style={{ transform: isWin ? 'translateX(26px)' : 'translateX(2px)' }} />
              </div>
              <span className="font-semibold" style={{ color: isWin ? ACCENT : 'var(--text-muted)', fontSize: 13 }}>
                {isWin ? <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><TrophyIcon size={14} color={ACCENT} /> Win</span> : 'Loss'}
              </span>
            </div>

            <Button type="submit" fullWidth loading={isSubmitting} disabled={isSubmitting}>{isSubmitting ? 'Logging...' : 'Log Game'}</Button>
          </form>
        </div>
      )}
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  )
}

// ── Sand form ─────────────────────────────────────────────────────

interface SandForm {
  date: string
  my_score: string
  opp_score: string
  partner: string
  opponent: string
  notes: string
}

function LogSandPanel({ onLogged }: { onLogged: () => void }) {
  const [open,  setOpen]  = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [isWin, setIsWin] = useState(true)
  const refreshXP       = useStore(s => s.refreshXP)
  const refreshActivity = useStore(s => s.refreshActivity)
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<SandForm>({
    defaultValues: { date: today(), my_score: '', opp_score: '', partner: '', opponent: '', notes: '' },
  })

  const onSubmit = async (data: SandForm) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase.from('volleyball_sessions').insert({
      user_id:   user.id,
      date:      data.date,
      format:    'Sand',
      win:       isWin,
      my_score:  data.my_score  ? parseInt(data.my_score)  : null,
      opp_score: data.opp_score ? parseInt(data.opp_score) : null,
      partner:   data.partner   || null,
      opponent:  data.opponent  || null,
      notes:     data.notes     || null,
    })
    if (error) { setToast('Failed to save — try again'); return }
    const xp = XP_RATES.volleyball_game + (isWin ? XP_RATES.volleyball_win : 0)
    if (isWin) { playPR();     setToast(`+${xp} XP — Beach winner!`) }
    else        { playXPGain(); setToast(`+${xp} XP — Keep grinding!`) }
    await refreshXP(); refreshActivity()
    reset({ date: today(), my_score: '', opp_score: '', partner: '', opponent: '', notes: '' })
    setIsWin(true); setOpen(false); onLogged()
  }

  return (
    <div className="mb-4">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all"
        style={{ background: open ? ACCENT : 'var(--input-bg)', color: open ? '#0d0d1a' : ACCENT, border: `1px solid ${ACCENT}`, fontSize: 15 }}
      >
        {open ? '✕ Cancel' : '+ Log Game'}
      </button>
      {open && (
        <div className="mt-3 rounded-xl p-4 pop-in" style={{ background: 'var(--surface-1)', border: '1px solid var(--border-subtle)' }}>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <Input label="Date" type="date" {...register('date', { required: true })} />
            <div className="flex gap-3">
              <Input label="My Score"  type="number" placeholder="21" className="flex-1" {...register('my_score')} />
              <Input label="Opp Score" type="number" placeholder="18" className="flex-1" {...register('opp_score')} />
            </div>
            <Input label="Partner (optional)"  type="text" placeholder="Name…"   {...register('partner')} />
            <Input label="Opponent (optional)" type="text" placeholder="Team…"   {...register('opponent')} />
            <Input label="Notes (optional)"    type="text" placeholder="Location, tournament…" {...register('notes')} />

            {/* Win toggle */}
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => setIsWin(w => !w)}>
              <div className="w-12 h-6 rounded-full transition-colors relative" style={{ background: isWin ? ACCENT : 'var(--border)' }}>
                <div className="absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform" style={{ transform: isWin ? 'translateX(26px)' : 'translateX(2px)' }} />
              </div>
              <span className="font-semibold" style={{ color: isWin ? ACCENT : 'var(--text-muted)', fontSize: 13 }}>
                {isWin ? <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><TrophyIcon size={14} color={ACCENT} /> Win</span> : 'Loss'}
              </span>
            </div>

            <Button type="submit" fullWidth loading={isSubmitting} disabled={isSubmitting}>{isSubmitting ? 'Logging...' : 'Log Game'}</Button>
          </form>
        </div>
      )}
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  )
}

// ── Edit modal ────────────────────────────────────────────────────

function EditVBModal({ session, onClose, onSaved }: { session: VolleyballSession; onClose: () => void; onSaved: () => void }) {
  const [win,     setWin]     = useState(session.win)
  const [saving,  setSaving]  = useState(false)
  const [setsWon,  setSetsWon]  = useState(String(session.sets_won  ?? ''))
  const [setsLost, setSetsLost] = useState(String(session.sets_lost ?? ''))
  const [myScore,  setMyScore]  = useState(String(session.my_score  ?? ''))
  const [oppScore, setOppScore] = useState(String(session.opp_score ?? ''))

  async function save() {
    setSaving(true)
    const patch: Record<string, unknown> = { win }
    if (session.format === 'Indoor') {
      patch.sets_won  = setsWon  ? parseInt(setsWon)  : null
      patch.sets_lost = setsLost ? parseInt(setsLost) : null
    } else {
      patch.my_score  = myScore  ? parseInt(myScore)  : null
      patch.opp_score = oppScore ? parseInt(oppScore) : null
    }
    const { error } = await supabase.from('volleyball_sessions').update(patch).eq('id', session.id)
    setSaving(false)
    if (!error) { onSaved(); onClose() }
  }
  async function del() {
    const { error } = await supabase.from('volleyball_sessions').delete().eq('id', session.id)
    if (!error) { onSaved(); onClose() }
  }

  return (
    <EditModal title={`Edit — ${formatDate(session.date)}`} onClose={onClose} onDelete={del} onSave={save} saving={saving}>
      <div className="flex flex-col gap-4">
        {session.format === 'Indoor' ? (
          <div className="flex gap-3">
            <div className="flex flex-col gap-1 flex-1">
              <label className="section-label">Sets Won</label>
              <input type="number" value={setsWon} onChange={e => setSetsWon(e.target.value)} className="px-3 py-2.5 rounded-xl outline-none w-full text-sm" style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
            </div>
            <div className="flex flex-col gap-1 flex-1">
              <label className="section-label">Sets Lost</label>
              <input type="number" value={setsLost} onChange={e => setSetsLost(e.target.value)} className="px-3 py-2.5 rounded-xl outline-none w-full text-sm" style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
            </div>
          </div>
        ) : (
          <div className="flex gap-3">
            <div className="flex flex-col gap-1 flex-1">
              <label className="section-label">My Score</label>
              <input type="number" value={myScore} onChange={e => setMyScore(e.target.value)} className="px-3 py-2.5 rounded-xl outline-none w-full text-sm" style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
            </div>
            <div className="flex flex-col gap-1 flex-1">
              <label className="section-label">Opp Score</label>
              <input type="number" value={oppScore} onChange={e => setOppScore(e.target.value)} className="px-3 py-2.5 rounded-xl outline-none w-full text-sm" style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
            </div>
          </div>
        )}
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setWin(w => !w)}>
          <div className="w-12 h-6 rounded-full transition-colors relative" style={{ background: win ? ACCENT : 'var(--border)' }}>
            <div className="absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform" style={{ transform: win ? 'translateX(26px)' : 'translateX(2px)' }} />
          </div>
          <span className="font-medium" style={{ color: 'var(--text-primary)' }}>Win</span>
        </div>
      </div>
    </EditModal>
  )
}

// ── Main page ─────────────────────────────────────────────────────

const ttStyle = CHART_TOOLTIP_STYLE

export function Volleyball() {
  usePageTitle('Volleyball')
  const [tab,     setTab]     = useState<'Indoor' | 'Sand'>('Indoor')
  const [all,     setAll]     = useState<VolleyballSession[]>([])
  const [editing, setEditing] = useState<VolleyballSession | null>(null)

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('volleyball_sessions').select('*').eq('user_id', user.id).order('date', { ascending: false })
    setAll(data ?? [])
  }
  useEffect(() => { load() }, [])

  const games   = all.filter(g => g.format === tab)
  const wins    = games.filter(g => g.win).length
  const losses  = games.length - wins
  const winRate = games.length ? Math.round((wins / games.length) * 100) : 0
  const streak  = (() => { let s = 0; for (const g of games) { if (g.win) s++; else break } return s })()

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
      <TopBar title="Volleyball" back backTo="/hobbies" />
      <PageWrapper>

        {/* Tab switcher */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {(['Indoor', 'Sand'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                flex: 1, padding: '10px 0', borderRadius: 12, fontWeight: 700, fontSize: 14,
                background: tab === t ? ACCENT : 'var(--input-bg)',
                color: tab === t ? '#0d0d1a' : 'var(--text-muted)',
                border: `1px solid ${tab === t ? ACCENT : 'var(--border)'}`,
                cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              {t === 'Indoor' ? 'Indoor' : 'Sand'}
            </button>
          ))}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          {[
            { label: 'Wins',     value: wins },
            { label: 'Win Rate', value: games.length ? `${winRate}%` : '—' },
            { label: 'Streak',   value: streak || '—' },
          ].map(s => (
            <div key={s.label} className="rounded-xl p-3 text-center" style={{ background: 'var(--surface-1)', border: '1px solid var(--border-subtle)' }}>
              <p style={{ fontSize: 22, fontWeight: 700, color: ACCENT, fontFamily: 'var(--font-mono)', lineHeight: 1 }}>{s.value}</p>
              <p className="section-label mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {games.length > 0 && (
          <div className="rounded-xl px-4 py-3 mb-4 flex items-center justify-between" style={{ background: `${ACCENT}10`, border: `1px solid ${ACCENT}30` }}>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{games.length} games</span>
            <div className="flex items-center gap-4">
              <span style={{ fontSize: 14, fontWeight: 700, color: ACCENT }}>{wins}W</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#f87171' }}>{losses}L</span>
            </div>
          </div>
        )}

        {/* Log form */}
        {tab === 'Indoor' ? <LogIndoorPanel onLogged={load} /> : <LogSandPanel onLogged={load} />}

        {/* Chart */}
        {chartData.length >= 2 && (
          <Card className="mb-4">
            <p className="font-bold mb-3" style={{ fontSize: 15, color: 'var(--text-primary)' }}>Monthly Record</p>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={chartData} barGap={4}>
                <CartesianGrid strokeDasharray="3 6" stroke="var(--border-subtle)" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: 'var(--text-tertiary)', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fill: 'var(--text-tertiary)', fontSize: 9 }} axisLine={false} tickLine={false} width={20} />
                <Tooltip contentStyle={ttStyle} cursor={{ fill: 'var(--border-subtle)' }} />
                <Bar dataKey="wins"   name="Wins"   fill={ACCENT}   fillOpacity={0.85} radius={[4, 4, 0, 0]} />
                <Bar dataKey="losses" name="Losses" fill="#f87171"  fillOpacity={0.7}  radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        )}

        {/* History */}
        {games.length > 0 && <p className="section-label mb-3">History</p>}
        {games.map(g => (
          <Card key={g.id} className="flex items-center justify-between mb-2" style={{ padding: '12px 16px' }}>
            <div className="flex items-center gap-3">
              <div style={{
                width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                background: g.win ? `${ACCENT}20` : 'rgba(248,113,113,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {g.win
                  ? <TrophyIcon size={16} color={ACCENT} />
                  : <VolleyballIcon size={16} color="var(--text-muted)" />}
              </div>
              <div>
                <p style={{ color: 'var(--text-primary)', fontSize: 13, fontWeight: 600 }}>{formatDate(g.date)}</p>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>
                  {g.format === 'Indoor'
                    ? (g.sets_won != null && g.sets_lost != null ? `${g.sets_won}—${g.sets_lost} sets` : 'Indoor')
                    : (g.partner ? `w/ ${g.partner}` : 'Sand')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div style={{ textAlign: 'right' }}>
                {g.format === 'Sand' && g.my_score != null && g.opp_score != null && (
                  <p style={{ fontSize: 16, fontWeight: 700, color: g.win ? ACCENT : '#f87171' }}>
                    {g.my_score}—{g.opp_score}
                  </p>
                )}
                <p style={{ fontSize: 11, fontWeight: 600, color: g.win ? ACCENT : '#f87171' }}>
                  {g.win ? 'Win' : 'Loss'}
                </p>
              </div>
              <button onClick={() => setEditing(g)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 8, background: 'var(--input-bg)', border: 'none', cursor: 'pointer' }}>
                <EditIcon size={13} color="var(--text-muted)" />
              </button>
            </div>
          </Card>
        ))}

        {games.length === 0 && (
          <EmptyState
            icon={<VolleyballIcon size={56} color="var(--text-muted)" />}
            title="No games logged yet"
            sub={`Log your first ${tab.toLowerCase()} volleyball game to start tracking.`}
          />
        )}

        {editing && <EditVBModal session={editing} onClose={() => setEditing(null)} onSaved={load} />}
      </PageWrapper>
    </>
  )
}
