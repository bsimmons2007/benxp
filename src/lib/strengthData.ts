// Shared strength data loader — used by StrengthTab and useStrengthSnapshot
// to avoid duplicating the same 4 Supabase queries.

import { supabase } from './supabase'
import { computeMuscleScores, computeStrengthQuotient } from './muscleScore'
import type { LiftRow, ExerciseDef, ActivationRow, MuscleScoreResult } from './muscleScore'

export interface StrengthLoadResult {
  liftLog:     LiftRow[]
  exercises:   ExerciseDef[]
  activations: ActivationRow[]
  bodyweight:  number
  results:     MuscleScoreResult[]
  sq:          number
}

export async function loadStrengthData(userId: string): Promise<StrengthLoadResult> {
  const [logRes, bwRes, exRes, actRes] = await Promise.all([
    supabase.from('lifting_log').select('lift,weight,reps,sets,est_1rm,bodyweight,duration_secs,date').eq('user_id', userId),
    supabase.from('bodyweight_log').select('weight_lbs').eq('user_id', userId).order('date', { ascending: false }).limit(1),
    supabase.from('exercises').select('name,type,weight_multiplier,equipment'),
    supabase.from('exercise_muscle_activations').select('muscle_key, activation, exercises(name)').order('activation', { ascending: false }),
  ])

  let bodyweight = 160
  if (bwRes.data?.[0]) bodyweight = Number(bwRes.data[0].weight_lbs)
  else {
    const bwFromLifts = (logRes.data ?? []).find((r: LiftRow) => r.bodyweight != null)?.bodyweight
    if (bwFromLifts) bodyweight = bwFromLifts
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const activations: ActivationRow[] = (actRes.data ?? []).map((a: any) => ({
    exercise_name: a.exercises?.name ?? '',
    muscle_key:    a.muscle_key,
    activation:    Number(a.activation),
  })).filter((a: ActivationRow) => a.exercise_name)

  const liftLog   = (logRes.data ?? []) as LiftRow[]
  const exercises = (exRes.data ?? []) as ExerciseDef[]
  const results   = computeMuscleScores(liftLog, exercises, activations, bodyweight)
  const sq        = computeStrengthQuotient(results)

  return { liftLog, exercises, activations, bodyweight, results, sq }
}
