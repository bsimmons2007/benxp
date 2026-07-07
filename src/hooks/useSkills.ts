import { useMemo } from 'react'
import { skillXPFromRawRows, buildSkillStates } from '../lib/skills'
import type { SkillState } from '../lib/skills'
import { useStore } from '../store/useStore'

// Module-level cache keyed by userId + totalXP to prevent cross-user contamination
let skillCache: { userId: string; xp: number; skills: SkillState[] } | null = null

export function useSkills(): { skills: SkillState[]; loading: boolean } {
  const totalXP     = useStore(s => s.totalXP)
  const initialized = useStore(s => s.initialized)
  const userId      = useStore(s => s.userId)
  const rawRows     = useStore(s => s.rawRows)

  return useMemo(() => {
    if (!initialized || !userId || !rawRows) {
      if (skillCache?.userId === userId && skillCache?.xp === totalXP) {
        return { skills: skillCache.skills, loading: false }
      }
      return { skills: [], loading: true }
    }

    if (skillCache?.userId === userId && skillCache?.xp === totalXP) {
      return { skills: skillCache.skills, loading: false }
    }

    const xpMap  = skillXPFromRawRows(rawRows)
    const result = buildSkillStates(xpMap)
    skillCache = { userId, xp: totalXP, skills: result }
    return { skills: result, loading: false }
  }, [initialized, totalXP, userId, rawRows])
}
