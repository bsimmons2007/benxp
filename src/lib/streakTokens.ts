import { getPref, setPref } from './prefs'

// ── Streak freeze tokens ──────────────────────────────────────
//
// Rules (deterministic + idempotent):
//  - Earn a MAX of 1 token per calendar month.
//  - A month earns a token if ANY tracked category was "consistent" that month.
//    Consistent = that category has logs in >= 3 distinct ISO weeks of the month
//    (consistency across five categories still yields just 1 token; no stacking).
//  - Balance = tokens earned (from history) - tokens spent (recorded in prefs).
//  - A token auto-spends to cover a single-day gap in the overall streak.
//
// Only the SPENT records live in prefs (list of covered ISO dates). Earned
// tokens are always recomputed from rawRows history, so the balance is
// reproducible on any device.

const SPENT_KEY = 'streakFreezeSpent'

/** ISO-8601 week number for a YYYY-MM-DD date. */
export function isoWeek(dateStr: string): number {
  const d = new Date(dateStr + 'T12:00:00')
  const day = (d.getDay() + 6) % 7          // Mon=0..Sun=6
  d.setDate(d.getDate() - day + 3)          // nearest Thursday
  const firstThursday = new Date(d.getFullYear(), 0, 4)
  const diff = d.getTime() - firstThursday.getTime()
  return 1 + Math.round(diff / (7 * 86400000))
}

function monthKey(dateStr: string): string {
  return dateStr.slice(0, 7)   // YYYY-MM
}

/** Count total tokens earned across all months, from per-category date sets.
 *  A month earns 1 token if any single category logged in >= 3 distinct ISO
 *  weeks that month. */
export function tokensEarned(categoryDateSets: Set<string>[]): number {
  // month -> category index -> set of iso-week keys hit that month
  const months = new Map<string, Map<number, Set<string>>>()
  categoryDateSets.forEach((dates, ci) => {
    for (const dateStr of dates) {
      const mk = monthKey(dateStr)
      const wk = `${dateStr.slice(0, 4)}-W${isoWeek(dateStr)}`
      let cats = months.get(mk)
      if (!cats) { cats = new Map(); months.set(mk, cats) }
      let weeks = cats.get(ci)
      if (!weeks) { weeks = new Set(); cats.set(ci, weeks) }
      weeks.add(wk)
    }
  })

  let earned = 0
  for (const cats of months.values()) {
    let consistent = false
    for (const weeks of cats.values()) {
      if (weeks.size >= 3) { consistent = true; break }
    }
    if (consistent) earned++
  }
  return earned
}

/** Dates a freeze token has been spent to cover (sorted set of YYYY-MM-DD). */
export function getSpentDates(): string[] {
  const raw = getPref<string[] | null>(SPENT_KEY, null)
  return Array.isArray(raw) ? raw : []
}

/** Record a token spent to cover `date`. Idempotent (no duplicate dates). */
export function recordSpend(date: string): void {
  const spent = getSpentDates()
  if (spent.includes(date)) return
  setPref(SPENT_KEY, [...spent, date].sort())
}

export function tokensSpent(): number {
  return getSpentDates().length
}

/** Current available balance = earned - spent (never negative). */
export function tokenBalance(categoryDateSets: Set<string>[]): number {
  return Math.max(0, tokensEarned(categoryDateSets) - tokensSpent())
}
