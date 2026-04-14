import { useStore } from '../store/useStore'
import type { AppStats } from '../store/useStore'

export type { AppStats as Stats }

/** Reads stats from the global store — no component-level fetching. */
export function useStats() {
  const stats       = useStore(s => s.stats)
  const initialized = useStore(s => s.initialized)
  return { stats, loading: !initialized }
}
