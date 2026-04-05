import { useEffect } from 'react'
import { useStore } from '../store/useStore'

export function useXP() {
  const { totalXP, level, progress, loading, refreshXP } = useStore()

  useEffect(() => {
    refreshXP()
  }, [refreshXP])

  return { totalXP, level, progress, loading, refreshXP }
}
