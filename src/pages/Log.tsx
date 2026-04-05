import { useState } from 'react'
import { TopBar } from '../components/layout/TopBar'
import { LogWorkoutForm } from '../components/forms/LogWorkoutForm'
import { LogSkateForm } from '../components/forms/LogSkateForm'
import { LogFortniteForm } from '../components/forms/LogFortniteForm'
import { LogBookForm } from '../components/forms/LogBookForm'
import { LogSleepForm } from '../components/forms/LogSleepForm'

const TABS = [
  { key: 'Workout',  label: 'Workout',  icon: '🏋️' },
  { key: 'Skate',    label: 'Skate',    icon: '🛼' },
  { key: 'Fortnite', label: 'Fortnite', icon: '🎮' },
  { key: 'Book',     label: 'Book',     icon: '📚' },
  { key: 'Sleep',    label: 'Sleep',    icon: '😴' },
] as const

type Tab = typeof TABS[number]['key']

export function Log() {
  const [active, setActive] = useState<Tab>('Workout')

  return (
    <div className="min-h-screen pb-28">
      <TopBar title="Log Activity" />

      {/* Sticky tab bar sits just below TopBar */}
      <div
        className="fixed left-0 right-0 z-30 flex px-3 py-2 gap-2"
        style={{
          top: 52,
          background: 'var(--base-bg)',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActive(tab.key)}
            className="flex flex-col items-center justify-center gap-1 py-2 rounded-xl font-semibold transition-colors flex-1"
            style={
              active === tab.key
                ? { background: 'var(--accent)', color: 'var(--base-bg)' }
                : { background: 'rgba(255,255,255,0.05)', color: '#888888' }
            }
          >
            <span className="text-2xl">{tab.icon}</span>
            <span className="text-xs">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content scrolls below both bars — top padding accounts for TopBar + tab bar */}
      <div className="px-4" style={{ paddingTop: 148 }}>
        {active === 'Workout'  && <LogWorkoutForm />}
        {active === 'Skate'    && <LogSkateForm />}
        {active === 'Fortnite' && <LogFortniteForm />}
        {active === 'Book'     && <LogBookForm />}
        {active === 'Sleep'    && <LogSleepForm />}
      </div>
    </div>
  )
}
