// ── Muscle Ranking & Scoring Engine ──────────────────────────────────────────
// Computes per-muscle strength scores from lifting_log data using:
//   score = Σ (est_1rm / bodyweight) × weight_multiplier × activation
// with recency freshness signal and volume confidence modifier.

// ── Rank system ──────────────────────────────────────────────────────────────

export interface RankMeta {
  id:       string
  label:    string
  icon:     string      // emoji icon displayed in dropdown and badge
  tier:     number      // 0 = unranked, 1-18 = ranked
  color:    string      // fill color for body map
  glow:     string      // glow / accent color
  border:   string
  minScore: number
  maxScore: number
}

// Thresholds calibrated so that:
//  • Any data = Bronze I
//  • 6 months consistent → Silver 2–3
//  • 3 years solid lifting → Gold 2–3
//  • Competitive powerlifter → Platinum 2–3
//  • Elite / world-class → Diamond 2–3
//  • God (6.5+) is mathematically unreachable for small isolation muscles;
//    theoretically reachable only for large compound muscles (quads/glutes)
//    at superhuman strength levels.
// Each gap is ~15-20% wider than the previous, creating an exponential curve.
export const RANKS: RankMeta[] = [
  { id:'unranked',  label:'—',            icon:'○',  tier:0,  color:'#12122a', glow:'none',    border:'#1e1e38', minScore:-Infinity, maxScore:0.005 },
  { id:'bronze1',   label:'Bronze I',     icon:'Rk', tier:1,  color:'#3d1a06', glow:'#a05228', border:'#5c2b08', minScore:0.005,  maxScore:0.08  },
  { id:'bronze2',   label:'Bronze II',    icon:'Br', tier:2,  color:'#5c2b08', glow:'#c46820', border:'#7a3c10', minScore:0.08,   maxScore:0.18  },
  { id:'bronze3',   label:'Bronze III',   icon:'Rk', tier:3,  color:'#7a3c10', glow:'#e07830', border:'#9a5218', minScore:0.18,   maxScore:0.30  },
  { id:'silver1',   label:'Silver I',     icon:'Sv', tier:4,  color:'#28283c', glow:'#8888a8', border:'#3c3c50', minScore:0.30,   maxScore:0.45  },
  { id:'silver2',   label:'Silver II',    icon:'Sv', tier:5,  color:'#3c3c52', glow:'#a0a0c0', border:'#505068', minScore:0.45,   maxScore:0.62  },
  { id:'silver3',   label:'Silver III',   icon:'Sv', tier:6,  color:'#50506a', glow:'#c0c0d8', border:'#68687e', minScore:0.62,   maxScore:0.82  },
  { id:'gold1',     label:'Gold I',       icon:'Au', tier:7,  color:'#3a2e00', glow:'#c09000', border:'#5a4800', minScore:0.82,   maxScore:1.05  },
  { id:'gold2',     label:'Gold II',      icon:'Au', tier:8,  color:'#5a4800', glow:'#d8b000', border:'#7a6200', minScore:1.05,   maxScore:1.32  },
  { id:'gold3',     label:'Gold III',     icon:'Au', tier:9,  color:'#7a6200', glow:'#f0cc00', border:'#a08400', minScore:1.32,   maxScore:1.65  },
  { id:'platinum1', label:'Platinum I',   icon:'Pt', tier:10, color:'#08304a', glow:'#50a8d8', border:'#0e4868', minScore:1.65,   maxScore:2.05  },
  { id:'platinum2', label:'Platinum II',  icon:'Pt', tier:11, color:'#0e4868', glow:'#68c0f0', border:'#186488', minScore:2.05,   maxScore:2.52  },
  { id:'platinum3', label:'Platinum III', icon:'Pt', tier:12, color:'#186488', glow:'#88d8ff', border:'#2480aa', minScore:2.52,   maxScore:3.08  },
  { id:'diamond1',  label:'Diamond I',    icon:'Di', tier:13, color:'#0a1060', glow:'#4466ee', border:'#142088', minScore:3.08,   maxScore:3.72  },
  { id:'diamond2',  label:'Diamond II',   icon:'Di', tier:14, color:'#142088', glow:'#5588ff', border:'#2038b0', minScore:3.72,   maxScore:4.45  },
  { id:'diamond3',  label:'Diamond III',  icon:'✦',  tier:15, color:'#2038b0', glow:'#80aaff', border:'#3058dd', minScore:4.45,   maxScore:5.30  },
  { id:'elite',     label:'Elite',        icon:'El', tier:16, color:'#38086a', glow:'#cc44ff', border:'#5010a0', minScore:5.30,   maxScore:6.25  },
  { id:'champion',  label:'Champion',     icon:'Ch', tier:17, color:'#6a0818', glow:'#ff2244', border:'#9a1020', minScore:6.25,   maxScore:7.40  },
  { id:'god',       label:'God',          icon:'Gd', tier:18, color:'#6a2800', glow:'#ff8800', border:'#a04000', minScore:7.40,   maxScore:Infinity },
]

export function getRankById(id: string): RankMeta {
  return RANKS.find(r => r.id === id) ?? RANKS[0]
}

export function getRankForScore(score: number): RankMeta {
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (score >= RANKS[i].minScore) return RANKS[i]
  }
  return RANKS[0]
}

/** Progress from current rank min to next rank min, clamped 0–1 */
export function rankProgress(score: number, rank: RankMeta): number {
  const next = RANKS.find(r => r.tier === rank.tier + 1)
  if (!next) return 1
  const range = next.minScore - rank.minScore
  if (range <= 0) return 1
  return Math.max(0, Math.min(1, (score - rank.minScore) / range))
}

// ── Muscle definitions ────────────────────────────────────────────────────────

export interface MuscleInfo {
  key:        string
  name:       string
  group:      string
  side:       'front' | 'back' | 'both'
  sizeWeight: number
}

export const MUSCLES: MuscleInfo[] = [
  { key:'chest_upper',  name:'Upper Chest',   group:'chest',     side:'front', sizeWeight:0.70 },
  { key:'chest_mid',    name:'Mid Chest',      group:'chest',     side:'front', sizeWeight:0.85 },
  { key:'chest_lower',  name:'Lower Chest',    group:'chest',     side:'front', sizeWeight:0.65 },
  { key:'delt_front',   name:'Front Delts',    group:'shoulders', side:'front', sizeWeight:0.50 },
  { key:'delt_side',    name:'Side Delts',     group:'shoulders', side:'both',  sizeWeight:0.50 },
  { key:'delt_rear',    name:'Rear Delts',     group:'shoulders', side:'back',  sizeWeight:0.45 },
  { key:'biceps',       name:'Biceps',         group:'arms',      side:'front', sizeWeight:0.55 },
  { key:'triceps',      name:'Triceps',        group:'arms',      side:'back',  sizeWeight:0.65 },
  { key:'forearms',     name:'Forearms',       group:'arms',      side:'both',  sizeWeight:0.30 },
  { key:'lats',         name:'Lats',           group:'back',      side:'back',  sizeWeight:0.90 },
  { key:'traps',        name:'Traps',          group:'back',      side:'back',  sizeWeight:0.75 },
  { key:'rhomboids',    name:'Rhomboids',      group:'back',      side:'back',  sizeWeight:0.60 },
  { key:'lower_back',   name:'Lower Back',     group:'back',      side:'back',  sizeWeight:0.80 },
  { key:'upper_abs',    name:'Upper Abs',      group:'core',      side:'front', sizeWeight:0.60 },
  { key:'lower_abs',    name:'Lower Abs',      group:'core',      side:'front', sizeWeight:0.55 },
  { key:'obliques',     name:'Obliques',       group:'core',      side:'front', sizeWeight:0.50 },
  { key:'glutes',       name:'Glutes',         group:'legs',      side:'back',  sizeWeight:1.00 },
  { key:'quads',        name:'Quads',          group:'legs',      side:'front', sizeWeight:1.00 },
  { key:'hamstrings',   name:'Hamstrings',     group:'legs',      side:'back',  sizeWeight:0.85 },
  { key:'calves_gastro',name:'Gastrocnemius',  group:'legs',      side:'back',  sizeWeight:0.45 },
  { key:'calves_soleus',name:'Soleus',         group:'legs',      side:'back',  sizeWeight:0.35 },
]

export function getMuscle(key: string): MuscleInfo | undefined {
  return MUSCLES.find(m => m.key === key)
}

// ── Imbalance pairs (primary vs antagonist) ───────────────────────────────────
export const IMBALANCE_PAIRS: Array<{ a: string; b: string; label: string }> = [
  { a: 'chest_mid',  b: 'rhomboids', label: 'Push/Pull Balance' },
  { a: 'quads',      b: 'hamstrings', label: 'Quad/Hamstring Balance' },
  { a: 'biceps',     b: 'triceps',   label: 'Bi/Tri Balance' },
  { a: 'delt_front', b: 'delt_rear', label: 'Front/Rear Delt Balance' },
  { a: 'lats',       b: 'chest_mid', label: 'Pull/Push Ratio' },
  { a: 'lower_back', b: 'upper_abs', label: 'Posterior/Anterior Core' },
]

// ── Name normalisation (old Records.tsx names → canonical exercise names) ─────
const LIFT_ALIAS: Record<string, string> = {
  'Bench':     'Bench Press',
  'PullUps':   'Pull-Up',
  'PushUps':   'Push-Up',
  'Squat':     'Squat',
  'Deadlift':  'Deadlift',
}

export function normaliseLiftName(raw: string): string {
  return LIFT_ALIAS[raw] ?? raw
}

// ── Types from Supabase data ──────────────────────────────────────────────────

export interface LiftRow {
  lift:          string
  weight:        number | null
  reps:          number | null
  sets:          number | null
  est_1rm:       number | null
  bodyweight:    number | null
  duration_secs: number | null
  date:          string
}

export interface ExerciseDef {
  name:              string
  type:              string
  weight_multiplier: number
  equipment:         string
}

export interface ActivationRow {
  exercise_name: string
  muscle_key:    string
  activation:    number
}

// ── Per-muscle result ─────────────────────────────────────────────────────────

export interface ContributionItem {
  exerciseName:       string
  oneRM:              number
  activationPct:      number      // 0–1
  rawContribution:    number      // before multiplier
  weightedContrib:    number      // final contribution to score
  daysAgo:            number
  isStale:            boolean
}

export interface MuscleScoreResult {
  muscleKey:         string
  score:             number
  rank:              RankMeta
  progressToNext:    number       // 0–1
  contributions:     ContributionItem[]
  topExercise:       string | null
  lastActive:        Date | null
  isStale:           boolean      // no session in 90+ days
}

// ── Scoring algorithm ─────────────────────────────────────────────────────────

/**
 * Compute per-muscle strength scores from the user's lifting log.
 *
 * Algorithm per exercise:
 *   contribution = (best_1rm / bodyweight) × weight_multiplier × activation
 *
 * Improvements over base spec:
 *  • Volume confidence: if <4 unique sessions, scale contribution by 0.5+(sessions/8)
 *  • Freshness flag: stale if last session >90 days ago (score unchanged, UI warns)
 *  • For bodyweight exercises where weight=null, use logged bodyweight as the load
 */
export function computeMuscleScores(
  liftingLog:   LiftRow[],
  exercises:    ExerciseDef[],
  activations:  ActivationRow[],
  bodyweight:   number,
): MuscleScoreResult[] {
  const bw = bodyweight > 0 ? bodyweight : 160   // fallback 160 lbs

  // Build lookup maps
  const exMap = new Map(exercises.map(e => [e.name, e]))
  const actMap = new Map<string, ActivationRow[]>()
  for (const a of activations) {
    const list = actMap.get(a.exercise_name) ?? []
    list.push(a)
    actMap.set(a.exercise_name, list)
  }

  // Group log entries by canonical exercise name
  const byExercise = new Map<string, LiftRow[]>()
  for (const row of liftingLog) {
    const name = normaliseLiftName(row.lift)
    const list = byExercise.get(name) ?? []
    list.push(row)
    byExercise.set(name, list)
  }

  // Accumulate contributions per muscle
  const muscleContribs = new Map<string, ContributionItem[]>()

  const today = new Date()

  for (const [exName, rows] of byExercise) {
    const exDef = exMap.get(exName)
    const acts  = actMap.get(exName)
    if (!acts || acts.length === 0) continue

    const weightMult = exDef?.weight_multiplier ?? 0.45

    // Best est_1rm across all sessions for this exercise
    let best1rm = 0
    let lastDate: Date = new Date(0)
    const sessionDates = new Set<string>()

    for (const row of rows) {
      sessionDates.add(row.date)
      const rowDate = new Date(row.date)
      if (rowDate > lastDate) lastDate = rowDate

      let load = row.est_1rm
      if (!load && row.weight && row.reps) {
        load = Math.round((1 + row.reps / 30) * row.weight * 10) / 10
      }
      // Bodyweight exercises: use bodyweight as load if weight is null
      if (!load && row.reps && (row.weight === null || row.weight === 0)) {
        const bwLoad = row.bodyweight ?? bw
        load = Math.round((1 + row.reps / 30) * bwLoad * 10) / 10
      }
      // Timed exercises: duration_secs proxy — 60s hold ≈ 1× bodyweight load, capped at 3×
      if (!load && row.duration_secs && row.duration_secs > 0) {
        const bwLoad = row.bodyweight ?? bw
        load = Math.round(bwLoad * Math.min(3, row.duration_secs / 60) * 10) / 10
      }
      if (load && load > best1rm) {
        best1rm = load
      }
    }

    if (best1rm === 0) continue

    const daysAgo    = Math.floor((today.getTime() - lastDate.getTime()) / 86_400_000)
    const isStale    = daysAgo > 90
    const sessions   = sessionDates.size
    // Volume confidence: ramps from 0.55 (1 session) to 1.0 (8+ sessions)
    const confidence = Math.min(1.0, 0.55 + (sessions / 8) * 0.45)

    const normalised = best1rm / bw   // ratio of 1RM to bodyweight

    for (const act of acts) {
      const raw      = normalised * weightMult * act.activation
      const weighted = raw * confidence

      const contrib: ContributionItem = {
        exerciseName:    exName,
        oneRM:           best1rm,
        activationPct:   act.activation,
        rawContribution: raw,
        weightedContrib: weighted,
        daysAgo,
        isStale,
      }

      const list = muscleContribs.get(act.muscle_key) ?? []
      list.push(contrib)
      muscleContribs.set(act.muscle_key, list)
    }
  }

  // Build results for all 21 muscles
  return MUSCLES.map(muscle => {
    const contribs = muscleContribs.get(muscle.key) ?? []

    // Sort by contribution descending
    const sorted = [...contribs].sort((a, b) => b.weightedContrib - a.weightedContrib)

    const score = sorted.reduce((s, c) => s + c.weightedContrib, 0)
    const rank  = getRankForScore(score)

    // Last active = most recent session across all contributing exercises
    const lastActiveMs = sorted.reduce((max, c) => {
      const d = today.getTime() - c.daysAgo * 86_400_000
      return d > max ? d : max
    }, 0)
    const lastActive = lastActiveMs > 0 ? new Date(lastActiveMs) : null

    const isStale = sorted.length > 0 && sorted.every(c => c.isStale)

    return {
      muscleKey:      muscle.key,
      score,
      rank,
      progressToNext: rankProgress(score, rank),
      contributions:  sorted.slice(0, 5),
      topExercise:    sorted[0]?.exerciseName ?? null,
      lastActive,
      isStale,
    }
  })
}

// ── Overall Strength Quotient ─────────────────────────────────────────────────
/** Weighted average of all muscle rank tiers, 0–18 scale, normalised to 0–100 */
export function computeStrengthQuotient(results: MuscleScoreResult[]): number {
  const totalWeight = MUSCLES.reduce((s, m) => s + m.sizeWeight, 0)
  const weightedSum = results.reduce((s, r) => {
    const muscle = MUSCLES.find(m => m.key === r.muscleKey)
    return s + r.rank.tier * (muscle?.sizeWeight ?? 0.5)
  }, 0)
  return Math.round((weightedSum / (totalWeight * 18)) * 100)
}

// ── Imbalance detection ───────────────────────────────────────────────────────
export interface ImbalanceWarning {
  label:     string
  aName:     string
  bName:     string
  aTier:     number
  bTier:     number
  delta:     number   // tier difference
  direction: string  // which side is lagging
}

export function detectImbalances(results: MuscleScoreResult[]): ImbalanceWarning[] {
  const tierMap = new Map(results.map(r => [r.muscleKey, r.rank.tier]))
  const warnings: ImbalanceWarning[] = []

  for (const pair of IMBALANCE_PAIRS) {
    const aTier = tierMap.get(pair.a) ?? 0
    const bTier = tierMap.get(pair.b) ?? 0
    const delta = Math.abs(aTier - bTier)
    if (delta >= 3 && (aTier > 0 || bTier > 0)) {
      const muscleA = getMuscle(pair.a)
      const muscleB = getMuscle(pair.b)
      warnings.push({
        label:     pair.label,
        aName:     muscleA?.name ?? pair.a,
        bName:     muscleB?.name ?? pair.b,
        aTier,
        bTier,
        delta,
        direction: aTier < bTier ? muscleA?.name ?? pair.a : muscleB?.name ?? pair.b,
      })
    }
  }

  return warnings.sort((a, b) => b.delta - a.delta)
}
