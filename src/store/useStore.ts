import { create } from 'zustand'
import { calculateLevel, levelProgress, calculateTotalXP } from '../lib/xp'
import { supabase } from '../lib/supabase'

interface AppState {
  totalXP: number
  level: number
  progress: number
  loading: boolean
  refreshXP: () => Promise<void>
}

export const useStore = create<AppState>((set) => ({
  totalXP: 0,
  level: 1,
  progress: 0,
  loading: true,

  refreshXP: async () => {
    const totalXP = await calculateTotalXP(supabase)
    set({
      totalXP,
      level: calculateLevel(totalXP),
      progress: levelProgress(totalXP),
      loading: false,
    })
  },
}))
