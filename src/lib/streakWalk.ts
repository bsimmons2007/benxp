function prevDay(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() - 1)
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-')
}

export interface WalkStreakResult {
  current: number
  freezeTokens: number
  tokenSaving: boolean
  toCover: string[]
}

/** Walk the overall streak back from `today`, bridging single-day gaps with
 *  freeze tokens when a balance is available. Pure and deterministic: takes
 *  today's date and the already-spent dates as input, returns which NEW gap
 *  dates it covered (`toCover`) so the caller can persist them idempotently. */
export function walkStreak(
  activityDates: Set<string>,
  today: string,
  tokenBalance: number,
  alreadySpent: string[],
): WalkStreakResult {
  const spentSet = new Set(alreadySpent)
  let remaining = Math.max(0, tokenBalance - alreadySpent.length)
  const toCover: string[] = []
  let tokenSaving = false

  const activeToday = activityDates.has(today)
  let d = activeToday ? today : prevDay(today)
  let current = 0

  // If today isn't active and yesterday isn't either, there's no live streak to
  // preserve (a token only bridges a *single* missing day, never today itself).
  while (true) {
    if (activityDates.has(d)) {
      current++
      d = prevDay(d)
      continue
    }
    // d is missing. Only a single-day gap can be bridged: the day before d must
    // be an active day for the streak to continue past it.
    const before = prevDay(d)
    if (!activityDates.has(before)) break
    if (spentSet.has(d)) {
      // already covered on a prior run — counts, no new token consumed
      current++
      tokenSaving = true
      d = before
      continue
    }
    if (remaining > 0) {
      remaining--
      toCover.push(d)
      tokenSaving = true
      current++
      d = before
      continue
    }
    break
  }

  return { current, freezeTokens: remaining, tokenSaving, toCover }
}
