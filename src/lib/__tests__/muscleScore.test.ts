import { describe, it, expect } from 'vitest'
import { computeMuscleScores, type LiftRow, type ExerciseDef, type ActivationRow } from '../muscleScore'

const today = new Date()
function daysAgoStr(n: number): string {
  const d = new Date(today)
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

describe('computeMuscleScores — load estimation fallback branches', () => {
  it('estimates load via Epley (weight + reps) when est_1rm is absent', () => {
    const liftingLog: LiftRow[] = [
      { lift: 'Bench Press', weight: 185, reps: 5, sets: 1, est_1rm: null, bodyweight: null, duration_secs: null, date: daysAgoStr(0) },
    ]
    const exercises: ExerciseDef[] = [
      { name: 'Bench Press', type: 'barbell', weight_multiplier: 1, equipment: 'barbell' },
    ]
    const activations: ActivationRow[] = [
      { exercise_name: 'Bench Press', muscle_key: 'chest_mid', activation: 1 },
    ]
    const results = computeMuscleScores(liftingLog, exercises, activations, 180)
    const chest = results.find(r => r.muscleKey === 'chest_mid')!

    // Epley: (1 + min(reps,12)/30) * weight, rounded to 1 decimal
    const expectedLoad = Math.round((1 + Math.min(5, 12) / 30) * 185 * 10) / 10
    // confidence for 1 session = 0.55 + (1/8)*0.45 = 0.60625
    const confidence = 0.55 + (1 / 8) * 0.45
    const normalised = expectedLoad / 180
    const expectedScore = normalised * 1 * 1 * confidence

    expect(chest.score).toBeCloseTo(expectedScore, 6)
    expect(chest.topExercise).toBe('Bench Press')
  })

  it('falls back to logged/default bodyweight as load for bodyweight exercises (weight null)', () => {
    const liftingLog: LiftRow[] = [
      { lift: 'PullUps', weight: null, reps: 10, sets: 1, est_1rm: null, bodyweight: 170, duration_secs: null, date: daysAgoStr(0) },
    ]
    const exercises: ExerciseDef[] = [
      { name: 'Pull-Up', type: 'bodyweight', weight_multiplier: 0.9, equipment: 'bodyweight' },
    ]
    const activations: ActivationRow[] = [
      { exercise_name: 'Pull-Up', muscle_key: 'lats', activation: 1 },
    ]
    // normaliseLiftName maps 'PullUps' -> 'Pull-Up'
    const results = computeMuscleScores(liftingLog, exercises, activations, 160)
    const lats = results.find(r => r.muscleKey === 'lats')!

    const expectedLoad = Math.round((1 + Math.min(10, 12) / 30) * 170 * 10) / 10   // uses row.bodyweight, not fallback 160
    const confidence = 0.55 + (1 / 8) * 0.45
    const normalised = expectedLoad / 160   // still normalised against the passed-in current bodyweight
    const expectedScore = normalised * 0.9 * 1 * confidence

    expect(lats.score).toBeCloseTo(expectedScore, 6)
  })

  it('uses the fallback 160lb bodyweight when neither current nor logged bodyweight is available', () => {
    const liftingLog: LiftRow[] = [
      { lift: 'PushUps', weight: null, reps: 8, sets: 1, est_1rm: null, bodyweight: null, duration_secs: null, date: daysAgoStr(0) },
    ]
    const exercises: ExerciseDef[] = [
      { name: 'Push-Up', type: 'bodyweight', weight_multiplier: 0.8, equipment: 'bodyweight' },
    ]
    const activations: ActivationRow[] = [
      { exercise_name: 'Push-Up', muscle_key: 'chest_mid', activation: 1 },
    ]
    // bodyweight param passed as 0 -> falls back to 160 both for normalisation and load estimate
    const results = computeMuscleScores(liftingLog, exercises, activations, 0)
    const chest = results.find(r => r.muscleKey === 'chest_mid')!

    const expectedLoad = Math.round((1 + Math.min(8, 12) / 30) * 160 * 10) / 10
    const confidence = 0.55 + (1 / 8) * 0.45
    const normalised = expectedLoad / 160
    const expectedScore = normalised * 0.8 * 1 * confidence

    expect(chest.score).toBeCloseTo(expectedScore, 6)
  })

  it('estimates load from duration_secs for timed/isometric exercises, capped at 3x bodyweight', () => {
    const liftingLog: LiftRow[] = [
      { lift: 'Plank', weight: null, reps: null, sets: 1, est_1rm: null, bodyweight: 150, duration_secs: 90, date: daysAgoStr(0) },
    ]
    const exercises: ExerciseDef[] = [
      { name: 'Plank', type: 'isometric', weight_multiplier: 0.3, equipment: 'bodyweight' },
    ]
    const activations: ActivationRow[] = [
      { exercise_name: 'Plank', muscle_key: 'upper_abs', activation: 1 },
    ]
    const results = computeMuscleScores(liftingLog, exercises, activations, 150)
    const abs = results.find(r => r.muscleKey === 'upper_abs')!

    // 90s hold -> min(3, 90/60) = 1.5x bodyweight
    const expectedLoad = Math.round(150 * 1.5 * 10) / 10
    const confidence = 0.55 + (1 / 8) * 0.45
    const normalised = expectedLoad / 150
    const expectedScore = normalised * 0.3 * 1 * confidence

    expect(abs.score).toBeCloseTo(expectedScore, 6)
  })

  it('caps the duration-based load multiplier at 3x bodyweight for very long holds', () => {
    const liftingLog: LiftRow[] = [
      { lift: 'Plank', weight: null, reps: null, sets: 1, est_1rm: null, bodyweight: 150, duration_secs: 600, date: daysAgoStr(0) },
    ]
    const exercises: ExerciseDef[] = [
      { name: 'Plank', type: 'isometric', weight_multiplier: 0.3, equipment: 'bodyweight' },
    ]
    const activations: ActivationRow[] = [
      { exercise_name: 'Plank', muscle_key: 'upper_abs', activation: 1 },
    ]
    const results = computeMuscleScores(liftingLog, exercises, activations, 150)
    const abs = results.find(r => r.muscleKey === 'upper_abs')!

    // 600s -> min(3, 600/60=10) = 3x cap
    const expectedLoad = Math.round(150 * 3 * 10) / 10
    const confidence = 0.55 + (1 / 8) * 0.45
    const normalised = expectedLoad / 150
    const expectedScore = normalised * 0.3 * 1 * confidence

    expect(abs.score).toBeCloseTo(expectedScore, 6)
  })

  it('marks a muscle stale when its most recent contributing session is more than 90 days ago', () => {
    const liftingLog: LiftRow[] = [
      { lift: 'Bench Press', weight: 135, reps: 5, sets: 1, est_1rm: null, bodyweight: null, duration_secs: null, date: daysAgoStr(120) },
    ]
    const exercises: ExerciseDef[] = [
      { name: 'Bench Press', type: 'barbell', weight_multiplier: 1, equipment: 'barbell' },
    ]
    const activations: ActivationRow[] = [
      { exercise_name: 'Bench Press', muscle_key: 'chest_mid', activation: 1 },
    ]
    const results = computeMuscleScores(liftingLog, exercises, activations, 180)
    const chest = results.find(r => r.muscleKey === 'chest_mid')!
    expect(chest.isStale).toBe(true)
  })

  it('returns a zero score with no rank progress for muscles with no contributing exercises', () => {
    const results = computeMuscleScores([], [], [], 180)
    const chest = results.find(r => r.muscleKey === 'chest_mid')!
    expect(chest.score).toBe(0)
    expect(chest.contributions).toEqual([])
    expect(chest.topExercise).toBeNull()
    expect(chest.lastActive).toBeNull()
  })
})
