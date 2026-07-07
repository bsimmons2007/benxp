import { describe, it, expect } from 'vitest'
import { walkStreak } from '../streakWalk'

// Fixed anchor so date math is deterministic. 2026-07-06 is a Monday.
const TODAY = '2026-07-06'
const D = {
  today: '2026-07-06',
  d1: '2026-07-05',
  d2: '2026-07-04',
  d3: '2026-07-03',
  d4: '2026-07-02',
  d5: '2026-07-01',
  d6: '2026-06-30',
  d7: '2026-06-29',
}

describe('walkStreak', () => {
  it('counts an unbroken streak ending today', () => {
    const dates = new Set([D.today, D.d1, D.d2, D.d3])
    const result = walkStreak(dates, TODAY, 0, [])
    expect(result.current).toBe(4)
    expect(result.tokenSaving).toBe(false)
    expect(result.toCover).toEqual([])
  })

  it('counts a streak ending yesterday when today is not yet logged', () => {
    // Current behavior: today missing simply shifts the walk start to yesterday
    // and counts from there — today not being logged does not break the streak.
    const dates = new Set([D.d1, D.d2, D.d3])
    const result = walkStreak(dates, TODAY, 0, [])
    expect(result.current).toBe(3)
    expect(result.tokenSaving).toBe(false)
    expect(result.toCover).toEqual([])
  })

  it('bridges an exactly-one-day gap when token balance > 0', () => {
    // Active today, d1; gap at d2; active d3, d4.
    const dates = new Set([D.today, D.d1, D.d3, D.d4])
    const result = walkStreak(dates, TODAY, 1, [])
    // today, d1 (2), bridge d2 (3), d3 (4), d4 (5)
    expect(result.current).toBe(5)
    expect(result.tokenSaving).toBe(true)
    expect(result.toCover).toEqual([D.d2])
    expect(result.freezeTokens).toBe(0)
  })

  it('does not bridge the gap when token balance is 0', () => {
    const dates = new Set([D.today, D.d1, D.d3, D.d4])
    const result = walkStreak(dates, TODAY, 0, [])
    // today, d1 (2), then d2 missing and no tokens -> stop
    expect(result.current).toBe(2)
    expect(result.tokenSaving).toBe(false)
    expect(result.toCover).toEqual([])
    expect(result.freezeTokens).toBe(0)
  })

  it('never bridges a two-day gap even with tokens available', () => {
    // Active today, d1; gap at d2 AND d3; active d4.
    const dates = new Set([D.today, D.d1, D.d4])
    const result = walkStreak(dates, TODAY, 5, [])
    // today, d1 (2); d2 missing, before=d3 also missing -> break
    expect(result.current).toBe(2)
    expect(result.tokenSaving).toBe(false)
    expect(result.toCover).toEqual([])
    expect(result.freezeTokens).toBe(5)
  })

  it('reuses a previously-spent date idempotently without double-spending', () => {
    const dates = new Set([D.today, D.d1, D.d3, D.d4])
    // The gap at d2 was already recorded as spent in a prior run.
    const result = walkStreak(dates, TODAY, 1, [D.d2])
    expect(result.current).toBe(5)
    expect(result.tokenSaving).toBe(true)
    // No NEW spend — d2 was already covered, so toCover stays empty.
    expect(result.toCover).toEqual([])
    // Balance: earned(1) - alreadySpent.length(1) = 0 remaining, untouched.
    expect(result.freezeTokens).toBe(0)
  })

  it('covers only the first of multiple gaps when balance covers just one', () => {
    // Active today, d1; gap d2; active d3; gap d4; active d5, d6.
    const dates = new Set([D.today, D.d1, D.d3, D.d5, D.d6])
    const result = walkStreak(dates, TODAY, 1, [])
    // today, d1 (2), bridge d2 (3), d3 (4); d4 missing, before=d5 active,
    // but no tokens remain -> break.
    expect(result.current).toBe(4)
    expect(result.tokenSaving).toBe(true)
    expect(result.toCover).toEqual([D.d2])
    expect(result.freezeTokens).toBe(0)
  })

  it('returns a zero streak for empty activity', () => {
    const result = walkStreak(new Set<string>(), TODAY, 3, [])
    expect(result.current).toBe(0)
    expect(result.tokenSaving).toBe(false)
    expect(result.toCover).toEqual([])
    expect(result.freezeTokens).toBe(3)
  })

  it('bridges the gap at the walk start day when today is inactive (verified current behavior)', () => {
    // Walk starts at yesterday (today inactive) since a missing "today" simply
    // shifts the start back one day. Yesterday (d1) is then itself the "d"
    // being evaluated, so a token CAN bridge it if day-before (d2) is active.
    // This is a real behavior of the current algorithm, not a hypothetical.
    const dates = new Set([D.d2, D.d3])
    const result = walkStreak(dates, TODAY, 1, [])
    // start d = d1 (today inactive); d1 missing, before = d2 active -> bridge d1
    expect(result.toCover).toEqual([D.d1])
    expect(result.current).toBe(3)
    expect(result.tokenSaving).toBe(true)
  })

  it('caps remaining balance at zero when more dates are spent than earned', () => {
    const dates = new Set([D.today])
    const result = walkStreak(dates, TODAY, 0, [D.d1, D.d2])
    expect(result.freezeTokens).toBe(0)
    expect(result.current).toBe(1)
  })
})
