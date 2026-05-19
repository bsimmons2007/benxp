import { Link } from 'react-router-dom'
import { TopBar } from '../components/layout/TopBar'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Card } from '../components/ui/Card'
import {
  PersonIcon, TargetIcon, RulerIcon, CalendarIcon, GridIcon,
  TrophyIcon, ShareIcon, TrendingIcon, ChevronRightIcon, TerminalIcon,
} from '../components/ui/Icon'
import type { CSSProperties } from 'react'
import { usePageTitle } from '../hooks/usePageTitle'

type IconFn = (props: { size?: number; color?: string; style?: CSSProperties }) => React.ReactElement

const NAV_LINKS: { to: string; Icon: IconFn; label: string; sub: string }[] = [
  { to: '/profile',      Icon: PersonIcon,   label: 'Profile',            sub: 'Badges, skills & identity'    },
  { to: '/goals',        Icon: TargetIcon,   label: 'Goals',              sub: 'Set targets, earn XP'         },
  { to: '/measurements', Icon: RulerIcon,    label: 'Measurements',       sub: 'Body composition over time'   },
  { to: '/weekly',       Icon: CalendarIcon, label: 'Weekly Review',      sub: 'XP & highlights this week'    },
  { to: '/monthly',      Icon: GridIcon,     label: 'Monthly Reel',       sub: 'Your best moments this month' },
  { to: '/pr-feed',      Icon: TrophyIcon,   label: 'PR Feed',            sub: "Every record you've set"      },
  { to: '/share',        Icon: ShareIcon,    label: 'Share Card',         sub: 'Export your progress card'    },
  { to: '/xp-history',   Icon: TrendingIcon, label: 'XP History',        sub: 'Every XP event, ever'         },
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
            <Link key={link.to} to={link.to} style={{ textDecoration: 'none' }}>
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
          ))}
        </div>
      </PageWrapper>
    </>
  )
}
