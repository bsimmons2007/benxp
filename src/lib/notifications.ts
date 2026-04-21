// ── Notification preferences ──────────────────────────────────────────────────

const PREF_KEY       = 'benxp-notif-prefs'
const LAST_SHOWN_KEY = 'benxp-notif-last-shown'

export interface NotifPrefs {
  enabled: boolean
  time:    string   // "HH:MM" 24-hour
}

const DEFAULTS: NotifPrefs = { enabled: false, time: '21:00' }

export function getNotifPrefs(): NotifPrefs {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(PREF_KEY) ?? '{}') }
  } catch {
    return DEFAULTS
  }
}

export function saveNotifPrefs(prefs: NotifPrefs): void {
  localStorage.setItem(PREF_KEY, JSON.stringify(prefs))
}

// ── Permission ────────────────────────────────────────────────────────────────

export function notificationsSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window
}

export async function requestPermission(): Promise<NotificationPermission> {
  if (!notificationsSupported()) return 'denied'
  if (Notification.permission !== 'default') return Notification.permission
  return Notification.requestPermission()
}

export function permissionGranted(): boolean {
  return notificationsSupported() && Notification.permission === 'granted'
}

// ── Daily reminder check ──────────────────────────────────────────────────────
// Call this on app load. Shows a notification if it's within 5 min of the
// user's chosen reminder time AND they haven't been notified today yet.

export function checkDailyReminder(): void {
  if (!permissionGranted()) return
  const prefs = getNotifPrefs()
  if (!prefs.enabled) return

  const now   = new Date()
  const today = now.toLocaleDateString('en-CA')
  if (localStorage.getItem(LAST_SHOWN_KEY) === today) return

  const [h, m] = prefs.time.split(':').map(Number)
  const target = new Date()
  target.setHours(h, m, 0, 0)

  const diffMs = Math.abs(now.getTime() - target.getTime())
  if (diffMs > 5 * 60 * 1000) return   // outside 5-minute window

  localStorage.setItem(LAST_SHOWN_KEY, today)
  try {
    new Notification('YouXP', {
      body: "Have you logged today? Keep your streak alive! 🔥",
      icon: '/favicon.svg',
      badge: '/favicon.svg',
    })
  } catch {
    // Notification API unavailable (e.g. in iframe) — silently ignore
  }
}
