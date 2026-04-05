import { useForm } from 'react-hook-form'
import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { XP_RATES } from '../../lib/xp'
import { today } from '../../lib/utils'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'
import { Toast } from '../ui/Toast'
import { useStore } from '../../store/useStore'

interface FortniteForm {
  date: string
  mode: 'Solos' | 'Duos' | 'Squads'
  season: string
  placement: string
  kills: string
  accuracy: string
  win: boolean
}

export function LogFortniteForm() {
  const { register, handleSubmit, watch, reset, formState: { isSubmitting } } = useForm<FortniteForm>({
    defaultValues: { date: today(), mode: 'Solos', season: '', placement: '', kills: '', accuracy: '', win: false },
  })
  const [toast, setToast] = useState<string | null>(null)
  const refreshXP = useStore((s) => s.refreshXP)
  const win = watch('win')

  const onSubmit = async (data: FortniteForm) => {
    await supabase.from('fortnite_games').insert({
      date: data.date,
      mode: data.mode,
      season: data.season || null,
      placement: data.placement ? parseInt(data.placement) : null,
      kills: parseInt(data.kills) || 0,
      accuracy: data.accuracy ? parseFloat(data.accuracy) : null,
      win: data.win,
    })

    const xp = data.win ? XP_RATES.fortnite_win : 0
    setToast(data.win ? `+${xp} XP — Victory Royale! 🏆` : 'Game logged!')
    await refreshXP()
    reset({ date: today(), mode: 'Solos', season: '', placement: '', kills: '', accuracy: '', win: false })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <Input label="Date" type="date" {...register('date', { required: true })} />

      <div className="flex flex-col gap-1">
        <label className="text-base font-medium" style={{ color: '#AAAAAA', fontFamily: 'Cormorant Garamond, serif' }}>Mode</label>
        <select
          {...register('mode')}
          className="px-3 py-2 rounded-lg text-white outline-none"
          style={{ background: '#0D1B2A', border: '1px solid rgba(255,255,255,0.1)' }}
        >
          <option>Solos</option>
          <option>Duos</option>
          <option>Squads</option>
        </select>
      </div>

      <Input label="Season" type="text" placeholder="Chapter 6 S2" {...register('season')} />

      <div className="flex gap-3">
        <Input label="Placement" type="number" placeholder="1" className="flex-1" {...register('placement')} />
        <Input label="Kills" type="number" placeholder="0" className="flex-1" {...register('kills')} />
      </div>

      <Input label="Accuracy %" type="number" step="0.1" placeholder="24.5" {...register('accuracy')} />

      <label className="flex items-center gap-3 cursor-pointer">
        <div
          className="w-12 h-6 rounded-full transition-colors relative"
          style={{ background: win ? '#27AE60' : 'rgba(255,255,255,0.15)' }}
        >
          <div
            className="absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform"
            style={{ transform: win ? 'translateX(26px)' : 'translateX(2px)' }}
          />
        </div>
        <span className="font-medium text-white">Win</span>
        <input type="checkbox" className="sr-only" {...register('win')} />
      </label>

      <Button type="submit" fullWidth disabled={isSubmitting}>
        {isSubmitting ? 'Logging...' : 'Log Game'}
      </Button>
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </form>
  )
}
