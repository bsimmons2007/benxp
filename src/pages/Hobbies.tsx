import { useEffect, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { TopBar } from '../components/layout/TopBar'
import { PageWrapper } from '../components/layout/PageWrapper'
import { supabase } from '../lib/supabase'
import { usePageTitle } from '../hooks/usePageTitle'
import { BasketballIcon, GamepadIcon, TargetIcon, GolfIcon, DiscIcon, MountainIcon } from '../components/ui/Icon'

// ── Hobby card ────────────────────────────────────────────────────────────────

interface HobbyCardProps {
  icon:        ReactNode
  label:       string
  sub:         string
  path:        string
  statLabel?:  string
  statValue?:  string | number
  accentColor: string
}

function HobbyCard({ icon, label, sub, path, statLabel, statValue, accentColor }: HobbyCardProps) {
  const navigate = useNavigate()
  return (
    <button
      onClick={() => navigate(path)}
      style={{
        width: '100%', textAlign: 'left', cursor: 'pointer',
        padding: '18px 20px', borderRadius: 16,
        background: 'var(--card-bg)',
        border: `1px solid rgba(255,255,255,0.07)`,
        backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
        display: 'flex', alignItems: 'center', gap: 16,
        transition: 'border-color 0.15s, transform 0.12s',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = accentColor
        e.currentTarget.style.transform = 'translateY(-1px)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'
        e.currentTarget.style.transform = 'none'
      }}
    >
      {/* Icon */}
      <div style={{
        width: 52, height: 52, borderRadius: 14, flexShrink: 0,
        background: `${accentColor}15`,
        border: `1.5px solid ${accentColor}40`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {icon}
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'Cinzel, serif' }}>
          {label}
        </p>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{sub}</p>
      </div>

      {/* Quick stat */}
      {statValue !== undefined && (
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <p style={{ fontSize: 20, fontWeight: 900, color: accentColor, fontFamily: 'Cinzel, serif', lineHeight: 1 }}>
            {statValue}
          </p>
          <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{statLabel}</p>
        </div>
      )}

      {/* Chevron */}
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, opacity: 0.4 }}>
        <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function Hobbies() {
  usePageTitle('Hobbies')
  const [bbSessions,   setBbSessions]   = useState<number | null>(null)
  const [fnWins,       setFnWins]       = useState<number | null>(null)
  const [pbWins,       setPbWins]       = useState<number | null>(null)
  const [golfRounds,   setGolfRounds]   = useState<number | null>(null)
  const [dgRounds,     setDgRounds]     = useState<number | null>(null)
  const [hikeMiles,    setHikeMiles]    = useState<number | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const [bb, fn, pb, golf, dg, hike] = await Promise.all([
        supabase.from('basketball_sessions').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('fortnite_games').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('win', true),
        supabase.from('pickleball_games').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('win', true),
        supabase.from('golf_rounds').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('disc_golf_rounds').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('hiking_sessions').select('distance_miles').eq('user_id', user.id),
      ])
      setBbSessions(bb.count ?? 0)
      setFnWins(fn.count ?? 0)
      setPbWins(pb.count ?? 0)
      setGolfRounds(golf.count ?? 0)
      setDgRounds(dg.count ?? 0)
      const miles = (hike.data ?? []).reduce((s: number, r: { distance_miles: number }) => s + Number(r.distance_miles), 0)
      setHikeMiles(Math.round(miles * 10) / 10)
    }
    load()
  }, [])

  return (
    <>
      <TopBar title="Hobbies" />
      <PageWrapper>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          <HobbyCard
            icon={<GolfIcon size={28} color="#34d399" />}
            label="Golf"
            sub="Score vs par, putts & round history"
            path="/golf"
            accentColor="#34d399"
            statLabel="rounds"
            statValue={golfRounds ?? '—'}
          />

          <HobbyCard
            icon={<DiscIcon size={28} color="#f59e0b" />}
            label="Disc Golf"
            sub="Score vs par, course history"
            path="/disc-golf"
            accentColor="#f59e0b"
            statLabel="rounds"
            statValue={dgRounds ?? '—'}
          />

          <HobbyCard
            icon={<MountainIcon size={28} color="#84cc16" />}
            label="Hiking"
            sub="Trails, miles & elevation gain"
            path="/hiking"
            accentColor="#84cc16"
            statLabel="miles"
            statValue={hikeMiles ?? '—'}
          />

          <HobbyCard
            icon={<BasketballIcon size={28} color="#f97316" />}
            label="Hoops"
            sub="Shot charts, box scores & streaks"
            path="/basketball"
            accentColor="#f97316"
            statLabel="sessions"
            statValue={bbSessions ?? '—'}
          />

          <HobbyCard
            icon={<GamepadIcon size={28} color="#a855f7" />}
            label="Fortnite"
            sub="Wins, kill streaks & placement"
            path="/fortnite"
            accentColor="#a855f7"
            statLabel="wins"
            statValue={fnWins ?? '—'}
          />

          <HobbyCard
            icon={<TargetIcon size={28} color="#22c55e" />}
            label="Pickleball"
            sub="Wins, scores & win rate"
            path="/pickleball"
            accentColor="#22c55e"
            statLabel="wins"
            statValue={pbWins ?? '—'}
          />

        </div>
      </PageWrapper>
    </>
  )
}
