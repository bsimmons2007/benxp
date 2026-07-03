import { useMemo, useState } from 'react'
import { SearchIcon } from './Icon'

export const HISTORY_RANGES = [
  { key: '30d',  label: '30d',  days: 30 },
  { key: '90d',  label: '90d',  days: 90 },
  { key: 'year', label: 'Year', days: 365 },
  { key: 'all',  label: 'All',  days: 0 },
] as const
export type HistoryRangeKey = typeof HISTORY_RANGES[number]['key']

/** Client-side search + date-range filter shared by history lists.
 *  `fields` are the row keys searched (opponent/notes/title/etc.). */
export function useHistoryFilter<T extends { date: string }>(rows: T[], fields: (keyof T)[]) {
  const [search, setSearch] = useState('')
  const [range,  setRange]  = useState<HistoryRangeKey>('all')

  const cutoff = useMemo(() => {
    const days = HISTORY_RANGES.find(r => r.key === range)?.days ?? 0
    if (!days) return ''
    const d = new Date(); d.setDate(d.getDate() - days)
    return d.toISOString().slice(0, 10)
  }, [range])

  const filtered = useMemo(() => {
    let out = rows
    if (cutoff) out = out.filter(r => r.date >= cutoff)
    const q = search.trim().toLowerCase()
    if (q) out = out.filter(r => fields.some(f => String(r[f] ?? '').toLowerCase().includes(q)))
    return out
  }, [rows, cutoff, search, fields])

  return { search, setSearch, range, setRange, filtered }
}

export function HistoryControls({
  search, onSearch, range, onRange, placeholder = 'Search...',
}: {
  search: string
  onSearch: (v: string) => void
  range: HistoryRangeKey
  onRange: (r: HistoryRangeKey) => void
  placeholder?: string
}) {
  return (
    <div className="mb-3">
      <div style={{ position: 'relative', marginBottom: 8 }}>
        <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
          <SearchIcon size={14} color="var(--text-muted)" />
        </span>
        <input
          type="search"
          value={search}
          onChange={e => onSearch(e.target.value)}
          placeholder={placeholder}
          aria-label="Search history"
          style={{ width: '100%', padding: '9px 12px 9px 34px', borderRadius: 10, fontSize: 13, background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)', outline: 'none' }}
        />
      </div>
      <div className="flex gap-2">
        {HISTORY_RANGES.map(r => (
          <button
            key={r.key}
            type="button"
            onClick={() => onRange(r.key)}
            className="px-3 py-1.5 rounded-full text-xs font-semibold"
            style={{
              background: range === r.key ? 'var(--accent)' : 'var(--input-bg)',
              color: range === r.key ? 'var(--base-bg)' : 'var(--text-muted)',
              border: `1px solid ${range === r.key ? 'var(--accent)' : 'var(--border)'}`,
              cursor: 'pointer',
            }}
          >
            {r.label}
          </button>
        ))}
      </div>
    </div>
  )
}
