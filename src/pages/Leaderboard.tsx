import { useEffect, useState } from 'react'
import { TopBar } from '../components/layout/TopBar'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Card } from '../components/ui/Card'
import { Toast } from '../components/ui/Toast'
import { TrophyIcon, CrownIcon, ZapIcon, PersonIcon } from '../components/ui/Icon'
import { ErrorState } from '../components/ui/ErrorState'
import { EmptyState } from '../components/ui/EmptyState'
import { supabase } from '../lib/supabase'
import { getLevelTitle } from '../lib/xp'
import { useStore } from '../store/useStore'
import { usePageTitle } from '../hooks/usePageTitle'
import { validateDisplayName } from '../lib/validation'

/*
  Required Supabase migration (run once in SQL editor):

  CREATE TABLE public_profiles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users NOT NULL UNIQUE,
    display_name text NOT NULL DEFAULT '',
    total_xp integer DEFAULT 0,
    level integer DEFAULT 1,
    is_public boolean DEFAULT false,
    updated_at timestamptz DEFAULT now()
  );
  ALTER TABLE public_profiles ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "Public profiles readable by authenticated users"
    ON public_profiles FOR SELECT TO authenticated
    USING (is_public = true OR auth.uid() = user_id);
  CREATE POLICY "Users manage own profile"
    ON public_profiles FOR ALL TO authenticated
    USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
*/

interface PublicProfile {
  id: string
  user_id: string
  display_name: string
  total_xp: number
  level: number
  is_public: boolean
}

const MEDAL_COLORS = ['var(--gold)', 'var(--silver)', 'var(--bronze)']
const RANK_BG      = [
  'color-mix(in srgb, var(--gold) 12%, transparent)',
  'color-mix(in srgb, var(--silver) 10%, transparent)',
  'color-mix(in srgb, var(--bronze) 10%, transparent)',
]

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <CrownIcon size={20} color="var(--gold)" />
  if (rank <= 3)  return <TrophyIcon size={16} color={MEDAL_COLORS[rank - 1]} />
  return (
    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', minWidth: 20, textAlign: 'center' }}>
      {rank}
    </span>
  )
}

export function Leaderboard() {
  usePageTitle('Leaderboard')
  const totalXP   = useStore(s => s.totalXP)
  const level     = useStore(s => s.level)
  const userName  = useStore(s => s.userName)

  const [leaderboard, setLeaderboard] = useState<PublicProfile[]>([])
  const [ownProfile,  setOwnProfile]  = useState<PublicProfile | null>(null)
  const [loading,     setLoading]     = useState(true)
  const [unavailable, setUnavailable] = useState(false)
  const [loadError,   setLoadError]   = useState(false)
  const [editName,    setEditName]    = useState('')
  const [saving,      setSaving]      = useState(false)
  const [syncing,     setSyncing]     = useState(false)
  const [toast,       setToast]       = useState<string | null>(null)
  const [nameError,   setNameError]   = useState<string | null>(null)

  const [tab,            setTab]           = useState<'global' | 'following'>('global')
  const [followingIds,   setFollowingIds]  = useState<string[] | null>(null)   // null = unavailable
  const [followsChecked, setFollowsChecked] = useState(false)

  async function load() {
    setLoadError(false)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [ownRes, boardRes, followsRes] = await Promise.all([
      supabase.from('public_profiles').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('public_profiles').select('*').eq('is_public', true).order('total_xp', { ascending: false }).limit(50),
      supabase.from('user_follows').select('following_id').eq('follower_id', user.id),
    ])

    if (ownRes.error?.code === '42P01' || boardRes.error?.code === '42P01') {
      setUnavailable(true)
      setLoading(false)
      return
    }

    if (ownRes.error || boardRes.error) {
      setLoadError(true)
      setLoading(false)
      return
    }

    if (!followsRes.error) {
      setFollowingIds((followsRes.data ?? []).map(r => r.following_id))
    } else {
      setFollowingIds(null)
    }
    setFollowsChecked(true)

    setOwnProfile(ownRes.data ?? null)
    setEditName(ownRes.data?.display_name ?? userName ?? '')
    setLeaderboard(boardRes.data ?? [])
    setLoading(false)

    if (ownRes.data && (ownRes.data.total_xp !== totalXP || ownRes.data.level !== level)) {
      const { error } = await supabase.from('public_profiles').update({ total_xp: totalXP, level }).eq('user_id', user.id)
      if (!error) setOwnProfile({ ...ownRes.data, total_xp: totalXP, level })
    }
  }

  useEffect(() => { load() }, [])   // eslint-disable-line react-hooks/exhaustive-deps

  async function saveProfile(patch: Partial<PublicProfile>) {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }

    if (ownProfile) {
      const { error } = await supabase.from('public_profiles').update(patch).eq('user_id', user.id)
      if (!error) { setOwnProfile({ ...ownProfile, ...patch }); load() }
    } else {
      const { data, error } = await supabase.from('public_profiles').insert({
        user_id:      user.id,
        display_name: editName || userName || 'Anonymous',
        total_xp:     totalXP,
        level,
        ...patch,
      }).select().single()
      if (!error && data) { setOwnProfile(data); load() }
    }
    setSaving(false)
  }

  async function syncXP() {
    setSyncing(true)
    await saveProfile({ total_xp: totalXP, level })
    setToast('XP synced to leaderboard')
    setSyncing(false)
  }

  async function togglePublic() {
    const next = !ownProfile?.is_public
    if (!ownProfile && !next) return
    const name = editName.trim() || userName || 'Anonymous'
    await saveProfile({ is_public: next, display_name: name, total_xp: totalXP, level })
    setToast(next ? 'You\'re now on the leaderboard!' : 'Hidden from leaderboard')
  }

  const ownRank = ownProfile?.is_public
    ? leaderboard.findIndex(p => p.user_id === ownProfile?.user_id) + 1
    : null

  const followsAvailable = followsChecked && followingIds !== null
  const visibleBoard = tab === 'following' && followingIds
    ? leaderboard.filter(p => followingIds.includes(p.user_id))
    : leaderboard

  return (
    <>
      <TopBar title="Leaderboard" back />
      <PageWrapper>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}>
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Loading…</p>
          </div>
        ) : loadError ? (
          <ErrorState
            icon={<TrophyIcon size={48} color="var(--text-muted)" />}
            title="Could not load leaderboard"
            sub="Check your connection and try again."
            onRetry={load}
          />
        ) : unavailable ? (
          <Card className="text-center" style={{ padding: 32 }}>
            <TrophyIcon size={48} color="var(--text-muted)" />
            <p className="font-bold mt-3" style={{ color: 'var(--text-primary)', fontSize: 16 }}>Leaderboard Coming Soon</p>
            <p className="mt-1" style={{ color: 'var(--text-muted)', fontSize: 13 }}>
              The leaderboard requires a database migration. Ask the admin to run the SQL setup.
            </p>
          </Card>
        ) : (
          <>
            {/* Your profile card */}
            <Card className="mb-4">
              <div className="flex items-center gap-2 mb-3">
                <PersonIcon size={16} color="var(--accent)" />
                <p className="font-bold" style={{ fontSize: 15, color: 'var(--text-primary)' }}>Your Profile</p>
                {ownRank && (
                  <span
                    className="ml-auto text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{ background: 'var(--accent)', color: 'var(--base-bg)' }}
                  >
                    Rank #{ownRank}
                  </span>
                )}
              </div>

              {/* Display name input */}
              <div className="mb-3">
                <label className="section-label mb-1 block">Display name</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={editName}
                    onChange={e => { setEditName(e.target.value); setNameError(null) }}
                    placeholder={userName || 'Your name'}
                    maxLength={32}
                    className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
                    style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                  />
                  {ownProfile && editName !== ownProfile.display_name && (
                    <button
                      onClick={() => {
                        const err = validateDisplayName(editName)
                        if (err) { setNameError(err); return }
                        setNameError(null)
                        saveProfile({ display_name: editName.trim() || userName || 'Anonymous' })
                      }}
                      disabled={saving}
                      style={{ padding: '8px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700, background: 'var(--accent)', color: 'var(--base-bg)', border: 'none', cursor: 'pointer' }}
                    >
                      Save
                    </button>
                  )}
                </div>
                {nameError && <p style={{ color: 'var(--red)', fontSize: 11, marginTop: 4 }}>{nameError}</p>}
              </div>

              {/* XP row */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="section-label">Your XP</p>
                  <p className="font-bold text-lg" style={{ color: 'var(--accent)' }}>
                    <ZapIcon size={14} color="var(--accent)" /> {totalXP.toLocaleString()}
                  </p>
                </div>
                {ownProfile && (
                  <div style={{ textAlign: 'right' }}>
                    <p className="section-label">On board</p>
                    <p className="font-bold text-sm" style={{ color: ownProfile.total_xp === totalXP ? 'var(--text-muted)' : 'var(--warning)' }}>
                      {ownProfile.total_xp.toLocaleString()}
                      {ownProfile.total_xp !== totalXP && ' (stale)'}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                {/* Public toggle */}
                <button
                  onClick={togglePublic}
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl font-bold text-sm transition-all"
                  style={{
                    background: ownProfile?.is_public ? 'var(--accent)' : 'var(--input-bg)',
                    color: ownProfile?.is_public ? 'var(--base-bg)' : 'var(--text-muted)',
                    border: `1px solid ${ownProfile?.is_public ? 'var(--accent)' : 'var(--border)'}`,
                    cursor: 'pointer',
                  }}
                >
                  {ownProfile?.is_public ? 'Listed — tap to hide' : 'Join leaderboard'}
                </button>

                {/* Sync XP */}
                {ownProfile && ownProfile.total_xp !== totalXP && (
                  <button
                    onClick={syncXP}
                    disabled={syncing}
                    style={{ padding: '10px 16px', borderRadius: 10, fontSize: 12, fontWeight: 700, background: 'color-mix(in srgb, var(--warning) 15%, transparent)', color: 'var(--warning)', border: '1px solid color-mix(in srgb, var(--warning) 30%, transparent)', cursor: 'pointer' }}
                  >
                    {syncing ? '…' : 'Sync XP'}
                  </button>
                )}
              </div>
            </Card>

            {/* Global / Following tabs */}
            {followsAvailable && (
              <div
                className="flex gap-1 mb-4"
                role="tablist"
                style={{ background: 'var(--surface-1)', borderRadius: 12, padding: 4 }}
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={tab === 'global'}
                  aria-label="Show global leaderboard"
                  onClick={() => setTab('global')}
                  className="flex-1 py-2 rounded-lg font-bold text-sm transition-all"
                  style={{
                    background: tab === 'global' ? 'var(--accent)' : 'transparent',
                    color: tab === 'global' ? 'var(--base-bg)' : 'var(--text-muted)',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  Global
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={tab === 'following'}
                  aria-label="Show leaderboard for people you follow"
                  onClick={() => setTab('following')}
                  className="flex-1 py-2 rounded-lg font-bold text-sm transition-all"
                  style={{
                    background: tab === 'following' ? 'var(--accent)' : 'transparent',
                    color: tab === 'following' ? 'var(--base-bg)' : 'var(--text-muted)',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  Following
                </button>
              </div>
            )}

            {/* Leaderboard list */}
            {tab === 'following' && visibleBoard.length === 0 ? (
              <EmptyState
                icon={<PersonIcon size={40} color="var(--text-muted)" />}
                title="No one to show"
                sub="Follow people from their profile to see them here."
              />
            ) : visibleBoard.length === 0 ? (
              <Card className="text-center" style={{ padding: 32 }}>
                <TrophyIcon size={40} color="var(--text-muted)" />
                <p className="font-bold mt-3" style={{ color: 'var(--text-primary)', fontSize: 15 }}>No one here yet</p>
                <p className="mt-1" style={{ color: 'var(--text-muted)', fontSize: 13 }}>Be the first to join!</p>
              </Card>
            ) : (
              <>
                <p className="section-label mb-3">{visibleBoard.length} players ranked</p>
                {visibleBoard.map((p, i) => {
                  const rank    = i + 1
                  const isMe    = p.user_id === ownProfile?.user_id
                  const isTop3  = rank <= 3
                  return (
                    <Card
                      key={p.id}
                      className="flex items-center gap-3 mb-2"
                      style={{
                        padding: '12px 16px',
                        background: isMe ? 'var(--surface-2)' : undefined,
                        border: isMe ? '1px solid var(--accent)' : isTop3 ? `1px solid color-mix(in srgb, ${MEDAL_COLORS[rank - 1]} 40%, transparent)` : undefined,
                        backgroundColor: isTop3 && !isMe ? RANK_BG[rank - 1] : undefined,
                      }}
                    >
                      <div style={{ width: 28, flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
                        <RankBadge rank={rank} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate" style={{ color: isMe ? 'var(--accent)' : 'var(--text-primary)' }}>
                          {p.display_name}
                          {isMe && <span style={{ marginLeft: 6, fontSize: 10, background: 'var(--accent)', color: 'var(--base-bg)', padding: '1px 5px', borderRadius: 4 }}>YOU</span>}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                          Lv.{p.level} · {getLevelTitle(p.level)}
                        </p>
                      </div>
                      <p className="font-bold text-sm shrink-0" style={{ color: isTop3 ? MEDAL_COLORS[rank - 1] : 'var(--accent)' }}>
                        {p.total_xp.toLocaleString()} XP
                      </p>
                    </Card>
                  )
                })}
              </>
            )}
          </>
        )}

      </PageWrapper>
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </>
  )
}
