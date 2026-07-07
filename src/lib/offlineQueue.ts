import { supabase } from './supabase'
import { useStore } from '../store/useStore'

const QUEUE_KEY = 'youxp-offline-queue'

interface QueuedInsert {
  id: string
  table: string
  payload: Record<string, unknown>
  timestamp: number
}

function readQueue(): QueuedInsert[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function writeQueue(q: QueuedInsert[]) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(q))
}

export function enqueueWrite(table: string, payload: Record<string, unknown>): void {
  const q = readQueue()
  q.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, table, payload, timestamp: Date.now() })
  writeQueue(q)
}

// Postgres error codes that mean "this row will never succeed" — drop rather
// than retry forever and jam the queue behind it. Network/timeout failures
// (no `code`, or connection-level) are left in the queue for the next flush.
function isPermanentError(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code
  if (!code) return false
  return code.startsWith('22') || code.startsWith('23') || code === 'PGRST301' || code === '42501'
}

export async function flushQueue(): Promise<void> {
  const q = readQueue()
  if (!q.length) return
  // Oldest first, sequential — avoids hammering the connection right as it
  // comes back online and keeps ordering sane for same-table rows.
  const remaining: QueuedInsert[] = []
  let succeeded = 0
  for (const item of q) {
    try {
      const { error } = await supabase.from(item.table).insert(item.payload)
      if (error) {
        if (isPermanentError(error)) continue // drop poison row
        remaining.push(item)
      } else {
        succeeded++
      }
    } catch {
      remaining.push(item) // network error — keep for next attempt
    }
  }
  writeQueue(remaining)
  if (succeeded > 0) {
    const { refreshXP, refreshActivity } = useStore.getState()
    await refreshXP()
    refreshActivity()
  }
}

let _setupDone = false
export function setupOfflineQueue() {
  if (_setupDone) return
  _setupDone = true
  window.addEventListener('online', () => {
    flushQueue().catch(console.error)
  })
  // Flush anything queued from a previous offline session — the 'online'
  // event never fires if the app starts already online
  if (navigator.onLine) flushQueue().catch(console.error)
}
