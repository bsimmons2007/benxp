import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useStore } from '../store/useStore'

export interface Badge {
  id: string
  icon: string
  name: string
  description: string
  category:
    | 'lifting' | 'skate' | 'books' | 'fortnite' | 'sleep' | 'general' | 'challenges'
    | 'basketball' | 'pickleball' | 'golf' | 'disc_golf' | 'hiking'
    | 'table_tennis' | 'chess' | 'pool' | 'volleyball' | 'spikeball' | 'cardio'
  earned: boolean
  earnedDate?: string
  secret?: boolean
}

interface RawData {
  liftingRows:    { date: string; lift: string; est_1rm: number | null; weight: number | null; sets: number | null; reps: number | null }[]
  prRows:         { lift: string; est_1rm: number; date: string }[]
  skateRows:      { miles: number; date: string }[]
  bookRows:       { date_finished: string | null; title: string }[]
  gameRows:       { date: string; kills: number; win: boolean; accuracy?: number | null }[]
  sleepRows:      { date: string; hours_slept: number | null }[]
  challengeRows:  { status: string; xp_reward: number }[]
  bbRows:         { date: string; points: number; fg_made: number; fg_attempted: number }[]
  pbRows:         { date: string; win: boolean }[]
  golfRows:       { date: string; score: number; par: number; holes: number }[]
  dgRows:         { date: string; score: number; par: number; holes: number }[]
  hikeRows:       { date: string; distance_miles: number; elevation_gain_ft: number | null; difficulty: string | null }[]
  ttRows:         { date: string; win: boolean; my_score: number | null; opp_score: number | null }[]
  chessRows:      { date: string; result: string; rating_after: number | null; opening: string | null }[]
  poolRows:       { date: string; win: boolean; break_and_run: boolean }[]
  vbRows:         { date: string; win: boolean; format: string; kills: number | null }[]
  sbRows:         { date: string; win: boolean }[]
  cardioRows:     { date: string; distance_miles: number; activity: string }[]
  totalXP:        number
  level:          number
}

function evaluate(data: RawData): Badge[] {
  const {
    liftingRows, prRows, skateRows, bookRows,
    gameRows, sleepRows, challengeRows, totalXP, level,
    bbRows, pbRows, golfRows, dgRows, hikeRows,
    ttRows, chessRows, poolRows, vbRows, sbRows, cardioRows,
  } = data

  // ── Existing calculations ──────────────────────────────────────
  const uniqueLiftDays    = new Set(liftingRows.map(r => r.date)).size
  const totalSets         = liftingRows.length
  const totalMiles        = skateRows.reduce((s, r) => s + r.miles, 0)
  const totalSessions     = skateRows.length
  const maxSessionMiles   = skateRows.reduce((m, r) => Math.max(m, r.miles), 0)
  const booksRead         = bookRows.filter(r => r.date_finished).length
  const totalWins         = gameRows.filter(r => r.win).length
  const totalGames        = gameRows.length
  const totalKills        = gameRows.reduce((s, r) => s + (r.kills ?? 0), 0)
  const completedChallenges = challengeRows.filter(r => r.status === 'completed').length
  const goodSleepNights   = sleepRows.filter(r => (r.hours_slept ?? 0) >= 7).length
  const totalSleepLogs    = sleepRows.length
  const totalSleepHours   = sleepRows.reduce((s, r) => s + (r.hours_slept ?? 0), 0)
  const perfectSleep      = sleepRows.filter(r => (r.hours_slept ?? 0) >= 9).length
  const bestKills         = gameRows.reduce((best, r) => Math.max(best, r.kills ?? 0), 0)

  const benchPRs    = prRows.filter(r => r.lift === 'Bench')
  const squatPRs    = prRows.filter(r => r.lift === 'Squat')
  const deadliftPRs = prRows.filter(r => r.lift === 'Deadlift')
  const topBench    = benchPRs.reduce((m, r) => Math.max(m, r.est_1rm), 0)
  const topSquat    = squatPRs.reduce((m, r) => Math.max(m, r.est_1rm), 0)
  const topDeadlift = deadliftPRs.reduce((m, r) => Math.max(m, r.est_1rm), 0)
  const totalPRs    = prRows.length

  const totalVolumeLbs = liftingRows.reduce((s, r) => {
    if (r.weight && r.sets && r.reps) return s + r.weight * r.sets * r.reps
    return s
  }, 0)

  const maxPullupReps = liftingRows.filter(r => r.lift === 'PullUps').reduce((m, r) => Math.max(m, r.reps ?? 0), 0)
  const maxPushupReps = liftingRows.filter(r => r.lift === 'PushUps').reduce((m, r) => Math.max(m, r.reps ?? 0), 0)
  const plTotal       = topBench + topSquat + topDeadlift
  const hasAllCategories = totalSets >= 1 && totalSessions >= 1 && booksRead >= 1 && totalGames >= 1 && totalSleepLogs >= 1

  function longestStreak(dates: string[]): number {
    if (!dates.length) return 0
    const sorted = [...new Set(dates)].sort()
    let best = 1, cur = 1
    for (let i = 1; i < sorted.length; i++) {
      const diff = (new Date(sorted[i] + 'T12:00:00').getTime() - new Date(sorted[i - 1] + 'T12:00:00').getTime()) / 86400000
      cur = diff === 1 ? cur + 1 : 1
      best = Math.max(best, cur)
    }
    return best
  }
  const liftStreak  = longestStreak(liftingRows.map(r => r.date))
  const sleepStreak = longestStreak(sleepRows.map(r => r.date))
  const skateStreak = longestStreak(skateRows.map(r => r.date))

  const accuracyGames = gameRows.filter(r => (r.accuracy ?? 0) > 0)
  const avgAccuracy   = accuracyGames.length
    ? accuracyGames.reduce((s, r) => s + (r.accuracy ?? 0), 0) / accuracyGames.length
    : 0

  const firstLiftDate  = liftingRows[liftingRows.length - 1]?.date
  const firstSkateDate = skateRows[skateRows.length - 1]?.date
  const firstBookDate  = bookRows.filter(r => r.date_finished).sort((a, b) =>
    (a.date_finished ?? '').localeCompare(b.date_finished ?? ''))[0]?.date_finished ?? undefined
  const firstGameDate  = gameRows[gameRows.length - 1]?.date
  const firstSleepDate = sleepRows[sleepRows.length - 1]?.date

  // ── Basketball ────────────────────────────────────────────────
  const bbSessions     = bbRows.length
  const totalBBPoints  = bbRows.reduce((s, r) => s + (r.points ?? 0), 0)
  const maxBBPoints    = bbRows.reduce((m, r) => Math.max(m, r.points ?? 0), 0)
  const bbSharpshooter = bbRows.some(r => r.fg_attempted >= 10 && r.fg_made / r.fg_attempted >= 0.5)

  // ── Pickleball ───────────────────────────────────────────────
  const pbWins  = pbRows.filter(r => r.win).length

  // ── Golf ─────────────────────────────────────────────────────
  const golfRounds     = golfRows.length
  const golfHas18      = golfRows.some(r => r.holes >= 18)
  const golfVsParList  = golfRows.map(r => r.score - r.par)
  const golfUnderPar   = golfVsParList.some(v => v < 0)
  const golfBestVsPar  = golfVsParList.length ? Math.min(...golfVsParList) : 0

  // ── Disc Golf ────────────────────────────────────────────────
  const dgRounds     = dgRows.length
  const dgVsParList  = dgRows.map(r => r.score - r.par)
  const dgUnderPar   = dgVsParList.some(v => v < 0)
  const dgBestVsPar  = dgVsParList.length ? Math.min(...dgVsParList) : 0

  // ── Hiking ───────────────────────────────────────────────────
  const hikeSessions   = hikeRows.length
  const hikeTotalMiles = hikeRows.reduce((s, r) => s + (r.distance_miles ?? 0), 0)
  const hikeTotalElev  = hikeRows.reduce((s, r) => s + (r.elevation_gain_ft ?? 0), 0)
  const hikeMaxElev    = hikeRows.reduce((m, r) => Math.max(m, r.elevation_gain_ft ?? 0), 0)
  const hikeHasExpert  = hikeRows.some(r => r.difficulty?.toLowerCase() === 'expert')

  // ── Table Tennis ─────────────────────────────────────────────
  const ttWins    = ttRows.filter(r => r.win).length
  const ttShutOut = ttRows.some(r => r.win && r.opp_score === 0 && (r.my_score ?? 0) > 0)

  // ── Chess ────────────────────────────────────────────────────
  const chessTotal          = chessRows.length
  const chessWins           = chessRows.filter(r => r.result === 'win').length
  const chessDraws          = chessRows.filter(r => r.result === 'draw').length
  const chessPeakELO        = chessRows.reduce((m, r) => Math.max(m, r.rating_after ?? 0), 0)
  const chessUniqueOpenings = new Set(chessRows.map(r => r.opening).filter(Boolean)).size

  // ── Pool ─────────────────────────────────────────────────────
  const poolWins    = poolRows.filter(r => r.win).length
  const poolBarRuns = poolRows.filter(r => r.break_and_run).length

  // ── Volleyball ───────────────────────────────────────────────
  const vbWins     = vbRows.filter(r => r.win).length
  const vbSandWins = vbRows.filter(r => r.win && r.format === 'Sand').length
  const vbMaxKills = vbRows.reduce((m, r) => Math.max(m, r.kills ?? 0), 0)

  // ── Spikeball ────────────────────────────────────────────────
  const sbWins = sbRows.filter(r => r.win).length

  // ── Cardio ───────────────────────────────────────────────────
  const cardioTotal      = cardioRows.length
  const cardioTotalMiles = cardioRows.reduce((s, r) => s + (r.distance_miles ?? 0), 0)
  const cardioMaxSession = cardioRows.reduce((m, r) => Math.max(m, r.distance_miles ?? 0), 0)

  return [
    // ── GENERAL — First Step & XP ────────────────────────────
    { id: 'first_login',   icon: 'Star',   name: 'First Step',         description: 'Log into YouXP for the first time.',            category: 'general', earned: true },
    { id: 'all_categories',icon: 'Files',  name: 'Renaissance',        description: 'Log data in all 5 tracked categories.',         category: 'general', earned: hasAllCategories },
    { id: 'xp_500',        icon: 'Zap',    name: 'Spark',              description: 'Earn 500 total XP.',                            category: 'general', earned: totalXP >= 500 },
    { id: 'xp_1000',       icon: 'Fire',   name: 'Ignition',           description: 'Earn 1,000 total XP.',                          category: 'general', earned: totalXP >= 1000 },
    { id: 'xp_5000',       icon: 'Rocket', name: 'Liftoff',            description: 'Earn 5,000 total XP.',                          category: 'general', earned: totalXP >= 5000 },
    { id: 'xp_10000',      icon: 'Gem',    name: 'Nova',               description: 'Earn 10,000 total XP.',                         category: 'general', earned: totalXP >= 10000 },
    { id: 'xp_25000',      icon: 'Crown',  name: 'Unstoppable',        description: 'Earn 25,000 total XP.',                         category: 'general', earned: totalXP >= 25000 },
    { id: 'xp_50000',      icon: 'Star',   name: 'Transcendent',       description: 'Earn 50,000 total XP.',                         category: 'general', earned: totalXP >= 50000,  secret: true },
    { id: 'xp_100000',     icon: 'Gem',    name: 'Mythic',             description: 'Earn 100,000 total XP.',                        category: 'general', earned: totalXP >= 100000, secret: true },

    // ── GENERAL — Levels ──────────────────────────────────────
    { id: 'level_5',       icon: 'Up',     name: 'Rising',             description: 'Reach Level 5.',                                category: 'general', earned: level >= 5 },
    { id: 'level_10',      icon: 'Target', name: 'In the Zone',        description: 'Reach Level 10.',                               category: 'general', earned: level >= 10 },
    { id: 'level_20',      icon: 'Shield', name: 'Veteran',            description: 'Reach Level 20.',                               category: 'general', earned: level >= 20 },
    { id: 'level_25',      icon: 'Trophy', name: 'Quarter Century',    description: 'Reach Level 25.',                               category: 'general', earned: level >= 25 },
    { id: 'level_50',      icon: 'Crown',  name: 'Half Century',       description: 'Reach Level 50.',                               category: 'general', earned: level >= 50 },
    { id: 'level_75',      icon: 'Gem',    name: 'Elite',              description: 'Reach Level 75.',                               category: 'general', earned: level >= 75,   secret: true },
    { id: 'level_100',     icon: 'Star',   name: 'Godlike',            description: 'Reach Level 100.',                              category: 'general', earned: level >= 100,  secret: true },

    // ── CHALLENGES ───────────────────────────────────────────
    { id: 'challenges_1',   icon: 'Done',   name: 'Challenger',        description: 'Complete your first challenge.',                 category: 'challenges', earned: completedChallenges >= 1 },
    { id: 'challenges_5',   icon: 'Sword',  name: 'Quest Seeker',      description: 'Complete 5 challenges.',                        category: 'challenges', earned: completedChallenges >= 5 },
    { id: 'challenges_10',  icon: 'Shield', name: 'Battle Hardened',   description: 'Complete 10 challenges.',                       category: 'challenges', earned: completedChallenges >= 10 },
    { id: 'challenges_25',  icon: 'Trophy', name: 'Elite Challenger',  description: 'Complete 25 challenges.',                       category: 'challenges', earned: completedChallenges >= 25 },
    { id: 'challenges_50',  icon: 'Crown',  name: 'Overlord',          description: 'Complete 50 challenges.',                       category: 'challenges', earned: completedChallenges >= 50,  secret: true },
    { id: 'challenges_75',  icon: 'Gem',    name: 'Grand Overlord',    description: 'Complete 75 challenges.',                       category: 'challenges', earned: completedChallenges >= 75,  secret: true },
    { id: 'challenges_100', icon: 'Star',   name: 'Legendary Finisher',description: 'Complete 100 challenges.',                      category: 'challenges', earned: completedChallenges >= 100, secret: true },

    // ── LIFTING — Sets ───────────────────────────────────────
    { id: 'lift_first',      icon: 'Strong', name: 'First Rep',         description: 'Log your first lifting set.',                   category: 'lifting', earned: totalSets >= 1,    earnedDate: firstLiftDate },
    { id: 'lift_50_sets',    icon: 'Chart',  name: 'Getting Reps In',   description: 'Log 50 total sets.',                            category: 'lifting', earned: totalSets >= 50 },
    { id: 'lift_250_sets',   icon: 'Strong', name: 'Iron Work',         description: 'Log 250 total sets.',                           category: 'lifting', earned: totalSets >= 250 },
    { id: 'lift_500_sets',   icon: 'Fire',   name: 'Built Different',   description: 'Log 500 total sets.',                           category: 'lifting', earned: totalSets >= 500 },
    { id: 'lift_1000_sets',  icon: 'Shield', name: 'Iron Shield',       description: 'Log 1,000 total sets.',                         category: 'lifting', earned: totalSets >= 1000 },
    { id: 'lift_2000_sets',  icon: 'Crown',  name: 'Iron Legend',       description: 'Log 2,000 total sets.',                         category: 'lifting', earned: totalSets >= 2000, secret: true },

    // ── LIFTING — Days ───────────────────────────────────────
    { id: 'lift_days_10',    icon: 'Cal',    name: 'Showing Up',        description: 'Work out on 10 different days.',                category: 'lifting', earned: uniqueLiftDays >= 10 },
    { id: 'lift_days_30',    icon: 'Cal',    name: 'Month Warrior',     description: 'Work out on 30 different days.',                category: 'lifting', earned: uniqueLiftDays >= 30 },
    { id: 'lift_days_50',    icon: 'Cal',    name: 'Fifty Sessions',    description: 'Work out on 50 different days.',                category: 'lifting', earned: uniqueLiftDays >= 50 },
    { id: 'lift_days_100',   icon: 'Trophy', name: 'Century Club',      description: 'Work out on 100 different days.',               category: 'lifting', earned: uniqueLiftDays >= 100 },
    { id: 'lift_days_200',   icon: 'Shield', name: 'Iron Discipline',   description: 'Work out on 200 different days.',               category: 'lifting', earned: uniqueLiftDays >= 200 },
    { id: 'lift_days_365',   icon: 'Crown',  name: 'Year of Iron',      description: 'Work out on 365 different days.',               category: 'lifting', earned: uniqueLiftDays >= 365, secret: true },

    // ── LIFTING — Streaks ────────────────────────────────────
    { id: 'lift_streak_7',   icon: 'Fire',   name: 'On Fire',           description: 'Log lifting 7 days in a row.',                  category: 'lifting', earned: liftStreak >= 7 },
    { id: 'lift_streak_14',  icon: 'Fire',   name: 'Volcanic',          description: 'Log lifting 14 days in a row.',                 category: 'lifting', earned: liftStreak >= 14 },
    { id: 'lift_streak_30',  icon: 'Rocket', name: 'Unstoppable Grind', description: 'Log lifting 30 days in a row.',                 category: 'lifting', earned: liftStreak >= 30 },
    { id: 'lift_streak_60',  icon: 'Gem',    name: 'Obsessed',          description: 'Log lifting 60 days in a row.',                 category: 'lifting', earned: liftStreak >= 60, secret: true },

    // ── LIFTING — PRs ────────────────────────────────────────
    { id: 'lift_first_pr',   icon: 'Trophy', name: 'PR Machine',        description: 'Set your first personal record.',               category: 'lifting', earned: totalPRs >= 1 },
    { id: 'lift_10_prs',     icon: 'Trophy', name: 'Record Breaker',    description: 'Set 10 personal records.',                      category: 'lifting', earned: totalPRs >= 10 },
    { id: 'lift_25_prs',     icon: 'Target', name: 'PR Hunter',         description: 'Set 25 personal records.',                      category: 'lifting', earned: totalPRs >= 25 },
    { id: 'lift_50_prs',     icon: 'Gem',    name: 'PR Legend',         description: 'Set 50 personal records.',                      category: 'lifting', earned: totalPRs >= 50 },

    // ── LIFTING — Volume ─────────────────────────────────────
    { id: 'vol_10k',         icon: 'Chart',  name: 'Iron Foundry',      description: 'Lift 10,000 lbs total volume.',                 category: 'lifting', earned: totalVolumeLbs >= 10_000 },
    { id: 'vol_50k',         icon: 'Up',     name: 'Iron Monk',         description: 'Lift 50,000 lbs total volume.',                 category: 'lifting', earned: totalVolumeLbs >= 50_000 },
    { id: 'vol_100k',        icon: 'Mtn',    name: 'Century Lifter',    description: 'Lift 100,000 lbs total volume.',                category: 'lifting', earned: totalVolumeLbs >= 100_000 },
    { id: 'vol_250k',        icon: 'Mtn',    name: 'Mountain Mover',    description: 'Lift 250,000 lbs total volume.',                category: 'lifting', earned: totalVolumeLbs >= 250_000 },
    { id: 'vol_500k',        icon: 'Rocket', name: 'Half Million',      description: 'Lift 500,000 lbs total volume.',                category: 'lifting', earned: totalVolumeLbs >= 500_000,   secret: true },
    { id: 'vol_1m',          icon: 'Crown',  name: 'Iron God',          description: 'Lift 1,000,000 lbs total volume.',              category: 'lifting', earned: totalVolumeLbs >= 1_000_000, secret: true },

    // ── LIFTING — Powerlifting Total ─────────────────────────
    { id: 'pl_total_1000',   icon: 'Trophy', name: 'Four Digit Club',   description: 'Bench + Squat + Deadlift total ≥ 1,000 lbs.',   category: 'lifting', earned: plTotal >= 1000 },
    { id: 'pl_total_1500',   icon: 'Gem',    name: 'Elite Total',       description: 'Bench + Squat + Deadlift total ≥ 1,500 lbs.',   category: 'lifting', earned: plTotal >= 1500, secret: true },
    { id: 'pl_total_2000',   icon: 'Crown',  name: 'Platform Legend',   description: 'Bench + Squat + Deadlift total ≥ 2,000 lbs.',   category: 'lifting', earned: plTotal >= 2000, secret: true },

    // ── LIFTING — Bench ──────────────────────────────────────
    { id: 'bench_95',        icon: 'Strong', name: 'Bar Warrior',       description: 'Bench press 95 lbs est. 1RM.',                  category: 'lifting', earned: topBench >= 95 },
    { id: 'bench_135',       icon: 'Strong', name: 'One Plate',         description: 'Bench press 135 lbs est. 1RM.',                 category: 'lifting', earned: topBench >= 135 },
    { id: 'bench_185',       icon: 'Shield', name: 'Smooth Presser',    description: 'Bench press 185 lbs est. 1RM.',                 category: 'lifting', earned: topBench >= 185 },
    { id: 'bench_225',       icon: 'Trophy', name: 'Two Plates',        description: 'Bench press 225 lbs est. 1RM.',                 category: 'lifting', earned: topBench >= 225 },
    { id: 'bench_275',       icon: 'Fire',   name: 'Powerhouse',        description: 'Bench press 275 lbs est. 1RM.',                 category: 'lifting', earned: topBench >= 275 },
    { id: 'bench_315',       icon: 'Gem',    name: 'Three Plates',      description: 'Bench press 315 lbs est. 1RM.',                 category: 'lifting', earned: topBench >= 315, secret: true },
    { id: 'bench_405',       icon: 'Crown',  name: 'Four Plates',       description: 'Bench press 405 lbs est. 1RM.',                 category: 'lifting', earned: topBench >= 405, secret: true },

    // ── LIFTING — Squat ──────────────────────────────────────
    { id: 'squat_135',       icon: 'Strong', name: 'First Squat Plate', description: 'Squat 135 lbs est. 1RM.',                       category: 'lifting', earned: topSquat >= 135 },
    { id: 'squat_225',       icon: 'Fire',   name: 'Squat Warm-Up',     description: 'Squat 225 lbs est. 1RM.',                       category: 'lifting', earned: topSquat >= 225 },
    { id: 'squat_315',       icon: 'Mtn',    name: 'Quad Dominant',     description: 'Squat 315 lbs est. 1RM.',                       category: 'lifting', earned: topSquat >= 315 },
    { id: 'squat_405',       icon: 'Gem',    name: 'Four Wheels',       description: 'Squat 405 lbs est. 1RM.',                       category: 'lifting', earned: topSquat >= 405, secret: true },
    { id: 'squat_495',       icon: 'Crown',  name: 'Squat God',         description: 'Squat 495 lbs est. 1RM.',                       category: 'lifting', earned: topSquat >= 495, secret: true },

    // ── LIFTING — Deadlift ───────────────────────────────────
    { id: 'dl_225',          icon: 'Strong', name: 'Pulling Weight',    description: 'Deadlift 225 lbs est. 1RM.',                    category: 'lifting', earned: topDeadlift >= 225 },
    { id: 'dl_315',          icon: 'Chart',  name: 'Chain Puller',      description: 'Deadlift 315 lbs est. 1RM.',                    category: 'lifting', earned: topDeadlift >= 315 },
    { id: 'dl_405',          icon: 'Trophy', name: 'Four Wheels Pull',  description: 'Deadlift 405 lbs est. 1RM.',                    category: 'lifting', earned: topDeadlift >= 405 },
    { id: 'dl_500',          icon: 'Gem',    name: 'Five Hundred',      description: 'Deadlift 500 lbs est. 1RM.',                    category: 'lifting', earned: topDeadlift >= 500, secret: true },
    { id: 'dl_600',          icon: 'Crown',  name: 'Six Hundred Club',  description: 'Deadlift 600 lbs est. 1RM.',                    category: 'lifting', earned: topDeadlift >= 600, secret: true },

    // ── LIFTING — Bodyweight & Compound ──────────────────────
    { id: 'lift_all_three',  icon: 'Trophy', name: 'The Big Three',     description: 'Set a PR in Bench, Squat, and Deadlift.',        category: 'lifting', earned: benchPRs.length > 0 && squatPRs.length > 0 && deadliftPRs.length > 0 },
    { id: 'pullup_1',        icon: 'Chart',  name: 'First Pull',        description: 'Do your first pull-up.',                        category: 'lifting', earned: maxPullupReps >= 1 },
    { id: 'pullup_5',        icon: 'Chart',  name: 'Five Up',           description: 'Do 5 pull-ups in one set.',                     category: 'lifting', earned: maxPullupReps >= 5 },
    { id: 'pullup_10',       icon: 'Trophy', name: 'Double Digits',     description: 'Do 10 pull-ups in one set.',                    category: 'lifting', earned: maxPullupReps >= 10 },
    { id: 'pullup_15',       icon: 'Shield', name: 'Pull-Up Machine',   description: 'Do 15 pull-ups in one set.',                    category: 'lifting', earned: maxPullupReps >= 15 },
    { id: 'pullup_20',       icon: 'Crown',  name: 'Bar Athlete',       description: 'Do 20 pull-ups in one set.',                    category: 'lifting', earned: maxPullupReps >= 20, secret: true },
    { id: 'pushup_20',       icon: 'Chart',  name: 'Twenty Strong',     description: 'Do 20 push-ups in one set.',                    category: 'lifting', earned: maxPushupReps >= 20 },
    { id: 'pushup_50',       icon: 'Fire',   name: 'Half-Century Push', description: 'Do 50 push-ups in one set.',                    category: 'lifting', earned: maxPushupReps >= 50 },
    { id: 'pushup_100',      icon: 'Crown',  name: 'Push-Up Legend',    description: 'Do 100 push-ups in one set.',                   category: 'lifting', earned: maxPushupReps >= 100, secret: true },

    // ── SKATE ────────────────────────────────────────────────
    { id: 'skate_first',         icon: 'Skate',  name: 'Rolling Out',       description: 'Log your first skate session.',               category: 'skate', earned: totalSessions >= 1,    earnedDate: firstSkateDate },
    { id: 'skate_10_sessions',   icon: 'Skate',  name: 'Getting the Feel',  description: 'Log 10 skate sessions.',                      category: 'skate', earned: totalSessions >= 10 },
    { id: 'skate_50_sessions',   icon: 'Zap',    name: 'Regular',           description: 'Log 50 skate sessions.',                      category: 'skate', earned: totalSessions >= 50 },
    { id: 'skate_100_sessions',  icon: 'Fire',   name: 'Skate Addict',      description: 'Log 100 skate sessions.',                     category: 'skate', earned: totalSessions >= 100 },
    { id: 'skate_200_sessions',  icon: 'Gem',    name: 'Born on Wheels',    description: 'Log 200 skate sessions.',                     category: 'skate', earned: totalSessions >= 200, secret: true },
    { id: 'skate_3mi_session',   icon: 'Zap',    name: 'Distance Pusher',   description: 'Skate 3+ miles in a single session.',         category: 'skate', earned: maxSessionMiles >= 3 },
    { id: 'skate_5mi_session',   icon: 'Rocket', name: 'Speed Demon',       description: 'Skate 5+ miles in a single session.',         category: 'skate', earned: maxSessionMiles >= 5 },
    { id: 'skate_10mi_session',  icon: 'Gem',    name: 'Distance King',     description: 'Skate 10+ miles in a single session.',        category: 'skate', earned: maxSessionMiles >= 10, secret: true },
    { id: 'skate_10_miles',      icon: 'Skate',  name: 'Ten Miles',         description: 'Skate a total of 10 miles.',                  category: 'skate', earned: totalMiles >= 10 },
    { id: 'skate_20_miles',      icon: 'Up',     name: 'Pavement Pounder',  description: 'Skate a total of 20 miles.',                  category: 'skate', earned: totalMiles >= 20 },
    { id: 'skate_50_miles',      icon: 'Up',     name: 'Road Tripper',      description: 'Skate a total of 50 miles.',                  category: 'skate', earned: totalMiles >= 50 },
    { id: 'skate_100_miles',     icon: 'Trophy', name: 'Centurion',         description: 'Skate a total of 100 miles.',                 category: 'skate', earned: totalMiles >= 100 },
    { id: 'skate_200_miles',     icon: 'Shield', name: 'Road Warrior',      description: 'Skate a total of 200 miles.',                 category: 'skate', earned: totalMiles >= 200 },
    { id: 'skate_500_miles',     icon: 'Rocket', name: 'Cross Country',     description: 'Skate a total of 500 miles.',                 category: 'skate', earned: totalMiles >= 500,    secret: true },
    { id: 'skate_1000_miles',    icon: 'Crown',  name: 'Iron Skater',       description: 'Skate a total of 1,000 miles.',               category: 'skate', earned: totalMiles >= 1000,   secret: true },
    { id: 'skate_streak_7',      icon: 'Fire',   name: 'Daily Skater',      description: 'Skate 7 days in a row.',                      category: 'skate', earned: skateStreak >= 7 },
    { id: 'skate_streak_30',     icon: 'Rocket', name: 'Wheels Never Stop', description: 'Skate 30 days in a row.',                     category: 'skate', earned: skateStreak >= 30, secret: true },

    // ── BOOKS ────────────────────────────────────────────────
    { id: 'book_first',   icon: 'Read',  name: 'First Page',        description: 'Finish your first book.',                       category: 'books', earned: booksRead >= 1,    earnedDate: firstBookDate },
    { id: 'book_3',       icon: 'Books', name: 'Trilogy',           description: 'Finish 3 books.',                               category: 'books', earned: booksRead >= 3 },
    { id: 'book_5',       icon: 'Books', name: 'Bookworm',          description: 'Finish 5 books.',                               category: 'books', earned: booksRead >= 5 },
    { id: 'book_10',      icon: 'Brain', name: 'Voracious Reader',  description: 'Finish 10 books.',                              category: 'books', earned: booksRead >= 10 },
    { id: 'book_25',      icon: 'Brain', name: 'Scholar',           description: 'Finish 25 books.',                              category: 'books', earned: booksRead >= 25 },
    { id: 'book_50',      icon: 'Star',  name: 'Bibliophile',       description: 'Finish 50 books.',                              category: 'books', earned: booksRead >= 50,   secret: true },
    { id: 'book_100',     icon: 'Gem',   name: 'Century Reader',    description: 'Finish 100 books.',                             category: 'books', earned: booksRead >= 100,  secret: true },

    // ── FORTNITE ─────────────────────────────────────────────
    { id: 'fn_10_games',      icon: 'Game',   name: 'In the Lobby',     description: 'Play 10 Fortnite games.',                    category: 'fortnite', earned: totalGames >= 10 },
    { id: 'fn_50_games',      icon: 'Game',   name: 'Seasoned Player',  description: 'Play 50 Fortnite games.',                    category: 'fortnite', earned: totalGames >= 50 },
    { id: 'fn_100_games',     icon: 'Game',   name: 'Veteran Operator', description: 'Play 100 Fortnite games.',                   category: 'fortnite', earned: totalGames >= 100 },
    { id: 'fn_first_win',     icon: 'Trophy', name: 'Victory Royale',   description: 'Log your first Fortnite win.',               category: 'fortnite', earned: totalWins >= 1,    earnedDate: firstGameDate },
    { id: 'fn_5_wins',        icon: 'Trophy', name: 'Winner',           description: 'Log 5 Fortnite wins.',                       category: 'fortnite', earned: totalWins >= 5 },
    { id: 'fn_25_wins',       icon: 'Target', name: 'Sharpshooter',     description: 'Log 25 Fortnite wins.',                      category: 'fortnite', earned: totalWins >= 25 },
    { id: 'fn_50_wins',       icon: 'Game',   name: 'Elite Operator',   description: 'Log 50 Fortnite wins.',                      category: 'fortnite', earned: totalWins >= 50 },
    { id: 'fn_100_wins',      icon: 'Sword',  name: 'No Mercy',         description: 'Log 100 Fortnite wins.',                     category: 'fortnite', earned: totalWins >= 100,  secret: true },
    { id: 'fn_500_wins',      icon: 'Crown',  name: 'Legend',           description: 'Log 500 Fortnite wins.',                     category: 'fortnite', earned: totalWins >= 500,  secret: true },
    { id: 'fn_100_kills',     icon: 'Sword',  name: 'Slayer',           description: 'Record 100 total kills.',                    category: 'fortnite', earned: totalKills >= 100 },
    { id: 'fn_500_kills',     icon: 'Sword',  name: 'Eliminator',       description: 'Record 500 total kills.',                    category: 'fortnite', earned: totalKills >= 500 },
    { id: 'fn_1000_kills',    icon: 'Crown',  name: 'Mass Eliminator',  description: 'Record 1,000 total kills.',                  category: 'fortnite', earned: totalKills >= 1000, secret: true },
    { id: 'fn_10_kills_game', icon: 'Zap',    name: 'Wipe Out',         description: 'Get 10+ kills in a single game.',            category: 'fortnite', earned: bestKills >= 10 },
    { id: 'fn_20_kills_game', icon: 'Gem',    name: 'Nuclear',          description: 'Get 20+ kills in a single game.',            category: 'fortnite', earned: bestKills >= 20,    secret: true },
    { id: 'fn_accuracy_30',   icon: 'Target', name: 'On Target',        description: 'Maintain 30%+ average accuracy.',            category: 'fortnite', earned: avgAccuracy >= 30 },
    { id: 'fn_accuracy_50',   icon: 'Gem',    name: 'Dead Eye',         description: 'Maintain 50%+ average accuracy.',            category: 'fortnite', earned: avgAccuracy >= 50 },
    { id: 'fn_accuracy_70',   icon: 'Crown',  name: 'Laser Sight',      description: 'Maintain 70%+ average accuracy.',            category: 'fortnite', earned: avgAccuracy >= 70,  secret: true },

    // ── SLEEP ────────────────────────────────────────────────
    { id: 'sleep_first',       icon: 'Moon',   name: 'Rest Up',          description: 'Log your first night of sleep.',             category: 'sleep', earned: totalSleepLogs >= 1,   earnedDate: firstSleepDate },
    { id: 'sleep_7_nights',    icon: 'Moon',   name: 'Week of Rest',     description: 'Log 7 nights of sleep.',                     category: 'sleep', earned: totalSleepLogs >= 7 },
    { id: 'sleep_30_nights',   icon: 'Star',   name: 'Sleep Tracker',    description: 'Log 30 nights of sleep.',                    category: 'sleep', earned: totalSleepLogs >= 30 },
    { id: 'sleep_50_nights',   icon: 'Star',   name: 'Consistent Logger',description: 'Log 50 nights of sleep.',                    category: 'sleep', earned: totalSleepLogs >= 50 },
    { id: 'sleep_100_nights',  icon: 'Trophy', name: 'Century Sleeper',  description: 'Log 100 nights of sleep.',                   category: 'sleep', earned: totalSleepLogs >= 100 },
    { id: 'sleep_good_3',      icon: 'Moon',   name: 'Well Rested',      description: 'Log 3 nights of 7+ hours sleep.',            category: 'sleep', earned: goodSleepNights >= 3 },
    { id: 'sleep_good_14',     icon: 'Shield', name: 'Recovery Pro',     description: 'Log 14 nights of 7+ hours sleep.',           category: 'sleep', earned: goodSleepNights >= 14 },
    { id: 'sleep_good_30',     icon: 'Star',   name: 'Recovery Master',  description: 'Log 30 nights of 7+ hours sleep.',           category: 'sleep', earned: goodSleepNights >= 30 },
    { id: 'sleep_good_60',     icon: 'Trophy', name: 'Sleep Champion',   description: 'Log 60 nights of 7+ hours sleep.',           category: 'sleep', earned: goodSleepNights >= 60,  secret: true },
    { id: 'sleep_good_90',     icon: 'Gem',    name: 'Body in Sync',     description: 'Log 90 nights of 7+ hours sleep.',           category: 'sleep', earned: goodSleepNights >= 90,  secret: true },
    { id: 'sleep_streak_7',    icon: 'Fire',   name: 'Sleep Streak',     description: 'Log sleep 7 nights in a row.',               category: 'sleep', earned: sleepStreak >= 7 },
    { id: 'sleep_streak_30',   icon: 'Gem',    name: 'Sleep Machine',    description: 'Log sleep 30 nights in a row.',              category: 'sleep', earned: sleepStreak >= 30 },
    { id: 'sleep_perfect_5',   icon: 'Moon',   name: 'Deep Sleep',       description: 'Log 5 nights of 9+ hours sleep.',            category: 'sleep', earned: perfectSleep >= 5 },
    { id: 'sleep_perfect_10',  icon: 'Crown',  name: 'Peak Recovery',    description: 'Log 10 nights of 9+ hours sleep.',           category: 'sleep', earned: perfectSleep >= 10 },
    { id: 'sleep_perfect_20',  icon: 'Gem',    name: 'Hibernation Mode', description: 'Log 20 nights of 9+ hours sleep.',           category: 'sleep', earned: perfectSleep >= 20,     secret: true },
    { id: 'sleep_400h',        icon: 'Star',   name: 'Rested Soul',      description: 'Accumulate 400+ total hours of sleep.',      category: 'sleep', earned: totalSleepHours >= 400 },
    { id: 'sleep_1000h',       icon: 'Crown',  name: 'Sleep Sage',       description: 'Accumulate 1,000+ total hours of sleep.',    category: 'sleep', earned: totalSleepHours >= 1000, secret: true },

    // ── BASKETBALL ───────────────────────────────────────────
    { id: 'bb_first',        icon: 'Basketball', name: 'First Shot',       description: 'Log your first basketball session.',              category: 'basketball', earned: bbSessions >= 1 },
    { id: 'bb_10_sessions',  icon: 'Basketball', name: 'Regular Baller',   description: 'Log 10 basketball sessions.',                     category: 'basketball', earned: bbSessions >= 10 },
    { id: 'bb_century',      icon: 'Trophy',     name: 'Century Scorer',   description: 'Log 100 total points across all sessions.',       category: 'basketball', earned: totalBBPoints >= 100 },
    { id: 'bb_buckets',      icon: 'Fire',       name: 'Buckets',          description: 'Score 50+ points in a single session.',          category: 'basketball', earned: maxBBPoints >= 50 },
    { id: 'bb_sharp',        icon: 'Target',     name: 'Sharpshooter',     description: 'Shoot 50%+ from the field (min 10 attempts).',   category: 'basketball', earned: bbSharpshooter },

    // ── PICKLEBALL ───────────────────────────────────────────
    { id: 'pb_first_win',    icon: 'Target',  name: 'Dinking',          description: 'Win your first pickleball game.',                 category: 'pickleball', earned: pbWins >= 1 },
    { id: 'pb_10_wins',      icon: 'Target',  name: 'On the Court',     description: 'Win 10 pickleball games.',                        category: 'pickleball', earned: pbWins >= 10 },
    { id: 'pb_25_wins',      icon: 'Trophy',  name: 'Dink Master',      description: 'Win 25 pickleball games.',                        category: 'pickleball', earned: pbWins >= 25 },
    { id: 'pb_50_wins',      icon: 'Crown',   name: 'Pickleball Pro',   description: 'Win 50 pickleball games.',                        category: 'pickleball', earned: pbWins >= 50, secret: true },

    // ── GOLF ─────────────────────────────────────────────────
    { id: 'golf_first',      icon: 'Golf',    name: 'First Tee',        description: 'Log your first round of golf.',                   category: 'golf', earned: golfRounds >= 1 },
    { id: 'golf_18_holes',   icon: 'Golf',    name: '18 Holes',         description: 'Complete a full 18-hole round.',                  category: 'golf', earned: golfHas18 },
    { id: 'golf_10_rounds',  icon: 'Trophy',  name: 'Regular Golfer',   description: 'Log 10 rounds of golf.',                         category: 'golf', earned: golfRounds >= 10 },
    { id: 'golf_under_par',  icon: 'Target',  name: 'Under Par',        description: 'Shoot under par in any round.',                   category: 'golf', earned: golfUnderPar },
    { id: 'golf_eagle_round',icon: 'Crown',   name: 'Eagle Round',      description: 'Finish a round 5+ strokes under par.',           category: 'golf', earned: golfBestVsPar <= -5, secret: true },

    // ── DISC GOLF ────────────────────────────────────────────
    { id: 'dg_first',        icon: 'Disc',    name: 'First Disc',       description: 'Log your first disc golf round.',                 category: 'disc_golf', earned: dgRounds >= 1 },
    { id: 'dg_10_rounds',    icon: 'Trophy',  name: 'Disc Regular',     description: 'Log 10 disc golf rounds.',                        category: 'disc_golf', earned: dgRounds >= 10 },
    { id: 'dg_under_par',    icon: 'Target',  name: 'Under Par',        description: 'Shoot under par in a disc golf round.',           category: 'disc_golf', earned: dgUnderPar },
    { id: 'dg_birdie_machine',icon: 'Crown',  name: 'Birdie Machine',   description: 'Finish a round 5+ strokes under par.',           category: 'disc_golf', earned: dgBestVsPar <= -5, secret: true },

    // ── HIKING ───────────────────────────────────────────────
    { id: 'hike_first',      icon: 'Mtn',     name: 'Trail Starter',    description: 'Log your first hike.',                           category: 'hiking', earned: hikeSessions >= 1 },
    { id: 'hike_10mi',       icon: 'Mtn',     name: 'Ten Miles',        description: 'Log 10 total miles hiked.',                      category: 'hiking', earned: hikeTotalMiles >= 10 },
    { id: 'hike_50mi',       icon: 'Trophy',  name: 'Trail Runner',     description: 'Log 50 total miles hiked.',                      category: 'hiking', earned: hikeTotalMiles >= 50 },
    { id: 'hike_100mi',      icon: 'Crown',   name: 'Century Hiker',    description: 'Log 100 total miles hiked.',                     category: 'hiking', earned: hikeTotalMiles >= 100, secret: true },
    { id: 'hike_summit',     icon: 'Rocket',  name: 'Summit Seeker',    description: 'Gain 1,000+ ft elevation in a single hike.',    category: 'hiking', earned: hikeMaxElev >= 1000 },
    { id: 'hike_vert_mile',  icon: 'Gem',     name: 'Vertical Mile',    description: 'Accumulate 5,280 ft total elevation gain.',      category: 'hiking', earned: hikeTotalElev >= 5280, secret: true },
    { id: 'hike_expert',     icon: 'Shield',  name: 'Expert Trail',     description: 'Complete an Expert difficulty hike.',            category: 'hiking', earned: hikeHasExpert },

    // ── TABLE TENNIS ─────────────────────────────────────────
    { id: 'tt_first_win',    icon: 'Paddle',  name: 'First Serve',      description: 'Win your first table tennis game.',              category: 'table_tennis', earned: ttWins >= 1 },
    { id: 'tt_10_wins',      icon: 'Trophy',  name: 'Table Regular',    description: 'Win 10 table tennis games.',                     category: 'table_tennis', earned: ttWins >= 10 },
    { id: 'tt_25_wins',      icon: 'Trophy',  name: 'Paddle Pro',       description: 'Win 25 table tennis games.',                     category: 'table_tennis', earned: ttWins >= 25 },
    { id: 'tt_50_wins',      icon: 'Crown',   name: 'Table Champion',   description: 'Win 50 table tennis games.',                     category: 'table_tennis', earned: ttWins >= 50, secret: true },
    { id: 'tt_shut_out',     icon: 'Gem',     name: 'Shut Out',         description: 'Win a game with the opponent scoring 0.',        category: 'table_tennis', earned: ttShutOut },

    // ── CHESS ────────────────────────────────────────────────
    { id: 'chess_first',       icon: 'Chess',   name: 'First Move',       description: 'Log your first chess game.',                   category: 'chess', earned: chessTotal >= 1 },
    { id: 'chess_first_win',   icon: 'Trophy',  name: 'Check!',           description: 'Win your first chess game.',                   category: 'chess', earned: chessWins >= 1 },
    { id: 'chess_10_wins',     icon: 'Trophy',  name: 'Tactician',        description: 'Win 10 chess games.',                          category: 'chess', earned: chessWins >= 10 },
    { id: 'chess_draw_5',      icon: 'Shield',  name: 'Draw Artist',      description: 'Log 5 draws.',                                 category: 'chess', earned: chessDraws >= 5 },
    { id: 'chess_openings',    icon: 'Brain',   name: 'Opening Theory',   description: 'Play 10 different openings.',                  category: 'chess', earned: chessUniqueOpenings >= 10 },
    { id: 'chess_1500',        icon: 'Gem',     name: '1500 Club',        description: 'Reach 1,500 ELO rating.',                      category: 'chess', earned: chessPeakELO >= 1500 },
    { id: 'chess_1800',        icon: 'Crown',   name: '1800 Club',        description: 'Reach 1,800 ELO rating.',                      category: 'chess', earned: chessPeakELO >= 1800, secret: true },

    // ── POOL ─────────────────────────────────────────────────
    { id: 'pool_first_win',  icon: 'Pool',    name: "Rack 'Em",         description: 'Win your first pool game.',                      category: 'pool', earned: poolWins >= 1 },
    { id: 'pool_first_bar',  icon: 'Trophy',  name: 'Break & Run',      description: 'Pull off your first break & run.',              category: 'pool', earned: poolBarRuns >= 1 },
    { id: 'pool_10_wins',    icon: 'Trophy',  name: 'Pool Shark',       description: 'Win 10 pool games.',                            category: 'pool', earned: poolWins >= 10 },
    { id: 'pool_25_wins',    icon: 'Shield',  name: 'Hustler',          description: 'Win 25 pool games.',                            category: 'pool', earned: poolWins >= 25 },
    { id: 'pool_bar_10',     icon: 'Crown',   name: 'Break & Run King', description: 'Pull off 10 break & runs.',                    category: 'pool', earned: poolBarRuns >= 10, secret: true },

    // ── VOLLEYBALL ───────────────────────────────────────────
    { id: 'vb_first_win',    icon: 'Volleyball', name: 'First Spike',    description: 'Win your first volleyball game.',              category: 'volleyball', earned: vbWins >= 1 },
    { id: 'vb_10_wins',      icon: 'Trophy',     name: 'Court Ready',    description: 'Win 10 volleyball games.',                     category: 'volleyball', earned: vbWins >= 10 },
    { id: 'vb_25_wins',      icon: 'Trophy',     name: 'Net Dominator',  description: 'Win 25 volleyball games.',                     category: 'volleyball', earned: vbWins >= 25 },
    { id: 'vb_beach_bum',    icon: 'Star',       name: 'Beach Bum',      description: 'Win 10 sand volleyball games.',                category: 'volleyball', earned: vbSandWins >= 10 },
    { id: 'vb_net_master',   icon: 'Crown',      name: 'Net Master',     description: 'Record 10+ kills in a single session.',        category: 'volleyball', earned: vbMaxKills >= 10 },

    // ── SPIKEBALL ────────────────────────────────────────────
    { id: 'sb_first_win',    icon: 'Spikeball', name: 'First Spike',    description: 'Win your first spikeball game.',               category: 'spikeball', earned: sbWins >= 1 },
    { id: 'sb_10_wins',      icon: 'Trophy',    name: 'Spike Regular',  description: 'Win 10 spikeball games.',                      category: 'spikeball', earned: sbWins >= 10 },
    { id: 'sb_25_wins',      icon: 'Crown',     name: 'Spike King',     description: 'Win 25 spikeball games.',                      category: 'spikeball', earned: sbWins >= 25 },

    // ── CARDIO ───────────────────────────────────────────────
    { id: 'cardio_first',    icon: 'Activity',  name: 'First Mile',     description: 'Log your first cardio session.',               category: 'cardio', earned: cardioTotal >= 1 },
    { id: 'cardio_5k',       icon: 'Zap',       name: '5K Runner',      description: 'Run 3.1+ miles in a single session.',          category: 'cardio', earned: cardioMaxSession >= 3.1 },
    { id: 'cardio_10k',      icon: 'Rocket',    name: '10K Runner',     description: 'Run 6.2+ miles in a single session.',          category: 'cardio', earned: cardioMaxSession >= 6.2 },
    { id: 'cardio_half',     icon: 'Crown',     name: 'Half Marathon',  description: 'Log 13.1+ miles in a single session.',         category: 'cardio', earned: cardioMaxSession >= 13.1, secret: true },
    { id: 'cardio_100mi',    icon: 'Trophy',    name: 'Century Miles',  description: 'Log 100 total cardio miles.',                  category: 'cardio', earned: cardioTotalMiles >= 100 },
  ] as Badge[]
}

// Module-level cache — survives re-renders, cleared when XP changes
let badgeCache: { xp: number; badges: Badge[] } | null = null

export function useAchievements() {
  const totalXP     = useStore(s => s.totalXP)
  const level       = useStore(s => s.level)
  const initialized = useStore(s => s.initialized)

  const [badges, setBadges]   = useState<Badge[]>(badgeCache?.xp === totalXP ? badgeCache.badges : [])
  const [loading, setLoading] = useState(badgeCache?.xp !== totalXP)

  useEffect(() => {
    if (!initialized) return
    if (badgeCache?.xp === totalXP) {
      setBadges(badgeCache.badges)
      setLoading(false)
      return
    }

    let cancelled = false
    async function load() {
      const [
        lifting, prs, skate, books, games, sleep, challenges,
        basketball, pickleball, golf, discGolf, hiking,
        tableTennis, chess, pool, volleyball, spikeball, cardio,
      ] = await Promise.all([
        supabase.from('lifting_log').select('date, lift, est_1rm, weight, sets, reps').order('created_at', { ascending: false }),
        supabase.from('pr_history').select('lift, est_1rm, date'),
        supabase.from('skate_sessions').select('miles, date').order('created_at', { ascending: false }),
        supabase.from('books').select('date_finished, title').not('date_finished', 'is', null).order('created_at', { ascending: false }),
        supabase.from('fortnite_games').select('date, kills, win, accuracy').order('created_at', { ascending: false }),
        supabase.from('sleep_log').select('date, hours_slept').order('created_at', { ascending: false }),
        supabase.from('challenges').select('status, xp_reward'),
        supabase.from('basketball_sessions').select('date, points, fg_made, fg_attempted'),
        supabase.from('pickleball_games').select('date, win'),
        supabase.from('golf_rounds').select('date, score, par, holes'),
        supabase.from('disc_golf_rounds').select('date, score, par, holes'),
        supabase.from('hiking_sessions').select('date, distance_miles, elevation_gain_ft, difficulty'),
        supabase.from('table_tennis_games').select('date, win, my_score, opp_score'),
        supabase.from('chess_games').select('date, result, rating_after, opening'),
        supabase.from('pool_games').select('date, win, break_and_run'),
        supabase.from('volleyball_sessions').select('date, win, format, kills'),
        supabase.from('spikeball_games').select('date, win'),
        supabase.from('cardio_sessions').select('date, distance_miles, activity'),
      ])
      if (cancelled) return

      const result = evaluate({
        liftingRows:   lifting.data    ?? [],
        prRows:        prs.data        ?? [],
        skateRows:     skate.data      ?? [],
        bookRows:      books.data      ?? [],
        gameRows:      games.data      ?? [],
        sleepRows:     sleep.data      ?? [],
        challengeRows: challenges.data ?? [],
        bbRows:        basketball.data ?? [],
        pbRows:        pickleball.data ?? [],
        golfRows:      golf.data       ?? [],
        dgRows:        discGolf.data   ?? [],
        hikeRows:      hiking.data     ?? [],
        ttRows:        tableTennis.data ?? [],
        chessRows:     chess.data      ?? [],
        poolRows:      pool.data       ?? [],
        vbRows:        volleyball.data ?? [],
        sbRows:        spikeball.data  ?? [],
        cardioRows:    cardio.data     ?? [],
        totalXP,
        level,
      })

      badgeCache = { xp: totalXP, badges: result }
      setBadges(result)
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [initialized, totalXP, level])

  const earned   = badges.filter(b => b.earned)
  const unearned = badges.filter(b => !b.earned && !b.secret)
  return { badges, earned, unearned, loading }
}
