import { useEffect, useState } from 'react'
import { TopBar } from '../components/layout/TopBar'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { supabase } from '../lib/supabase'
import { useStore } from '../store/useStore'
import type { Challenge } from '../types'

const TIER_COLORS: Record<string, string> = {
  Weekly: '#E94560',
  Monthly: '#0F3460',
  Boss: '#4A235B',
}

function ChallengeRow({ challenge, onComplete }: { challenge: Challenge; onComplete: () => void }) {
  const isBoss = challenge.tier === 'Boss'
  const isCompleted = challenge.status === 'completed'

  return (
    <Card goldBorder={isBoss} className={`mb-2 ${isBoss ? 'py-5' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={`font-semibold text-white ${isBoss ? 'text-base' : 'text-sm'}`}>
              {challenge.challenge_name}
            </span>
            {challenge.category && <Badge label={challenge.category} />}
          </div>
          {challenge.target && (
            <p className="text-xs mb-1" style={{ color: '#888' }}>Target: {challenge.target}</p>
          )}
          <span className="text-sm font-bold" style={{ color: '#F5A623' }}>
            +{challenge.xp_reward} XP
          </span>
        </div>
        <div className="flex flex-col items-end gap-1">
          {isCompleted ? (
            <span className="text-green-400 text-lg">✓</span>
          ) : (
            <button
              onClick={onComplete}
              className="text-xs px-3 py-1 rounded-lg font-medium"
              style={{ background: 'rgba(255,255,255,0.1)', color: '#CCCCCC' }}
            >
              Mark done
            </button>
          )}
        </div>
      </div>
    </Card>
  )
}

export function Challenges() {
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const refreshXP = useStore((s) => s.refreshXP)

  async function load() {
    const { data } = await supabase.from('challenges').select('*').order('tier')
    setChallenges(data ?? [])
  }

  useEffect(() => { load() }, [])

  async function handleComplete(id: string) {
    await supabase
      .from('challenges')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', id)
    await load()
    await refreshXP()
  }

  const tiers = ['Weekly', 'Monthly', 'Boss'] as const

  return (
    <>
      <TopBar title="Challenges" />
      <PageWrapper>
        {tiers.map((tier) => (
          <div key={tier} className="mb-6">
            <div
              className="px-3 py-2 rounded-lg mb-3 font-bold text-white"
              style={{ background: TIER_COLORS[tier] }}
            >
              {tier} Challenges
            </div>
            {challenges
              .filter((c) => c.tier === tier)
              .map((c) => (
                <ChallengeRow
                  key={c.id}
                  challenge={c}
                  onComplete={() => handleComplete(c.id)}
                />
              ))}
          </div>
        ))}
      </PageWrapper>
    </>
  )
}
