import { useForm } from 'react-hook-form'
import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { today } from '../../lib/utils'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'
import { Toast } from '../ui/Toast'

interface SleepForm {
  date: string
  bedtime: string
  hours_slept: string
  wake_time: string
}

export function LogSleepForm() {
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<SleepForm>({
    defaultValues: { date: today(), bedtime: '', hours_slept: '', wake_time: '' },
  })
  const [toast, setToast] = useState<string | null>(null)

  const onSubmit = async (data: SleepForm) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('sleep_log').insert({
      user_id: user.id,
      date: data.date,
      bedtime: data.bedtime || null,
      hours_slept: data.hours_slept ? parseFloat(data.hours_slept) : null,
      wake_time: data.wake_time || null,
    })

    const hrs = parseFloat(data.hours_slept)
    const quality = hrs >= 8 ? 'Great sleep!' : hrs >= 7 ? 'Good sleep' : 'Could be better'
    setToast(`Sleep logged — ${quality}`)
    reset({ date: today(), bedtime: '', hours_slept: '', wake_time: '' })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <Input label="Date" type="date" {...register('date', { required: true })} />
      <Input label="Bedtime" type="time" {...register('bedtime')} />
      <Input label="Hours Slept" type="number" step="0.1" placeholder="7.5" {...register('hours_slept', { required: true })} />
      <Input label="Wake Up" type="time" {...register('wake_time')} />
      <Button type="submit" fullWidth disabled={isSubmitting}>
        {isSubmitting ? 'Logging...' : 'Log Sleep'}
      </Button>
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </form>
  )
}
