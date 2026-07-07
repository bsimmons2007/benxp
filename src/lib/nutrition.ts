import { getPref, setPref } from './prefs'

// ── Nutrition profile (synced via prefs) ──────────────────────
export type GoalMode = 'bulk' | 'cut' | 'maintain'
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'

export interface NutritionProfile {
  height_in: number | null
  age: number | null
  sex: 'male' | 'female' | null
  activity: ActivityLevel
  goal: GoalMode
  bulkSurplus: number
  cutDeficit: number
  proteinPerLb: number
}

export const DEFAULT_NUTRITION_PROFILE: NutritionProfile = {
  height_in: null,
  age: null,
  sex: null,
  activity: 'moderate',
  goal: 'maintain',
  bulkSurplus: 300,
  cutDeficit: 500,
  proteinPerLb: 0.8,
}

const PREF_KEY = 'nutritionProfile'

export function getNutritionProfile(): NutritionProfile {
  const saved = getPref<Partial<NutritionProfile>>(PREF_KEY, {})
  return { ...DEFAULT_NUTRITION_PROFILE, ...saved }
}

export function setNutritionProfile(patch: Partial<NutritionProfile>): NutritionProfile {
  const next = { ...getNutritionProfile(), ...patch }
  setPref(PREF_KEY, next)
  return next
}

// ── BMR / TDEE / targets ──────────────────────────────────────
export const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary:   1.2,
  light:       1.375,
  moderate:    1.55,
  active:      1.725,
  very_active: 1.9,
}

export const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary:   'Sedentary',
  light:       'Lightly active',
  moderate:    'Moderately active',
  active:      'Very active',
  very_active: 'Extremely active',
}

export type BmrFormula = 'katch' | 'mifflin'

export interface CalorieTargets {
  bmr: number
  tdee: number
  target: number
  proteinTarget: number
  formula: BmrFormula
  adjustment: number   // signed surplus(+)/deficit(-) applied to TDEE
}

/**
 * Compute BMR → TDEE → daily calorie target.
 * With a body-fat % logged in Measurements, uses Katch-McArdle (lean mass only,
 * no height/age/sex needed). Otherwise falls back to Mifflin-St Jeor, which
 * requires the height/age/sex profile — returns null until that's filled in.
 */
export function computeTargets(
  weightLbs: number | null,
  bodyFatPct: number | null,
  profile: NutritionProfile,
): CalorieTargets | null {
  if (!weightLbs || weightLbs <= 0) return null
  const weightKg = weightLbs * 0.45359237

  let bmr: number
  let formula: BmrFormula
  if (bodyFatPct != null && bodyFatPct > 0 && bodyFatPct < 70) {
    const leanKg = weightKg * (1 - bodyFatPct / 100)
    bmr = 370 + 21.6 * leanKg
    formula = 'katch'
  } else {
    if (!profile.height_in || !profile.age || !profile.sex) return null
    const heightCm = profile.height_in * 2.54
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * profile.age + (profile.sex === 'male' ? 5 : -161)
    formula = 'mifflin'
  }

  const tdee = bmr * ACTIVITY_MULTIPLIERS[profile.activity]
  const adjustment =
    profile.goal === 'bulk' ? profile.bulkSurplus :
    profile.goal === 'cut'  ? -profile.cutDeficit : 0

  return {
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    target: Math.round(tdee + adjustment),
    proteinTarget: Math.round(weightLbs * profile.proteinPerLb),
    formula,
    adjustment,
  }
}

// ── Weekly grouping (correlation charts) ──────────────────────
/** Monday-of-week key for a YYYY-MM-DD date string — matches VolumeTrendChart's grouping. */
export function mondayKey(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  const dow = (d.getDay() + 6) % 7   // 0 = Monday
  d.setDate(d.getDate() - dow)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}
