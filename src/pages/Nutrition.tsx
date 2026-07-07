import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { TopBar } from '../components/layout/TopBar'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { Toast } from '../components/ui/Toast'
import { EditModal } from '../components/ui/EditModal'
import { ProgressBar } from '../components/ui/ProgressBar'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorState } from '../components/ui/ErrorState'
import { HistoryControls, useHistoryFilter } from '../components/ui/HistoryControls'
import { UtensilsIcon, EditIcon, ChevronIcon, FlameIcon } from '../components/ui/Icon'
import { CalorieVolumeChart } from '../components/charts/CalorieVolumeChart'
import { SurplusWeightChart } from '../components/charts/SurplusWeightChart'
import { NutritionWellnessChart } from '../components/charts/NutritionWellnessChart'
import { supabase } from '../lib/supabase'
import { today as appToday, formatDate, isMissingTableError } from '../lib/utils'
import { getLastUsed, setLastUsed } from '../lib/lastUsed'
import { playXPGain } from '../lib/sounds'
import { XP_RATES } from '../lib/xp'
import {
  getNutritionProfile, setNutritionProfile, computeTargets,
  type GoalMode, type CalorieTargets,
} from '../lib/nutrition'
import { useStore } from '../store/useStore'
import { usePageTitle } from '../hooks/usePageTitle'
import type { Meal } from '../types'

const MEAL_TYPES: Meal['meal_type'][] = ['Breakfast', 'Lunch', 'Dinner', 'Snack']
const GOALS: { key: GoalMode; label: string }[] = [
  { key: 'cut',      label: 'Cut' },
  { key: 'maintain', label: 'Maintain' },
  { key: 'bulk',     label: 'Bulk' },
]

function n(v: number | null | undefined): number { return typeof v === 'number' && isFinite(v) ? v : 0 }

interface DayGroup {
  date:     string
  meals:    Meal[]
  calories: number
  protein:  number
}

export function Nutrition() {
  usePageTitle('Nutrition')

  const stats     = useStore(s => s.stats)
  const refreshXP = useStore(s => s.refreshXP)
  const refreshActivity = useStore(s => s.refreshActivity)

  const [userId,   setUserId]   = useState<string | null>(null)
  const [allMeals, setAllMeals] = useState<Meal[]>([])
  const [loading,  setLoading]  = useState(true)
  const [loadError,   setLoadError]   = useState(false)
  const [missingTable, setMissingTable] = useState(false)

  const [goal, setGoal] = useState<GoalMode>(() => getNutritionProfile().goal)

  const [mealType, setMealType] = useState<Meal['meal_type']>(
    () => getLastUsed('meal_type', 'Breakfast') as Meal['meal_type'],
  )
  const [calories, setCalories] = useState('')
  const [showDetails, setShowDetails] = useState(false)
  const [name,    setName]    = useState('')
  const [protein, setProtein] = useState('')
  const [carbs,   setCarbs]   = useState('')
  const [fat,     setFat]     = useState('')
  const [notes,   setNotes]   = useState('')
  const [submitting, setSubmitting] = useState(false)

  const [toast,      setToast]      = useState<string | null>(null)
  const [toastUndo,  setToastUndo]  = useState<(() => void) | undefined>(undefined)

  const [editMeal,  setEditMeal]  = useState<Meal | null>(null)
  const [editVals,  setEditVals]  = useState({ meal_type: 'Breakfast', name: '', calories: '', protein_g: '', carbs_g: '', fat_g: '', notes: '' })
  const [savingEdit, setSavingEdit] = useState(false)

  const [visibleGroups, setVisibleGroups] = useState(10)

  const todayStr = appToday()

  const targets: CalorieTargets | null = useMemo(
    () => computeTargets(stats.latestWeight, stats.latestBodyFat, { ...getNutritionProfile(), goal }),
    [stats.latestWeight, stats.latestBodyFat, goal],
  )

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError(false)
    setMissingTable(false)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }
    setUserId(user.id)
    const { data, error } = await supabase
      .from('meals')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
    if (error) {
      if (isMissingTableError(error)) setMissingTable(true)
      else setLoadError(true)
      setLoading(false)
      return
    }
    setAllMeals((data ?? []) as Meal[])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const todayMeals = useMemo(() => allMeals.filter(m => m.date === todayStr), [allMeals, todayStr])
  const caloriesToday = useMemo(() => todayMeals.reduce((s, m) => s + n(m.calories), 0), [todayMeals])
  const proteinToday  = useMemo(() => todayMeals.reduce((s, m) => s + n(m.protein_g), 0), [todayMeals])

  function pickGoal(next: GoalMode) {
    setGoal(next)
    setNutritionProfile({ goal: next })
  }

  async function addMeal() {
    if (!userId) return
    const cals = parseFloat(calories)
    if (!isFinite(cals) || cals < 0) return
    setSubmitting(true)
    const row = {
      user_id:   userId,
      date:      appToday(),
      meal_type: mealType,
      name:      name.trim() || null,
      calories:  Math.round(cals),
      protein_g: protein ? Math.round(parseFloat(protein)) : null,
      carbs_g:   carbs   ? Math.round(parseFloat(carbs))   : null,
      fat_g:     fat     ? Math.round(parseFloat(fat))     : null,
      notes:     notes.trim() || null,
    }
    const { data, error } = await supabase.from('meals').insert(row).select().single()
    setSubmitting(false)
    if (error) { setToast('Failed to log — try again'); setToastUndo(undefined); return }

    setLastUsed('meal_type', mealType)
    playXPGain()
    const inserted = data as Meal
    setToast(`+${XP_RATES.meal_logged} XP · ${mealType} logged`)
    setToastUndo(() => async () => {
      await supabase.from('meals').delete().eq('id', inserted.id)
      await load()
      refreshXP()
      refreshActivity()
    })

    setCalories(''); setName(''); setProtein(''); setCarbs(''); setFat(''); setNotes('')
    setShowDetails(false)
    await load()
    refreshXP()
    refreshActivity()
  }

  function openEdit(m: Meal) {
    setEditVals({
      meal_type: m.meal_type,
      name:      m.name ?? '',
      calories:  String(m.calories ?? ''),
      protein_g: m.protein_g != null ? String(m.protein_g) : '',
      carbs_g:   m.carbs_g   != null ? String(m.carbs_g)   : '',
      fat_g:     m.fat_g     != null ? String(m.fat_g)     : '',
      notes:     m.notes ?? '',
    })
    setEditMeal(m)
  }

  async function saveEdit() {
    if (!editMeal) return
    setSavingEdit(true)
    const { error } = await supabase.from('meals').update({
      meal_type: editVals.meal_type,
      name:      editVals.name.trim() || null,
      calories:  (() => { const c = parseFloat(editVals.calories); return Math.round(isFinite(c) ? c : editMeal.calories) })(),
      protein_g: editVals.protein_g ? Math.round(parseFloat(editVals.protein_g)) : null,
      carbs_g:   editVals.carbs_g   ? Math.round(parseFloat(editVals.carbs_g))   : null,
      fat_g:     editVals.fat_g     ? Math.round(parseFloat(editVals.fat_g))     : null,
      notes:     editVals.notes.trim() || null,
    }).eq('id', editMeal.id)
    setSavingEdit(false)
    if (!error) { setEditMeal(null); await load(); refreshXP(); refreshActivity() }
  }

  async function deleteMeal() {
    if (!editMeal) return
    const { error } = await supabase.from('meals').delete().eq('id', editMeal.id)
    if (!error) { setEditMeal(null); await load(); refreshXP(); refreshActivity() }
  }

  // History — grouped by day, searched + range-filtered
  const { search, setSearch, range, setRange, filtered } = useHistoryFilter<Meal>(
    allMeals,
    ['name', 'meal_type', 'notes'],
  )

  const dayGroups = useMemo<DayGroup[]>(() => {
    const byDate: Record<string, Meal[]> = {}
    for (const m of filtered) (byDate[m.date] ??= []).push(m)
    return Object.entries(byDate)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, meals]) => ({
        date,
        meals,
        calories: meals.reduce((s, m) => s + n(m.calories), 0),
        protein:  meals.reduce((s, m) => s + n(m.protein_g), 0),
      }))
  }, [filtered])

  const calRemaining = targets ? targets.target - caloriesToday : null

  return (
    <>
      <TopBar title="Nutrition" />
      <PageWrapper>

        {/* TODAY HERO */}
        <Card className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <p className="card-title">Today</p>
            <div style={{ display: 'flex', gap: 4 }}>
              {GOALS.map(g => (
                <button
                  key={g.key}
                  type="button"
                  onClick={() => pickGoal(g.key)}
                  style={{
                    padding: '5px 12px', borderRadius: 999, fontSize: 12, fontWeight: 700,
                    fontFamily: 'var(--font-mono)',
                    background: goal === g.key ? 'var(--accent)' : 'var(--input-bg)',
                    color: goal === g.key ? 'var(--base-bg)' : 'var(--text-muted)',
                    border: `1px solid ${goal === g.key ? 'var(--accent)' : 'var(--border)'}`,
                    cursor: 'pointer',
                  }}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          {targets ? (
            <>
              <div className="flex items-baseline justify-between mb-1.5">
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Calories</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--text-primary)', fontWeight: 700 }}>
                  {caloriesToday.toLocaleString()} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>/ {targets.target.toLocaleString()}</span>
                </span>
              </div>
              <ProgressBar value={targets.target > 0 ? caloriesToday / targets.target : 0} height={12} />
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: (calRemaining ?? 0) >= 0 ? 'var(--text-tertiary)' : 'var(--red)', marginTop: 6 }}>
                {calRemaining != null && calRemaining >= 0
                  ? `${calRemaining.toLocaleString()} cal remaining`
                  : `${Math.abs(calRemaining ?? 0).toLocaleString()} cal over`}
              </p>

              <div className="flex items-baseline justify-between mb-1.5 mt-4">
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Protein</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--text-primary)', fontWeight: 700 }}>
                  {Math.round(proteinToday)}g <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>/ {targets.proteinTarget}g</span>
                </span>
              </div>
              <ProgressBar value={targets.proteinTarget > 0 ? proteinToday / targets.proteinTarget : 0} height={12} color="var(--chart-alt)" />

              <div className="grid grid-cols-3 gap-2 mt-4">
                {([
                  { label: 'BMR',  value: targets.bmr.toLocaleString() },
                  { label: 'TDEE', value: targets.tdee.toLocaleString() },
                  { label: 'Formula', value: targets.formula === 'katch' ? 'Body fat %' : 'Mifflin' },
                ]).map(s => (
                  <div key={s.label} className="rounded-xl p-2.5 text-center" style={{ background: 'var(--surface-1)', border: '1px solid var(--border-subtle)' }}>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>{s.value}</p>
                    <p className="section-label mt-1">{s.label}</p>
                  </div>
                ))}
              </div>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8, textAlign: 'center' }}>
                {targets.formula === 'katch' ? 'BMR from body fat % (Katch-McArdle)' : 'BMR from Mifflin-St Jeor'}
              </p>
            </>
          ) : (
            <div className="rounded-xl p-4" style={{ background: 'var(--surface-1)', border: '1px dashed var(--border)' }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>
                Set up your calorie targets
              </p>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                To compute a daily target, either log a body-fat % in <Link to="/measurements" style={{ color: 'var(--accent)', fontWeight: 600 }}>Measurements</Link>, or fill in your height, age, and sex under{' '}
                <Link to="/settings" style={{ color: 'var(--accent)', fontWeight: 600 }}>Settings &rarr; Nutrition Profile</Link>. You can still log meals below.
              </p>
            </div>
          )}
        </Card>

        {/* ADD MEAL */}
        <Card className="mb-4">
          <p className="card-title mb-3">Add Meal</p>

          <div style={{ display: 'flex', gap: 4, marginBottom: 12, flexWrap: 'wrap' }}>
            {MEAL_TYPES.map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setMealType(t)}
                style={{
                  flex: 1, minWidth: 70, padding: '8px 6px', borderRadius: 10, fontSize: 12, fontWeight: 700,
                  background: mealType === t ? 'var(--accent)' : 'var(--input-bg)',
                  color: mealType === t ? 'var(--base-bg)' : 'var(--text-muted)',
                  border: `1px solid ${mealType === t ? 'var(--accent)' : 'var(--border)'}`,
                  cursor: 'pointer',
                }}
              >
                {t}
              </button>
            ))}
          </div>

          <Input
            label="Calories"
            type="number"
            placeholder="e.g. 600"
            value={calories}
            onChange={e => setCalories(e.target.value)}
          />

          <button
            type="button"
            onClick={() => setShowDetails(v => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: 4, marginTop: 12,
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--accent)', fontSize: 13, fontWeight: 600, padding: 0,
            }}
          >
            <ChevronIcon size={14} color="var(--accent)" style={{ transform: showDetails ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
            Add details
          </button>

          {showDetails && (
            <div className="flex flex-col gap-3 mt-3">
              <Input label="Name" type="text" placeholder="Chicken and rice" value={name} onChange={e => setName(e.target.value)} />
              <div className="grid grid-cols-3 gap-2">
                <Input label="Protein (g)" type="number" value={protein} onChange={e => setProtein(e.target.value)} />
                <Input label="Carbs (g)"   type="number" value={carbs}   onChange={e => setCarbs(e.target.value)} />
                <Input label="Fat (g)"     type="number" value={fat}     onChange={e => setFat(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="section-label">Notes</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Optional"
                  className="px-3 py-2 rounded-xl outline-none resize-none text-sm"
                  style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                />
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={addMeal}
            disabled={submitting || !calories || parseFloat(calories) < 0 || !userId}
            className="w-full mt-4 py-2.5 rounded-xl font-semibold text-sm"
            style={{
              background: (!submitting && calories && parseFloat(calories) >= 0) ? 'var(--accent)' : 'var(--input-bg)',
              color: (!submitting && calories && parseFloat(calories) >= 0) ? 'var(--base-bg)' : 'var(--text-muted)',
              border: 'none', cursor: (!submitting && calories) ? 'pointer' : 'default',
            }}
          >
            {submitting ? 'Logging…' : 'Log Meal'}
          </button>
        </Card>

        {/* TODAY'S MEALS */}
        {todayMeals.length > 0 && (
          <Card className="mb-4">
            <p className="card-title mb-3">Today's Meals</p>
            <div className="flex flex-col gap-2">
              {todayMeals.map(m => (
                <div
                  key={m.id}
                  className="flex items-center justify-between"
                  style={{ padding: '10px 12px', borderRadius: 10, background: 'var(--input-bg)', border: '1px solid var(--border-faint)' }}
                >
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                      {m.name || m.meal_type}
                    </p>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                      {m.meal_type} · {n(m.calories)} cal{m.protein_g != null ? ` · ${m.protein_g}g P` : ''}
                    </p>
                  </div>
                  <button
                    onClick={() => openEdit(m)}
                    aria-label="Edit meal"
                    style={{ width: 28, height: 28, borderRadius: 8, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-1)', border: 'none', cursor: 'pointer' }}
                  >
                    <EditIcon size={13} color="var(--text-muted)" />
                  </button>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* CORRELATION CHARTS */}
        <Card className="mb-4">
          <p className="card-title mb-2">Calories vs Training Volume</p>
          <CalorieVolumeChart />
        </Card>

        <Card className="mb-4">
          <p className="card-title mb-2">Surplus vs Bodyweight</p>
          <SurplusWeightChart target={targets ? targets.target : null} />
        </Card>

        <Card className="mb-4">
          <p className="card-title mb-2">Fuel vs Recovery</p>
          <NutritionWellnessChart />
        </Card>

        {/* HISTORY */}
        <div>
          <p className="card-title mb-3">History</p>

          {loading && (
            <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-muted)', padding: '24px 0' }}>Loading…</p>
          )}

          {!loading && missingTable && (
            <EmptyState
              icon={<UtensilsIcon size={40} color="var(--text-muted)" />}
              title="Nutrition not set up yet"
              sub="Run the phase7 migration in Supabase to create the meals table, then start logging."
            />
          )}

          {!loading && !missingTable && loadError && (
            <ErrorState
              icon={<UtensilsIcon size={40} color="var(--text-muted)" />}
              title="Could not load meals"
              sub="Something went wrong fetching your meal history."
              onRetry={load}
            />
          )}

          {!loading && !missingTable && !loadError && allMeals.length === 0 && (
            <EmptyState
              icon={<UtensilsIcon size={40} color="var(--text-muted)" />}
              title="No meals logged yet"
              sub="Log your first meal above to start tracking calories and macros."
            />
          )}

          {!loading && !missingTable && !loadError && allMeals.length > 0 && (
            <>
              <HistoryControls
                search={search}
                onSearch={setSearch}
                range={range}
                onRange={setRange}
                placeholder="Search meals..."
              />

              {dayGroups.length === 0 && (
                <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-muted)', padding: '20px 0' }}>
                  No meals match your filters.
                </p>
              )}

              <div className="flex flex-col gap-3">
                {dayGroups.slice(0, visibleGroups).map(g => (
                  <Card key={g.date} noPadding>
                    <div
                      className="flex items-center justify-between"
                      style={{ padding: '10px 14px', borderBottom: '1px solid var(--border-faint)' }}
                    >
                      <div className="flex items-center gap-2">
                        <FlameIcon size={14} color="var(--accent)" />
                        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{formatDate(g.date)}</span>
                      </div>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-tertiary)' }}>
                        {g.calories.toLocaleString()} cal · {Math.round(g.protein)}g P
                      </span>
                    </div>
                    <div className="flex flex-col">
                      {g.meals.map(m => (
                        <button
                          key={m.id}
                          onClick={() => openEdit(m)}
                          className="flex items-center justify-between text-left"
                          style={{ padding: '8px 14px', background: 'none', border: 'none', cursor: 'pointer' }}
                        >
                          <span style={{ fontSize: 12, color: 'var(--text-secondary)', minWidth: 0 }}>
                            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{m.meal_type}</span>
                            {m.name ? ` · ${m.name}` : ''}
                          </span>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-tertiary)', flexShrink: 0, marginLeft: 8 }}>
                            {n(m.calories)} cal
                          </span>
                        </button>
                      ))}
                    </div>
                  </Card>
                ))}
              </div>

              {dayGroups.length > visibleGroups && (
                <button
                  onClick={() => setVisibleGroups(v => v + 20)}
                  className="w-full mt-3 py-2.5 rounded-xl font-semibold text-sm"
                  style={{ background: 'var(--input-bg)', color: 'var(--accent)', border: '1px solid var(--border)', cursor: 'pointer' }}
                >
                  Show more
                </button>
              )}
            </>
          )}
        </div>

      </PageWrapper>

      {toast && <Toast message={toast} onDone={() => { setToast(null); setToastUndo(undefined) }} onUndo={toastUndo} />}

      {editMeal && (
        <EditModal
          title={`Edit — ${formatDate(editMeal.date)}`}
          onClose={() => setEditMeal(null)}
          onDelete={deleteMeal}
          onSave={saveEdit}
          saving={savingEdit}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 13, color: 'var(--text-muted)' }}>Meal</label>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {MEAL_TYPES.map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setEditVals(v => ({ ...v, meal_type: t }))}
                    style={{
                      flex: 1, minWidth: 64, padding: '6px 4px', borderRadius: 8, fontSize: 11, fontWeight: 700,
                      background: editVals.meal_type === t ? 'var(--accent)' : 'var(--input-bg)',
                      color: editVals.meal_type === t ? 'var(--base-bg)' : 'var(--text-muted)',
                      border: `1px solid ${editVals.meal_type === t ? 'var(--accent)' : 'var(--border)'}`,
                      cursor: 'pointer',
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            {([
              { label: 'Name',        key: 'name'      as const, type: 'text' },
              { label: 'Calories',    key: 'calories'  as const, type: 'number' },
              { label: 'Protein (g)', key: 'protein_g' as const, type: 'number' },
              { label: 'Carbs (g)',   key: 'carbs_g'   as const, type: 'number' },
              { label: 'Fat (g)',     key: 'fat_g'     as const, type: 'number' },
            ]).map(({ label, key, type }) => (
              <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 13, color: 'var(--text-muted)' }}>{label}</label>
                <input
                  type={type}
                  value={editVals[key]}
                  onChange={e => setEditVals(v => ({ ...v, [key]: e.target.value }))}
                  style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', color: 'var(--text-primary)', fontSize: 14, width: '100%' }}
                />
              </div>
            ))}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label style={{ fontSize: 13, color: 'var(--text-muted)' }}>Notes</label>
              <textarea
                value={editVals.notes}
                onChange={e => setEditVals(v => ({ ...v, notes: e.target.value }))}
                rows={2}
                style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 10px', color: 'var(--text-primary)', fontSize: 14, width: '100%', resize: 'none' }}
              />
            </div>
          </div>
        </EditModal>
      )}
    </>
  )
}
