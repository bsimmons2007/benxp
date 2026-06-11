/** Shared Recharts Tooltip contentStyle — theme-aware surface with flat shadow */
export const CHART_TOOLTIP_STYLE = {
  background:   'var(--surface-1)',
  border:       '1px solid var(--border-subtle)',
  borderRadius: 8,
  color:        'var(--text-primary)',
  fontSize:     12,
  boxShadow:    'var(--shadow-lg)',
} as const

export function toRoman(n: number): string {
  if (n <= 0) return String(n)
  const vals = [1000,900,500,400,100,90,50,40,10,9,5,4,1]
  const syms = ['M','CM','D','CD','C','XC','L','XL','X','IX','V','IV','I']
  let result = ''
  for (let i = 0; i < vals.length; i++) {
    while (n >= vals[i]) { result += syms[i]; n -= vals[i] }
  }
  return result
}

export function formatDate(iso: string): string {
  const [year, month, day] = iso.split('-')
  return `${month}/${day}/${year}`
}

/** "Mon May 12" — for chart tooltips */
export function formatDateTooltip(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

/** Formats a Date as YYYY-MM-DD using the browser's local timezone. */
export function localDateStr(d: Date): string {
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-')
}

/**
 * Returns today's date as YYYY-MM-DD in local timezone.
 * Days start at 1AM — anything between midnight and 1AM still counts as "yesterday".
 */
export function today(): string {
  const now = new Date()
  if (now.getHours() < 1) {
    const prev = new Date(now)
    prev.setDate(prev.getDate() - 1)
    return localDateStr(prev)
  }
  return localDateStr(now)
}
