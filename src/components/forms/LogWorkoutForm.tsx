import { useForm } from 'react-hook-form'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { checkForPR } from '../../lib/xp'
import { XP_RATES } from '../../lib/xp'
import { today } from '../../lib/utils'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'
import { Toast } from '../ui/Toast'
import { useStore } from '../../store/useStore'
import { getLastUsed, setLastUsed } from '../../lib/lastUsed'
import type { LiftType } from '../../types'

interface WorkoutForm {
  date:        string
  lift:        LiftType
  weight:      string
  sets:        string
  reps:        string
  bodyweight:  string
  equipment:   string
  grip:        string
}

const LIFTS: LiftType[] = ['Bench', 'Squat', 'Deadlift', 'PullUps', 'PushUps']
const BODYWEIGHT_LIFTS: LiftType[] = ['PullUps', 'PushUps']
const GRIP_LIFTS: LiftType[] = ['Bench', 'PullUps']
const EQUIPMENT_TYPES = ['Barbell', 'Dumbbell', 'Cable', 'Machine', 'Smith Machine', 'Bodyweight']
const GRIP_WIDTHS = ['Standard', 'Wide', 'Narrow', 'Close', 'Neutral']

const LIFT_VARIANTS_KEY = 'youxp-lift-variants'
function getLiftVariantsMap(): Record<string, { equipment?: string; grip?: string }> {
  try { return JSON.parse(localStorage.getItem(LIFT_VARIANTS_KEY) ?? '{}') } catch { return {} }
}
function saveVariantsForLift(id: string, equipment: string, grip: string) {
  const m = getLiftVariantsMap()
  m[id] = {
    ...(equipment && equipment !== 'Barbell' ? { equipment } : {}),
    ...(grip && grip !== 'Standard' ? { grip } : {}),
  }
  if (Object.keys(m[id]).length === 0) delete m[id]
  localStorage.setItem(LIFT_VARIANTS_KEY, JSON.stringify(m))
}

const labelStyle: React.CSSProperties = {
  fontSize: 12, fontWeight: 600, color: 'var(--text-muted)',
  textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'var(--font-mono)',
}
const selectStyle: React.CSSProperties = {
  padding: '10px 12px', borderRadius: 10, fontSize: 14,
  background: 'var(--surface-2)', border: '1px solid var(--border-default)',
  color: 'var(--text-primary)', outline: 'none', width: '100%',
  appearance: 'none', WebkitAppearance: 'none',
}

export function LogWorkoutForm() {
  const { register, handleSubmit, watch, reset, setValue, formState: { errors, isSubmitting } } = useForm<WorkoutForm>({
    defaultValues: {
      date: today(),
      lift: getLastUsed('workout-lift', 'Bench') as LiftType,
      sets: '', reps: '', weight: '', bodyweight: '',
      equipment: getLastUsed('workout-equipment', 'Barbell'),
      grip: getLastUsed('workout-grip', 'Standard'),
    },
  })
  const [toast,         setToast]         = useState<string | null>(null)
  const [bwLoggedToday, setBwLoggedToday] = useState(false)
  const [userId,        setUserId]        = useState<string | null>(null)
  const [dupWarning,    setDupWarning]    = useState<string | null>(null)
  const refreshXP = useStore((s) => s.refreshXP)
  const lift = watch('lift')
  const isBodyweight = BODYWEIGHT_LIFTS.includes(lift)
  const showGrip = GRIP_LIFTS.includes(lift)

  useEffect(() => {
    async function loadBW() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)
      const { data } = await supabase
        .from('bodyweight_log').select('weight_lbs')
        .eq('user_id', user.id).eq('date', today())
        .order('created_at', { ascending: false }).limit(1)
      if (data?.[0]) { setValue('bodyweight', String(data[0].weight_lbs)); setBwLoggedToday(true) }
    }
    loadBW()
  }, [setValue])

  const onSubmit = async (data: WorkoutForm) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setToast('Not signed in'); return }

    const sets   = Math.min(Math.max(parseInt(data.sets)  || 1, 1), 100)
    const reps   = Math.min(Math.max(parseInt(data.reps)  || 1, 1), 500)
    const weight = isBodyweight ? (parseFloat(data.bodyweight) || 0) : (parseFloat(data.weight) || 0)
    const est1rm = Math.round((1 + Math.min(reps, 12) / 30) * weight)

    const { data: prData } = await supabase
      .from('pr_history').select('est_1rm').eq('user_id', user.id).eq('lift', data.lift).order('est_1rm', { ascending: false }).limit(1)
    const allTimePR = prData?.[0]?.est_1rm ?? 0
    if (allTimePR > 0 && est1rm > allTimePR * 2.2) {
      setToast(`⚠️ Heads up: ${data.lift} ${weight}lbs looks unusually heavy. Check the value before logging.`)
      return
    }

    const { data: recent } = await supabase
      .from('lifting_log').select('created_at, sets, reps, weight')
      .eq('user_id', user.id).eq('lift', data.lift).eq('date', data.date)
      .gte('created_at', new Date(Date.now() - 120_000).toISOString()).limit(5)
    const dup = (recent ?? []).find(r => r.reps === reps && Math.abs((r.weight ?? 0) - weight) < 0.1)
    if (dup && !dupWarning) {
      setDupWarning(`Possible duplicate: ${data.lift} ${weight}lbs ×${reps} reps already logged recently. Log anyway?`)
      return
    }
    setDupWarning(null)

    const { data: inserted, error } = await supabase
      .from('lifting_log').insert({
        user_id: user.id, date: data.date, lift: data.lift,
        weight: isBodyweight ? null : weight, sets, reps, est_1rm: est1rm,
        bodyweight: data.bodyweight ? parseFloat(data.bodyweight) : null, is_pr: false,
      }).select().single()

    if (error || !inserted) { setToast(`Error: ${error?.message ?? 'Insert failed'}`); return }
    saveVariantsForLift(inserted.id, data.equipment, data.grip)
    setLastUsed('workout-lift', data.lift)
    setLastUsed('workout-equipment', data.equipment)
    setLastUsed('workout-grip', data.grip)

    if (data.bodyweight && parseFloat(data.bodyweight) > 0 && !bwLoggedToday) {
      const { error: bwErr } = await supabase.from('bodyweight_log').insert({
        user_id: userId ?? user.id, date: data.date, weight_lbs: parseFloat(data.bodyweight),
      })
      if (!bwErr) setBwLoggedToday(true)
    }

    const isPR = await checkForPR(supabase, data.lift, est1rm, data.date, inserted.id, user.id)
    if (isPR) await supabase.from('lifting_log').update({ is_pr: true }).eq('id', inserted.id)

    // Check if this was the first set of the day (to include workout_day bonus in toast)
    const { count: prevTodaySets } = await supabase
      .from('lifting_log').select('id', { count: 'exact', head: true })
      .eq('user_id', user.id).eq('date', data.date).neq('id', inserted.id)
    const isFirstSetToday = (prevTodaySets ?? 0) === 0
    // XP engine awards per logged entry (row), not per the sets column — keep the toast honest
    const xpEarned = XP_RATES.per_set + (isPR ? XP_RATES.new_pr : 0) + (isFirstSetToday ? XP_RATES.workout_day : 0)
    setToast(`+${xpEarned} XP${isPR ? ' — New PR!' : ''}${isFirstSetToday ? ' 🏋️' : ''}`)
    await refreshXP()

    const savedBW = data.bodyweight
    reset({ date: today(), lift: data.lift, sets: '', reps: '', weight: '', bodyweight: savedBW, equipment: data.equipment, grip: 'Standard' })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <Input label="Date" type="date" {...register('date', { required: true })} />

      {/* Lift */}
      <div className="flex flex-col gap-1.5">
        <label style={labelStyle}>Lift</label>
        <select {...register('lift')} style={selectStyle}>
          {LIFTS.map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
      </div>

      {/* Equipment + Grip */}
      <div className="flex gap-3">
        <div className="flex flex-col gap-1.5 flex-1">
          <label style={labelStyle}>Equipment</label>
          <select {...register('equipment')} style={selectStyle}>
            {EQUIPMENT_TYPES.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
        </div>
        {showGrip && (
          <div className="flex flex-col gap-1.5 flex-1">
            <label style={labelStyle}>Grip</label>
            <select {...register('grip')} style={selectStyle}>
              {GRIP_WIDTHS.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
        )}
      </div>

      {!isBodyweight && (
        <Input label="Weight (lbs)" type="number" step="2.5" placeholder="135"
          {...register('weight', { required: !isBodyweight })}
          error={errors.weight ? 'Required' : undefined}
        />
      )}

      <div className="flex gap-3">
        <Input label="Sets" type="number" placeholder="3" className="flex-1"
          {...register('sets', { required: true, min: 1, max: 100 })}
          error={errors.sets ? 'Required' : undefined}
        />
        <Input label="Reps" type="number" placeholder="8" className="flex-1"
          {...register('reps', { required: true, min: 1, max: 500 })}
          error={errors.reps ? 'Required' : undefined}
        />
      </div>

      {/* Bodyweight */}
      <div className="flex flex-col gap-1.5">
        <label style={labelStyle}>
          Bodyweight (lbs)
          {bwLoggedToday && (
            <span style={{ marginLeft: 8, fontSize: 10, color: 'var(--green)', fontWeight: 700 }}>
              ✓ logged today
            </span>
          )}
        </label>
        <input
          type="number" step="0.1" placeholder="150"
          {...register('bodyweight')}
          disabled={bwLoggedToday}
          style={{
            ...selectStyle,
            border: `1px solid ${bwLoggedToday ? 'color-mix(in srgb, var(--green) 30%, transparent)' : 'var(--border-default)'}`,
            color: bwLoggedToday ? 'var(--text-muted)' : 'var(--text-primary)',
          }}
        />
        {!bwLoggedToday && (
          <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>
            Only asked once per day — updates your weight graph
          </p>
        )}
      </div>

      {/* Duplicate warning */}
      {dupWarning && (
        <div style={{
          borderRadius: 12, padding: '10px 12px',
          background: 'color-mix(in srgb, var(--red) 8%, transparent)',
          border: '1px solid color-mix(in srgb, var(--red) 22%, transparent)',
        }}>
          <p style={{ fontSize: 12, color: 'var(--red)', lineHeight: 1.5, marginBottom: 8 }}>{dupWarning}</p>
          <div className="flex gap-2">
            <button
              type="button" onClick={() => setDupWarning(null)}
              className="flex-1 py-1.5 rounded-lg text-xs font-semibold"
              style={{ background: 'var(--surface-2)', color: 'var(--text-muted)', border: '1px solid var(--border-default)', cursor: 'pointer' }}
            >
              Cancel
            </button>
            <Button type="submit" loading={isSubmitting} disabled={isSubmitting} style={{ flex: 1 }}>
              Log Anyway
            </Button>
          </div>
        </div>
      )}

      {!dupWarning && (
        <Button type="submit" fullWidth loading={isSubmitting} disabled={isSubmitting}>
          {isSubmitting ? 'Logging...' : 'Log Workout'}
        </Button>
      )}

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </form>
  )
}
