import { useEffect } from 'react'
import { useStore } from '../store/useStore'

/**
 * Triggers the store's init() on first use — subsequent calls are no-ops.
 * All consumers share the same cached XP/level data.
 */
export function useXP() {
  const { totalXP, level, progress, loading, refreshXP, init, initialized } = useStore()

  useEffect(() => {
    if (!initialized) init()
  }, [initialized, init])

  return { totalXP, level, progress, loading, refreshXP }
}
