import { supabase } from './supabase'

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

export async function flushQueue(): Promise<void> {
  const q = readQueue()
  if (!q.length) return
  const results = await Promise.allSettled(
    q.map(item => supabase.from(item.table).insert(item.payload))
  )
  const failed = q.filter((_, i) => {
    const r = results[i]
    return r.status === 'rejected' || (r.status === 'fulfilled' && r.value.error)
  })
  writeQueue(failed)
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
