import { describe, it, expect } from 'vitest'
import { tokensEarned, isoWeek } from '../streakTokens'

describe('isoWeek', () => {
  it('computes ISO-8601 week numbers', () => {
    // 2026-01-01 is a Thursday -> ISO week 1 of 2026
    expect(isoWeek('2026-01-01')).toBe(1)
  })
})

describe('tokensEarned', () => {
  it('earns 0 tokens when no category has 3+ distinct ISO weeks in any month', () => {
    // Only 2 distinct weeks logged in January
    const category = new Set(['2026-01-05', '2026-01-12'])
    expect(tokensEarned([category])).toBe(0)
  })

  it('earns 1 token for a month where a category logs in >= 3 distinct ISO weeks', () => {
    // Mondays of 3 different ISO weeks in January 2026
    const category = new Set(['2026-01-05', '2026-01-12', '2026-01-19'])
    expect(tokensEarned([category])).toBe(1)
  })

  it('does not stack tokens when multiple categories are each consistent in the same month', () => {
    const category1 = new Set(['2026-01-05', '2026-01-12', '2026-01-19'])
    const category2 = new Set(['2026-01-06', '2026-01-13', '2026-01-20'])
    expect(tokensEarned([category1, category2])).toBe(1)
  })

  it('earns 1 token per distinct month that qualifies', () => {
    const januaryQualifying = ['2026-01-05', '2026-01-12', '2026-01-19']
    const februaryQualifying = ['2026-02-02', '2026-02-09', '2026-02-16']
    const category = new Set([...januaryQualifying, ...februaryQualifying])
    expect(tokensEarned([category])).toBe(2)
  })

  it('handles a month-boundary case: dates split across two months do not combine into one', () => {
    // 2 dates in the last week of January + 2 dates in the first week of February
    // spans what might look like "4 weeks" of activity but neither month alone hits 3 distinct weeks
    const category = new Set([
      '2026-01-19', '2026-01-26',   // 2 distinct Jan ISO weeks
      '2026-02-02', '2026-02-09',   // 2 distinct Feb ISO weeks
    ])
    expect(tokensEarned([category])).toBe(0)
  })

  it('counts distinct ISO weeks, not distinct dates — multiple logs in the same week only count once', () => {
    // All 7 days of a single ISO week -> only 1 distinct week, not 7
    const category = new Set([
      '2026-01-05', '2026-01-06', '2026-01-07', '2026-01-08',
      '2026-01-09', '2026-01-10', '2026-01-11',
    ])
    expect(tokensEarned([category])).toBe(0)
  })

  it('returns 0 for no category data', () => {
    expect(tokensEarned([])).toBe(0)
    expect(tokensEarned([new Set()])).toBe(0)
  })
})
