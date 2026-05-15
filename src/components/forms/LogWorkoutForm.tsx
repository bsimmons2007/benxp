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
import type { LiftType } from '../../types'

interface WorkoutForm {
  date: string
  lift: LiftType
  weight: string
  sets: string
  reps: string
  bodyweight: string
  equipment: string
  grip: string
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

export function LogWorkoutForm() {
  const { register, handleSubmit, watch, reset, setValue, formState: { errors, isSubmitting } } = useForm<WorkoutForm>({
    defaultValues: { date: today(), lift: 'Bench', sets: '', reps: '', weight: '', bodyweight: '', equipment: 'Barbell', grip: 'Standard' },
  })
  const [toast,          setToast]          = useState<string | null>(null)
  const [bwLoggedToday,  setBwLoggedToday]  = useState(false)   // already in bodyweight_log today
  const [userId,         setUserId]         = useState<string | null>(null)
  const [dupWarning,     setDupWarning]     = useState<string | null>(null)
  const refreshXP = useStore((s) => s.refreshXP)
  const lift = watch('lift')
  const isBodyweight = BODYWEIGHT_LIFTS.includes(lift)
  const showGrip = GRIP_LIFTS.includes(lift)

  // â"€â"€ Load today's bodyweight on mount â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
  useEffect(() => {
    async function loadBW() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)

      // Check bodyweight_log for today's entry
      const { data } = await supabase
        .from('bodyweight_log')
        .select('weight_lbs')
        .eq('user_id', user.id)
        .eq('date', today())
        .order('created_at', { ascending: false })
        .limit(1)

      if (data?.[0]) {
        setValue('bodyweight', String(data[0].weight_lbs))
        setBwLoggedToday(true)
      }
    }
    loadBW()
  }, [setValue])

  const onSubmit = async (data: WorkoutForm) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setToast('Not signed in'); return }

    const sets   = Math.min(Math.max(parseInt(data.sets)  || 1, 1), 100)
    const reps   = Math.min(Math.max(parseInt(data.reps)  || 1, 1), 500)
    const weight = isBodyweight ? (parseFloat(data.bodyweight) || 0) : (parseFloat(data.weight) || 0)
    const est1rm = Math.round((1 + reps / 30) * weight)

    // Outlier detection — flag suspiciously large values
    const { data: prData } = await supabase
      .from('pr_history').select('est_1rm').eq('lift', data.lift).order('est_1rm', { ascending: false }).limit(1)
    const allTimePR = prData?.[0]?.est_1rm ?? 0
    if (allTimePR > 0 && est1rm > allTimePR * 2.2) {
      setToast(`⚠️ Heads up: ${data.lift} ${weight}lbs looks unusually heavy. Check the value before logging.`)
      return
    }

    // Duplicate detection — check for same lift+date+weight+reps in last 2 minutes
    const { data: recent } = await supabase
      .from('lifting_log')
      .select('created_at, sets, reps, weight')
      .eq('lift', data.lift)
      .eq('date', data.date)
      .gte('created_at', new Date(Date.now() - 120_000).toISOString())
      .limit(5)
    const dup = (recent ?? []).find(r =>
      r.reps === reps && Math.abs((r.weight ?? 0) - weight) < 0.1
    )
    if (dup && !dupWarning) {
      setDupWarning(`Possible duplicate: ${data.lift} ${weight}lbs ×${reps} reps already logged recently. Log anyway?`)
      return
    }
    setDupWarning(null)

    const { data: inserted, error } = await supabase
      .from('lifting_log')
      .insert({
        user_id:    user.id,
        date:       data.date,
        lift:       data.lift,
        weight:     isBodyweight ? null : weight,
        sets,
        reps,
        est_1rm:    est1rm,
        bodyweight: data.bodyweight ? parseFloat(data.bodyweight) : null,
        is_pr:      false,
      })
      .select()
      .single()

    if (error || !inserted) {
      setToast(`Error: ${error?.message ?? 'Insert failed'}`)
      return
    }
    saveVariantsForLift(inserted.id, data.equipment, data.grip)

    // â"€â"€ Save bodyweight to bodyweight_log (only once per day) â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€
    if (data.bodyweight && parseFloat(data.bodyweight) > 0 && !bwLoggedToday) {
      const bwEntry = parseFloat(data.bodyweight)
      await supabase.from('bodyweight_log').insert({
        user_id: userId ?? user.id,
        date: data.date,
        weight_lbs: bwEntry,
      })
      setBwLoggedToday(true)
    }

    const isPR = await checkForPR(supabase, data.lift, est1rm, data.date, inserted.id, user.id)

    if (isPR) {
      await supabase.from('lifting_log').update({ is_pr: true }).eq('id', inserted.id)
    }

    const xpEarned = sets * XP_RATES.per_set + (isPR ? XP_RATES.new_pr : 0)
    setToast(`+${xpEarned} XP${isPR ? ' — New PR!' : ''}`)
    await refreshXP()

    // Keep bodyweight and equipment pre-filled across entries
    const savedBW = data.bodyweight
    reset({ date: today(), lift: data.lift, sets: '', reps: '', weight: '', bodyweight: savedBW, equipment: data.equipment, grip: 'Standard' })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <Input label="Date" type="date" {...register('date', { required: true })} />

      <div className="flex flex-col gap-1">
        <label className="text-base font-medium" style={{ color: '#AAAAAA', fontFamily: 'Cormorant Garamond, serif' }}>Lift</label>
        <select
          {...register('lift')}
          className="px-3 py-2 rounded-lg text-white outline-none"
          style={{ background: '#0D1B2A', border: '1px solid var(--border)' }}
        >
          {LIFTS.map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
      </div>

      {/* Equipment + Grip row */}
      <div className="flex gap-3">
        <div className="flex flex-col gap-1 flex-1">
          <label className="text-sm font-medium" style={{ color: '#AAAAAA', fontFamily: 'Cormorant Garamond, serif' }}>Equipment</label>
          <select
            {...register('equipment')}
            className="px-3 py-2 rounded-lg text-white outline-none text-sm"
            style={{ background: '#0D1B2A', border: '1px solid var(--border)' }}
          >
            {EQUIPMENT_TYPES.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
        </div>
        {showGrip && (
          <div className="flex flex-col gap-1 flex-1">
            <label className="text-sm font-medium" style={{ color: '#AAAAAA', fontFamily: 'Cormorant Garamond, serif' }}>Grip</label>
            <select
              {...register('grip')}
              className="px-3 py-2 rounded-lg text-white outline-none text-sm"
              style={{ background: '#0D1B2A', border: '1px solid var(--border)' }}
            >
              {GRIP_WIDTHS.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
        )}
      </div>

      {!isBodyweight && (
        <Input
          label="Weight (lbs)"
          type="number"
          step="2.5"
          placeholder="135"
          {...register('weight', { required: !isBodyweight })}
          error={errors.weight ? 'Required' : undefined}
        />
      )}

      <div className="flex gap-3">
        <Input
          label="Sets"
          type="number"
          placeholder="3"
          className="flex-1"
          {...register('sets', { required: true, min: 1, max: 100 })}
          error={errors.sets ? 'Required' : undefined}
        />
        <Input
          label="Reps"
          type="number"
          placeholder="8"
          className="flex-1"
          {...register('reps', { required: true, min: 1, max: 500 })}
          error={errors.reps ? 'Required' : undefined}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs font-bold uppercase tracking-wider" style={{ color: '#AAAAAA', fontFamily: 'Cormorant Garamond, serif' }}>
          Bodyweight (lbs)
          {bwLoggedToday && (
            <span style={{ marginLeft: 8, fontSize: 10, color: '#4caf50', fontWeight: 700 }}>âœ" logged today</span>
          )}
        </label>
        <input
          type="number"
          step="0.1"
          placeholder="150"
          {...register('bodyweight')}
          disabled={bwLoggedToday}
          style={{
            padding: '8px 12px', borderRadius: 8, fontSize: 14,
            background: bwLoggedToday ? 'rgba(255,255,255,0.03)' : '#0D1B2A',
            border: `1px solid ${bwLoggedToday ? 'rgba(76,175,80,0.3)' : 'rgba(255,255,255,0.1)'}`,
            color: bwLoggedToday ? '#666' : '#fff',
            outline: 'none', width: '100%', boxSizing: 'border-box',
          }}
        />
        {!bwLoggedToday && (
          <p style={{ fontSize: 10, color: '#555', marginTop: 2 }}>
            Only asked once per day — updates your weight graph
          </p>
        )}
      </div>

      {dupWarning && (
        <div className="rounded-xl px-3 py-2.5 flex flex-col gap-2" style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)' }}>
          <p style={{ fontSize: 11, color: '#f87171', lineHeight: 1.5 }}>{dupWarning}</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setDupWarning(null)}
              className="flex-1 py-1.5 rounded-lg text-xs font-semibold"
              style={{ background: 'var(--input-bg)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
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
