import { useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useStore } from '../store/useStore'
import { useNavStore } from '../store/useNavStore'
import { today } from '../lib/utils'
import { CheckIcon, MoonIcon, DropletIcon, BrainIcon, ZapIcon, UtensilsIcon, type IconComponent } from './ui/Icon'

const WATER_GOAL = 64

interface TodayItem {
  id: string
  label: string
  Icon: IconComponent
  done: boolean
  detail?: string
  quickAdd?: () => void   // inline +8oz for water
  target: string          // quick-log activity id
}

export function TodayCard() {
  const rawRows         = useStore(s => s.rawRows)
  const refreshXP       = useStore(s => s.refreshXP)
  const refreshActivity = useStore(s => s.refreshActivity)
  const openQuickLog    = useNavStore(s => s.openQuickLog)

  const [waterBump, setWaterBump] = useState(0) // optimistic oz added inline
  const [addingWater, setAddingWater] = useState(false)

  const todayStr = today()

  const items = useMemo<TodayItem[]>(() => {
    const r = rawRows
    const loggedToday = (dates: (string | null | undefined)[]) => dates.some(d => d === todayStr)

    const sleepDone = loggedToday((r?.sleepRows ?? []).map(x => x.date))
    const moodDone  = loggedToday((r?.moodRows ?? []).map(x => x.date))
    const mealsDone = loggedToday((r?.mealRows ?? []).map(x => x.date))
    const waterOz   = (r?.waterRows ?? []).filter(x => x.date === todayStr).reduce((s, x) => s + Number(x.oz), 0) + waterBump

    // "Any activity" today across the movement/game tables.
    const activityDates: (string | null | undefined)[] = [
      ...(r?.liftingRows ?? []).map(x => x.date),
      ...(r?.cardioRows  ?? []).map(x => x.date),
      ...(r?.skateRows   ?? []).map(x => x.date),
      ...(r?.gameRows    ?? []).map(x => x.date),
      ...(r?.bbRows      ?? []).map(x => x.date),
      ...(r?.pbRows      ?? []).map(x => x.date),
      ...(r?.hikeRows    ?? []).map(x => x.date),
    ]
    const activityDone = loggedToday(activityDates)

    async function addWater8() {
      if (addingWater) return
      setAddingWater(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setAddingWater(false); return }
      const { error } = await supabase.from('water_log').insert({ user_id: user.id, date: todayStr, oz: 8 })
      setAddingWater(false)
      if (error) return
      setWaterBump(b => b + 8)
      await refreshXP(); refreshActivity()
    }

    return [
      { id: 'sleep', label: 'Log sleep', Icon: MoonIcon, done: sleepDone, target: 'sleep' },
      {
        id: 'water', label: 'Drink water', Icon: DropletIcon, done: waterOz >= WATER_GOAL,
        detail: `${Math.round(waterOz)}/${WATER_GOAL}oz`,
        quickAdd: waterOz >= WATER_GOAL ? undefined : addWater8, target: 'water',
      },
      { id: 'mood', label: 'Check in mood', Icon: BrainIcon, done: moodDone, target: 'mood' },
      { id: 'meals', label: 'Log a meal', Icon: UtensilsIcon, done: mealsDone, target: 'nutrition' },
      { id: 'activity', label: 'Log an activity', Icon: ZapIcon, done: activityDone, target: 'open' },
    ]
  }, [rawRows, waterBump, todayStr, refreshXP, refreshActivity, addingWater])

  const remaining = items.filter(i => !i.done).length
  const afterSix  = new Date().getHours() >= 18

  // Nothing to nudge — everything done.
  if (remaining === 0) return null

  return (
    <div className="mb-5 rounded-2xl" style={{ background: 'var(--surface-1)', border: '1px solid var(--border-subtle)', overflow: 'hidden' }}>
      <div className="flex items-center justify-between" style={{ padding: '14px 16px 8px' }}>
        <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>Today</p>
        {remaining > 0 && (
          <span
            className="font-mono"
            style={{
              fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
              color: afterSix ? 'var(--accent)' : 'var(--text-muted)',
              background: afterSix ? 'var(--accent-subtle)' : 'var(--input-bg)',
            }}
          >
            {remaining} left{afterSix ? ' today' : ''}
          </span>
        )}
      </div>

      <div style={{ padding: '0 8px 6px' }}>
        {items.map(item => (
          <div key={item.id} className="flex items-center gap-3" style={{ padding: '8px 8px' }}>
            <button
              type="button"
              disabled={item.done}
              aria-label={item.done ? `${item.label} done` : item.label}
              onClick={() => openQuickLog(item.target)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0,
                background: 'none', border: 'none', padding: 0,
                cursor: item.done ? 'default' : 'pointer', textAlign: 'left',
              }}
            >
              <div style={{
                width: 30, height: 30, borderRadius: 9, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: item.done ? 'color-mix(in srgb, var(--green) 15%, transparent)' : 'var(--input-bg)',
                border: `1px solid ${item.done ? 'color-mix(in srgb, var(--green) 40%, transparent)' : 'var(--border-subtle)'}`,
              }}>
                {item.done
                  ? <CheckIcon size={15} color="var(--green)" />
                  : <item.Icon size={15} color="var(--text-secondary)" />}
              </div>
              <span style={{
                fontSize: 13, fontWeight: 500, flex: 1,
                color: item.done ? 'var(--text-disabled)' : 'var(--text-primary)',
                textDecoration: item.done ? 'line-through' : 'none',
              }}>
                {item.label}
                {item.detail && (
                  <span className="font-mono" style={{ marginLeft: 8, fontSize: 11, color: 'var(--text-muted)' }}>{item.detail}</span>
                )}
              </span>
            </button>
            {item.quickAdd && !item.done && (
              <button
                type="button"
                disabled={addingWater}
                onClick={item.quickAdd}
                aria-label="Add 8 ounces of water"
                className="font-mono"
                style={{
                  flexShrink: 0, padding: '5px 10px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                  background: 'var(--accent-subtle)', border: '1px solid var(--accent-dim)',
                  color: 'var(--accent)', cursor: addingWater ? 'default' : 'pointer',
                  opacity: addingWater ? 0.6 : 1,
                }}
              >
                +8oz
              </button>
            )}
          </div>
        ))}
      </div>

    </div>
  )
}
