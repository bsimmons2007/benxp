import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { TopBar } from '../components/layout/TopBar'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { Toast } from '../components/ui/Toast'
import { supabase } from '../lib/supabase'
import { today, formatDate } from '../lib/utils'
import { playXPGain } from '../lib/sounds'
import { XP_RATES } from '../lib/xp'
import { useStore } from '../store/useStore'
import type { MoodLog } from '../types'
import { HeartIcon, ZapIcon, ActivityIcon } from '../components/ui/Icon'

interface MoodForm {
  date: string
  mood: string
  energy: string
  stress: string
  activities: string
  notes: string
}


const TT_STYLE = {
  background: 'rgba(10,10,22,0.97)', border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: 8, color: '#fff', fontSize: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
}

function moodEmoji(v: number) {
  if (v >= 9) return '🤩'
  if (v >= 7) return '😊'
  if (v >= 5) return '😐'
  if (v >= 3) return '😔'
  return '😞'
}

export function Mood() {
  const { register, handleSubmit, watch, reset, formState: { isSubmitting } } = useForm<MoodForm>({
    defaultValues: { date: today(), mood: '7', energy: '7', stress: '5', activities: '', notes: '' },
  })
  const [recent, setRecent] = useState<MoodLog[]>([])
  const [toast,  setToast]  = useState<string | null>(null)
  const refreshXP = useStore(s => s.refreshXP)

  const moodVal   = parseInt(watch('mood')   ?? '7')
  const energyVal = parseInt(watch('energy') ?? '7')

  async function loadRecent() {
    const { data } = await supabase.from('mood_log').select('*').order('date', { ascending: false }).limit(30)
    setRecent(data ?? [])
  }

  useEffect(() => { loadRecent() }, [])

  const onSubmit = async (data: MoodForm) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('mood_log').insert({
      user_id: user.id,
      date: data.date,
      mood: parseInt(data.mood),
      energy: parseInt(data.energy),
      stress: parseInt(data.stress),
      activities: data.activities || null,
      notes: data.notes || null,
    })
    playXPGain()
    setToast(`+${XP_RATES.mood_log} XP · Check-in logged ${moodEmoji(parseInt(data.mood))}`)
    refreshXP()
    reset({ date: today(), mood: '7', energy: '7', stress: '5', activities: '', notes: '' })
    loadRecent()
  }

  const avgMood   = recent.length ? recent.reduce((s, r) => s + (r.mood ?? 5), 0) / recent.length : null
  const avgEnergy = recent.length ? recent.reduce((s, r) => s + (r.energy ?? 5), 0) / recent.length : null
  const avgStress = recent.length ? recent.reduce((s, r) => s + (r.stress ?? 5), 0) / recent.length : null

  // Chart data — oldest first
  const chartData = [...recent].reverse().map(r => ({
    date:   r.date,
    mood:   r.mood ?? 5,
    energy: r.energy ?? 5,
    stress: r.stress ?? 5,
  }))

  return (
    <>
      <TopBar title="Mood" />
      <PageWrapper>

        {/* Stat summary */}
        {recent.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mb-5">
            {([
              { label: 'Avg Mood',   value: avgMood?.toFixed(1)   ?? '—', color: 'var(--accent)', icon: <HeartIcon   size={18} color="var(--accent)" /> as ReactNode },
              { label: 'Avg Energy', value: avgEnergy?.toFixed(1) ?? '—', color: '#4ade80',       icon: <ZapIcon     size={18} color="#4ade80"       /> as ReactNode },
              { label: 'Avg Stress', value: avgStress?.toFixed(1) ?? '—', color: '#f87171',       icon: <ActivityIcon size={18} color="#f87171"      /> as ReactNode },
            ] as { label: string; value: string; color: string; icon: ReactNode }[]).map(s => (
              <div
                key={s.label}
                className="card-animate"
                style={{
                  background: 'var(--card-bg)', backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14,
                  padding: '12px 10px', textAlign: 'center',
                  boxShadow: `0 0 16px ${s.color}15`,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 3 }}>{s.icon}</div>
                <p style={{ color: s.color, fontSize: 24, fontWeight: 900, lineHeight: 1, fontFamily: 'Cinzel, serif' }}>
                  {s.value}
                </p>
                <p style={{ color: '#555', fontSize: 10, marginTop: 3, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Trend chart — Recharts area */}
        {chartData.length >= 3 && (
          <Card className="mb-5">
            <p style={{ fontSize: 13, fontWeight: 700, color: '#ccc', fontFamily: 'Cinzel, serif', marginBottom: 12 }}>
              Mood Trends
            </p>
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={chartData} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="mood-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="var(--accent)" stopOpacity={0.30} />
                    <stop offset="100%" stopColor="var(--accent)" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="energy-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#4ade80" stopOpacity={0.22} />
                    <stop offset="100%" stopColor="#4ade80" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 6" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={(d: string) => formatDate(d)}
                  tick={{ fill: '#555', fontSize: 8 }}
                  axisLine={false} tickLine={false}
                />
                <YAxis domain={[1, 10]} tick={{ fill: '#555', fontSize: 9 }} axisLine={false} tickLine={false} width={20} />
                <Tooltip
                  contentStyle={TT_STYLE}
                  labelFormatter={(l: unknown) => typeof l === 'string' ? formatDate(l) : String(l)}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(v: any, name: string) => [v, name.charAt(0).toUpperCase() + name.slice(1)]}
                  cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }}
                />
                <Area type="monotone" dataKey="mood"   stroke="var(--accent)" strokeWidth={2} fill="url(#mood-grad)"   dot={false} />
                <Area type="monotone" dataKey="energy" stroke="#4ade80"        strokeWidth={1.5} fill="url(#energy-grad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 6 }}>
              <span style={{ fontSize: 10, color: 'var(--accent)' }}>── Mood</span>
              <span style={{ fontSize: 10, color: '#4ade80' }}>── Energy</span>
            </div>
          </Card>
        )}

        {/* Log form */}
        <Card className="mb-5">
          <p style={{ fontSize: 14, fontWeight: 700, color: '#ccc', fontFamily: 'Cinzel, serif', marginBottom: 16 }}>
            {moodEmoji(moodVal)} Daily Check-in
          </p>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <Input label="Date" type="date" {...register('date', { required: true })} />

            {/* Slider with live value display */}
            {[
              { label: 'Mood',   name: 'mood'   as const, val: moodVal,   color: 'var(--accent)' },
              { label: 'Energy', name: 'energy' as const, val: energyVal, color: '#4ade80' },
              { label: 'Stress', name: 'stress' as const, val: parseInt(watch('stress') ?? '5'), color: '#f87171' },
            ].map(({ label, name, val, color }) => (
              <div key={name} className="flex flex-col gap-1">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ color: '#AAAAAA', fontFamily: 'Cormorant Garamond, serif', fontSize: 15, fontWeight: 500 }}>
                    {label}
                  </label>
                  <span style={{ color, fontWeight: 700, fontSize: 16, fontFamily: 'Cinzel, serif', minWidth: 20, textAlign: 'right' }}>
                    {val}
                  </span>
                </div>
                <input
                  type="range" min="1" max="10" step="1"
                  {...register(name)}
                  style={{ accentColor: color } as React.CSSProperties}
                  className="w-full"
                />
              </div>
            ))}

            <Input label="Activities" type="text" placeholder="Gym, reading, skating…" {...register('activities')} />
            <div className="flex flex-col gap-1">
              <label style={{ color: '#AAAAAA', fontFamily: 'Cormorant Garamond, serif', fontSize: 15, fontWeight: 500 }}>
                Notes
              </label>
              <textarea
                {...register('notes')}
                rows={3}
                className="px-3 py-2 rounded-lg text-white outline-none resize-none"
                style={{ background: '#0D1B2A', border: '1px solid rgba(255,255,255,0.1)', fontSize: 14 }}
                placeholder="How was today?"
              />
            </div>
            <Button type="submit" fullWidth disabled={isSubmitting}>
              {isSubmitting ? 'Logging…' : 'Log Check-in'}
            </Button>
          </form>
        </Card>

        {/* Recent entries */}
        {recent.length > 0 && (
          <Card>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#ccc', fontFamily: 'Cinzel, serif', marginBottom: 12 }}>
              Recent Entries
            </p>
            <div className="flex flex-col gap-1">
              {recent.slice(0, 14).map(r => (
                <div
                  key={r.id}
                  style={{
                    padding: '9px 10px', borderRadius: 8, marginBottom: 2,
                    background: 'rgba(255,255,255,0.025)',
                    border: '1px solid rgba(255,255,255,0.04)',
                  }}
                >
                  <div className="flex justify-between items-center">
                    <p style={{ fontSize: 12, color: '#666' }}>{formatDate(r.date)}</p>
                    <div style={{ display: 'flex', gap: 10 }}>
                      <span style={{ color: 'var(--accent)', fontSize: 12, fontWeight: 700 }}>{moodEmoji(r.mood ?? 5)} {r.mood}</span>
                      <span style={{ color: '#4ade80',       fontSize: 12 }}>E:{r.energy}</span>
                      <span style={{ color: '#f87171',       fontSize: 12 }}>S:{r.stress}</span>
                    </div>
                  </div>
                  {r.notes && (
                    <p style={{ fontSize: 11, color: '#555', marginTop: 4, fontStyle: 'italic' }}>"{r.notes}"</p>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}

        {toast && <Toast message={toast} onDone={() => setToast(null)} />}
      </PageWrapper>
    </>
  )
}
