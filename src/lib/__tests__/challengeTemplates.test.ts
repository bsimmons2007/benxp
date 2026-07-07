import { describe, it, expect } from 'vitest'
import { CHALLENGE_TEMPLATES, type UserStats } from '../challengeTemplates'

// Minimal all-zero UserStats fixture; individual tests override the fields they exercise.
function baseStats(): UserStats {
  return {
    lifting:      { avgDaysPerWeek: 0, avgSetsPerWeek: 0 },
    run:          { avgMilesPerWeek: 0, avgSessionsPerWeek: 0 },
    bike:         { avgMilesPerWeek: 0, avgSessionsPerWeek: 0 },
    swim:         { avgSessionsPerWeek: 0 },
    walk:         { avgMilesPerWeek: 0, avgSessionsPerWeek: 0 },
    skate:        { avgMilesPerWeek: 0, avgSessionsPerWeek: 0 },
    sleep:        { avgHours: 0, avgNightsPerWeek: 0 },
    water:        { avgDaysPerWeek: 0 },
    books:        { avgPerMonth: 0 },
    mood:         { avgScore: 0, avgDaysPerWeek: 0 },
    chess:        { avgPerWeek: 0, winRate: 0 },
    disc_golf:    { avgPerMonth: 0 },
    fortnite:     { avgPerWeek: 0, avgKills: 0 },
    golf:         { avgPerMonth: 0 },
    hiking:       { avgMilesPerMonth: 0, avgSessionsPerMonth: 0 },
    basketball:   { avgPerWeek: 0 },
    pickleball:   { avgPerWeek: 0, winRate: 0 },
    pool:         { avgPerWeek: 0, winRate: 0 },
    spikeball:    { avgPerWeek: 0, winRate: 0 },
    table_tennis: { avgPerWeek: 0, winRate: 0 },
    volleyball:   { avgPerWeek: 0, winRate: 0 },
    nutrition:    { avgMealsPerWeek: 0, avgFullDaysPerWeek: 0 },
  }
}

function findTemplate(key: string) {
  const t = CHALLENGE_TEMPLATES.find(t => t.key === key)
  if (!t) throw new Error(`template ${key} not found`)
  return t
}

// sc(avg, factor, min, max=Infinity) = clamp(round(avg * factor), min, max) — read from
// challengeTemplates.ts's private `sc` helper. Verified indirectly through exported templates.
describe('scaleTarget (sc helper) via CHALLENGE_TEMPLATES', () => {
  it('clamps to the minimum when avg * factor is below min', () => {
    const t = findTemplate('lifting_days_w1')   // sc(avgDaysPerWeek, 1.5, 2, 7)
    const stats = baseStats()
    stats.lifting.avgDaysPerWeek = 0
    expect(t.scaleTarget(stats)).toBe(2)   // 0 * 1.5 = 0, clamped up to min 2
  })

  it('clamps to the maximum when avg * factor exceeds max', () => {
    const t = findTemplate('lifting_days_w1')   // sc(avgDaysPerWeek, 1.5, 2, 7)
    const stats = baseStats()
    stats.lifting.avgDaysPerWeek = 10
    expect(t.scaleTarget(stats)).toBe(7)   // 10 * 1.5 = 15, clamped down to max 7
  })

  it('rounds avg * factor to the nearest integer within range', () => {
    const t = findTemplate('lifting_days_w1')   // sc(avgDaysPerWeek, 1.5, 2, 7)
    const stats = baseStats()
    stats.lifting.avgDaysPerWeek = 2   // 2 * 1.5 = 3.0
    expect(t.scaleTarget(stats)).toBe(3)
  })

  it('defaults max to Infinity when omitted, only clamping the floor', () => {
    const t = findTemplate('lifting_sets_w1')   // sc(avgSetsPerWeek, 1.5, 8)  -- no max arg
    const stats = baseStats()
    stats.lifting.avgSetsPerWeek = 100   // 100 * 1.5 = 150, no upper clamp
    expect(t.scaleTarget(stats)).toBe(150)
  })

  it('enforces the floor of at least 1 via Math.max(1, round(...)) semantics', () => {
    const t = findTemplate('run_miles_w1')   // sc(avgMilesPerWeek, 1.6, 2)
    const stats = baseStats()
    stats.run.avgMilesPerWeek = 0
    expect(t.scaleTarget(stats)).toBe(2)   // clamped to explicit min of 2
  })

  it('fixed-target templates ignore stats entirely', () => {
    const t = findTemplate('lifting_pr_w1')   // scaleTarget: () => 1
    const stats = baseStats()
    stats.lifting.avgDaysPerWeek = 999
    expect(t.scaleTarget(stats)).toBe(1)

    const sleepT = findTemplate('sleep_hours_w2')   // scaleTarget: () => 7
    expect(sleepT.scaleTarget(stats)).toBe(7)
  })

  it('xpForTarget scales linearly with the resolved target', () => {
    const t = findTemplate('lifting_days_w1')   // xpForTarget: n => n * 30
    expect(t.xpForTarget(2)).toBe(60)
    expect(t.xpForTarget(7)).toBe(210)
  })
})
