export function formatDate(iso: string): string {
  const [year, month, day] = iso.split('-')
  return `${month}/${day}/${year}`
}

export function formatNumber(n: number, decimals = 1): string {
  return n.toFixed(decimals)
}

export function today(): string {
  return new Date().toISOString().split('T')[0]
}
