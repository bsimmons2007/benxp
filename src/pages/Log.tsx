import { useState } from 'react'
import type { ReactNode } from 'react'
import { TopBar } from '../components/layout/TopBar'
import { LogWorkoutForm } from '../components/forms/LogWorkoutForm'
import { LogFortniteForm } from '../components/forms/LogFortniteForm'
import { DumbbellIcon, GamepadIcon } from '../components/ui/Icon'
import { usePageTitle } from '../hooks/usePageTitle'

type Tab = 'Workout' | 'Fortnite'

const TABS: { key: Tab; label: string; icon: ReactNode }[] = [
  { key: 'Workout',  label: 'Workout',  icon: <DumbbellIcon size={24} color="currentColor" /> },
  { key: 'Fortnite', label: 'Fortnite', icon: <GamepadIcon  size={24} color="currentColor" /> },
]

export function Log() {
  usePageTitle('Log')
  const [active, setActive] = useState<Tab>('Workout')

  return (
    <div className="min-h-screen" style={{ paddingBottom: 120 }}>
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
            <span style={{ display: 'flex', alignItems: 'center' }}>{tab.icon}</span>
            <span className="text-xs">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content scrolls below both bars — top padding accounts for TopBar + tab bar */}
      <div className="px-4" style={{ paddingTop: 148 }}>
        {active === 'Workout'  && <LogWorkoutForm />}
        {active === 'Fortnite' && <LogFortniteForm />}
      </div>
    </div>
  )
}
