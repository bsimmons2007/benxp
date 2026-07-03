// Remembers the last value a user picked for a given form field (game type,
// cardio activity, golf course, chess opponent type, etc.) so the next log
// defaults to it. Keys are namespaced under youxp-lastused- per convention.

const PREFIX = 'youxp-lastused-'

export function getLastUsed(key: string, fallback: string): string {
  try {
    return localStorage.getItem(PREFIX + key) ?? fallback
  } catch {
    return fallback
  }
}

export function setLastUsed(key: string, value: string): void {
  if (!value) return
  try {
    localStorage.setItem(PREFIX + key, value)
  } catch { /* ignore */ }
}
