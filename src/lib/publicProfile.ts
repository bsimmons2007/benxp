import type { SupabaseClient } from '@supabase/supabase-js'

// Keeps the public leaderboard row current without requiring the user to
// visit /leaderboard and tap Sync. Fire-and-forget from the store after XP
// recomputes; silent on missing table (migration not run) or private profile.

let lastSyncedXP: number | null = null

export async function syncPublicProfileXP(
  supabase: SupabaseClient,
  userId: string,
  totalXP: number,
  level: number,
): Promise<void> {
  if (totalXP <= 0 || totalXP === lastSyncedXP) return
  try {
    const { data, error } = await supabase
      .from('public_profiles')
      .select('total_xp, level, is_public')
      .eq('user_id', userId)
      .maybeSingle()
    if (error || !data || !data.is_public) return
    if (data.total_xp === totalXP && data.level === level) {
      lastSyncedXP = totalXP
      return
    }
    const { error: updateErr } = await supabase
      .from('public_profiles')
      .update({ total_xp: totalXP, level, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
    if (!updateErr) lastSyncedXP = totalXP
  } catch { /* offline or table missing — leaderboard page still self-heals */ }
}
