import { describe, it, expect } from 'vitest'
import { computeTargets, DEFAULT_NUTRITION_PROFILE, type NutritionProfile } from '../nutrition'

describe('computeTargets', () => {
  it('returns null when weight is missing or non-positive', () => {
    expect(computeTargets(null, null, DEFAULT_NUTRITION_PROFILE)).toBeNull()
    expect(computeTargets(0, null, DEFAULT_NUTRITION_PROFILE)).toBeNull()
    expect(computeTargets(-10, null, DEFAULT_NUTRITION_PROFILE)).toBeNull()
  })

  it('uses Katch-McArdle when a valid body fat % is present, needing no height/age/sex', () => {
    const profile: NutritionProfile = { ...DEFAULT_NUTRITION_PROFILE, height_in: null, age: null, sex: null }
    const weightLbs = 180
    const bodyFatPct = 15
    const result = computeTargets(weightLbs, bodyFatPct, profile)
    expect(result).not.toBeNull()
    expect(result!.formula).toBe('katch')

    // Hand-computed: weightKg = 180 * 0.45359237, leanKg = weightKg * 0.85
    const weightKg = weightLbs * 0.45359237
    const leanKg = weightKg * 0.85
    const bmr = 370 + 21.6 * leanKg
    expect(result!.bmr).toBe(Math.round(bmr))

    // DEFAULT_NUTRITION_PROFILE.activity is 'moderate' -> multiplier 1.55
    expect(result!.tdee).toBe(Math.round(bmr * 1.55))
    expect(result!.target).toBe(result!.tdee)   // maintain goal -> no adjustment
    expect(result!.adjustment).toBe(0)
    expect(result!.proteinTarget).toBe(Math.round(weightLbs * profile.proteinPerLb))
  })

  it('falls back to Mifflin-St Jeor when body fat is absent, requiring height/age/sex', () => {
    const incompleteProfile: NutritionProfile = { ...DEFAULT_NUTRITION_PROFILE, height_in: null, age: 30, sex: 'male' }
    expect(computeTargets(180, null, incompleteProfile)).toBeNull()

    const completeProfile: NutritionProfile = { ...DEFAULT_NUTRITION_PROFILE, height_in: 70, age: 30, sex: 'male' }
    const result = computeTargets(180, null, completeProfile)
    expect(result).not.toBeNull()
    expect(result!.formula).toBe('mifflin')

    const weightKg = 180 * 0.45359237
    const heightCm = 70 * 2.54
    const bmr = 10 * weightKg + 6.25 * heightCm - 5 * 30 + 5   // male: +5
    expect(result!.bmr).toBe(Math.round(bmr))
  })

  it('treats an out-of-range body fat % (<=0 or >=70) as absent, falling back to Mifflin', () => {
    const completeProfile: NutritionProfile = { ...DEFAULT_NUTRITION_PROFILE, height_in: 65, age: 25, sex: 'female' }
    const zeroBf = computeTargets(140, 0, completeProfile)
    const highBf = computeTargets(140, 70, completeProfile)
    expect(zeroBf?.formula).toBe('mifflin')
    expect(highBf?.formula).toBe('mifflin')
  })

  it('applies bulk surplus and cut deficit adjustments to TDEE', () => {
    const bulkProfile: NutritionProfile = { ...DEFAULT_NUTRITION_PROFILE, goal: 'bulk', bulkSurplus: 300 }
    const cutProfile: NutritionProfile = { ...DEFAULT_NUTRITION_PROFILE, goal: 'cut', cutDeficit: 500 }

    const bulkResult = computeTargets(180, 15, bulkProfile)!
    const cutResult = computeTargets(180, 15, cutProfile)!

    expect(bulkResult.adjustment).toBe(300)
    expect(bulkResult.target).toBe(bulkResult.tdee + 300)

    expect(cutResult.adjustment).toBe(-500)
    expect(cutResult.target).toBe(cutResult.tdee - 500)
  })

  it('rounds protein target to nearest whole gram from weight * proteinPerLb', () => {
    const profile: NutritionProfile = { ...DEFAULT_NUTRITION_PROFILE, proteinPerLb: 1.0 }
    const result = computeTargets(175, 15, profile)!
    expect(result.proteinTarget).toBe(175)

    const fractionalProfile: NutritionProfile = { ...DEFAULT_NUTRITION_PROFILE, proteinPerLb: 0.82 }
    const fractionalResult = computeTargets(175, 15, fractionalProfile)!
    expect(fractionalResult.proteinTarget).toBe(Math.round(175 * 0.82))
  })
})
