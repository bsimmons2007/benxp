import { useForm } from 'react-hook-form'
import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { XP_RATES } from '../../lib/xp'
import { today } from '../../lib/utils'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'
import { Toast } from '../ui/Toast'
import { useStore } from '../../store/useStore'

interface SkateForm {
  date: string
  miles: string
  duration: string
  fastest_mile: string
}

export function LogSkateForm() {
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<SkateForm>({
    defaultValues: { date: today(), miles: '', duration: '', fastest_mile: '' },
  })
  const [toast, setToast] = useState<string | null>(null)
  const refreshXP = useStore((s) => s.refreshXP)

  const onSubmit = async (data: SkateForm) => {
    const miles = parseFloat(data.miles)
    await supabase.from('skate_sessions').insert({
      date: data.date,
      miles,
      duration: data.duration || null,
      fastest_mile: data.fastest_mile ? parseFloat(data.fastest_mile) : null,
    })

    const xp = Math.round(miles * XP_RATES.skate_per_mile)
    setToast(`+${xp} XP — Skate logged!`)
    await refreshXP()
    reset({ date: today(), miles: '', duration: '', fastest_mile: '' })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <Input label="Date" type="date" {...register('date', { required: true })} />
      <Input label="Miles" type="number" step="0.01" placeholder="5.5" {...register('miles', { required: true })} />
      <Input label="Duration (e.g. 45m)" type="text" placeholder="45m" {...register('duration')} />
      <Input label="Fastest Mile (min/mi)" type="number" step="0.01" placeholder="5.15" {...register('fastest_mile')} />
      <Button type="submit" fullWidth disabled={isSubmitting}>
        {isSubmitting ? 'Logging...' : 'Log Skate Session'}
      </Button>
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </form>
  )
}
