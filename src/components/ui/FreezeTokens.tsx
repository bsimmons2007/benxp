import { SnowflakeIcon } from './Icon'

/** Compact freeze-token indicator: snowflake + available count. Shown next to
 *  the streak on Home. A token auto-spends to cover a single-day streak gap. */
export function FreezeTokens({ count, saving = false }: { count: number; saving?: boolean }) {
  if (count <= 0 && !saving) return null
  return (
    <div
      title={saving ? 'A freeze token is protecting your streak' : `${count} streak freeze token${count === 1 ? '' : 's'}`}
      style={{ display: 'flex', alignItems: 'center', gap: 2, marginTop: 3, justifyContent: 'flex-end' }}
    >
      <SnowflakeIcon size={11} color={saving ? 'var(--accent)' : 'var(--text-muted)'} />
      <span
        className="font-mono"
        style={{ fontSize: 10, fontWeight: 600, color: saving ? 'var(--accent)' : 'var(--text-muted)' }}
      >
        {count}
      </span>
    </div>
  )
}
