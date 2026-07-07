import { useEffect, useRef, useState } from 'react'
import { TopBar } from '../components/layout/TopBar'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Card } from '../components/ui/Card'
import { Toast } from '../components/ui/Toast'
import { BodyweightChart } from '../components/charts/BodyweightChart'
import { LiftTrendChart } from '../components/charts/LiftTrendChart'
import { VolumeTrendChart } from '../components/charts/VolumeTrendChart'
import { EditModal } from '../components/ui/EditModal'
import { StrengthTab } from '../components/StrengthTab'
import { supabase } from '../lib/supabase'
import { playTabSwitch } from '../lib/sounds'
import { formatDate, today } from '../lib/utils'
import { checkForPR, getMilestoneHit, LIFT_MILESTONES, XP_RATES, epleyEst1RM } from '../lib/xp'
import { MilestoneOverlay } from '../components/ui/MilestoneOverlay'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorState } from '../components/ui/ErrorState'
import { DumbbellIcon, RunIcon, ActivityIcon, ZapIcon, GridIcon, BookmarkIcon, CloseIcon } from '../components/ui/Icon'
import { useStore } from '../store/useStore'
import type { LiftType, LiftingLog, PrHistory } from '../types'
import { usePageTitle } from '../hooks/usePageTitle'
import { useStreak } from '../hooks/useStreak'

// ── Exercise library (loaded once from Supabase) ──────────────────────────────

interface ExerciseMeta {
  name:      string
  muscle_group: string
  equipment: string
  type:      string
}

// SVG icon per muscle group shown in the picker filter chips
const PUSH_MUSCLES  = new Set(['Chest', 'Shoulders', 'Triceps', 'Arms', 'Biceps', 'Forearms'])
const LEG_MUSCLES   = new Set(['Legs', 'Quads', 'Hamstrings', 'Glutes', 'Calves', 'Hip Flexors'])
const CORE_MUSCLES  = new Set(['Core', 'Abs', 'Obliques'])
const BACK_MUSCLES  = new Set(['Back', 'Lats', 'Upper Back', 'Lower Back', 'Traps'])

function MuscleGroupIcon({ group, size = 11, color = 'currentColor' }: { group: string; size?: number; color?: string }) {
  if (PUSH_MUSCLES.has(group))  return <DumbbellIcon size={size} color={color} />
  if (LEG_MUSCLES.has(group))   return <RunIcon      size={size} color={color} />
  if (CORE_MUSCLES.has(group))  return <ZapIcon      size={size} color={color} />
  if (BACK_MUSCLES.has(group))  return <ActivityIcon size={size} color={color} />
  if (group === 'Cardio')       return <RunIcon      size={size} color={color} />
  if (group === 'Full Body')    return <GridIcon     size={size} color={color} />
  return <DumbbellIcon size={size} color={color} />
}

function liftIcon(_name?: string, _group?: string) {
  return <DumbbellIcon size={18} color="var(--text-secondary)" />
}

// ── Exercise autocomplete field ───────────────────────────────────────────────

interface ExercisePickerProps {
  value:        string
  onChange:     (name: string, isBodyweight: boolean) => void
  exercises:    ExerciseMeta[]
}

function ExercisePicker({ value, onChange, exercises }: ExercisePickerProps) {
  const [query,    setQuery]    = useState(value)
  const [open,     setOpen]     = useState(false)
  const [activeGrp,setActiveGrp]= useState<string | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  const groups = [...new Set(exercises.map(e => e.muscle_group))].sort()

  const filtered = query.length >= 1
    ? exercises.filter(e => e.name.toLowerCase().includes(query.toLowerCase())).slice(0, 12)
    : activeGrp
      ? exercises.filter(e => e.muscle_group === activeGrp)
      : []

  function select(ex: ExerciseMeta) {
    setQuery(ex.name)
    onChange(ex.name, ex.equipment === 'bodyweight')
    setOpen(false)
    setActiveGrp(null)
  }

  // Close on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <label className="section-label">Exercise</label>
      <div style={{ position: 'relative', marginTop: 4 }}>
        <input
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); setActiveGrp(null) }}
          onFocus={() => setOpen(true)}
          placeholder="Search exercises…"
          className="w-full px-3 py-2.5 rounded-lg outline-none"
          style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: 14 }}
        />
        {query && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => { setQuery(''); onChange('', false); setOpen(true) }}
            style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}
          ><CloseIcon size={14} /></button>
        )}
      </div>

      {open && (
        <div
          style={{
            position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
            background: 'var(--surface-2)', border: '1px solid var(--border-subtle)',
            borderRadius: 12, marginTop: 4, maxHeight: 280, overflowY: 'auto',
            boxShadow: 'var(--shadow-lg)',
          }}
        >
          {/* Group filter chips */}
          {query.length < 1 && (
            <div style={{ display: 'flex', gap: 6, padding: '8px 10px', borderBottom: '1px solid var(--border-faint)', flexWrap: 'wrap' }}>
              {groups.map(g => (
                <button
                  type="button"
                  key={g}
                  onClick={() => setActiveGrp(prev => prev === g ? null : g)}
                  style={{
                    padding: '3px 10px', borderRadius: 12, fontSize: 11, cursor: 'pointer',
                    background: activeGrp === g ? 'var(--accent)' : 'var(--input-bg)',
                    color: activeGrp === g ? 'var(--base-bg)' : 'var(--text-muted)',
                    border: 'none',
                    fontWeight: activeGrp === g ? 700 : 400,
                  }}
                >
                  <MuscleGroupIcon group={g} color={activeGrp === g ? 'var(--base-bg)' : 'var(--text-muted)'} /> {g}
                </button>
              ))}
            </div>
          )}

          {filtered.length === 0 && (
            <div style={{ padding: '12px 14px' }}>
              {query.length >= 1 ? (
                <button
                  type="button"
                  onClick={() => { onChange(query, false); setOpen(false) }}
                  style={{ width: '100%', textAlign: 'left', color: 'var(--accent)', fontSize: 13, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  + Use "{query}" as custom exercise
                </button>
              ) : (
                <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>Select a group or type to search</p>
              )}
            </div>
          )}

          {filtered.map(ex => (
            <button
              type="button"
              key={ex.name}
              onClick={() => select(ex)}
              style={{
                width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 12px', background: 'none', border: 'none', cursor: 'pointer',
                borderBottom: '1px solid var(--border-faint)',
              transition: 'background 0.1s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--input-bg)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              {liftIcon(ex.name, ex.muscle_group)}
              <div style={{ flex: 1 }}>
                <p style={{ color: 'var(--text-primary)', fontSize: 13, fontWeight: 600 }}>{ex.name}</p>
                <p style={{ color: 'var(--text-muted)', fontSize: 11 }}>{ex.muscle_group} · {ex.equipment}</p>
              </div>
              {ex.type === 'primary_compound' && (
                <span style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 700, letterSpacing: '0.05em' }}>COMPOUND</span>
              )}
            </button>
          ))}

          {/* Custom lift option at bottom */}
          {query.length >= 2 && filtered.length > 0 && (
            <button
              type="button"
              onClick={() => { onChange(query, false); setOpen(false) }}
              style={{ width: '100%', textAlign: 'left', color: 'var(--text-muted)', fontSize: 11, background: 'none', border: 'none', cursor: 'pointer', padding: '8px 12px', borderTop: '1px solid var(--border-faint)' }}
            >
              + Use "{query}" as custom exercise
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ── Workout Templates ─────────────────────────────────────────────

interface WorkoutTemplate {
  id:         string
  name:       string
  exercises:  Omit<SessionEntry, 'uid'>[]
  createdAt:  string
}

const TMPL_KEY = 'youxp-workout-templates'

function getTemplates(): WorkoutTemplate[] {
  try { return JSON.parse(localStorage.getItem(TMPL_KEY) ?? '[]') } catch { return [] }
}
function saveTemplates(ts: WorkoutTemplate[]) {
  localStorage.setItem(TMPL_KEY, JSON.stringify(ts))
}
function addTemplate(name: string, exercises: Omit<SessionEntry, 'uid'>[]): WorkoutTemplate {
  const t: WorkoutTemplate = { id: crypto.randomUUID(), name, exercises, createdAt: new Date().toISOString() }
  saveTemplates([t, ...getTemplates()])
  return t
}
function deleteTemplate(id: string) { saveTemplates(getTemplates().filter(t => t.id !== id)) }

// ── Session logging ───────────────────────────────────────────────

// Exercises where duration is the primary metric instead of reps
const TIMED_EXERCISES = new Set([
  'Plank', 'Side Plank', 'Wall Sit', 'L-Sit', 'Dead Hang',
  'Hollow Hold', 'Superman Hold', 'Farmer Carry', 'Farmer Walk',
  'Isometric Hold', 'Bar Hang', 'Ring Support Hold',
])

// Parse "1:30" → 90, "45" → 45, "1:50" → 110
function parseDuration(val: string): number {
  if (!val) return 0
  if (val.includes(':')) {
    const [m, s] = val.split(':').map(Number)
    return (m || 0) * 60 + (s || 0)
  }
  return parseInt(val) || 0
}

// Format seconds → "1:30" display string
function fmtDuration(secs: number): string {
  if (secs < 60) return `${secs}s`
  return `${Math.floor(secs / 60)}m ${secs % 60}s`
}

interface SessionEntry {
  uid:          string
  liftName:     string
  isBodyweight: boolean
  isTimed:      boolean
  weight:       string
  sets:         string
  reps:         string
  duration:     string   // raw input: "45" or "1:30"
  rpe:          string
  bodyweight:   string
}

function newEntry(): SessionEntry {
  return {
    uid: crypto.randomUUID(),
    liftName: '', isBodyweight: false, isTimed: false,
    weight: '', sets: '', reps: '', duration: '', rpe: '', bodyweight: '',
  }
}

// ── Individual exercise row ───────────────────────────────────────

const FIELD_STYLE: React.CSSProperties = {
  width: '100%', padding: '8px 10px', borderRadius: 8,
  background: 'var(--input-bg)', border: '1px solid var(--border)',
  color: 'var(--text-primary)', fontSize: 13, outline: 'none',
}

function ExerciseRow({
  entry, exercises, index, canRemove, onChange, onRemove,
}: {
  entry: SessionEntry
  exercises: ExerciseMeta[]
  index: number
  canRemove: boolean
  onChange: (patch: Partial<SessionEntry>) => void
  onRemove: () => void
}) {
  const isTimed = entry.isTimed || TIMED_EXERCISES.has(entry.liftName)

  return (
    <div className="pop-in" style={{
      background: 'var(--surface-2)', border: '1px solid var(--border-subtle)',
      borderRadius: 12, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ color: 'var(--text-muted)', fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
          Exercise {index + 1}
        </span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* Timed toggle */}
          <button
            type="button"
            onClick={() => onChange({ isTimed: !entry.isTimed })}
            style={{
              background: isTimed ? 'rgba(245,166,35,0.15)' : 'var(--input-bg)',
              border: isTimed ? '1px solid rgba(245,166,35,0.4)' : '1px solid var(--border)',
              color: isTimed ? 'var(--accent)' : 'var(--text-muted)',
              borderRadius: 6, padding: '3px 8px', fontSize: 10, fontWeight: 700,
              cursor: 'pointer', letterSpacing: '0.06em',
            }}
          >
            {isTimed ? 'TIMED' : 'REPS'}
          </button>
          {canRemove && (
            <button
              type="button"
              onClick={onRemove}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: 2 }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Exercise picker */}
      <ExercisePicker
        value={entry.liftName}
        exercises={exercises}
        onChange={(name, bw) => {
          onChange({ liftName: name, isBodyweight: bw, isTimed: TIMED_EXERCISES.has(name) })
        }}
      />

      {/* Fields row */}
      <div style={{ display: 'grid', gridTemplateColumns: isTimed ? '1fr 1fr 1fr' : (entry.isBodyweight ? '1fr 1fr 1fr' : '1.4fr 1fr 1fr 1fr'), gap: 8 }}>
        {/* Weight — hidden for bodyweight & timed (bodyweight) */}
        {!entry.isBodyweight && !isTimed && (
          <div>
            <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: 10, marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>Weight lbs</label>
            <input
              type="number" step="2.5" placeholder="135"
              value={entry.weight}
              onChange={e => onChange({ weight: e.target.value })}
              style={FIELD_STYLE}

            />
          </div>
        )}

        {/* Bodyweight field */}
        {entry.isBodyweight && (
          <div>
            <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: 10, marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>BW lbs</label>
            <input
              type="number" step="0.1" placeholder="160"
              value={entry.bodyweight}
              onChange={e => onChange({ bodyweight: e.target.value })}
              style={FIELD_STYLE}

            />
          </div>
        )}

        {/* Sets */}
        <div>
          <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: 10, marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'var(--font-mono)' }}>Sets</label>
          <input
            type="number" placeholder="3"
            value={entry.sets}
            onChange={e => onChange({ sets: e.target.value })}
            style={FIELD_STYLE}
            onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
            onBlur={e  => (e.target.style.borderColor = 'var(--border)')}
          />
        </div>

        {/* Reps or Duration */}
        {isTimed ? (
          <div>
            <label style={{ display: 'block', color: 'var(--accent)', fontSize: 10, marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'var(--font-mono)' }}>Duration</label>
            <input
              type="text" placeholder="45s or 1:30"
              value={entry.duration}
              onChange={e => onChange({ duration: e.target.value })}
              style={{ ...FIELD_STYLE, borderColor: 'rgba(245,166,35,0.3)' }}
            />
            {entry.duration && parseDuration(entry.duration) > 0 && (
              <p style={{ color: 'var(--text-muted)', fontSize: 10, marginTop: 2 }}>{fmtDuration(parseDuration(entry.duration))}</p>
            )}
          </div>
        ) : (
          <div>
            <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: 10, marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>Reps</label>
            <input
              type="number" placeholder="8"
              value={entry.reps}
              onChange={e => onChange({ reps: e.target.value })}
              style={FIELD_STYLE}

            />
          </div>
        )}

        {/* RPE */}
        <div>
          <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: 10, marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'var(--font-mono)' }}>
            RPE
            <span title="Rate of Perceived Exertion — how hard the set felt on a scale of 1–10. 6 = easy, 8 = 2 reps left in tank, 10 = absolute max effort."
              style={{ marginLeft: 5, cursor: 'help', color: 'var(--text-muted)', fontSize: 11, fontStyle: 'normal' }}>ⓘ</span>
          </label>
          <input
            type="number" step="0.5" min="1" max="10" placeholder="8 (optional)"
            value={entry.rpe}
            onChange={e => onChange({ rpe: e.target.value })}
            style={FIELD_STYLE}
            onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
            onBlur={e  => (e.target.style.borderColor = 'var(--border)')}
          />
          <p style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 3 }}>1–10 · How hard did that feel? (e.g. 8 = 2 reps left)</p>
        </div>
      </div>
    </div>
  )
}

// ── Session log panel ─────────────────────────────────────────────

function LogWorkoutPanel({ onLogged, exercises }: { onLogged: () => void; exercises: ExerciseMeta[] }) {
  const [open,       setOpen]       = useState(false)
  const [date,       setDate]       = useState(today())
  const [entries,    setEntries]    = useState<SessionEntry[]>([newEntry()])
  const [submitting, setSubmitting] = useState(false)
  const [toast,      setToast]      = useState<string | null>(null)
  const [undo,       setUndo]       = useState<(() => void) | null>(null)
  const [milestone,      setMilestone]      = useState<import('../lib/xp').StrengthMilestone | null>(null)
  const [milestoneLift,  setMilestoneLift]  = useState('')
  const refreshXP       = useStore(s => s.refreshXP)
  const refreshActivity = useStore(s => s.refreshActivity)
  const [lastWorkout, setLastWorkout] = useState<Omit<SessionEntry, 'uid'>[] | null>(null)
  const [templates,    setTemplates]   = useState<WorkoutTemplate[]>([])
  const [tmplOpen,     setTmplOpen]    = useState(false)
  const [savingTmpl,   setSavingTmpl]  = useState(false)
  const [tmplName,     setTmplName]    = useState('')

  useEffect(() => {
    try {
      const saved = localStorage.getItem('youxp-last-workout')
      if (saved) setLastWorkout(JSON.parse(saved))
    } catch { /* ignore */ }
    setTemplates(getTemplates())
  }, [])

  function addEntry() { setEntries(e => [...e, newEntry()]) }
  function removeEntry(uid: string) { setEntries(e => e.filter(x => x.uid !== uid)) }
  function updateEntry(uid: string, patch: Partial<SessionEntry>) {
    setEntries(e => e.map(x => x.uid === uid ? { ...x, ...patch } : x))
  }

  function cancelSession() {
    setOpen(false)
    setEntries([newEntry()])
    setDate(today())
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    const valid = entries.filter(e => e.liftName.trim())
    if (!valid.length) return
    setSubmitting(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSubmitting(false); return }

    // ── Step 1: Pre-fetch all previous bests in parallel ──────────────
    // Only needed for lifts that have milestone thresholds defined.
    const prevBestMap: Record<string, number> = {}
    await Promise.all(
      valid
        .filter(e => LIFT_MILESTONES[e.liftName] && !(e.isTimed || TIMED_EXERCISES.has(e.liftName)))
        .map(async e => {
          const isBW = e.isBodyweight
          const { data } = await supabase
            .from('lifting_log')
            .select(isBW ? 'reps' : 'est_1rm')
            .eq('lift', e.liftName)
            .order(isBW ? 'reps' : 'est_1rm', { ascending: false })
            .limit(1)
          prevBestMap[e.liftName] = isBW
            ? ((data?.[0] as { reps?: number } | undefined)?.reps ?? 0)
            : ((data?.[0] as { est_1rm?: number } | undefined)?.est_1rm ?? 0)
        })
    )

    // ── Step 2: Batch-insert all exercises in one query ───────────────
    const insertPayloads = valid.map(entry => {
      const isTimed = entry.isTimed || TIMED_EXERCISES.has(entry.liftName)
      const sets    = parseInt(entry.sets) || 1
      const reps    = isTimed ? 0 : (parseInt(entry.reps) || 0)
      const durSecs = isTimed ? parseDuration(entry.duration) : null
      const bw      = entry.bodyweight ? parseFloat(entry.bodyweight) : null
      const weight  = entry.isBodyweight ? (bw ?? 0) : (parseFloat(entry.weight) || 0)
      const est1rm  = !isTimed && weight > 0 && reps > 0
        ? epleyEst1RM(weight, reps)
        : null
      return {
        user_id: user.id, date, lift: entry.liftName,
        weight:        entry.isBodyweight ? null : (weight || null),
        sets,
        reps:          isTimed ? null : (reps || null),
        est_1rm:       est1rm,
        bodyweight:    bw,
        is_pr:         false,
        rpe:           entry.rpe ? parseFloat(entry.rpe) : null,
        duration_secs: durSecs,
      }
    })

    const { data: inserted, error: insertError } = await supabase
      .from('lifting_log')
      .insert(insertPayloads)
      .select()

    if (insertError || !inserted?.length) {
      setToast('Failed to save workout. Please try again.')
      setSubmitting(false)
      return
    }

    // ── Step 3: PR checks sequentially to prevent duplicate pr_history rows ──
    // (parallel checks all read before any write — two sets same lift = double PR)
    type RowResult = { isPR: boolean; xp: number; milestone: import('../lib/xp').StrengthMilestone | null; liftName: string; rowId: string; prKey: { lift: string; est_1rm: number; date: string } | null }

    const rowResults: RowResult[] = []
    for (let i = 0; i < inserted.length; i++) {
      const row   = inserted[i]
      const entry = valid[i]
      await (async () => {
        const isTimed = entry.isTimed || TIMED_EXERCISES.has(entry.liftName)
        const reps    = isTimed ? 0 : (parseInt(entry.reps) || 0)
        const est1rm  = row.est_1rm as number | null
        let isPR      = false

        if (est1rm) {
          isPR = await checkForPR(supabase, entry.liftName, est1rm, date, row.id, user.id)
          if (isPR) await supabase.from('lifting_log').update({ is_pr: true }).eq('id', row.id)
        }

        let milestone: import('../lib/xp').StrengthMilestone | null = null
        if (LIFT_MILESTONES[entry.liftName] && !isTimed) {
          const newVal    = entry.isBodyweight ? reps : (est1rm ?? 0)
          const prevBest  = prevBestMap[entry.liftName] ?? 0
          milestone       = getMilestoneHit(entry.liftName, prevBest, newVal) ?? null
        }

        rowResults.push({
          isPR,
          // XP engine awards per logged entry (row), not per the sets column
          xp:       XP_RATES.per_set + (isPR ? XP_RATES.new_pr : 0),
          milestone,
          liftName: entry.liftName,
          rowId:    row.id,
          prKey:    isPR && est1rm ? { lift: entry.liftName, est_1rm: est1rm, date } : null,
        })
      })()
    }

    const totalXP     = rowResults.reduce((s, r) => s + r.xp, 0)
    const prCount     = rowResults.filter(r => r.isPR).length
    const hitMilestone = rowResults.findLast(r => r.milestone)

    // Capture lift name BEFORE resetting form state (P1-2 fix)
    const liftNameForOverlay = hitMilestone?.liftName ?? ''

    const prMsg = prCount > 0 ? ` — ${prCount} PR${prCount > 1 ? 's' : ''}!` : ''
    setToast(`+${totalXP} XP · ${valid.length} exercise${valid.length > 1 ? 's' : ''} logged${prMsg}`)
    if (hitMilestone?.milestone) {
      setMilestone(hitMilestone.milestone)
      setMilestoneLift(liftNameForOverlay)
    }

    const rowIds = rowResults.map(r => r.rowId)
    const prKeys = rowResults.map(r => r.prKey).filter((k): k is { lift: string; est_1rm: number; date: string } => k !== null)
    setUndo(() => async () => {
      await supabase.from('lifting_log').delete().in('id', rowIds)
      await Promise.all(prKeys.map(k =>
        supabase.from('pr_history').delete().eq('lift', k.lift).eq('est_1rm', k.est_1rm).eq('date', k.date)
      ))
      await refreshXP(); refreshActivity(); onLogged()
    })

    await refreshXP()
    refreshActivity()

    // Save last workout for "Repeat" button
    localStorage.setItem('youxp-last-workout', JSON.stringify(
      valid.map(e => ({
        liftName: e.liftName, isBodyweight: e.isBodyweight, isTimed: e.isTimed,
        weight: e.weight, sets: e.sets, reps: e.reps, duration: e.duration, rpe: e.rpe, bodyweight: e.bodyweight,
      }))
    ))

    setEntries([newEntry()])
    setDate(today())
    setOpen(false)
    setSubmitting(false)
    onLogged()
  }

  return (
    <div className="mb-5">
      <div style={{ display: 'flex', gap: 8, marginBottom: (lastWorkout || templates.length > 0) && !open ? 8 : 0 }}>
        <button
          data-tutorial="log-workout-btn"
          onClick={() => { setOpen(o => !o); setTmplOpen(false) }}
          className="flex items-center justify-center gap-2 rounded-xl font-semibold transition-all"
          style={{
            flex: 1, height: 44,
            background: open ? 'var(--input-bg)' : 'var(--accent)',
            color: open ? 'var(--text-secondary)' : 'var(--base-bg)',
            border: open ? '1px solid var(--border)' : 'none',
            fontSize: 14, letterSpacing: '0.01em',
            boxShadow: open ? 'none' : '0 4px 16px var(--accent-dim)',
          }}
        >
          {open ? 'Cancel' : 'Log Workout'}
        </button>
        {!open && lastWorkout && (
          <button
            onClick={() => {
              setEntries(lastWorkout.map(e => ({ ...e, uid: crypto.randomUUID() })))
              setOpen(true)
              setTmplOpen(false)
            }}
            title="Repeat your last logged workout"
            style={{
              height: 44, padding: '0 14px', borderRadius: 12, flexShrink: 0,
              background: 'var(--input-bg)', border: '1px solid var(--border)',
              color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13, fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
          >
            ↺ Repeat
          </button>
        )}
        {!open && templates.length > 0 && (
          <button
            onClick={() => setTmplOpen(o => !o)}
            title="Load a saved workout template"
            style={{
              height: 44, padding: '0 14px', borderRadius: 12, flexShrink: 0,
              background: tmplOpen ? 'rgba(245,166,35,0.12)' : 'var(--input-bg)',
              border: tmplOpen ? '1px solid rgba(245,166,35,0.4)' : '1px solid var(--border)',
              color: tmplOpen ? 'var(--accent)' : 'var(--text-secondary)',
              cursor: 'pointer', fontSize: 13, fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.15s',
            }}
          >
            <BookmarkIcon size={14} color={tmplOpen ? 'var(--accent)' : 'var(--text-secondary)'} />
            Templates
          </button>
        )}
      </div>

      {/* Templates panel */}
      {tmplOpen && !open && (
        <div className="pop-in" style={{
          marginBottom: 12, borderRadius: 14,
          background: 'var(--surface-1)', border: '1px solid color-mix(in srgb, var(--accent) 25%, transparent)', overflow: 'hidden',
        }}>
          <p className="section-label" style={{ padding: '12px 14px 8px', borderBottom: '1px solid var(--border-faint)' }}>
            Saved Templates
          </p>
          {templates.map(t => (
            <div key={t.id} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 14px', borderBottom: '1px solid var(--border-faint)',
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.2 }}>{t.name}</p>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {t.exercises.length} exercise{t.exercises.length !== 1 ? 's' : ''} · {t.exercises.map(e => e.liftName).filter(Boolean).slice(0, 3).join(', ')}{t.exercises.length > 3 ? '…' : ''}
                </p>
              </div>
              <button
                onClick={() => {
                  setEntries(t.exercises.map(e => ({ ...e, uid: crypto.randomUUID() })))
                  setOpen(true)
                  setTmplOpen(false)
                }}
                style={{
                  padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, flexShrink: 0,
                  background: 'var(--accent)', color: 'var(--base-bg)', border: 'none', cursor: 'pointer',
                }}
              >
                Load
              </button>
              <button
                onClick={() => { deleteTemplate(t.id); setTemplates(getTemplates()) }}
                style={{
                  width: 28, height: 28, borderRadius: 7, flexShrink: 0,
                  background: 'rgba(233,69,96,0.08)', border: '1px solid rgba(233,69,96,0.2)',
                  color: '#E94560', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {open && (
        <form onSubmit={handleSubmit}>
          <Card className="mt-3 pop-in">
            {/* Date */}
            <div style={{ marginBottom: 16 }}>
              <label className="section-label" style={{ display: 'block', marginBottom: 6 }}>Workout Date</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                style={{ ...FIELD_STYLE, maxWidth: 200 }}
              />
            </div>

            {/* Exercise rows */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {entries.map((entry, i) => (
                <ExerciseRow
                  key={entry.uid}
                  entry={entry}
                  exercises={exercises}
                  index={i}
                  canRemove={entries.length > 1}
                  onChange={patch => updateEntry(entry.uid, patch)}
                  onRemove={() => removeEntry(entry.uid)}
                />
              ))}
            </div>

            {/* Add exercise button */}
            <button
              type="button"
              onClick={addEntry}
              style={{
                width: '100%', marginTop: 10, padding: '10px', borderRadius: 10,
                background: 'var(--input-bg)', border: '1px dashed var(--border)',
                color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer', transition: 'all 0.15s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(245,166,35,0.4)'; e.currentTarget.style.color = 'var(--accent)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)' }}
            >
              + Add Another Exercise
            </button>

            {/* Save as Template */}
            {!savingTmpl ? (
              <button
                type="button"
                onClick={() => { setSavingTmpl(true); setTmplName('') }}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                  width: '100%', marginTop: 8, padding: '6px', borderRadius: 8,
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--text-muted)', fontSize: 12, transition: 'color 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
              >
                <BookmarkIcon size={12} /> Save as Template
              </button>
            ) : (
              <div className="pop-in" style={{ display: 'flex', gap: 6, marginTop: 10, alignItems: 'center' }}>
                <input
                  type="text"
                  autoFocus
                  placeholder="Template name (e.g. Push Day)…"
                  value={tmplName}
                  onChange={e => setTmplName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && tmplName.trim()) {
                      addTemplate(tmplName.trim(), entries.filter(en => en.liftName).map(en => ({ liftName: en.liftName, isBodyweight: en.isBodyweight, isTimed: en.isTimed, weight: en.weight, sets: en.sets, reps: en.reps, duration: en.duration, rpe: en.rpe, bodyweight: en.bodyweight })))
                      setTemplates(getTemplates()); setSavingTmpl(false); setTmplName('')
                    }
                    if (e.key === 'Escape') { setSavingTmpl(false); setTmplName('') }
                  }}
                  style={{
                    flex: 1, padding: '8px 12px', borderRadius: 8,
                    background: 'var(--input-bg)', border: '1px solid var(--border)',
                    color: 'var(--text-primary)', fontSize: 13, outline: 'none',
                  }}
                />
                <button
                  type="button"
                  disabled={!tmplName.trim()}
                  onClick={() => {
                    addTemplate(tmplName.trim(), entries.filter(en => en.liftName).map(en => ({ liftName: en.liftName, isBodyweight: en.isBodyweight, isTimed: en.isTimed, weight: en.weight, sets: en.sets, reps: en.reps, duration: en.duration, rpe: en.rpe, bodyweight: en.bodyweight })))
                    setTemplates(getTemplates()); setSavingTmpl(false); setTmplName('')
                  }}
                  style={{
                    padding: '8px 14px', borderRadius: 8, flexShrink: 0,
                    background: tmplName.trim() ? 'var(--accent)' : 'var(--input-bg)',
                    color: tmplName.trim() ? 'var(--base-bg)' : 'var(--text-muted)', border: 'none',
                    fontSize: 12, fontWeight: 700, cursor: tmplName.trim() ? 'pointer' : 'not-allowed',
                  }}
                >Save</button>
                <button
                  type="button"
                  aria-label="Cancel"
                  onClick={() => { setSavingTmpl(false); setTmplName('') }}
                  style={{
                    width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                    background: 'var(--input-bg)', border: '1px solid var(--border)',
                    color: 'var(--text-muted)', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                ><CloseIcon size={13} /></button>
              </div>
            )}

            {/* Submit */}
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button
                type="button"
                onClick={cancelSession}
                style={{
                  flex: 1, height: 42, borderRadius: 10, fontSize: 13, fontWeight: 500,
                  background: 'var(--input-bg)', border: '1px solid var(--border)',
                  color: 'var(--text-muted)', cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                style={{
                  flex: 2, height: 42, borderRadius: 10, border: 'none',
                  background: submitting ? 'rgba(245,166,35,0.5)' : 'var(--accent)',
                  color: 'var(--base-bg)', fontSize: 14, fontWeight: 700,
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  boxShadow: submitting ? 'none' : '0 4px 16px var(--accent-dim)',
                }}
              >
                {submitting ? 'Logging…' : `Log ${entries.filter(e => e.liftName).length || ''} Exercise${entries.filter(e => e.liftName).length !== 1 ? 's' : ''}`}
              </button>
            </div>
          </Card>
        </form>
      )}

      {toast && <Toast message={toast} onUndo={undo ?? undefined} onDone={() => { setToast(null); setUndo(null) }} />}
      {milestone && (
        <MilestoneOverlay
          milestone={milestone}
          liftName={milestoneLift}
          onDismiss={() => { setMilestone(null); setMilestoneLift('') }}
        />
      )}
    </div>
  )
}

// ── Edit modal ────────────────────────────────────────────────────

function EditLiftModal({ row, onClose, onSaved }: { row: LiftingLog; onClose: () => void; onSaved: () => void }) {
  const [weight, setWeight] = useState(String(row.weight ?? ''))
  const [sets, setSets] = useState(String(row.sets ?? ''))
  const [reps, setReps] = useState(String(row.reps ?? ''))
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    const newWeight = weight ? parseFloat(weight) : null
    const newReps   = reps   ? parseInt(reps)     : null
    // Recompute est_1rm so PR comparisons stay accurate after an edit
    const newEst1rm = newWeight && newReps
      ? Math.round(newWeight * (1 + Math.min(newReps, 12) / 30))
      : null
    const { error } = await supabase.from('lifting_log').update({
      weight: newWeight,
      sets:   sets ? parseInt(sets) : null,
      reps:   newReps,
      est_1rm: newEst1rm,
    }).eq('id', row.id)
    setSaving(false)
    if (!error) { onSaved(); onClose() }
  }

  async function del() {
    setSaving(true)
    const { error } = await supabase.from('lifting_log').delete().eq('id', row.id)
    if (error) { setSaving(false); return }
    // Remove orphaned pr_history entry that was created from this set
    if (row.is_pr && row.est_1rm) {
      await supabase.from('pr_history')
        .delete()
        .eq('lift', row.lift)
        .eq('est_1rm', row.est_1rm)
        .eq('date', row.date)
    }
    setSaving(false)
    onSaved()
    onClose()
  }

  return (
    <EditModal title={`${row.lift} — ${formatDate(row.date)}`} onClose={onClose} onDelete={del} onSave={save} saving={saving}>
      <div className="flex flex-col gap-4">
        {row.weight !== null && (
          <div className="flex flex-col gap-1">
            <label className="section-label">Weight (lbs)</label>
            <input type="number" step="2.5" value={weight} onChange={e => setWeight(e.target.value)} className="px-3 py-2.5 rounded-xl outline-none w-full text-sm" style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
          </div>
        )}
        <div className="flex gap-3">
          <div className="flex flex-col gap-1 flex-1">
            <label className="section-label">Sets</label>
            <input type="number" value={sets} onChange={e => setSets(e.target.value)} className="px-3 py-2.5 rounded-xl outline-none w-full text-sm" style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
          </div>
          <div className="flex flex-col gap-1 flex-1">
            <label className="section-label">Reps</label>
            <input type="number" value={reps} onChange={e => setReps(e.target.value)} className="px-3 py-2.5 rounded-xl outline-none w-full text-sm" style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
          </div>
        </div>
      </div>
    </EditModal>
  )
}

// ── Mini stat block ───────────────────────────────────────────────

function MiniStat({ label, value, color, wide }: { label: string; value: string; color: string; wide?: boolean }) {
  return (
    <div
      style={{
        padding: '10px 14px',
        borderRadius: 10,
        background: 'var(--surface-2)', border: '1px solid var(--border-subtle)',
        gridColumn: wide ? '1 / -1' : undefined,
        display: 'flex',
        flexDirection: wide ? 'row' : 'column',
        alignItems: wide ? 'center' : undefined,
        justifyContent: wide ? 'space-between' : undefined,
        gap: wide ? 0 : 4,
      }}
    >
      <p className="section-label">{label}</p>
      <p style={{ fontSize: wide ? 15 : 18, fontWeight: 700, color, lineHeight: 1, fontFamily: 'var(--font-mono)' }}>{value}</p>
    </div>
  )
}

// ── Lift card ─────────────────────────────────────────────────────

const BW_LIFTS = new Set(['PullUps', 'PushUps', 'Pull-Ups', 'Push-Ups', 'Pull Ups', 'Push Ups'])

function fmtSecs(secs: number): string {
  if (secs >= 60) return `${Math.floor(secs / 60)}m ${secs % 60}s`
  return `${secs}s`
}

function LiftCard({ lift, pr, history, onSaved }: { lift: LiftType; pr: PrHistory | undefined; history: LiftingLog[]; onSaved: () => void }) {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<LiftingLog | null>(null)
  const liftHistory = history.filter(r => r.lift === lift).slice(0, 8)

  // Detect bodyweight-only lift: no set has a real weight value
  const allRows = history.filter(r => r.lift === lift)
  const isTimedLift = TIMED_EXERCISES.has(lift) || allRows.some(r => r.duration_secs != null)
  const isBWLift = !isTimedLift && (BW_LIFTS.has(lift) || allRows.every(r => r.weight === null || r.weight === 0))

  const totalVolume = allRows
    .filter(r => r.weight && r.sets && r.reps)
    .reduce((sum, r) => sum + (r.weight! * r.sets! * r.reps!), 0)

  // For timed lifts: best duration_secs
  const bestDurSecs = isTimedLift
    ? allRows.reduce((best, r) => Math.max(best, r.duration_secs ?? 0), 0)
    : 0

  // For BW lifts: track best reps in a single set
  const maxReps = isBWLift
    ? allRows.reduce((best, r) => Math.max(best, r.reps ?? 0), 0)
    : 0

  // Best set for rep-max display (row with highest reps)
  const bestRepSet = isBWLift
    ? allRows.reduce<LiftingLog | null>((best, r) => (!best || (r.reps ?? 0) > (best.reps ?? 0)) ? r : best, null)
    : null

  // Predicted max reps at a higher effort — Epley inverse: reps = 30 × (1RM/w - 1)
  // For BW: est how many reps at 100% effort given best set
  const predictedMaxReps = isBWLift && bestRepSet
    ? Math.round(bestRepSet.reps! * 1.15)   // simple ~15% buffer above best logged set
    : null

  // For weighted lifts: est 1RM from latest set
  const latestWeightedSet = !isBWLift ? history.find(r => r.lift === lift && r.weight && r.reps) : null
  const quick1rm = latestWeightedSet
    ? epleyEst1RM(latestWeightedSet.weight!, latestWeightedSet.reps!)
    : null

  const [hovered, setHovered] = useState(false)

  return (
    <div
      className="mb-2 overflow-hidden"
      style={{
        position: 'relative',
        borderRadius: 14,
        border: open
          ? '1px solid color-mix(in srgb, var(--accent) 35%, transparent)'
          : '1px solid var(--border-subtle)',
        background: open ? 'var(--surface-2)' : 'var(--surface-1)',
        transition: 'border-color 0.18s ease, background 0.18s ease, box-shadow 0.18s ease',
        boxShadow: open ? 'var(--shadow-md)' : hovered ? 'var(--shadow-sm)' : 'none',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Accent left stripe when open */}
      {open && (
        <div style={{
          position: 'absolute', left: 0, top: 0, bottom: 0, width: 3,
          background: 'var(--accent)', borderRadius: '14px 0 0 14px',
        }} />
      )}

      <button
        className="w-full flex items-center justify-between"
        style={{ padding: '14px 16px', paddingLeft: open ? 20 : 16 }}
        onClick={() => setOpen(o => !o)}
      >
        {/* Left: icon + name + sub */}
        <div className="flex items-center gap-3 text-left min-w-0">
          <div style={{
            width: 38, height: 38, borderRadius: 10, flexShrink: 0,
            background: open ? 'rgba(245,166,35,0.12)' : 'var(--input-bg)',
            border: open ? '1px solid rgba(245,166,35,0.25)' : '1px solid var(--border-faint)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, transition: 'all 0.18s ease',
          }}>
            {liftIcon(lift)}
          </div>
          <div className="min-w-0">
            <p style={{
              fontWeight: 700, fontSize: 15, color: 'var(--text-primary)',
              letterSpacing: '0.01em', lineHeight: 1.2,
            }}>
              {lift}
            </p>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2, lineHeight: 1 }}>
              {isTimedLift
                ? (bestDurSecs > 0 ? `Best ${fmtSecs(bestDurSecs)}` : 'No data')
                : isBWLift
                ? (maxReps > 0 ? `Best ${maxReps} reps` : 'No data')
                : (pr ? `PR · ${pr.est_1rm.toFixed(0)} lbs est 1RM` : 'No data')}
              {totalVolume > 0 && (
                <span style={{ color: 'var(--text-dim)', marginLeft: 6 }}>
                  · {totalVolume >= 1000 ? `${(totalVolume / 1000).toFixed(1)}k` : totalVolume.toLocaleString()} lbs
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Right: primary metric + chevron */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <div style={{ textAlign: 'right' }}>
            {isTimedLift && bestDurSecs > 0 && (
              <span style={{ fontWeight: 700, fontSize: 17, color: 'var(--accent)', letterSpacing: '-0.02em' }}>
                {fmtSecs(bestDurSecs)}
              </span>
            )}
            {isBWLift && maxReps > 0 && (
              <span style={{ fontWeight: 700, fontSize: 17, color: 'var(--accent)', letterSpacing: '-0.02em' }}>
                {maxReps}
                <span style={{ fontWeight: 400, fontSize: 11, color: 'var(--text-muted)', marginLeft: 3 }}>reps</span>
              </span>
            )}
            {!isTimedLift && !isBWLift && pr && (
              <span style={{ fontWeight: 700, fontSize: 17, color: 'var(--accent)', letterSpacing: '-0.02em' }}>
                {pr.est_1rm.toFixed(0)}
                <span style={{ fontWeight: 400, fontSize: 11, color: 'var(--text-muted)', marginLeft: 3 }}>lbs</span>
              </span>
            )}
          </div>
          <span style={{ color: 'var(--text-muted)' }}>
            <ChevronIcon open={open} />
          </span>
        </div>
      </button>

      {editing && <EditLiftModal row={editing} onClose={() => setEditing(null)} onSaved={onSaved} />}

      {open && (
        <div style={{ borderTop: '1px solid var(--border-faint)', padding: '16px 16px 16px 20px' }}>

          {/* Stat mini-cards */}
          {isTimedLift && bestDurSecs > 0 && (
            <div className="grid grid-cols-2 gap-2 mb-4">
              <MiniStat label="Best hold" value={fmtSecs(bestDurSecs)} color="var(--accent)" />
              <MiniStat label="Sets logged" value={String(allRows.length)} color="var(--green)" />
            </div>
          )}

          {isBWLift && bestRepSet && (
            <div className="grid grid-cols-2 gap-2 mb-4">
              <MiniStat label="Best set" value={`${maxReps} reps`} color="var(--accent)" />
              <MiniStat label="Predicted max" value={`${predictedMaxReps} reps`} color="var(--green)" />
            </div>
          )}

          {!isTimedLift && !isBWLift && quick1rm && (
            <div className="mb-4">
              <MiniStat label="Est 1RM (latest set)" value={`${quick1rm} lbs`} color="var(--accent)" wide />
            </div>
          )}

          {/* Trend chart */}
          {!isTimedLift && (
            <div className="mb-4">
              <p className="section-label mb-2">{isBWLift ? 'Rep Trend' : 'Est 1RM Trend'}</p>
              <LiftTrendChart lift={lift} pr={pr?.est_1rm ?? 0} isBWLift={isBWLift} />
            </div>
          )}

          {/* Recent sets */}
          {liftHistory.length > 0 && (
            <div>
              <p className="section-label mb-2">Recent Sets</p>
              <div className="flex flex-col">
                {liftHistory.map((row, i) => (
                  <div
                    key={row.id}
                    className="flex items-center justify-between"
                    style={{
                      padding: '8px 10px',
                      borderRadius: 8,
                      background: i % 2 === 0 ? 'var(--input-bg)' : 'transparent',
                    }}
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      {!isTimedLift && !isBWLift && row.weight && (
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                          {row.weight} lbs
                        </span>
                      )}
                      <span style={{ fontSize: 13, color: isTimedLift || isBWLift ? 'var(--accent)' : 'var(--text-secondary)' }}>
                        {isTimedLift
                          ? (row.duration_secs != null ? fmtSecs(row.duration_secs) : '—')
                          : isBWLift ? `${row.reps} reps` : `${row.sets}×${row.reps}`}
                      </span>
                      {row.rpe != null && (
                        <span style={{ fontSize: 10, color: '#9B72CF', background: 'rgba(155,114,207,0.12)', padding: '2px 8px', borderRadius: 4, fontWeight: 600 }}>
                          RPE {row.rpe}
                        </span>
                      )}
                      {row.is_pr && (
                        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--base-bg)', background: 'var(--accent)', padding: '2px 8px', borderRadius: 4 }}>
                          PR
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2.5">
                      {!isBWLift && row.est_1rm && (
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{row.est_1rm.toFixed(0)} 1RM</span>
                      )}
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{formatDate(row.date)}</span>
                      <button
                        type="button"
                        aria-label="Edit set"
                        onClick={e => { e.stopPropagation(); setEditing(row) }}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          width: 24, height: 24, borderRadius: 6,
                          background: 'var(--input-bg)', border: '1px solid var(--border-faint)',
                          color: 'var(--text-muted)', cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--border)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--input-bg)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)' }}
                      >
                        <EditIcon />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Tab pill ──────────────────────────────────────────────────────

function TabPill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1, padding: '8px 12px', borderRadius: 7,
        fontSize: 13, fontWeight: 600, cursor: 'pointer',
        background: active ? 'var(--accent)' : 'transparent',
        color:      active ? 'var(--base-bg)' : 'var(--text-secondary)',
        border:     'none',
        transition: 'all 0.15s ease',
        letterSpacing: '0.01em',
        boxShadow:  active ? '0 2px 8px var(--accent-dim)' : 'none',
      }}
    >
      {label}
    </button>
  )
}

// ── SVG icons ─────────────────────────────────────────────────────

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="16" height="16" viewBox="0 0 16 16" fill="none"
      style={{ transition: 'transform 0.2s ease', transform: open ? 'rotate(180deg)' : 'rotate(0deg)', flexShrink: 0 }}
    >
      <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function EditIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M8.5 1.5a1.415 1.415 0 0 1 2 2L4 10H2v-2L8.5 1.5Z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ── Main page ─────────────────────────────────────────────────────

export function Records() {
  usePageTitle('Lifting')
  const streak = useStreak()
  const [tab,             setTab]           = useState<'log' | 'strength'>('log')
  const [strengthLoaded,  setStrengthLoaded] = useState(false)
  const [prs,             setPrs]           = useState<Record<string, PrHistory>>({})
  const [history,         setHistory]       = useState<LiftingLog[]>([])
  const [exercises,       setExercises]     = useState<ExerciseMeta[]>([])
  const [muscleFilter,    setMuscleFilter]  = useState<string | null>(null)
  const [loadError,       setLoadError]     = useState(false)

  async function load() {
    setLoadError(false)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [prData, historyData, exData] = await Promise.all([
      supabase.from('pr_history').select('*').eq('user_id', user.id).order('est_1rm', { ascending: false }),
      supabase.from('lifting_log').select('*').eq('user_id', user.id).order('date', { ascending: false }).limit(200),
      supabase.from('exercises').select('name,muscle_group,equipment,type').order('muscle_group').order('name'),
    ])

    if (historyData.error) { setLoadError(true); return }

    const prMap: Record<string, PrHistory> = {}
    prData.data?.forEach((r: PrHistory) => { if (!prMap[r.lift]) prMap[r.lift] = r })
    setPrs(prMap)
    setHistory(historyData.data ?? [])
    setExercises(exData.data ?? [])
  }

  useEffect(() => { load() }, [])

  function switchTab(t: 'log' | 'strength') {
    if (t === tab) return
    playTabSwitch()
    setTab(t)
    if (t === 'strength' && !strengthLoaded) setStrengthLoaded(true)
  }

  const exerciseGroupMap: Record<string, string> = Object.fromEntries(exercises.map(e => [e.name, e.muscle_group] as [string, string]))
  const allLoggedLifts = [...new Set(history.map(r => r.lift))]
  const liftGroups = [...new Set(allLoggedLifts.map(l => exerciseGroupMap[l]).filter((g): g is string => Boolean(g)))].sort()
  const loggedLifts = muscleFilter
    ? allLoggedLifts.filter(l => exerciseGroupMap[l] === muscleFilter)
    : allLoggedLifts

  return (
    <>
      <TopBar title="Lifting" />
      <PageWrapper>

        {/* ── Gym streak banner ── */}
        {!streak.loading && (streak.gymCurrent > 0 || streak.gymLongest > 0) && (
          <Card className="flex items-center justify-between mb-4" style={{ padding: '12px 16px' }}>
            <div>
              <p className="section-label mb-1">Gym Streak</p>
              <p style={{ fontSize: 24, fontWeight: 700, color: streak.gymCurrent > 0 ? 'var(--accent)' : 'var(--text-secondary)', lineHeight: 1, fontFamily: 'var(--font-mono)' }}>
                {streak.gymCurrent} <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-tertiary)' }}>days</span>
              </p>
            </div>
            {streak.gymLongest > 0 && (
              <div style={{ textAlign: 'right' }}>
                <p className="section-label mb-1">Best</p>
                <p style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-secondary)', lineHeight: 1, fontFamily: 'var(--font-mono)' }}>
                  {streak.gymLongest}
                </p>
              </div>
            )}
          </Card>
        )}

        {/* ── Tab switcher ── */}
        <div style={{
          display: 'flex', gap: 4, marginBottom: 20,
          background: 'var(--input-bg)', borderRadius: 10,
          padding: 4, border: '1px solid var(--border-faint)',
        }}>
          <TabPill label="Log" active={tab === 'log'}      onClick={() => switchTab('log')} />
          <TabPill label="Strength Map" active={tab === 'strength'} onClick={() => switchTab('strength')} />
        </div>

        {/* ── Log tab ── */}
        <div style={{ display: tab === 'log' ? 'block' : 'none' }}>
          <LogWorkoutPanel onLogged={load} exercises={exercises} />

          {allLoggedLifts.length > 0 && (
            <>
              <p className="section-label mb-2">Your Lifts — tap to expand</p>
              {liftGroups.length > 1 && (
                <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 8, marginBottom: 8, scrollbarWidth: 'none' }}>
                  <button
                    onClick={() => setMuscleFilter(null)}
                    style={{
                      flexShrink: 0, padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                      display: 'inline-flex', alignItems: 'center',
                      background: muscleFilter === null ? 'var(--accent)' : 'var(--surface-2)',
                      color: muscleFilter === null ? 'var(--base-bg)' : 'var(--text-secondary)',
                      border: `1px solid ${muscleFilter === null ? 'var(--accent)' : 'var(--border-subtle)'}`,
                      cursor: 'pointer', transition: 'all 0.12s ease',
                    }}
                  >All</button>
                  {liftGroups.map(grp => (
                    <button
                      key={grp}
                      onClick={() => setMuscleFilter(g => g === grp ? null : grp)}
                      style={{
                        flexShrink: 0, padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                        display: 'inline-flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap',
                        background: muscleFilter === grp ? 'var(--accent)' : 'var(--surface-2)',
                        color: muscleFilter === grp ? 'var(--base-bg)' : 'var(--text-secondary)',
                        border: `1px solid ${muscleFilter === grp ? 'var(--accent)' : 'var(--border-subtle)'}`,
                        cursor: 'pointer', transition: 'all 0.12s ease',
                      }}
                    ><MuscleGroupIcon group={grp} color={muscleFilter === grp ? 'var(--base-bg)' : 'var(--text-secondary)'} /> {grp}</button>
                  ))}
                </div>
              )}
            </>
          )}

          {loggedLifts.map(lift => (
            <LiftCard key={lift} lift={lift} pr={prs[lift]} history={history} onSaved={load} />
          ))}

          {loadError && allLoggedLifts.length === 0 && (
            <ErrorState
              icon={<DumbbellIcon size={64} color="var(--text-muted)" />}
              title="Could not load lifts"
              sub="Check your connection and try again."
              onRetry={load}
            />
          )}

          {!loadError && allLoggedLifts.length === 0 && (
            <EmptyState
              icon={<DumbbellIcon size={64} color="var(--text-muted)" />}
              title="No lifts logged yet"
              sub="Pick an exercise above and log your first set to start tracking PRs and volume."
            />
          )}

          {/* Charts */}
          <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Card>
              <div style={{ marginBottom: 12 }}>
                <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>Weekly Volume</p>
                <p className="section-label mt-0.5">lbs lifted (weight × sets × reps) per week</p>
              </div>
              <VolumeTrendChart />
            </Card>
            <Card>
              <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', marginBottom: 12 }}>Bodyweight</p>
              <BodyweightChart />
            </Card>
          </div>
        </div>

        {/* ── Strength Map tab ── */}
        <div style={{ display: tab === 'strength' ? 'block' : 'none' }}>
          <StrengthTab triggerLoad={strengthLoaded} />
        </div>

      </PageWrapper>
    </>
  )
}
