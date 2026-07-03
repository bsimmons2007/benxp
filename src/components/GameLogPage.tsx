import { useEffect, useState, useMemo } from 'react'
import type { ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { TopBar } from './layout/TopBar'
import { PageWrapper } from './layout/PageWrapper'
import { Input } from './ui/Input'
import { Button } from './ui/Button'
import { Toast } from './ui/Toast'
import { EditModal } from './ui/EditModal'
import { EmptyState } from './ui/EmptyState'
import { Card } from './ui/Card'
import { supabase } from '../lib/supabase'
import { CHART_TOOLTIP_STYLE, today, formatDate } from '../lib/utils'
import { useStore } from '../store/useStore'
import { playXPGain, playPR } from '../lib/sounds'
import { EditIcon, TrophyIcon, CircleIcon } from './ui/Icon'
import type { IconComponent } from './ui/Icon'

const PAGE_SIZE = 10
const LOAD_MORE = 20

// ── Config types ──────────────────────────────────────────────────

export type GameResult = 'win' | 'loss' | 'draw'

/** A base row every game shares. Sports extend this via generics. */
export interface GameRowBase {
  id: string
  date: string
  win?: boolean
  result?: string
}

export interface GameSelectField {
  key: string
  label: string
  options: string[]
}

export interface GameTextField {
  key: string
  label: string
  placeholder?: string
  type?: 'text' | 'number'
}

export interface StatDef<Row> {
  label: string
  value: (rows: Row[]) => string | number
  color?: string
}

export interface GameToggleField {
  key: string
  label: string
  /** shown next to the label when on, e.g. "+25 XP" */
  hint?: string
}

export interface GameLogConfig<Row extends GameRowBase> {
  table: string
  title: string
  backTo: string
  Icon: IconComponent
  emptyTitle: string
  emptySub: string
  logButtonLabel: string      // e.g. "Log Game"
  /** win/loss or win/draw/loss */
  resultMode: 'winloss' | 'wdl'
  /** score inputs shown in log form + history (my_score / opp_score) */
  hasScores?: boolean
  /** optional dropdown shown in the log form (e.g. game_type) */
  selectField?: GameSelectField
  /** extra optional text/number fields for the log form */
  textFields?: GameTextField[]
  /** optional boolean toggle in the log + edit form (e.g. break_and_run) */
  toggleField?: GameToggleField
  /** if set, a filter chip row over this row field (e.g. game_type) */
  filterField?: string
  /** XP reward computed for a submission — drives toast number */
  xp: (win: boolean, result: GameResult, toggle: boolean) => number
  /** toast copy per outcome */
  toast: (result: GameResult) => string
  /** extra stat cards beyond the default Wins / Win Rate / Streak */
  extraStats?: StatDef<Row>[]
  /** map form values → insert payload (excluding user_id / win / result / date / toggle) */
  buildInsert?: (data: Record<string, string>) => Record<string, unknown>
  /** map row → sub-line under the date in history (e.g. "vs John") */
  historySub?: (row: Row) => ReactNode
  /** map row → the select-field tag shown next to the date */
  historyTag?: (row: Row) => string | null | undefined
}

// ── Helpers ────────────────────────────────────────────────────────

function outcomeOf(row: GameRowBase, mode: 'winloss' | 'wdl'): GameResult {
  if (mode === 'wdl') return (row.result as GameResult) ?? 'loss'
  return row.win ? 'win' : 'loss'
}

function outcomeColor(o: GameResult): string {
  if (o === 'win') return 'var(--green)'
  if (o === 'draw') return 'var(--warning)'
  return 'var(--red)'
}

function outcomeLabel(o: GameResult): string {
  if (o === 'win') return 'Win'
  if (o === 'draw') return 'Draw'
  return 'Loss'
}

// ── Log panel ───────────────────────────────────────────────────────

function LogPanel<Row extends GameRowBase>({ cfg, onLogged }: { cfg: GameLogConfig<Row>; onLogged: () => void }) {
  const [open, setOpen]   = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [result, setResult] = useState<GameResult | null>(null)
  const [toggle, setToggle] = useState(false)
  const refreshXP       = useStore(s => s.refreshXP)
  const refreshActivity = useStore(s => s.refreshActivity)

  const defaults = useMemo(() => {
    const d: Record<string, string> = { date: today() }
    if (cfg.selectField) d[cfg.selectField.key] = cfg.selectField.options[0]
    if (cfg.hasScores) { d.my_score = ''; d.opp_score = '' }
    cfg.textFields?.forEach(f => { d[f.key] = '' })
    return d
  }, [cfg])

  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<Record<string, string>>({ defaultValues: defaults })

  const resultOptions: GameResult[] = cfg.resultMode === 'wdl' ? ['win', 'draw', 'loss'] : ['win', 'loss']

  const onSubmit = async (data: Record<string, string>) => {
    if (!result) return
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const isWin = result === 'win'
    const payload: Record<string, unknown> = {
      user_id: user.id,
      date: data.date,
    }
    if (cfg.resultMode === 'wdl') payload.result = result
    else payload.win = isWin
    if (cfg.selectField) payload[cfg.selectField.key] = data[cfg.selectField.key]
    if (cfg.hasScores) {
      payload.my_score  = data.my_score  ? parseInt(data.my_score)  : null
      payload.opp_score = data.opp_score ? parseInt(data.opp_score) : null
    }
    if (cfg.toggleField) payload[cfg.toggleField.key] = toggle
    if (cfg.buildInsert) Object.assign(payload, cfg.buildInsert(data))

    const { error } = await supabase.from(cfg.table).insert(payload)
    if (error) { setToast('Failed to save — try again'); return }
    const xp = cfg.xp(isWin, result, toggle)
    if (isWin) playPR(); else playXPGain()
    setToast(`+${xp} XP — ${cfg.toast(result)}`)
    await refreshXP(); refreshActivity()
    reset(defaults)
    setResult(null)
    setToggle(false)
    setOpen(false)
    onLogged()
  }

  return (
    <div className="mb-5">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all"
        style={{ background: open ? 'var(--accent)' : 'var(--input-bg)', color: open ? 'var(--base-bg)' : 'var(--accent)', border: '1px solid var(--accent)', fontSize: 15 }}
      >
        {open ? 'Cancel' : cfg.logButtonLabel}
      </button>
      {open && (
        <div className="mt-3 rounded-xl p-4 pop-in" style={{ background: 'var(--surface-1)', border: '1px solid var(--border-subtle)' }}>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <Input label="Date" type="date" {...register('date', { required: true })} />

            {cfg.selectField && (
              <div className="flex flex-col gap-1">
                <label className="text-base font-medium" style={{ color: 'var(--text-secondary)' }}>{cfg.selectField.label}</label>
                <select {...register(cfg.selectField.key)} className="px-3 py-2.5 rounded-lg outline-none" style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                  {cfg.selectField.options.map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
            )}

            {cfg.hasScores && (
              <div className="flex gap-3">
                <Input label="My Score"  type="number" placeholder="11" className="flex-1" {...register('my_score')} />
                <Input label="Opp Score" type="number" placeholder="9"  className="flex-1" {...register('opp_score')} />
              </div>
            )}

            {cfg.textFields?.map(f => (
              <Input key={f.key} label={f.label} type={f.type ?? 'text'} placeholder={f.placeholder} {...register(f.key)} />
            ))}

            {/* Required result — no default */}
            <div className="flex flex-col gap-2">
              <label className="section-label">Result</label>
              <div className="flex gap-2">
                {resultOptions.map(r => {
                  const active = result === r
                  return (
                    <button
                      key={r}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setResult(r)}
                      style={{
                        flex: 1, textAlign: 'center', padding: '10px 4px', borderRadius: 10, cursor: 'pointer',
                        background: active ? `color-mix(in srgb, ${outcomeColor(r)} 15%, transparent)` : 'var(--input-bg)',
                        border: `1px solid ${active ? outcomeColor(r) : 'var(--border)'}`,
                        color: active ? outcomeColor(r) : 'var(--text-muted)',
                        fontWeight: active ? 700 : 500, fontSize: 13, transition: 'all 0.15s',
                      }}
                    >
                      {outcomeLabel(r)}
                    </button>
                  )
                })}
              </div>
            </div>

            {cfg.toggleField && (
              <button
                type="button"
                role="switch"
                aria-checked={toggle}
                aria-label={cfg.toggleField.label}
                onClick={() => setToggle(t => !t)}
                className="flex items-center gap-3"
                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
              >
                <div className="w-12 h-6 rounded-full transition-colors relative" style={{ background: toggle ? 'var(--warning)' : 'var(--border)' }}>
                  <div className="absolute top-0.5 w-5 h-5 rounded-full transition-transform" style={{ background: 'var(--surface-1)', transform: toggle ? 'translateX(26px)' : 'translateX(2px)' }} />
                </div>
                <span className="font-semibold" style={{ color: toggle ? 'var(--warning)' : 'var(--text-muted)', fontSize: 13 }}>
                  {cfg.toggleField.label}
                  {toggle && cfg.toggleField.hint && <span style={{ marginLeft: 6 }}>{cfg.toggleField.hint}</span>}
                </span>
              </button>
            )}

            <Button type="submit" fullWidth loading={isSubmitting} disabled={isSubmitting || !result}>
              {isSubmitting ? 'Logging...' : cfg.logButtonLabel}
            </Button>
          </form>
        </div>
      )}
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  )
}

// ── Edit modal ──────────────────────────────────────────────────────

function EditGameModal<Row extends GameRowBase>({ cfg, row, onClose, onSaved }: {
  cfg: GameLogConfig<Row>; row: Row; onClose: () => void; onSaved: () => void
}) {
  const [result,   setResult]   = useState<GameResult>(outcomeOf(row, cfg.resultMode))
  const [myScore,  setMyScore]  = useState(String((row as GameRowBase & { my_score?: number | null }).my_score ?? ''))
  const [oppScore, setOppScore] = useState(String((row as GameRowBase & { opp_score?: number | null }).opp_score ?? ''))
  const [toggle,   setToggle]   = useState<boolean>(
    cfg.toggleField ? Boolean((row as Record<string, unknown>)[cfg.toggleField.key]) : false
  )
  const [saving,   setSaving]   = useState(false)

  const resultOptions: GameResult[] = cfg.resultMode === 'wdl' ? ['win', 'draw', 'loss'] : ['win', 'loss']

  async function save() {
    setSaving(true)
    const patch: Record<string, unknown> = {}
    if (cfg.resultMode === 'wdl') patch.result = result
    else patch.win = result === 'win'
    if (cfg.hasScores) {
      patch.my_score  = myScore  ? parseInt(myScore)  : null
      patch.opp_score = oppScore ? parseInt(oppScore) : null
    }
    if (cfg.toggleField) patch[cfg.toggleField.key] = toggle
    const { error } = await supabase.from(cfg.table).update(patch).eq('id', row.id)
    setSaving(false)
    if (!error) { onSaved(); onClose() }
  }
  async function del() {
    const { error } = await supabase.from(cfg.table).delete().eq('id', row.id)
    if (!error) { onSaved(); onClose() }
  }

  return (
    <EditModal title={`Edit — ${formatDate(row.date)}`} onClose={onClose} onDelete={del} onSave={save} saving={saving}>
      <div className="flex flex-col gap-4">
        {cfg.hasScores && (
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
        <div className="flex flex-col gap-2">
          <label className="section-label">Result</label>
          <div className="flex gap-2">
            {resultOptions.map(r => {
              const active = result === r
              return (
                <button
                  key={r}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setResult(r)}
                  style={{
                    flex: 1, padding: '10px 4px', borderRadius: 10, cursor: 'pointer',
                    background: active ? `color-mix(in srgb, ${outcomeColor(r)} 15%, transparent)` : 'var(--input-bg)',
                    border: `1px solid ${active ? outcomeColor(r) : 'var(--border)'}`,
                    color: active ? outcomeColor(r) : 'var(--text-muted)',
                    fontWeight: active ? 700 : 500, fontSize: 13,
                  }}
                >
                  {outcomeLabel(r)}
                </button>
              )
            })}
          </div>
        </div>
        {cfg.toggleField && (
          <button
            type="button"
            role="switch"
            aria-checked={toggle}
            aria-label={cfg.toggleField.label}
            onClick={() => setToggle(t => !t)}
            className="flex items-center gap-3"
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
          >
            <div className="w-12 h-6 rounded-full transition-colors relative" style={{ background: toggle ? 'var(--warning)' : 'var(--border)' }}>
              <div className="absolute top-0.5 w-5 h-5 rounded-full transition-transform" style={{ background: 'var(--surface-1)', transform: toggle ? 'translateX(26px)' : 'translateX(2px)' }} />
            </div>
            <span className="font-medium" style={{ color: toggle ? 'var(--warning)' : 'var(--text-muted)' }}>{cfg.toggleField.label}</span>
          </button>
        )}
      </div>
    </EditModal>
  )
}

// ── Monthly chart ───────────────────────────────────────────────────

function MonthlyChart<Row extends GameRowBase>({ cfg, rows }: { cfg: GameLogConfig<Row>; rows: Row[] }) {
  const monthMap: Record<string, { wins: number; losses: number }> = {}
  rows.forEach(g => {
    const k = g.date.slice(0, 7)
    if (!monthMap[k]) monthMap[k] = { wins: 0, losses: 0 }
    if (outcomeOf(g, cfg.resultMode) === 'win') monthMap[k].wins++; else monthMap[k].losses++
  })
  const data = Object.entries(monthMap)
    .sort(([a], [b]) => a.localeCompare(b)).slice(-6)
    .map(([month, d]) => ({ month: month.slice(5), ...d }))

  if (data.length < 2) {
    return (
      <Card className="mb-4">
        <p className="font-bold mb-2" style={{ fontSize: 15, color: 'var(--text-primary)' }}>Monthly Record</p>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', padding: '12px 0' }}>
          Monthly chart unlocks after your second month of games.
        </p>
      </Card>
    )
  }

  return (
    <Card className="mb-4">
      <p className="font-bold mb-3" style={{ fontSize: 15, color: 'var(--text-primary)' }}>Monthly Record</p>
      <ResponsiveContainer width="100%" height={140}>
        <BarChart data={data} barGap={4}>
          <CartesianGrid strokeDasharray="3 6" stroke="var(--border-subtle)" vertical={false} />
          <XAxis dataKey="month" tick={{ fill: 'var(--text-tertiary)', fontSize: 10 }} axisLine={false} tickLine={false} />
          <YAxis allowDecimals={false} tick={{ fill: 'var(--text-tertiary)', fontSize: 9 }} axisLine={false} tickLine={false} width={20} />
          <Tooltip contentStyle={CHART_TOOLTIP_STYLE} cursor={{ fill: 'var(--border-subtle)' }} />
          <Bar dataKey="wins"   name="Wins"   fill="var(--green)" fillOpacity={0.85} radius={[4, 4, 0, 0]} />
          <Bar dataKey="losses" name="Losses" fill="var(--red)"   fillOpacity={0.7}  radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  )
}

// ── Main page ───────────────────────────────────────────────────────

export function GameLogPage<Row extends GameRowBase>({ cfg }: { cfg: GameLogConfig<Row> }) {
  const [rows,    setRows]    = useState<Row[]>([])
  const [editing, setEditing] = useState<Row | null>(null)
  const [filter,  setFilter]  = useState<string>('All')
  const [visible, setVisible] = useState(PAGE_SIZE)

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from(cfg.table).select('*').eq('user_id', user.id).order('date', { ascending: false })
    setRows((data as Row[]) ?? [])
  }
  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const filterKey = cfg.filterField
  const filterOptions = useMemo(() => {
    if (!filterKey) return []
    const vals = [...new Set(rows.map(r => (r as Record<string, unknown>)[filterKey] as string).filter(Boolean))]
    return vals.length > 1 ? ['All', ...vals] : []
  }, [rows, filterKey])

  const filtered = filterKey && filter !== 'All'
    ? rows.filter(r => (r as Record<string, unknown>)[filterKey] === filter)
    : rows

  useEffect(() => { setVisible(PAGE_SIZE) }, [filter])

  const wins    = filtered.filter(g => outcomeOf(g, cfg.resultMode) === 'win').length
  const losses  = filtered.filter(g => outcomeOf(g, cfg.resultMode) === 'loss').length
  const winRate = filtered.length ? Math.round((wins / filtered.length) * 100) : 0
  const streak  = (() => { let s = 0; for (const g of filtered) { if (outcomeOf(g, cfg.resultMode) === 'win') s++; else break } return s })()

  const statCards: StatDef<Row>[] = cfg.extraStats ?? [
    { label: 'Wins',     value: () => wins },
    { label: 'Win Rate', value: () => filtered.length ? `${winRate}%` : '—' },
    { label: 'Streak',   value: () => streak || '—' },
  ]

  const shown = filtered.slice(0, visible)

  return (
    <>
      <TopBar title={cfg.title} back backTo={cfg.backTo} />
      <PageWrapper>

        {filterOptions.length > 0 && (
          <div className="flex gap-2 mb-3">
            {filterOptions.map(f => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className="px-3 py-1.5 rounded-full text-xs font-semibold"
                style={{
                  background: filter === f ? 'var(--accent)' : 'var(--input-bg)',
                  color: filter === f ? 'var(--base-bg)' : 'var(--text-muted)',
                  border: `1px solid ${filter === f ? 'var(--accent)' : 'var(--border)'}`,
                }}
              >
                {f}
              </button>
            ))}
          </div>
        )}

        {/* Stats */}
        <div className="grid gap-2 mb-3" style={{ gridTemplateColumns: `repeat(${statCards.length === 4 ? 2 : 3}, 1fr)` }}>
          {statCards.map(s => (
            <div key={s.label} className="rounded-xl p-3 text-center card-animate" style={{ background: 'var(--surface-1)', border: '1px solid var(--border-subtle)' }}>
              <p style={{ fontSize: 22, fontWeight: 700, color: s.color ?? 'var(--accent)', fontFamily: 'var(--font-mono)', lineHeight: 1 }}>{s.value(filtered)}</p>
              <p className="section-label mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* W/L row */}
        {filtered.length > 0 && (
          <div className="rounded-xl px-4 py-3 mb-4 flex items-center justify-between" style={{ background: 'var(--accent-subtle)', border: '1px solid var(--accent-dim)' }}>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{filtered.length} games{filterKey && filter !== 'All' ? ` (${filter})` : ''}</span>
            <div className="flex items-center gap-4">
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--green)' }}>{wins}W</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--red)' }}>{losses}L</span>
            </div>
          </div>
        )}

        <LogPanel cfg={cfg} onLogged={load} />

        {filtered.length > 0 && <MonthlyChart cfg={cfg} rows={filtered} />}

        {/* History */}
        {filtered.length > 0 && <p className="section-label mb-3">History</p>}
        {shown.map(row => {
          const o = outcomeOf(row, cfg.resultMode)
          const tag = cfg.historyTag?.(row)
          const sub = cfg.historySub?.(row)
          const myScore  = (row as GameRowBase & { my_score?: number | null }).my_score
          const oppScore = (row as GameRowBase & { opp_score?: number | null }).opp_score
          return (
            <Card key={row.id} className="flex items-center justify-between mb-2 card-animate" style={{ padding: '12px 16px' }}>
              <div className="flex items-center gap-3">
                <div style={{
                  width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                  background: o === 'win' ? 'color-mix(in srgb, var(--green) 15%, transparent)' : 'color-mix(in srgb, var(--red) 12%, transparent)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {o === 'win'
                    ? <TrophyIcon size={16} color="var(--green)" />
                    : <CircleIcon size={15} color="var(--text-muted)" />}
                </div>
                <div>
                  <p style={{ color: 'var(--text-primary)', fontSize: 13, fontWeight: 600 }}>
                    {formatDate(row.date)}
                    {tag && <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--text-muted)' }}>{tag}</span>}
                  </p>
                  {sub && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{sub}</div>}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div style={{ textAlign: 'right' }}>
                  {cfg.hasScores && myScore != null && oppScore != null && (
                    <p style={{ fontSize: 16, fontWeight: 700, color: outcomeColor(o) }}>{myScore}—{oppScore}</p>
                  )}
                  <p style={{ fontSize: 11, fontWeight: 600, color: outcomeColor(o) }}>{outcomeLabel(o)}</p>
                </div>
                <button
                  type="button"
                  aria-label="Edit game"
                  onClick={() => setEditing(row)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 8, background: 'var(--input-bg)', border: 'none', cursor: 'pointer' }}
                >
                  <EditIcon size={13} color="var(--text-muted)" />
                </button>
              </div>
            </Card>
          )
        })}

        {filtered.length > visible && (
          <button
            type="button"
            onClick={() => setVisible(v => v + LOAD_MORE)}
            className="w-full py-3 rounded-xl font-semibold mt-1"
            style={{ background: 'var(--input-bg)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)', fontSize: 14 }}
          >
            Show more ({filtered.length - visible} left)
          </button>
        )}

        {rows.length === 0 && (
          <EmptyState
            icon={<cfg.Icon size={56} color="var(--text-muted)" />}
            title={cfg.emptyTitle}
            sub={cfg.emptySub}
          />
        )}

        {editing && <EditGameModal cfg={cfg} row={editing} onClose={() => setEditing(null)} onSaved={load} />}
      </PageWrapper>
    </>
  )
}
