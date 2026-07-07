import { describe, it, expect } from 'vitest'
import {
  xpFromAggregates,
  calculateLevel,
  xpForLevel,
  levelProgress,
  aggregatesFromRawRows,
  XP_RATES,
  type XPAggregates,
  type RawActivityData,
} from '../xp'

function zeroAggregates(): XPAggregates {
  return {
    set_count: 0, workout_days: 0,
    pr_count: 0,
    book_count: 0,
    skate_miles: 0,
    fn_wins: 0, fn_blitz_wins: 0, fn_kills: 0,
    sleep_nights: 0, sleep_quality: 0,
    cardio_run_mi: 0, cardio_bike_mi: 0, cardio_swim_mi: 0,
    cardio_walk_mi: 0, cardio_other_mi: 0,
    challenge_xp: 0, goal_xp: 0,
    mood_count: 0, measurement_count: 0,
    water_goal_days: 0,
    bb_sessions: 0, bb_points: 0,
    pb_games: 0, pb_wins: 0,
    golf_rounds: 0, golf_under_par: 0,
    dg_rounds: 0, dg_under_par: 0,
    hike_miles: 0, hike_elev_buckets: 0,
    tt_games: 0, tt_wins: 0,
    chess_games: 0, chess_wins: 0, chess_draws: 0,
    vb_games: 0, vb_wins: 0,
    sb_games: 0, sb_wins: 0,
    pool_games: 0, pool_wins: 0, pool_bnr: 0,
    meals_logged: 0, nutrition_full_days: 0,
  }
}

function emptyRawRows(): RawActivityData {
  return {
    liftingRows: [], prRows: [], skateRows: [], bookRows: [], gameRows: [],
    challengeRows: [], sleepRows: [], cardioRows: [], bbRows: [], pbRows: [],
    golfRows: [], dgRows: [], hikeRows: [], ttRows: [], chessRows: [],
    poolRows: [], vbRows: [], sbRows: [], moodRows: [], waterRows: [], mealRows: [],
  }
}

describe('xpFromAggregates', () => {
  it('returns 0 XP for all-zero aggregates', () => {
    expect(xpFromAggregates(zeroAggregates())).toBe(0)
  })

  it('computes a hand-computed mixed aggregate', () => {
    const a = zeroAggregates()
    a.set_count = 10        // 10 * 15 = 150
    a.workout_days = 2      // 2 * 60 = 120
    a.pr_count = 1          // 1 * 200 = 200
    a.book_count = 1        // 1 * 250 = 250
    a.skate_miles = 5       // 5 * 12 = 60
    a.fn_wins = 2           // 2 * 100 = 200
    a.fn_blitz_wins = 3     // 3 * 30 = 90
    a.fn_kills = 20         // 20 * 3 = 60
    a.sleep_nights = 7      // 7 * 20 = 140
    a.sleep_quality = 4     // 4 * 35 = 140
    a.cardio_run_mi = 3     // 3 * 15 = 45
    a.cardio_bike_mi = 10   // 10 * 6 = 60
    a.cardio_swim_mi = 1    // 1 * 25 = 25
    a.cardio_walk_mi = 2    // 2 * 4 = 8
    a.challenge_xp = 75
    a.goal_xp = 50
    a.mood_count = 3        // 3 * 15 = 45
    a.water_goal_days = 2   // 2 * 50 = 100
    a.meals_logged = 8      // 8 * 10 = 80
    a.nutrition_full_days = 1 // 1 * 25 = 25

    const expected =
      150 + 120 + 200 + 250 + 60 + 200 + 90 + 60 + 140 + 140 +
      45 + 60 + 25 + 8 + 75 + 50 + 45 + 100 + 80 + 25

    expect(xpFromAggregates(a)).toBe(expected)
    expect(expected).toBe(1923)
  })

  it('rounds fractional XP from mile-based rates', () => {
    const a = zeroAggregates()
    a.cardio_run_mi = 1 / 3   // 1/3 * 15 = 5 XP exactly? -> 4.999... rounds to 5
    expect(xpFromAggregates(a)).toBe(Math.round((1 / 3) * XP_RATES.cardio_run_per_mile))
  })
})

describe('level curve', () => {
  it('is continuous at the level-30 boundary', () => {
    expect(xpForLevel(30)).toBe(126150)
    expect(xpForLevel(29)).toBe(117600)
    expect(xpForLevel(31) - xpForLevel(30)).toBe(8550)
    expect(xpForLevel(32) - xpForLevel(31)).toBe(8550)
  })

  it('calculateLevel inverts xpForLevel for levels below the cap', () => {
    for (const n of [1, 2, 5, 10, 15, 29, 30]) {
      expect(calculateLevel(xpForLevel(n))).toBe(n)
    }
  })

  it('calculateLevel inverts xpForLevel for levels above the cap', () => {
    for (const n of [31, 32, 40, 60, 100]) {
      expect(calculateLevel(xpForLevel(n))).toBe(n)
    }
  })

  it('calculateLevel returns 1 at zero XP', () => {
    expect(calculateLevel(0)).toBe(1)
  })

  it('levelProgress is 0 exactly at a level floor and approaches 1 near the next', () => {
    const floor = xpForLevel(10)
    expect(levelProgress(floor)).toBe(0)
    const ceiling = xpForLevel(11)
    const almostThere = ceiling - 1
    const progress = levelProgress(almostThere)
    expect(progress).toBeGreaterThan(0.9)
    expect(progress).toBeLessThan(1)
  })
})

describe('aggregatesFromRawRows', () => {
  it('caps meals_logged at 4/day and counts nutrition_full_days at >= 3 meals/day', () => {
    const rows = emptyRawRows()
    // Day 1: 5 meals logged -> capped contribution of 4, and counts as a full day (>=3)
    // Day 2: 2 meals logged -> contributes 2, not a full day
    rows.mealRows = [
      { date: '2026-01-01', meal_type: 'breakfast', name: null, calories: 100, protein_g: null, carbs_g: null, fat_g: null },
      { date: '2026-01-01', meal_type: 'lunch', name: null, calories: 100, protein_g: null, carbs_g: null, fat_g: null },
      { date: '2026-01-01', meal_type: 'dinner', name: null, calories: 100, protein_g: null, carbs_g: null, fat_g: null },
      { date: '2026-01-01', meal_type: 'snack', name: null, calories: 100, protein_g: null, carbs_g: null, fat_g: null },
      { date: '2026-01-01', meal_type: 'snack', name: null, calories: 100, protein_g: null, carbs_g: null, fat_g: null },
      { date: '2026-01-02', meal_type: 'breakfast', name: null, calories: 100, protein_g: null, carbs_g: null, fat_g: null },
      { date: '2026-01-02', meal_type: 'lunch', name: null, calories: 100, protein_g: null, carbs_g: null, fat_g: null },
    ]
    const agg = aggregatesFromRawRows(rows)
    expect(agg.meals_logged).toBe(4 + 2)
    expect(agg.nutrition_full_days).toBe(1)
  })

  it('sums water oz per date and counts days >= 64oz as water_goal_days', () => {
    const rows = emptyRawRows()
    rows.waterRows = [
      { date: '2026-01-01', oz: 40 },
      { date: '2026-01-01', oz: 24 },   // day total 64 -> meets goal
      { date: '2026-01-02', oz: 63 },   // just under -> does not meet goal
      { date: '2026-01-03', oz: 80 },   // over -> meets goal
    ]
    const agg = aggregatesFromRawRows(rows)
    expect(agg.water_goal_days).toBe(2)
  })

  it('splits fortnite wins into blitz vs regular based on mode', () => {
    const rows = emptyRawRows()
    rows.gameRows = [
      { date: '2026-01-01', kills: 5, win: true, mode: 'Solo' },
      { date: '2026-01-02', kills: 3, win: true, mode: 'Blitz' },
      { date: '2026-01-03', kills: 1, win: true, mode: 'Blitz Trios' },
      { date: '2026-01-04', kills: 2, win: false, mode: 'Blitz' },   // loss - doesn't count
      { date: '2026-01-05', kills: 4, win: true, mode: null },
    ]
    const agg = aggregatesFromRawRows(rows)
    expect(agg.fn_wins).toBe(2)          // Solo win + null-mode win
    expect(agg.fn_blitz_wins).toBe(2)    // 'Blitz' + 'Blitz Trios' wins
    expect(agg.fn_kills).toBe(5 + 3 + 1 + 2 + 4)
  })

  it('filters all dimensions by the since date (season XP path)', () => {
    const rows = emptyRawRows()
    rows.liftingRows = [
      { date: '2025-12-31', lift: 'Bench', est_1rm: 200, weight: 185, sets: 1, reps: 5 },
      { date: '2026-01-01', lift: 'Bench', est_1rm: 205, weight: 190, sets: 1, reps: 5 },
    ]
    rows.skateRows = [
      { miles: 3, date: '2025-12-31' },
      { miles: 5, date: '2026-01-02' },
    ]
    rows.challengeRows = [
      { status: 'completed', xp_reward: 100 },
    ]

    const since = '2026-01-01'
    const seasonAgg = aggregatesFromRawRows(rows, since)
    expect(seasonAgg.set_count).toBe(1)
    expect(seasonAgg.workout_days).toBe(1)
    expect(seasonAgg.skate_miles).toBe(5)
    // challenge_xp is explicitly zeroed whenever `since` is passed (season path)
    expect(seasonAgg.challenge_xp).toBe(0)

    const allTimeAgg = aggregatesFromRawRows(rows)
    expect(allTimeAgg.set_count).toBe(2)
    expect(allTimeAgg.skate_miles).toBe(8)
    expect(allTimeAgg.challenge_xp).toBe(100)
  })

  it('counts workout_days as distinct lifting dates, not set count', () => {
    const rows = emptyRawRows()
    rows.liftingRows = [
      { date: '2026-01-01', lift: 'Bench', est_1rm: 200, weight: 185, sets: 1, reps: 5 },
      { date: '2026-01-01', lift: 'Squat', est_1rm: 300, weight: 275, sets: 1, reps: 5 },
      { date: '2026-01-02', lift: 'Bench', est_1rm: 205, weight: 190, sets: 1, reps: 5 },
    ]
    const agg = aggregatesFromRawRows(rows)
    expect(agg.set_count).toBe(3)
    expect(agg.workout_days).toBe(2)
  })
})
