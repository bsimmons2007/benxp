import { supabase } from './supabase'
import { getPref, setPref } from './prefs'

// ── Web Push subscription plumbing ────────────────────────────
//
// Feature-detects support + VAPID key. If VITE_VAPID_PUBLIC_KEY is unset the
// whole feature is treated as unavailable (Settings hides it). All DB writes
// degrade gracefully when the push_subscriptions table is missing.

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined

export interface NotificationSettings {
  evening: boolean       // evening reminder if nothing logged
  streak: boolean        // streak-at-risk
  quest: boolean         // quest expiring soon
  weekly: boolean        // Monday weekly recap
  quietStart: string     // "HH:MM"
  quietEnd: string       // "HH:MM"
  timezone: string       // IANA tz
}

const DEFAULT_SETTINGS: NotificationSettings = {
  evening: true, streak: true, quest: true, weekly: true,
  quietStart: '22:00', quietEnd: '08:00',
  timezone: (typeof Intl !== 'undefined' && Intl.DateTimeFormat().resolvedOptions().timeZone) || 'America/Chicago',
}

export function pushConfigured(): boolean {
  return !!VAPID_PUBLIC_KEY
}

export function pushSupported(): boolean {
  return typeof window !== 'undefined'
    && 'serviceWorker' in navigator
    && 'PushManager' in window
    && 'Notification' in window
}

export function getNotificationSettings(): NotificationSettings {
  const saved = getPref<Partial<NotificationSettings> | null>('notificationSettings', null)
  return { ...DEFAULT_SETTINGS, ...(saved ?? {}) }
}

export function saveNotificationSettings(patch: Partial<NotificationSettings>): NotificationSettings {
  const next = { ...getNotificationSettings(), ...patch }
  setPref('notificationSettings', next)
  return next
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

async function getRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null
  return (await navigator.serviceWorker.getRegistration()) ?? (await navigator.serviceWorker.ready)
}

/** Request permission + subscribe + upsert to Supabase. Returns true on success. */
export async function subscribeToPush(): Promise<{ ok: boolean; reason?: string }> {
  if (!pushSupported())  return { ok: false, reason: 'unsupported' }
  if (!pushConfigured()) return { ok: false, reason: 'not-configured' }

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return { ok: false, reason: 'denied' }

  const reg = await getRegistration()
  if (!reg) return { ok: false, reason: 'no-sw' }

  let sub = await reg.pushManager.getSubscription()
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY as string),
    })
  }

  const json = sub.toJSON()
  const keys = json.keys ?? {}
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { ok: false, reason: 'signed-out' }
    const { error } = await supabase.from('push_subscriptions').upsert({
      user_id:  user.id,
      endpoint: sub.endpoint,
      p256dh:   keys.p256dh ?? '',
      auth:     keys.auth ?? '',
      timezone: getNotificationSettings().timezone,
    }, { onConflict: 'endpoint' })
    if (error) return { ok: false, reason: 'db' }
  } catch {
    return { ok: false, reason: 'db' }
  }
  return { ok: true }
}

/**
 * If the browser permission is already granted, (re)subscribe silently — no
 * prompt is shown. Safe to call on every app load; it's idempotent (reuses an
 * existing subscription and upserts on endpoint conflict). Does nothing until
 * the user has granted permission once via the Settings toggle.
 */
export async function autoSubscribeIfGranted(): Promise<void> {
  if (!pushSupported() || !pushConfigured()) return
  if (Notification.permission !== 'granted') return
  await subscribeToPush().catch(() => {})
}

/** Unsubscribe from push + remove the row from Supabase. */
export async function unsubscribeFromPush(): Promise<void> {
  try {
    const reg = await getRegistration()
    const sub = reg ? await reg.pushManager.getSubscription() : null
    if (sub) {
      const endpoint = sub.endpoint
      await sub.unsubscribe().catch(() => {})
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint)
      } catch { /* ignore */ }
    }
  } catch { /* ignore */ }
}

export async function isPushSubscribed(): Promise<boolean> {
  if (!pushSupported()) return false
  const reg = await getRegistration()
  if (!reg) return false
  const sub = await reg.pushManager.getSubscription()
  return !!sub
}
