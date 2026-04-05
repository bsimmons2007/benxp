import { useForm } from 'react-hook-form'
import { useState } from 'react'
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
  const { register, handleSubmit, watch, reset, formState: { errors, isSubmitting } } = useForm<WorkoutForm>({
    defaultValues: { date: today(), lift: 'Bench', sets: '', reps: '', weight: '', bodyweight: '' },
  })
  const [toast, setToast] = useState<string | null>(null)
  const refreshXP = useStore((s) => s.refreshXP)
  const lift = watch('lift')
  const isBodyweight = BODYWEIGHT_LIFTS.includes(lift)

  const onSubmit = async (data: WorkoutForm) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const sets = parseInt(data.sets)
    const reps = parseInt(data.reps)
    const weight = isBodyweight ? (parseFloat(data.bodyweight) || 0) : parseFloat(data.weight)
    const est1rm = (1 + reps / 30) * weight

    const { data: inserted, error } = await supabase
      .from('lifting_log')
      .insert({
        user_id: user.id,
        date: data.date,
        lift: data.lift,
        weight: isBodyweight ? null : weight,
        sets,
        reps,
        bodyweight: data.bodyweight ? parseFloat(data.bodyweight) : null,
        is_pr: false,
      })
      .select()
      .single()

    if (error || !inserted) return

    const isPR = await checkForPR(supabase, data.lift, est1rm, data.date, inserted.id, user.id)

    if (isPR) {
      await supabase.from('lifting_log').update({ is_pr: true }).eq('id', inserted.id)
    }

    const xpEarned = sets * XP_RATES.per_set + (isPR ? XP_RATES.new_pr : 0)
    setToast(`+${xpEarned} XP${isPR ? ' — New PR! 🎉' : ''}`)
    await refreshXP()
    reset({ date: today(), lift: data.lift, sets: '', reps: '', weight: '', bodyweight: '' })
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
          {...register('sets', { required: true })}
          error={errors.sets ? 'Required' : undefined}
        />
        <Input
          label="Reps"
          type="number"
          placeholder="8"
          className="flex-1"
          {...register('reps', { required: true })}
          error={errors.reps ? 'Required' : undefined}
        />
      </div>

      <Input
        label="Bodyweight (lbs, optional)"
        type="number"
        step="0.1"
        placeholder="150"
        {...register('bodyweight')}
      />

      <Button type="submit" fullWidth disabled={isSubmitting}>
        {isSubmitting ? 'Logging...' : 'Log Workout'}
      </Button>

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </form>
  )
}
