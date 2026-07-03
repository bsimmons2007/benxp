import { useMemo } from 'react'
import { useStore } from '../store/useStore'
import { CalendarIcon, TrophyIcon, BookIcon, GamepadIcon, type IconComponent } from './ui/Icon'

interface Hit {
  yearsAgo: number
  text: string
  Icon: IconComponent
}

/** Anniversary card: surfaces notable events (PRs, books, wins) from exactly
 *  1/2/3 years ago today. Renders nothing if there are no hits. */
export function OnThisDayCard() {
  const rawRows = useStore(s => s.rawRows)

  const hits = useMemo<Hit[]>(() => {
    if (!rawRows) return []
    const now = new Date()
    const mmdd = `${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    const found: Hit[] = []

    for (const yearsAgo of [1, 2, 3]) {
      const targetDate = `${now.getFullYear() - yearsAgo}-${mmdd}`

      const pr = rawRows.prRows.find(p => p.date === targetDate)
      if (pr) { found.push({ yearsAgo, text: `${pr.lift} PR: ${Math.round(pr.est_1rm)} lbs`, Icon: TrophyIcon }); continue }

      const book = rawRows.bookRows.find(b => b.date_finished === targetDate)
      if (book) { found.push({ yearsAgo, text: `Finished "${book.title}"`, Icon: BookIcon }); continue }

      const win = rawRows.gameRows.find(g => g.date === targetDate && g.win)
      if (win) { found.push({ yearsAgo, text: `Fortnite Victory Royale`, Icon: GamepadIcon }); continue }
    }
    return found
  }, [rawRows])

  if (hits.length === 0) return null

  return (
    <div className="mb-5 rounded-2xl" style={{ background: 'var(--surface-1)', border: '1px solid var(--border-subtle)', padding: '12px 16px' }}>
      <div className="flex items-center gap-2 mb-2">
        <CalendarIcon size={14} color="var(--accent)" />
        <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.04em', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
          On this day
        </p>
      </div>
      <div className="flex flex-col gap-2">
        {hits.map((h, i) => (
          <div key={i} className="flex items-center gap-2">
            <h.Icon size={14} color="var(--text-muted)" />
            <p style={{ fontSize: 13, color: 'var(--text-primary)' }}>
              <span className="font-mono" style={{ color: 'var(--accent)', fontWeight: 700 }}>{h.yearsAgo} year{h.yearsAgo > 1 ? 's' : ''} ago</span>
              {' — '}{h.text}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
