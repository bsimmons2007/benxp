import { TopBar } from '../components/layout/TopBar'
import { PageWrapper } from '../components/layout/PageWrapper'
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
  { to: '/xp-history',   Icon: TrendingIcon,  label: 'XP History',   sub: 'Every XP event, ever'         },
  { to: '/dev',          Icon: TerminalIcon,  label: 'Dev Tools',    sub: 'XP engine & diagnostics'      },
]

export function More() {
  usePageTitle('More')
  return (
    <>
      <TopBar title="More" />
      <PageWrapper>
        <div className="flex flex-col gap-2">
          {NAV_LINKS.map(link => (
            <a key={link.to} href={link.to} style={{ textDecoration: 'none' }}>
              <div
                className="card-hover"
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '14px 16px', borderRadius: 14,
                  background: 'var(--card-bg)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  border: '1px solid var(--border)',
                }}
              >
                <div style={{
                  width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid var(--border-faint)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <link.Icon size={18} color="var(--text-secondary)" />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{link.label}</p>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{link.sub}</p>
                </div>

                <ChevronRightIcon size={16} color="var(--text-dim)" />
              </div>
            </a>
          ))}
        </div>
      </PageWrapper>
    </>
  )
}
