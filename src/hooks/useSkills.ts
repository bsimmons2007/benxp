import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { fetchSkillXP, buildSkillStates } from '../lib/skills'
import type { SkillState } from '../lib/skills'
import { useStore } from '../store/useStore'

// Module-level cache keyed by userId + totalXP to prevent cross-user contamination
let skillCache: { userId: string; xp: number; skills: SkillState[] } | null = null

export function useSkills() {
  const totalXP     = useStore(s => s.totalXP)
  const initialized = useStore(s => s.initialized)
  const userId      = useStore(s => s.userId)

  const cacheValid = skillCache?.userId === userId && skillCache?.xp === totalXP
  const [skills,  setSkills]  = useState<SkillState[]>(cacheValid ? skillCache!.skills : [])
  const [loading, setLoading] = useState(!cacheValid)

  useEffect(() => {
    if (!initialized || !userId) return
    if (skillCache?.userId === userId && skillCache?.xp === totalXP) {
      setSkills(skillCache.skills)
      setLoading(false)
      return
    }

    let cancelled = false
    fetchSkillXP(supabase, userId).then(xpMap => {
      if (cancelled) return
      const result = buildSkillStates(xpMap)
      skillCache = { userId, xp: totalXP, skills: result }
      setSkills(result)
      setLoading(false)
    })

    return () => { cancelled = true }
  }, [initialized, totalXP, userId])

  return { skills, loading }
}
