import { Link } from 'react-router-dom'
import { TopBar } from '../components/layout/TopBar'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Card } from '../components/ui/Card'
import {
  PersonIcon, TargetIcon, RulerIcon, ShareIcon, TrendingIcon,
  ChevronRightIcon, TerminalIcon, CrownIcon, SettingsIcon,
} from '../components/ui/Icon'
import type { CSSProperties } from 'react'
import { usePageTitle } from '../hooks/usePageTitle'

type IconFn = (props: { size?: number; color?: string; style?: CSSProperties }) => React.ReactElement

const NAV_LINKS: { to: string; Icon: IconFn; label: string; sub: string; sidebarOnly?: boolean }[] = [
  { to: '/profile',      Icon: PersonIcon,   label: 'Profile',            sub: 'Badges, skills & identity'    },
  { to: '/progress',     Icon: TrendingIcon, label: 'Progress',           sub: 'Week, month, year, history & PRs' },
  { to: '/goals',        Icon: TargetIcon,   label: 'Goals',              sub: 'Set targets, earn XP',         sidebarOnly: true },
  { to: '/measurements', Icon: RulerIcon,    label: 'Measurements',       sub: 'Body composition over time'   },
  { to: '/share',        Icon: ShareIcon,    label: 'Share Card',         sub: 'Export your progress card'    },
  { to: '/leaderboard',  Icon: CrownIcon,    label: 'Leaderboard',        sub: 'See how you rank globally'    },
  { to: '/settings',     Icon: SettingsIcon, label: 'Settings',           sub: 'Themes, sections & account'   },
  // Dev tools only visible in local development
  ...(import.meta.env.DEV ? [
    { to: '/dev', Icon: TerminalIcon, label: 'Dev Tools', sub: 'XP engine & diagnostics' },
  ] : []),
]

export function More() {
  usePageTitle('More')
  return (
    <>
      <TopBar title="More" />
      <PageWrapper>
        <div className="flex flex-col gap-2">
          {NAV_LINKS.map(link => (
            <div key={link.to} className={link.sidebarOnly ? 'md:hidden' : ''}>
            <Link to={link.to} style={{ textDecoration: 'none' }}>
              <Card className="card-hover" style={{ padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <link.Icon size={18} color="var(--text-secondary)" />
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{link.label}</p>
                    <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 1 }}>{link.sub}</p>
                  </div>

                  <ChevronRightIcon size={16} color="var(--text-disabled)" />
                </div>
              </Card>
            </Link>
            </div>
          ))}
        </div>
      </PageWrapper>
    </>
  )
}
