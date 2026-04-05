import type { SupabaseClient } from '@supabase/supabase-js'

export const XP_RATES = {
  per_set: 5,
  workout_day: 40,
  new_pr: 100,
  book_finished: 150,
  skate_per_mile: 8,
  fortnite_win: 125,
  challenge: 0, // variable — from xp_reward col
}

export function calculateLevel(totalXP: number): number {
  return Math.floor(1 + Math.sqrt(totalXP / 200))
}

export function xpForLevel(level: number): number {
  return (level - 1) ** 2 * 200
}

export function levelProgress(totalXP: number): number {
  const level = calculateLevel(totalXP)
  const floor = xpForLevel(level)
  const ceiling = xpForLevel(level + 1)
  return (totalXP - floor) / (ceiling - floor)
}

export async function calculateTotalXP(supabase: SupabaseClient): Promise<number> {
  const [lifting, skate, prs, books, wins, challenges] = await Promise.all([
    supabase.from('lifting_log').select('id, date'),
    supabase.from('skate_sessions').select('miles'),
    supabase.from('pr_history').select('id'),
    supabase.from('books').select('id').not('date_finished', 'is', null),
    supabase.from('fortnite_games').select('id').eq('win', true),
    supabase.from('challenges').select('xp_reward').eq('status', 'completed'),
  ])

  const setXP = (lifting.data?.length ?? 0) * XP_RATES.per_set
  const uniqueDays = new Set(lifting.data?.map((r: { date: string }) => r.date)).size
  const dayXP = uniqueDays * XP_RATES.workout_day
  const prXP = (prs.data?.length ?? 0) * XP_RATES.new_pr
  const bookXP = (books.data?.length ?? 0) * XP_RATES.book_finished
  const skateXP =
    (skate.data?.reduce((sum: number, r: { miles: number }) => sum + (r.miles ?? 0), 0) ?? 0) *
    XP_RATES.skate_per_mile
  const fnXP = (wins.data?.length ?? 0) * XP_RATES.fortnite_win
  const challengeXP =
    challenges.data?.reduce(
      (sum: number, r: { xp_reward: number }) => sum + (r.xp_reward ?? 0),
      0
    ) ?? 0

  return Math.round(setXP + dayXP + prXP + bookXP + skateXP + fnXP + challengeXP)
}

export async function checkForPR(
  supabase: SupabaseClient,
  lift: string,
  newEst1RM: number,
  date: string,
  currentRowId: string
): Promise<boolean> {
  const { data: existing } = await supabase
    .from('lifting_log')
    .select('est_1rm')
    .eq('lift', lift)
    .neq('id', currentRowId)
    .order('est_1rm', { ascending: false })
    .limit(1)

  const previousBest = existing?.[0]?.est_1rm ?? 0

  if (newEst1RM > previousBest) {
    await supabase.from('pr_history').insert({ date, lift, est_1rm: newEst1RM })
    return true
  }
  return false
}
