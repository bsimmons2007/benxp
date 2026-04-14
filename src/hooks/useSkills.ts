import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { fetchSkillXP, buildSkillStates } from '../lib/skills'
import type { SkillState } from '../lib/skills'
import { useStore } from '../store/useStore'

// Module-level cache keyed by totalXP
let skillCache: { xp: number; skills: SkillState[] } | null = null

export function useSkills() {
  const totalXP    = useStore(s => s.totalXP)
  const initialized = useStore(s => s.initialized)

  const [skills,  setSkills]  = useState<SkillState[]>(skillCache?.xp === totalXP ? skillCache.skills : [])
  const [loading, setLoading] = useState(skillCache?.xp !== totalXP)

  useEffect(() => {
    if (!initialized) return
    if (skillCache?.xp === totalXP) {
      setSkills(skillCache.skills)
      setLoading(false)
      return
    }

    let cancelled = false
    fetchSkillXP(supabase).then(xpMap => {
      if (cancelled) return
      const result = buildSkillStates(xpMap)
      skillCache = { xp: totalXP, skills: result }
      setSkills(result)
      setLoading(false)
    })

    return () => { cancelled = true }
  }, [initialized, totalXP])

  return { skills, loading }
}
