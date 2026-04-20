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
}

const LIFTS: LiftType[] = ['Bench', 'Squat', 'Deadlift', 'PullUps', 'PushUps']
const BODYWEIGHT_LIFTS: LiftType[] = ['PullUps', 'PushUps']

export function LogWorkoutForm() {
  const { register, handleSubmit, watch, reset, setValue, formState: { errors, isSubmitting } } = useForm<WorkoutForm>({
    defaultValues: { date: today(), lift: 'Bench', sets: '', reps: '', weight: '', bodyweight: '' },
  })
  const [toast,          setToast]          = useState<string | null>(null)
  const [bwLoggedToday,  setBwLoggedToday]  = useState(false)   // already in bodyweight_log today
  const [userId,         setUserId]         = useState<string | null>(null)
  const refreshXP = useStore((s) => s.refreshXP)
  const lift = watch('lift')
  const isBodyweight = BODYWEIGHT_LIFTS.includes(lift)

  // ── Load today's bodyweight on mount ───────────────────────────────────────
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

    // ── Save bodyweight to bodyweight_log (only once per day) ──────────────
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
    setToast(`+${xpEarned} XP${isPR ? ' — New PR! 🎉' : ''}`)
    await refreshXP()

    // Keep bodyweight pre-filled across entries (only ask once)
    const savedBW = data.bodyweight
    reset({ date: today(), lift: data.lift, sets: '', reps: '', weight: '', bodyweight: savedBW })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <Input label="Date" type="date" {...register('date', { required: true })} />

      <div className="flex flex-col gap-1">
        <label className="text-base font-medium" style={{ color: '#AAAAAA', fontFamily: 'Cormorant Garamond, serif' }}>Lift</label>
        <select
          {...register('lift')}
          className="px-3 py-2 rounded-lg text-white outline-none"
          style={{ background: '#0D1B2A', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          {LIFTS.map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
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
            <span style={{ marginLeft: 8, fontSize: 10, color: '#4caf50', fontWeight: 700 }}>✓ logged today</span>
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
          <p style={{ fontSize: 10, color: '#777', marginTop: 2 }}>
            Only asked once per day — updates your weight graph
          </p>
        )}
      </div>

      <Button type="submit" fullWidth disabled={isSubmitting}>
        {isSubmitting ? 'Logging...' : 'Log Workout'}
      </Button>

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </form>
  )
}
