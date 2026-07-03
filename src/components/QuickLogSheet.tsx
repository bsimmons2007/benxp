import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useStore } from '../store/useStore'
import { XP_RATES } from '../lib/xp'
import { today } from '../lib/utils'
import { getLastUsed, setLastUsed } from '../lib/lastUsed'
import { playXPGain, playPR } from '../lib/sounds'
import { Toast } from './ui/Toast'
import {
  DumbbellIcon, RunIcon, MoonIcon, BrainIcon, DropletIcon, BookIcon,
  GamepadIcon, BasketballIcon, TargetIcon, PoolIcon, TableTennisIcon,
  VolleyballIcon, SpikeballIcon, ChessIcon, GolfIcon, DiscIcon,
  MountainIcon, SkateIcon, ChevronRightIcon,
  type IconComponent,
} from './ui/Icon'

// ── Activity registry ─────────────────────────────────────────────
// `kind` drives which inline form renders. `link` activities navigate out.

type ActivityKind = 'water' | 'mood' | 'sleep' | 'cardio' | 'winloss' | 'skate' | 'hiking' | 'link'

interface QuickActivity {
  id: string
  label: string
  Icon: IconComponent
  color: string
  kind: ActivityKind
  /** table + latest-date detection key in rawRows for recency sorting */
  recencyDates?: () => string[]
  /** for winloss: table + which win column + optional selectField */
  table?: string
  /** navigate target for link kind (and the "log full" fallback) */
  to?: string
  /** win-loss reward */
  winXP?: (win: boolean) => number
  /** optional dropdown for winloss (game type) */
  select?: { key: string; label: string; options: string[] }
  /** whether the winloss table stores result as `win` boolean */
  buildInsert?: (win: boolean, sel: string, myScore: string, oppScore: string) => Record<string, unknown>
  scores?: boolean
}

const CARDIO_TYPES = [
  { key: 'run',  label: 'Run',  rate: XP_RATES.cardio_run_per_mile },
  { key: 'bike', label: 'Bike', rate: XP_RATES.cardio_bike_per_mile },
  { key: 'swim', label: 'Swim', rate: XP_RATES.cardio_swim_per_mile },
  { key: 'walk', label: 'Walk', rate: XP_RATES.cardio_walk_per_mile },
]

export function useQuickActivities(): QuickActivity[] {
  const rawRows = useStore(s => s.rawRows)

  return useMemo(() => {
    const r = rawRows
    const dates = (arr: { date: string }[] | undefined) => (arr ?? []).map(x => x.date)

    // Wellness basics — always present.
    const base: QuickActivity[] = [
      { id: 'water', label: 'Water', Icon: DropletIcon, color: 'var(--cat-wellness)', kind: 'water',
        recencyDates: () => dates(r?.waterRows) },
      { id: 'mood', label: 'Mood', Icon: BrainIcon, color: 'var(--cat-mood)', kind: 'mood',
        recencyDates: () => dates(r?.moodRows) },
      { id: 'sleep', label: 'Sleep', Icon: MoonIcon, color: 'var(--cat-sleep)', kind: 'sleep',
        recencyDates: () => dates(r?.sleepRows) },
      { id: 'cardio', label: 'Cardio', Icon: RunIcon, color: 'var(--cat-cardio)', kind: 'cardio',
        recencyDates: () => dates(r?.cardioRows) },
      { id: 'lifting', label: 'Lifting', Icon: DumbbellIcon, color: 'var(--accent)', kind: 'link', to: '/lifting',
        recencyDates: () => dates(r?.liftingRows) },
    ]

    // Optional — only shown if the user has data for them.
    const optional: (QuickActivity & { has: boolean })[] = [
      { id: 'books', label: 'Books', Icon: BookIcon, color: 'var(--cat-books)', kind: 'link', to: '/books',
        has: (r?.bookRows?.length ?? 0) > 0, recencyDates: () => (r?.bookRows ?? []).map(b => b.date_finished ?? '').filter(Boolean) },
      { id: 'skate', label: 'Skate', Icon: SkateIcon, color: 'var(--cat-cardio)', kind: 'skate',
        has: (r?.skateRows?.length ?? 0) > 0, recencyDates: () => dates(r?.skateRows) },
      { id: 'hiking', label: 'Hiking', Icon: MountainIcon, color: 'var(--cat-wellness)', kind: 'hiking',
        has: (r?.hikeRows?.length ?? 0) > 0, recencyDates: () => dates(r?.hikeRows) },
      { id: 'fortnite', label: 'Fortnite', Icon: GamepadIcon, color: 'var(--cat-gaming)', kind: 'link', to: '/fortnite',
        has: (r?.gameRows?.length ?? 0) > 0, recencyDates: () => dates(r?.gameRows) },
      { id: 'basketball', label: 'Hoops', Icon: BasketballIcon, color: 'var(--cat-sports)', kind: 'link', to: '/basketball',
        has: (r?.bbRows?.length ?? 0) > 0, recencyDates: () => dates(r?.bbRows) },
      { id: 'pickleball', label: 'Pickleball', Icon: TargetIcon, color: 'var(--cat-sports)', kind: 'winloss',
        table: 'pickleball_games', to: '/pickleball',
        select: { key: 'game_type', label: 'Game Type', options: ['Singles', 'Doubles'] }, scores: true,
        winXP: w => XP_RATES.pickleball_game + (w ? XP_RATES.pickleball_win : 0),
        buildInsert: (w, sel, my, opp) => ({ win: w, game_type: sel, my_score: my ? parseInt(my) : null, opp_score: opp ? parseInt(opp) : null }),
        has: (r?.pbRows?.length ?? 0) > 0, recencyDates: () => dates(r?.pbRows) },
      { id: 'pool', label: 'Pool', Icon: PoolIcon, color: 'var(--cat-sports)', kind: 'winloss',
        table: 'pool_games', to: '/pool',
        select: { key: 'game_type', label: 'Game Type', options: ['8-Ball', '9-Ball', 'Straight'] },
        winXP: w => XP_RATES.pool_game + (w ? XP_RATES.pool_win : 0),
        buildInsert: (w, sel) => ({ win: w, game_type: sel, break_and_run: false }),
        has: (r?.poolRows?.length ?? 0) > 0, recencyDates: () => dates(r?.poolRows) },
      { id: 'table_tennis', label: 'Table Tennis', Icon: TableTennisIcon, color: 'var(--cat-sports)', kind: 'winloss',
        table: 'table_tennis_games', to: '/table-tennis', scores: true,
        select: { key: 'game_type', label: 'Game Type', options: ['Singles', 'Doubles'] },
        winXP: w => XP_RATES.table_tennis_game + (w ? XP_RATES.table_tennis_win : 0),
        buildInsert: (w, sel, my, opp) => ({ win: w, game_type: sel, my_score: my ? parseInt(my) : null, opp_score: opp ? parseInt(opp) : null }),
        has: (r?.ttRows?.length ?? 0) > 0, recencyDates: () => dates(r?.ttRows) },
      { id: 'volleyball', label: 'Volleyball', Icon: VolleyballIcon, color: 'var(--cat-sports)', kind: 'winloss',
        table: 'volleyball_sessions', to: '/volleyball',
        select: { key: 'format', label: 'Format', options: ['Indoor', 'Sand'] },
        winXP: w => XP_RATES.volleyball_game + (w ? XP_RATES.volleyball_win : 0),
        buildInsert: (w, sel) => ({ win: w, format: sel }),
        has: (r?.vbRows?.length ?? 0) > 0, recencyDates: () => dates(r?.vbRows) },
      { id: 'spikeball', label: 'Spikeball', Icon: SpikeballIcon, color: 'var(--cat-sports)', kind: 'winloss',
        table: 'spikeball_games', to: '/spikeball', scores: true,
        winXP: w => XP_RATES.spikeball_game + (w ? XP_RATES.spikeball_win : 0),
        buildInsert: (w, _sel, my, opp) => ({ win: w, my_score: my ? parseInt(my) : null, opp_score: opp ? parseInt(opp) : null }),
        has: (r?.sbRows?.length ?? 0) > 0, recencyDates: () => dates(r?.sbRows) },
      { id: 'chess', label: 'Chess', Icon: ChessIcon, color: 'var(--cat-sports)', kind: 'link', to: '/chess',
        has: (r?.chessRows?.length ?? 0) > 0, recencyDates: () => dates(r?.chessRows) },
      { id: 'golf', label: 'Golf', Icon: GolfIcon, color: 'var(--cat-sports)', kind: 'link', to: '/golf',
        has: (r?.golfRows?.length ?? 0) > 0, recencyDates: () => dates(r?.golfRows) },
      { id: 'disc_golf', label: 'Disc Golf', Icon: DiscIcon, color: 'var(--cat-sports)', kind: 'link', to: '/disc-golf',
        has: (r?.dgRows?.length ?? 0) > 0, recencyDates: () => dates(r?.dgRows) },
    ]

    const list = [...base, ...optional.filter(o => o.has)]

    // Sort: most-recently-logged activities first, then the rest.
    const lastDate = (a: QuickActivity) => {
      const ds = a.recencyDates?.() ?? []
      return ds.length ? ds.reduce((m, d) => (d > m ? d : m), '') : ''
    }
    return list.sort((a, b) => lastDate(b).localeCompare(lastDate(a)))
  }, [rawRows])
}

// ── Result segmented control (matches GameLogPage) ─────────────────
function ResultPick({ value, onChange }: { value: boolean | null; onChange: (w: boolean) => void }) {
  const opts: { win: boolean; label: string; color: string }[] = [
    { win: true,  label: 'Win',  color: 'var(--green)' },
    { win: false, label: 'Loss', color: 'var(--red)' },
  ]
  return (
    <div className="flex gap-2">
      {opts.map(o => {
        const active = value === o.win
        return (
          <button
            key={o.label}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(o.win)}
            style={{
              flex: 1, textAlign: 'center', padding: '10px 4px', borderRadius: 10, cursor: 'pointer',
              background: active ? `color-mix(in srgb, ${o.color} 15%, transparent)` : 'var(--input-bg)',
              border: `1px solid ${active ? o.color : 'var(--border)'}`,
              color: active ? o.color : 'var(--text-muted)',
              fontWeight: active ? 700 : 500, fontSize: 13, transition: 'all 0.15s',
            }}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  background: 'var(--input-bg)', border: '1px solid var(--border)',
  color: 'var(--text-primary)', borderRadius: 10, padding: '10px 12px',
  fontSize: 14, outline: 'none', width: '100%',
}
const labelCls = 'section-label'

// ── Inline form per activity ───────────────────────────────────────
function InlineForm({ act, onSaved }: { act: QuickActivity; onSaved: (msg: string, undo: () => Promise<void>, isPR: boolean) => void }) {
  const refreshXP       = useStore(s => s.refreshXP)
  const refreshActivity = useStore(s => s.refreshActivity)

  const [saving, setSaving] = useState(false)
  const [showDetails, setShowDetails] = useState(false)

  // Shared field state
  const [result, setResult]     = useState<boolean | null>(null)
  const [sel, setSel]           = useState(() => act.select ? getLastUsed(`${act.id}-${act.select.key}`, act.select.options[0]) : '')
  const [myScore, setMyScore]   = useState('')
  const [oppScore, setOppScore] = useState('')
  const [notes, setNotes]       = useState('')
  const [miles, setMiles]       = useState('')
  const [cardioType, setCardioType] = useState(() => getLastUsed('cardio-type', 'run'))
  const [hours, setHours]       = useState('')
  const [bedtime, setBedtime]   = useState('')
  const [wake, setWake]         = useState('')

  async function withUser(fn: (uid: string) => Promise<void>) {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }
    await fn(user.id)
    setSaving(false)
  }

  function finish(msg: string, table: string, id: string, isPR: boolean) {
    const undo = async () => {
      await supabase.from(table).delete().eq('id', id)
      await refreshXP(); refreshActivity()
    }
    if (isPR) playPR(); else playXPGain()
    refreshXP().then(() => refreshActivity())
    onSaved(msg, undo, isPR)
  }

  // ── Water ──
  async function addWater(oz: number) {
    await withUser(async uid => {
      const { data, error } = await supabase.from('water_log')
        .insert({ user_id: uid, date: today(), oz }).select('id').single()
      if (error || !data) return
      finish(`+${oz}oz logged`, 'water_log', data.id, false)
    })
  }

  // ── Mood ──
  async function saveMood(score: number) {
    await withUser(async uid => {
      const { data, error } = await supabase.from('mood_log')
        .insert({ user_id: uid, date: today(), mood: score, notes: notes || null }).select('id').single()
      if (error || !data) return
      finish(`+${XP_RATES.mood_log} XP - Mood logged`, 'mood_log', data.id, false)
    })
  }

  // ── Sleep ──
  async function saveSleep() {
    let hrs = hours ? parseFloat(hours) : null
    if (hrs == null && bedtime && wake) {
      const [bh, bm] = bedtime.split(':').map(Number)
      const [wh, wm] = wake.split(':').map(Number)
      let bed = bh * 60 + bm, up = wh * 60 + wm
      if (up <= bed) up += 24 * 60
      hrs = Math.round(((up - bed) / 60) * 10) / 10
    }
    if (hrs == null || !isFinite(hrs) || hrs <= 0) return
    await withUser(async uid => {
      const { data, error } = await supabase.from('sleep_log')
        .insert({ user_id: uid, date: today(), hours_slept: hrs, bedtime: bedtime || null, wake_time: wake || null }).select('id').single()
      if (error || !data) return
      const xp = XP_RATES.sleep_log + ((hrs ?? 0) >= 7 ? XP_RATES.sleep_quality_bonus : 0)
      finish(`+${xp} XP - ${hrs}h sleep`, 'sleep_log', data.id, (hrs ?? 0) >= 8.5)
    })
  }

  // ── Cardio ──
  async function saveCardio() {
    const m = parseFloat(miles)
    if (!isFinite(m) || m <= 0) return
    setLastUsed('cardio-type', cardioType)
    const rate = CARDIO_TYPES.find(c => c.key === cardioType)?.rate ?? XP_RATES.cardio_per_mile
    await withUser(async uid => {
      const { data, error } = await supabase.from('cardio_sessions')
        .insert({ user_id: uid, date: today(), activity: cardioType, distance_miles: m, notes: notes || null }).select('id').single()
      if (error || !data) return
      finish(`+${Math.round(m * rate)} XP - ${m} mi logged`, 'cardio_sessions', data.id, false)
    })
  }

  // ── Skate ──
  async function saveSkate() {
    const m = parseFloat(miles)
    if (!isFinite(m) || m <= 0) return
    await withUser(async uid => {
      const { data, error } = await supabase.from('skate_sessions')
        .insert({ user_id: uid, date: today(), miles: m }).select('id').single()
      if (error || !data) return
      finish(`+${Math.round(m * XP_RATES.skate_per_mile)} XP - ${m} mi skated`, 'skate_sessions', data.id, false)
    })
  }

  // ── Hiking ──
  async function saveHiking() {
    const m = parseFloat(miles)
    if (!isFinite(m) || m <= 0) return
    await withUser(async uid => {
      const { data, error } = await supabase.from('hiking_sessions')
        .insert({ user_id: uid, date: today(), distance_miles: m }).select('id').single()
      if (error || !data) return
      finish(`+${Math.round(m * XP_RATES.hiking_per_mile)} XP - ${m} mi hiked`, 'hiking_sessions', data.id, false)
    })
  }

  // ── Win/Loss sports ──
  async function saveWinLoss() {
    if (result == null || !act.table || !act.buildInsert || !act.winXP) return
    if (act.select) setLastUsed(`${act.id}-${act.select.key}`, sel)
    const payload = { user_id: '', date: today(), ...act.buildInsert(result, sel, myScore, oppScore), notes: notes || null }
    await withUser(async uid => {
      payload.user_id = uid
      const { data, error } = await supabase.from(act.table!).insert(payload).select('id').single()
      if (error || !data) return
      const xp = act.winXP!(result)
      finish(`+${xp} XP - ${result ? 'Win' : 'Loss'} logged`, act.table!, data.id, result)
    })
  }

  // ── Renders ──
  if (act.kind === 'water') {
    return (
      <div className="flex flex-col gap-3 pt-1">
        <div className="grid grid-cols-3 gap-2">
          {[8, 16, 24].map(oz => (
            <button
              key={oz}
              type="button"
              disabled={saving}
              onClick={() => addWater(oz)}
              className="font-mono"
              style={{ ...inputStyle, textAlign: 'center', cursor: 'pointer', fontWeight: 700, color: 'var(--accent)', background: 'var(--accent-subtle)', border: '1.5px solid var(--accent-dim)', fontSize: 16, padding: '14px 0' }}
            >
              +{oz}oz
            </button>
          ))}
        </div>
      </div>
    )
  }

  if (act.kind === 'mood') {
    return (
      <div className="flex flex-col gap-3 pt-1">
        <span className={labelCls}>How do you feel? (1-10)</span>
        <div className="grid grid-cols-10 gap-1">
          {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
            <button
              key={n}
              type="button"
              disabled={saving}
              aria-label={`Mood ${n}`}
              onClick={() => saveMood(n)}
              className="font-mono"
              style={{ padding: '10px 0', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 13, background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
            >
              {n}
            </button>
          ))}
        </div>
        <DetailsToggle open={showDetails} onToggle={() => setShowDetails(v => !v)} />
        {showDetails && (
          <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes (optional)" style={inputStyle} />
        )}
      </div>
    )
  }

  if (act.kind === 'sleep') {
    return (
      <div className="flex flex-col gap-3 pt-1">
        <div className="flex flex-col gap-1">
          <span className={labelCls}>Hours slept</span>
          <input value={hours} onChange={e => setHours(e.target.value)} type="number" step="0.1" inputMode="decimal" placeholder="7.5" style={inputStyle} />
        </div>
        <DetailsToggle label="Add bedtime / wake" open={showDetails} onToggle={() => setShowDetails(v => !v)} />
        {showDetails && (
          <div className="flex gap-2">
            <div className="flex flex-col gap-1 flex-1">
              <span className={labelCls}>Bedtime</span>
              <input value={bedtime} onChange={e => setBedtime(e.target.value)} type="time" style={inputStyle} />
            </div>
            <div className="flex flex-col gap-1 flex-1">
              <span className={labelCls}>Wake</span>
              <input value={wake} onChange={e => setWake(e.target.value)} type="time" style={inputStyle} />
            </div>
          </div>
        )}
        <SaveBtn saving={saving} onClick={saveSleep} disabled={!hours && !(bedtime && wake)} />
      </div>
    )
  }

  if (act.kind === 'cardio') {
    return (
      <div className="flex flex-col gap-3 pt-1">
        <div className="grid grid-cols-4 gap-2">
          {CARDIO_TYPES.map(c => {
            const on = cardioType === c.key
            return (
              <button
                key={c.key}
                type="button"
                onClick={() => setCardioType(c.key)}
                style={{ padding: '9px 0', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: on ? 700 : 500,
                  background: on ? 'var(--accent-subtle)' : 'var(--input-bg)', border: `1px solid ${on ? 'var(--accent)' : 'var(--border)'}`,
                  color: on ? 'var(--accent)' : 'var(--text-muted)' }}
              >
                {c.label}
              </button>
            )
          })}
        </div>
        <div className="flex flex-col gap-1">
          <span className={labelCls}>Miles</span>
          <input value={miles} onChange={e => setMiles(e.target.value)} type="number" step="0.01" inputMode="decimal" placeholder="3.1" style={inputStyle} />
        </div>
        <DetailsToggle open={showDetails} onToggle={() => setShowDetails(v => !v)} />
        {showDetails && (
          <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes (optional)" style={inputStyle} />
        )}
        <SaveBtn saving={saving} onClick={saveCardio} disabled={!miles} />
      </div>
    )
  }

  if (act.kind === 'skate' || act.kind === 'hiking') {
    const save = act.kind === 'skate' ? saveSkate : saveHiking
    return (
      <div className="flex flex-col gap-3 pt-1">
        <div className="flex flex-col gap-1">
          <span className={labelCls}>Miles</span>
          <input value={miles} onChange={e => setMiles(e.target.value)} type="number" step="0.01" inputMode="decimal" placeholder="3.0" style={inputStyle} />
        </div>
        <SaveBtn saving={saving} onClick={save} disabled={!miles} />
      </div>
    )
  }

  // winloss
  return (
    <div className="flex flex-col gap-3 pt-1">
      <div className="flex flex-col gap-1">
        <span className={labelCls}>Result</span>
        <ResultPick value={result} onChange={setResult} />
      </div>
      {act.select && (
        <div className="flex flex-col gap-1">
          <span className={labelCls}>{act.select.label}</span>
          <select value={sel} onChange={e => setSel(e.target.value)} style={inputStyle}>
            {act.select.options.map(o => <option key={o}>{o}</option>)}
          </select>
        </div>
      )}
      <DetailsToggle open={showDetails} onToggle={() => setShowDetails(v => !v)} />
      {showDetails && (
        <div className="flex flex-col gap-2">
          {act.scores && (
            <div className="flex gap-2">
              <input value={myScore} onChange={e => setMyScore(e.target.value)} type="number" inputMode="numeric" placeholder="My score" style={inputStyle} />
              <input value={oppScore} onChange={e => setOppScore(e.target.value)} type="number" inputMode="numeric" placeholder="Opp score" style={inputStyle} />
            </div>
          )}
          <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes (optional)" style={inputStyle} />
        </div>
      )}
      <SaveBtn saving={saving} onClick={saveWinLoss} disabled={result == null} />
    </div>
  )
}

function DetailsToggle({ open, onToggle, label = 'Add details...' }: { open: boolean; onToggle: () => void; label?: string }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      style={{ alignSelf: 'flex-start', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', fontSize: 12, fontWeight: 600, padding: '2px 0' }}
    >
      {open ? 'Hide details' : label}
    </button>
  )
}

function SaveBtn({ saving, onClick, disabled }: { saving: boolean; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      disabled={saving || disabled}
      onClick={onClick}
      className="w-full py-3 rounded-xl font-bold"
      style={{ background: 'var(--accent)', color: 'var(--base-bg)', border: 'none', cursor: (saving || disabled) ? 'default' : 'pointer', opacity: (saving || disabled) ? 0.5 : 1, fontSize: 15 }}
    >
      {saving ? 'Logging...' : 'Log'}
    </button>
  )
}

// ── Sheet host ─────────────────────────────────────────────────────
export function QuickLogSheet({ open, onClose, initialActivity }: {
  open: boolean; onClose: () => void; initialActivity?: string | null
}) {
  const navigate    = useNavigate()
  const activities  = useQuickActivities()
  const [expanded, setExpanded] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; undo: () => Promise<void> } | null>(null)
  const scrimRef = useRef<HTMLDivElement>(null)

  // Deep-link: open a specific activity (or just the sheet) when asked.
  useEffect(() => {
    if (!open) { setExpanded(null); return }
    if (initialActivity && initialActivity !== 'open') {
      const found = activities.find(a => a.id === initialActivity)
      if (found) {
        if (found.kind === 'link' && found.to) { navigate(found.to); onClose(); return }
        setExpanded(found.id)
      }
    }
  }, [open, initialActivity]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [open, onClose])

  function handleTile(a: QuickActivity) {
    if (a.kind === 'link' && a.to) { navigate(a.to); onClose(); return }
    setExpanded(prev => (prev === a.id ? null : a.id))
  }

  function handleSaved(msg: string, undo: () => Promise<void>) {
    setToast({ msg, undo })
    onClose()
  }

  const activeAct = activities.find(a => a.id === expanded)

  return (
    <>
      {open && (
      <>
      <div
        ref={scrimRef}
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'var(--overlay)' }}
      />
      <div
        role="dialog"
        aria-label="Quick log"
        className="quicklog-sheet"
        style={{
          position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 301,
          background: 'var(--surface-1)',
          borderTopLeftRadius: 20, borderTopRightRadius: 20,
          borderTop: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-lg)',
          paddingBottom: 'calc(16px + env(safe-area-inset-bottom))',
          maxHeight: '85dvh', overflowY: 'auto',
          animation: 'slideUpSheet 0.28s cubic-bezier(0.22,1,0.36,1) both',
        }}
      >
        {/* Drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 4px' }}>
          <div style={{ width: 40, height: 4, borderRadius: 3, background: 'var(--border-strong)' }} />
        </div>

        <div style={{ padding: '4px 18px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
            {activeAct ? activeAct.label : 'Quick Log'}
          </p>
          <button
            type="button"
            aria-label="Close"
            onClick={activeAct ? () => setExpanded(null) : onClose}
            style={{ background: 'var(--input-bg)', border: 'none', borderRadius: 8, width: 30, height: 30, cursor: 'pointer', color: 'var(--text-muted)', fontSize: 18, lineHeight: 1 }}
          >
            {activeAct ? '‹' : '×'}
          </button>
        </div>

        <div style={{ padding: '4px 18px 8px' }}>
          {activeAct ? (
            <InlineForm act={activeAct} onSaved={handleSaved} />
          ) : (
            <div className="grid grid-cols-4 gap-2" style={{ paddingTop: 4 }}>
              {activities.map(a => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => handleTile(a)}
                  aria-label={`Log ${a.label}`}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                    padding: '14px 4px', borderRadius: 12, cursor: 'pointer',
                    background: 'var(--input-bg)', border: '1px solid var(--border-subtle)',
                    position: 'relative',
                  }}
                >
                  <a.Icon size={22} color={a.color} />
                  <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'center', lineHeight: 1.1 }}>
                    {a.label}
                  </span>
                  {a.kind === 'link' && (
                    <span style={{ position: 'absolute', top: 4, right: 4, opacity: 0.4 }}>
                      <ChevronRightIcon size={11} color="var(--text-muted)" />
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      </>
      )}

      {toast && (
        <Toast
          message={toast.msg}
          onUndo={() => toast.undo()}
          onDone={() => setToast(null)}
        />
      )}
    </>
  )
}
