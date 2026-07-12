import { lazy, Suspense } from 'react'
import { useSearchParams } from 'react-router-dom'
import { TopBar } from '../components/layout/TopBar'
import { PageWrapper } from '../components/layout/PageWrapper'
import { usePageTitle } from '../hooks/usePageTitle'

// Each tab is its own chunk — a visit to one view doesn't pay for the others.
const WeeklyContent    = lazy(() => import('./Weekly').then(m => ({ default: m.WeeklyContent })))
const MonthlyContent   = lazy(() => import('./Monthly').then(m => ({ default: m.MonthlyContent })))
const YearlyContent    = lazy(() => import('./Yearly').then(m => ({ default: m.YearlyContent })))
const XPHistoryContent = lazy(() => import('./XPHistory').then(m => ({ default: m.XPHistoryContent })))
const PRFeedContent    = lazy(() => import('./PRFeed').then(m => ({ default: m.PRFeedContent })))

type TabId = 'week' | 'month' | 'year' | 'history' | 'prs'

const TABS: { id: TabId; label: string }[] = [
  { id: 'week',    label: 'Week' },
  { id: 'month',   label: 'Month' },
  { id: 'year',    label: 'Year' },
  { id: 'history', label: 'History' },
  { id: 'prs',     label: 'PRs' },
]

export function Progress() {
  usePageTitle('Progress')
  const [params, setParams] = useSearchParams()
  const raw = params.get('tab')
  const tab: TabId = TABS.some(t => t.id === raw) ? raw as TabId : 'week'

  return (
    <>
      <TopBar title="Progress" />
      <PageWrapper>

        {/* Tab switcher */}
        <div
          role="tablist"
          className="flex gap-1 mb-5"
          style={{ background: 'var(--surface-1)', borderRadius: 12, padding: 4, border: '1px solid var(--border-subtle)' }}
        >
          {TABS.map(t => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setParams({ tab: t.id }, { replace: true })}
              className="flex-1 py-2 rounded-lg text-xs font-semibold transition-all"
              style={{
                background: tab === t.id ? 'var(--accent)' : 'transparent',
                color:      tab === t.id ? 'var(--base-bg)' : 'var(--text-muted)',
                border: 'none', cursor: 'pointer',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <Suspense fallback={null}>
          {tab === 'week'    && <WeeklyContent />}
          {tab === 'month'   && <MonthlyContent />}
          {tab === 'year'    && <YearlyContent />}
          {tab === 'history' && <XPHistoryContent />}
          {tab === 'prs'     && <PRFeedContent />}
        </Suspense>

      </PageWrapper>
    </>
  )
}
