import { useEffect, useState } from 'react'
import { TopBar } from '../components/layout/TopBar'
import { PageWrapper } from '../components/layout/PageWrapper'
import { Card } from '../components/ui/Card'
import { BodyweightChart } from '../components/charts/BodyweightChart'
import { supabase } from '../lib/supabase'
import { formatDate } from '../lib/utils'
import type { LiftType, LiftingLog, PrHistory } from '../types'

const LIFTS: LiftType[] = ['Bench', 'Squat', 'Deadlift', 'PullUps', 'PushUps']

export function Records() {
  const [prs, setPrs] = useState<Record<string, PrHistory>>({})
  const [history, setHistory] = useState<LiftingLog[]>([])

  useEffect(() => {
    async function load() {
      const [prData, historyData] = await Promise.all([
        supabase.from('pr_history').select('*').order('est_1rm', { ascending: false }),
        supabase.from('lifting_log').select('*').order('date', { ascending: false }).limit(50),
      ])

      const prMap: Record<string, PrHistory> = {}
      prData.data?.forEach((r: PrHistory) => {
        if (!prMap[r.lift]) prMap[r.lift] = r
      })
      setPrs(prMap)
      setHistory(historyData.data ?? [])
    }
    load()
  }, [])

  return (
    <>
      <TopBar title="Records" />
      <PageWrapper>
        {/* Personal Records */}
        <Card className="mb-4">
          <h2 className="font-semibold text-white mb-3">Personal Records</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ color: '#888' }}>
                  <th className="text-left pb-2">Lift</th>
                  <th className="text-right pb-2">Est 1RM</th>
                  <th className="text-right pb-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {LIFTS.map((lift) => (
                  <tr key={lift} style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <td className="py-2 font-medium text-white">{lift}</td>
                    <td className="py-2 text-right font-bold" style={{ color: '#F5A623' }}>
                      {prs[lift] ? `${prs[lift].est_1rm.toFixed(1)} lbs` : '—'}
                    </td>
                    <td className="py-2 text-right" style={{ color: '#888' }}>
                      {prs[lift] ? formatDate(prs[lift].date) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Bodyweight trend */}
        <Card className="mb-4">
          <h2 className="font-semibold text-white mb-3">Bodyweight Trend</h2>
          <BodyweightChart />
        </Card>

        {/* Lifting history */}
        <Card>
          <h2 className="font-semibold text-white mb-3">Lifting History</h2>
          <div className="flex flex-col gap-2">
            {history.map((row) => (
              <div
                key={row.id}
                className="py-2 pl-3 rounded"
                style={{
                  borderLeft: row.is_pr ? '3px solid #F5A623' : '3px solid transparent',
                  background: 'rgba(255,255,255,0.02)',
                }}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-semibold text-white text-sm">{row.lift}</span>
                    {row.weight && (
                      <span className="text-sm ml-2" style={{ color: '#CCCCCC' }}>
                        {row.weight} lbs
                      </span>
                    )}
                    {row.sets && row.reps && (
                      <span className="text-sm ml-1" style={{ color: '#888' }}>
                        {row.sets}×{row.reps}
                      </span>
                    )}
                    {row.is_pr && (
                      <span className="ml-2 text-xs font-bold px-1.5 py-0.5 rounded" style={{ background: '#F5A623', color: '#1A1A2E' }}>
                        PR
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-xs" style={{ color: '#888' }}>{formatDate(row.date)}</p>
                    {row.est_1rm && (
                      <p className="text-xs font-semibold" style={{ color: '#F5A623' }}>
                        {row.est_1rm.toFixed(1)} 1RM
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </PageWrapper>
    </>
  )
}
