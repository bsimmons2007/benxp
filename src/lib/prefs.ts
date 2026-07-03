import { supabase } from './supabase'

// ── User preferences: one JSONB doc, localStorage-cached, DB write-through ──
//
// getPref/setPref operate synchronously on a localStorage cache
// (youxp-prefs-cache) so existing call sites that read at init stay synchronous.
// Writes update the cache immediately and debounce a write-through to the
// user_preferences table (last-write-wins on the whole doc).
//
// Graceful degradation: if the table doesn't exist yet (migration not run) or
// the user is signed out, everything stays localStorage-only and no errors
// surface. hydratePrefs() pulls the server doc on boot; seedPrefsFromLegacy()
// migrates existing youxp-* keys once so nothing resets.

const CACHE_KEY = 'youxp-prefs-cache'
const SEED_FLAG = 'youxp-prefs-seeded'

export type PrefsDoc = Record<string, unknown>

let tableAvailable = true          // flipped off on "relation does not exist"
let writeTimer: ReturnType<typeof setTimeout> | null = null

function readCache(): PrefsDoc {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed as PrefsDoc : {}
  } catch { return {} }
}

function writeCache(doc: PrefsDoc): void {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(doc)) } catch { /* quota */ }
}

/** Synchronously read a pref from the local cache, falling back to a default. */
export function getPref<T>(key: string, fallback: T): T {
  const doc = readCache()
  return (key in doc ? doc[key] as T : fallback)
}

/** Set a pref: update cache immediately, debounce a DB write-through. */
export function setPref(key: string, value: unknown): void {
  const doc = readCache()
  doc[key] = value
  writeCache(doc)
  scheduleSync()
}

/** Remove a pref key entirely. */
export function removePref(key: string): void {
  const doc = readCache()
  if (key in doc) { delete doc[key]; writeCache(doc); scheduleSync() }
}

function scheduleSync(): void {
  if (!tableAvailable) return
  if (writeTimer) clearTimeout(writeTimer)
  writeTimer = setTimeout(() => { void flushPrefs() }, 1500)
}

/** Immediately push the local doc to the DB (last-write-wins). */
export async function flushPrefs(): Promise<void> {
  if (!tableAvailable) return
  if (writeTimer) { clearTimeout(writeTimer); writeTimer = null }
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase
      .from('user_preferences')
      .upsert({ user_id: user.id, prefs: readCache(), updated_at: new Date().toISOString() })
    if (error && isMissingTable(error)) tableAvailable = false
  } catch { /* offline — keep local */ }
}

/** Pull the server doc into the local cache on boot (server wins on conflict for
 *  keys present server-side; local-only keys are preserved and pushed back). */
export async function hydratePrefs(): Promise<void> {
  if (!tableAvailable) return
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data, error } = await supabase
      .from('user_preferences')
      .select('prefs')
      .eq('user_id', user.id)
      .maybeSingle()
    if (error) { if (isMissingTable(error)) tableAvailable = false; return }
    const server = (data?.prefs ?? {}) as PrefsDoc
    const local  = readCache()
    // Merge: server values win where present, local-only keys kept.
    const merged = { ...local, ...server }
    writeCache(merged)
    // If local had keys the server didn't, push them back.
    if (Object.keys(local).some(k => !(k in server))) void flushPrefs()
  } catch { /* offline */ }
}

function isMissingTable(err: { message?: string; code?: string }): boolean {
  const m = (err.message ?? '').toLowerCase()
  return err.code === '42P01' || m.includes('does not exist') || m.includes('not found')
}

// ── One-time seed from legacy youxp-* localStorage keys ──────────────────────
// Maps the old flat keys into the prefs doc so migrating consumers find their
// data already present. Idempotent via SEED_FLAG.

const LEGACY_STRING_KEYS: [legacy: string, pref: string][] = [
  ['youxp-theme',        'theme'],
  ['youxp-light-mode',   'lightMode'],
  ['youxp-time-theme',   'timeTheme'],
  ['youxp-home-stat-picks', 'homeStatPicks'],
  ['youxp-level-style',  'levelStyle'],
]

export function seedPrefsFromLegacy(): void {
  try {
    if (localStorage.getItem(SEED_FLAG) === '1') return
    const doc = readCache()
    for (const [legacy, pref] of LEGACY_STRING_KEYS) {
      if (pref in doc) continue
      const raw = localStorage.getItem(legacy)
      if (raw === null) continue
      // homeStatPicks is a JSON array; others are plain strings.
      if (pref === 'homeStatPicks') {
        try { doc[pref] = JSON.parse(raw) } catch { /* skip malformed */ }
      } else {
        doc[pref] = raw
      }
    }
    // Quest reroll + seen-template keys are per-cycle/per-user; copy any present.
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (!k) continue
      if (k.startsWith('youxp-rerolls-') || k.startsWith('youxp-seen-templates-')) {
        if (!(k in doc)) {
          const v = localStorage.getItem(k)
          if (v !== null) doc[k] = v
        }
      }
    }
    writeCache(doc)
    localStorage.setItem(SEED_FLAG, '1')
    scheduleSync()
  } catch { /* ignore */ }
}
