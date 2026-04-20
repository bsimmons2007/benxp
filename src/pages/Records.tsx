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
import { checkForPR, getMilestoneHit, LIFT_MILESTONES, XP_RATES } from '../lib/xp'
import { MilestoneOverlay } from '../components/ui/MilestoneOverlay'
import { EmptyState } from '../components/ui/EmptyState'
import { DumbbellIcon } from '../components/ui/Icon'
import { useStore } from '../store/useStore'
import type { LiftType, LiftingLog, PrHistory } from '../types'
import { usePageTitle } from '../hooks/usePageTitle'

// ── Exercise library (loaded once from Supabase) ──────────────────────────────

interface ExerciseMeta {
  name:      string
  muscle_group: string
  equipment: string
  type:      string
}

// Emoji per muscle group shown in the picker filter chips
const MUSCLE_GROUP_ICONS: Record<string, string> = {
  'Chest':           '🫁',
  'Back':            '🔙',
  'Shoulders':       '🦴',
  'Biceps':          '💪',
  'Triceps':         '💪',
  'Legs':            '🦵',
  'Glutes':          '🍑',
  'Core':            '⚡',
  'Cardio':          '🏃',
  'Full Body':       '🏋️',
  'Arms':            '💪',
  'Hamstrings':      '🦵',
  'Quads':           '🦵',
  'Calves':          '🦵',
  'Forearms':        '💪',
  'Traps':           '🦴',
  'Lats':            '🔙',
  'Upper Back':      '🔙',
  'Lower Back':      '🔙',
  'Hip Flexors':     '🦵',
  'Abs':             '⚡',
  'Obliques':        '⚡',
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
            onClick={() => { setQuery(''); onChange('', false); setOpen(true) }}
            style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: '#555', fontSize: 14 }}
          >✕</button>
        )}
      </div>

      {open && (
        <div
          style={{
            position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
            background: 'rgba(10,12,28,0.98)', border: '1px solid var(--border)',
            borderRadius: 12, marginTop: 4, maxHeight: 280, overflowY: 'auto',
            boxShadow: '0 12px 40px rgba(0,0,0,0.7)',
            backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
          }}
        >
          {/* Group filter chips */}
          {query.length < 1 && (
            <div style={{ display: 'flex', gap: 6, padding: '8px 10px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexWrap: 'wrap' }}>
              {groups.map(g => (
                <button
                  type="button"
                  key={g}
                  onClick={() => setActiveGrp(prev => prev === g ? null : g)}
                  style={{
                    padding: '3px 10px', borderRadius: 12, fontSize: 11, cursor: 'pointer',
                    background: activeGrp === g ? 'var(--accent)' : 'rgba(255,255,255,0.06)',
                    color: activeGrp === g ? 'var(--base-bg)' : '#888',
                    border: 'none',
                    fontWeight: activeGrp === g ? 700 : 400,
                  }}
                >
                  {MUSCLE_GROUP_ICONS[g] ?? ''} {g}
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
                <p style={{ color: '#555', fontSize: 12 }}>Select a group or type to search</p>
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
                borderBottom: '1px solid rgba(255,255,255,0.04)',
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
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
              style={{ width: '100%', textAlign: 'left', color: '#666', fontSize: 11, background: 'none', border: 'none', cursor: 'pointer', padding: '8px 12px', borderTop: '1px solid rgba(255,255,255,0.05)' }}
            >
              + Use "{query}" as custom exercise
            </button>
          )}
        </div>
      )}
    </div>
  )
}

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
    uid: Math.random().toString(36).slice(2),
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
      background: 'rgba(255,255,255,0.025)', border: '1px solid var(--border-faint)',
      borderRadius: 12, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ color: '#555', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Exercise {index + 1}
        </span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* Timed toggle */}
          <button
            type="button"
            onClick={() => onChange({ isTimed: !entry.isTimed })}
            style={{
              background: isTimed ? 'rgba(245,166,35,0.15)' : 'rgba(255,255,255,0.04)',
              border: isTimed ? '1px solid rgba(245,166,35,0.4)' : '1px solid rgba(255,255,255,0.08)',
              color: isTimed ? 'var(--accent)' : '#555',
              borderRadius: 6, padding: '3px 8px', fontSize: 10, fontWeight: 700,
              cursor: 'pointer', letterSpacing: '0.06em',
            }}
          >
            ⏱ {isTimed ? 'TIMED' : 'REPS'}
          </button>
          {canRemove && (
            <button
              type="button"
              onClick={onRemove}
              style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: 2 }}
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
            <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: 10, marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Weight lbs</label>
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
            <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: 10, marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>BW lbs</label>
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
          <label style={{ display: 'block', color: '#666', fontSize: 10, marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Sets</label>
          <input
            type="number" placeholder="3"
            value={entry.sets}
            onChange={e => onChange({ sets: e.target.value })}
            style={FIELD_STYLE}
            onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
            onBlur={e  => (e.target.style.borderColor = 'rgba(255,255,255,0.10)')}
          />
        </div>

        {/* Reps or Duration */}
        {isTimed ? (
          <div>
            <label style={{ display: 'block', color: 'var(--accent)', fontSize: 10, marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Duration</label>
            <input
              type="text" placeholder="45s or 1:30"
              value={entry.duration}
              onChange={e => onChange({ duration: e.target.value })}
              style={{ ...FIELD_STYLE, borderColor: 'rgba(245,166,35,0.3)' }}
            />
            {entry.duration && parseDuration(entry.duration) > 0 && (
              <p style={{ color: '#555', fontSize: 10, marginTop: 2 }}>{fmtDuration(parseDuration(entry.duration))}</p>
            )}
          </div>
        ) : (
          <div>
            <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: 10, marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Reps</label>
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
          <label style={{ display: 'block', color: '#666', fontSize: 10, marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            RPE
            <span title="Rate of Perceived Exertion — how hard the set felt on a scale of 1–10. 6 = easy, 8 = 2 reps left in tank, 10 = absolute max effort."
              style={{ marginLeft: 5, cursor: 'help', color: '#555', fontSize: 11, fontStyle: 'normal' }}>ⓘ</span>
          </label>
          <input
            type="number" step="0.5" min="1" max="10" placeholder="8 (optional)"
            value={entry.rpe}
            onChange={e => onChange({ rpe: e.target.value })}
            style={FIELD_STYLE}
            onFocus={e => (e.target.style.borderColor = 'var(--accent)')}
            onBlur={e  => (e.target.style.borderColor = 'rgba(255,255,255,0.10)')}
          />
          <p style={{ fontSize: 9, color: '#444', marginTop: 3 }}>1–10 · How hard did that feel? (e.g. 8 = 2 reps left)</p>
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
  const [milestone,  setMilestone]  = useState<import('../lib/xp').StrengthMilestone | null>(null)
  const refreshXP       = useStore(s => s.refreshXP)
  const refreshActivity = useStore(s => s.refreshActivity)
  const [lastWorkout, setLastWorkout] = useState<Omit<SessionEntry, 'uid'>[] | null>(null)
  useEffect(() => {
    try {
      const saved = localStorage.getItem('benxp-last-workout')
      if (saved) setLastWorkout(JSON.parse(saved))
    } catch { /* ignore */ }
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

    let totalXP = 0
    let prCount = 0
    let lastMilestone: import('../lib/xp').StrengthMilestone | null = null

    for (const entry of valid) {
      const isTimed = entry.isTimed || TIMED_EXERCISES.has(entry.liftName)
      const sets    = parseInt(entry.sets) || 1
      const reps    = isTimed ? 0 : (parseInt(entry.reps) || 0)
      const durSecs = isTimed ? parseDuration(entry.duration) : null
      const bw      = entry.bodyweight ? parseFloat(entry.bodyweight) : null
      const weight  = entry.isBodyweight ? (bw ?? 0) : (parseFloat(entry.weight) || 0)
      const est1rm  = !isTimed && weight > 0 && reps > 0
        ? Math.round((1 + reps / 30) * weight * 10) / 10
        : null

      // Check previous best for PR milestone
      let previousBest = 0
      const liftMilestones = LIFT_MILESTONES[entry.liftName]
      if (liftMilestones && !isTimed) {
        const isBWRepLift = entry.isBodyweight
        const { data: prev } = await supabase
          .from('lifting_log')
          .select(isBWRepLift ? 'reps' : 'est_1rm')
          .eq('lift', entry.liftName)
          .order(isBWRepLift ? 'reps' : 'est_1rm', { ascending: false })
          .limit(1)
        previousBest = isBWRepLift
          ? ((prev?.[0] as { reps?: number } | undefined)?.reps ?? 0)
          : ((prev?.[0] as { est_1rm?: number } | undefined)?.est_1rm ?? 0)
      }

      const { data: inserted, error } = await supabase.from('lifting_log').insert({
        user_id:       user.id,
        date,
        lift:          entry.liftName,
        weight:        entry.isBodyweight ? null : (weight || null),
        sets,
        reps:          isTimed ? null : (reps || null),
        est_1rm:       est1rm,
        bodyweight:    bw,
        is_pr:         false,
        rpe:           entry.rpe ? parseFloat(entry.rpe) : null,
        duration_secs: durSecs,
      }).select().single()

      if (error || !inserted) continue

      let isPR = false
      if (est1rm) isPR = await checkForPR(supabase, entry.liftName, est1rm, date, inserted.id, user.id)
      if (isPR) {
        await supabase.from('lifting_log').update({ is_pr: true }).eq('id', inserted.id)
        prCount++
      }

      if (liftMilestones && !isTimed) {
        const newVal = entry.isBodyweight ? reps : (est1rm ?? 0)
        const hit    = getMilestoneHit(entry.liftName, previousBest, newVal)
        if (hit) lastMilestone = hit
      }

      totalXP += sets * XP_RATES.per_set + (isPR ? XP_RATES.new_pr : 0)
    }

    const prMsg = prCount > 0 ? ` — ${prCount} PR${prCount > 1 ? 's' : ''}! 🎉` : ''
    setToast(`+${totalXP} XP · ${valid.length} exercise${valid.length > 1 ? 's' : ''} logged${prMsg}`)
    if (lastMilestone) setMilestone(lastMilestone)
    await refreshXP()
    refreshActivity()
    // Save session template for "Repeat Last Workout"
    const template = valid.map(e => ({
      liftName: e.liftName, isBodyweight: e.isBodyweight, isTimed: e.isTimed,
      weight: e.weight, sets: e.sets, reps: e.reps, duration: e.duration, rpe: e.rpe, bodyweight: e.bodyweight,
    }))
    localStorage.setItem('benxp-last-workout', JSON.stringify(template))

    setEntries([newEntry()])
    setDate(today())
    setOpen(false)
    setSubmitting(false)
    onLogged()
  }

  return (
    <div className="mb-5">
      <div style={{ display: 'flex', gap: 8, marginBottom: lastWorkout ? 8 : 0 }}>
        <button
          onClick={() => setOpen(o => !o)}
          className="flex items-center justify-center gap-2 rounded-xl font-semibold transition-all"
          style={{
            flex: 1, height: 44,
            background: open ? 'rgba(255,255,255,0.04)' : 'var(--accent)',
            color: open ? 'var(--text-secondary)' : '#1A1A2E',
            border: open ? '1px solid var(--border)' : 'none',
            fontSize: 14, letterSpacing: '0.01em',
            boxShadow: open ? 'none' : '0 4px 16px var(--accent-dim)',
          }}
        >
          {open ? '✕ Cancel' : '+ Log Workout'}
        </button>
        {!open && lastWorkout && (
          <button
            onClick={() => {
              setEntries(lastWorkout.map(e => ({ ...e, uid: Math.random().toString(36).slice(2) })))
              setOpen(true)
            }}
            title="Repeat your last logged workout"
            style={{
              height: 44, padding: '0 14px', borderRadius: 12, flexShrink: 0,
              background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)',
              color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 13, fontWeight: 600,
              display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
          >
            ↺ Repeat
          </button>
        )}
      </div>

      {open && (
        <form onSubmit={handleSubmit}>
          <div className="mt-3 rounded-2xl p-4 pop-in" style={{ background: 'rgba(12,16,36,0.95)', border: '1px solid var(--border)', backdropFilter: 'blur(12px)' }}>
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
                background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.12)',
                color: '#555', fontSize: 13, cursor: 'pointer', transition: 'all 0.15s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(245,166,35,0.4)'; e.currentTarget.style.color = 'var(--accent)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = '#555' }}
            >
              + Add Another Exercise
            </button>

            {/* Submit */}
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button
                type="button"
                onClick={cancelSession}
                style={{
                  flex: 1, height: 42, borderRadius: 10, fontSize: 13, fontWeight: 500,
                  background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)',
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
                  color: '#1A1A2E', fontSize: 14, fontWeight: 700,
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  boxShadow: submitting ? 'none' : '0 4px 16px var(--accent-dim)',
                }}
              >
                {submitting ? 'Logging…' : `Log ${entries.filter(e => e.liftName).length || ''} Exercise${entries.filter(e => e.liftName).length !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        </form>
      )}

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
      {milestone && entries[0] && (
        <MilestoneOverlay
          milestone={milestone}
          liftName={entries[0].liftName}
          onDismiss={() => setMilestone(null)}
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
    await supabase.from('lifting_log').update({
      weight: weight ? parseFloat(weight) : null,
      sets: sets ? parseInt(sets) : null,
      reps: reps ? parseInt(reps) : null,
    }).eq('id', row.id)
    setSaving(false); onSaved(); onClose()
  }

  async function del() {
    await supabase.from('lifting_log').delete().eq('id', row.id)
    onSaved(); onClose()
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
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid var(--border-faint)',
        gridColumn: wide ? '1 / -1' : undefined,
        display: 'flex',
        flexDirection: wide ? 'row' : 'column',
        alignItems: wide ? 'center' : undefined,
        justifyContent: wide ? 'space-between' : undefined,
        gap: wide ? 0 : 4,
      }}
    >
      <p style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
        {label}
      </p>
      <p style={{ fontSize: wide ? 15 : 18, fontWeight: 700, color, lineHeight: 1 }}>{value}</p>
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
    ? Math.round((1 + latestWeightedSet.reps! / 30) * latestWeightedSet.weight! * 10) / 10
    : null

  const [hovered, setHovered] = useState(false)

  return (
    <div
      className="mb-2 overflow-hidden"
      style={{
        position: 'relative',
        borderRadius: 14,
        border: open
          ? '1px solid rgba(245,166,35,0.35)'
          : hovered ? '1px solid rgba(255,255,255,0.14)' : '1px solid var(--border)',
        background: open
          ? 'linear-gradient(135deg, rgba(20,26,56,0.95) 0%, rgba(16,20,44,0.95) 100%)'
          : 'var(--card-bg)',
        transition: 'border-color 0.18s ease, background 0.18s ease, box-shadow 0.18s ease',
        boxShadow: open ? '0 4px 24px rgba(0,0,0,0.3)' : hovered ? '0 4px 16px rgba(0,0,0,0.25)' : 'none',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Accent left stripe when open */}
      {open && (
        <div style={{
          position: 'absolute', left: 0, top: 0, bottom: 0, width: 3,
          background: 'var(--accent)', borderRadius: '14px 0 0 14px',
          boxShadow: '0 0 12px var(--accent-dim)',
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
            background: open ? 'rgba(245,166,35,0.12)' : 'rgba(255,255,255,0.06)',
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
              <span style={{ fontWeight: 800, fontSize: 17, color: 'var(--accent)', letterSpacing: '-0.02em' }}>
                {fmtSecs(bestDurSecs)}
              </span>
            )}
            {isBWLift && maxReps > 0 && (
              <span style={{ fontWeight: 800, fontSize: 17, color: 'var(--accent)', letterSpacing: '-0.02em' }}>
                {maxReps}
                <span style={{ fontWeight: 400, fontSize: 11, color: 'var(--text-muted)', marginLeft: 3 }}>reps</span>
              </span>
            )}
            {!isTimedLift && !isBWLift && pr && (
              <span style={{ fontWeight: 800, fontSize: 17, color: 'var(--accent)', letterSpacing: '-0.02em' }}>
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
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '16px 16px 16px 20px' }}>

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
                      background: i % 2 === 0 ? 'rgba(255,255,255,0.025)' : 'transparent',
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
                        <span style={{ fontSize: 10, color: '#9B72CF', background: 'rgba(155,114,207,0.1)', padding: '1px 6px', borderRadius: 4, fontWeight: 600 }}>
                          RPE {row.rpe}
                        </span>
                      )}
                      {row.is_pr && (
                        <span style={{ fontSize: 10, fontWeight: 700, color: '#1A1A2E', background: 'var(--accent)', padding: '1px 6px', borderRadius: 4 }}>
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
                        onClick={e => { e.stopPropagation(); setEditing(row) }}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          width: 24, height: 24, borderRadius: 6,
                          background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-faint)',
                          color: 'var(--text-muted)', cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.12)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)'; (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)' }}
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
        color:      active ? '#1A1A2E' : 'var(--text-secondary)',
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
  const [tab,             setTab]           = useState<'log' | 'strength'>('log')
  const [strengthLoaded,  setStrengthLoaded] = useState(false)
  const [prs,             setPrs]           = useState<Record<string, PrHistory>>({})
  const [history,         setHistory]       = useState<LiftingLog[]>([])
  const [exercises,       setExercises]     = useState<ExerciseMeta[]>([])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [prData, historyData, exData] = await Promise.all([
      supabase.from('pr_history').select('*').eq('user_id', user.id).order('est_1rm', { ascending: false }),
      supabase.from('lifting_log').select('*').eq('user_id', user.id).order('date', { ascending: false }).limit(200),
      supabase.from('exercises').select('name,muscle_group,equipment,type').order('muscle_group').order('name'),
    ])

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

  const loggedLifts = [...new Set(history.map(r => r.lift))]

  return (
    <>
      <TopBar title="Lifting" />
      <PageWrapper>

        {/* ── Tab switcher ── */}
        <div style={{
          display: 'flex', gap: 4, marginBottom: 20,
          background: 'rgba(255,255,255,0.04)', borderRadius: 10,
          padding: 4, border: '1px solid var(--border-faint)',
        }}>
          <TabPill label="Log" active={tab === 'log'}      onClick={() => switchTab('log')} />
          <TabPill label="Strength Map" active={tab === 'strength'} onClick={() => switchTab('strength')} />
        </div>

        {/* ── Log tab ── */}
        <div style={{ display: tab === 'log' ? 'block' : 'none' }}>
          <LogWorkoutPanel onLogged={load} exercises={exercises} />

          {loggedLifts.length > 0 && (
            <p className="section-label mb-3">Your Lifts — tap to expand</p>
          )}

          {loggedLifts.map(lift => (
            <LiftCard key={lift} lift={lift} pr={prs[lift]} history={history} onSaved={load} />
          ))}

          {loggedLifts.length === 0 && (
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
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>lbs lifted (weight × sets × reps) per week</p>
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
