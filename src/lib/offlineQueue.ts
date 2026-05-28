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
  const failed: QueuedInsert[] = []
  for (const item of q) {
    const { error } = await supabase.from(item.table).insert(item.payload)
    if (error) failed.push(item)
  }
  writeQueue(failed)
}

let _setupDone = false
export function setupOfflineQueue() {
  if (_setupDone) return
  _setupDone = true
  window.addEventListener('online', () => {
    flushQueue().catch(console.error)
  })
}
