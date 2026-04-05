import { useState } from 'react'
import { TopBar } from '../components/layout/TopBar'
import { PageWrapper } from '../components/layout/PageWrapper'
import { LogWorkoutForm } from '../components/forms/LogWorkoutForm'
import { LogSkateForm } from '../components/forms/LogSkateForm'
import { LogFortniteForm } from '../components/forms/LogFortniteForm'
import { LogBookForm } from '../components/forms/LogBookForm'
import { LogSleepForm } from '../components/forms/LogSleepForm'

const TABS = ['Workout', 'Skate', 'Fortnite', 'Book', 'Sleep'] as const
type Tab = typeof TABS[number]

export function Log() {
  const [active, setActive] = useState<Tab>('Workout')

  return (
    <>
      <TopBar title="Log Activity" />
      <PageWrapper>
        {/* Tab switcher */}
        <div
          className="flex overflow-x-auto gap-1 mb-6 pb-1"
          style={{ scrollbarWidth: 'none' }}
        >
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActive(tab)}
              className="px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors"
              style={
                active === tab
                  ? { background: '#F5A623', color: '#1A1A2E' }
                  : { background: '#16213E', color: '#888888' }
              }
            >
              {tab}
            </button>
          ))}
        </div>

        {active === 'Workout' && <LogWorkoutForm />}
        {active === 'Skate' && <LogSkateForm />}
        {active === 'Fortnite' && <LogFortniteForm />}
        {active === 'Book' && <LogBookForm />}
        {active === 'Sleep' && <LogSleepForm />}
      </PageWrapper>
    </>
  )
}
