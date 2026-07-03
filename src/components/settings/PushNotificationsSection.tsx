import { useEffect, useState } from 'react'
import { Card } from '../ui/Card'
import { BellIcon, ChevronIcon, CloseIcon } from '../ui/Icon'
import {
  pushSupported, pushConfigured, subscribeToPush, unsubscribeFromPush,
  isPushSubscribed, getNotificationSettings, saveNotificationSettings,
  type NotificationSettings,
} from '../../lib/push'

function Pill({ value, onToggle }: { value: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="relative rounded-full shrink-0"
      style={{ width: 44, height: 26, background: value ? 'var(--accent)' : 'var(--border)', transition: 'background 0.2s ease' }}
    >
      <div style={{
        position: 'absolute', top: 3, left: value ? 21 : 3, width: 20, height: 20,
        borderRadius: '50%', background: 'var(--surface-1)',
        transition: 'left 0.2s cubic-bezier(0.34,1.56,0.64,1)', boxShadow: 'var(--shadow-sm)',
      }} />
    </button>
  )
}

const TYPES: { key: keyof NotificationSettings; label: string; desc: string }[] = [
  { key: 'evening', label: 'Evening reminder',  desc: 'If you haven\'t logged anything by ~8pm' },
  { key: 'streak',  label: 'Streak at risk',    desc: 'When a 3+ day streak could break' },
  { key: 'quest',   label: 'Quest expiring',    desc: 'A quest close to done is about to expire' },
  { key: 'weekly',  label: 'Weekly recap',      desc: 'Monday morning: last week\'s XP + level' },
]

/** Self-contained push-notifications settings section. Additive: render once in
 *  Settings. Honest states for unsupported / not-configured / denied. */
export function PushNotificationsSection() {
  const [open, setOpen] = useState(false)
  const [subscribed, setSubscribed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [settings, setSettings] = useState<NotificationSettings>(() => getNotificationSettings())

  useEffect(() => { isPushSubscribed().then(setSubscribed) }, [])

  // Hidden entirely when the browser can't do push or no VAPID key is set.
  if (!pushSupported() || !pushConfigured()) return null

  async function toggleMaster() {
    setBusy(true); setError(null)
    if (subscribed) {
      await unsubscribeFromPush()
      setSubscribed(false)
    } else {
      const res = await subscribeToPush()
      if (res.ok) setSubscribed(true)
      else setError(
        res.reason === 'denied' ? 'Notification permission denied. Enable it in your browser settings, then try again.'
        : res.reason === 'signed-out' ? 'Sign in to enable notifications.'
        : 'Could not enable notifications. Please try again.'
      )
    }
    setBusy(false)
  }

  function toggleType(key: keyof NotificationSettings) {
    const next = saveNotificationSettings({ [key]: !settings[key] } as Partial<NotificationSettings>)
    setSettings(next)
  }

  function setQuiet(which: 'quietStart' | 'quietEnd', val: string) {
    const next = saveNotificationSettings({ [which]: val } as Partial<NotificationSettings>)
    setSettings(next)
  }

  return (
    <Card className="mb-2">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between py-2">
        <div className="flex items-center gap-3">
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28 }}><BellIcon size={18} color="var(--text-secondary)" /></span>
          <div className="text-left">
            <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Push Notifications</p>
            <p style={{ color: 'var(--text-muted)', fontSize: 11 }}>{subscribed ? 'On for this device' : 'Off'}</p>
          </div>
        </div>
        <ChevronIcon size={16} color="var(--text-muted)" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </button>

      {open && (
        <div className="pb-1 pop-in">
          {/* Master enable */}
          <div className="flex items-center justify-between py-2.5" style={{ borderTop: '1px solid var(--border-faint)' }}>
            <div className="flex items-center gap-3">
              <span style={{ width: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><BellIcon size={16} color="var(--accent)" /></span>
              <div>
                <p style={{ color: 'var(--text-primary)', fontSize: '0.875rem', fontWeight: 500 }}>Enable push notifications</p>
                <p style={{ color: 'var(--text-muted)', fontSize: 11 }}>Delivered even when the app is closed</p>
              </div>
            </div>
            <Pill value={subscribed} onToggle={() => { if (!busy) void toggleMaster() }} />
          </div>

          {error && (
            <div className="pop-in" style={{ margin: '0 0 8px', padding: '10px 12px', borderRadius: 10, background: 'var(--accent-subtle)', border: '1px solid var(--accent-dim)', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <CloseIcon size={14} color="var(--accent)" />
              <p style={{ color: 'var(--accent)', fontSize: 12, lineHeight: 1.5 }}>{error}</p>
            </div>
          )}

          {subscribed && (
            <>
              {TYPES.map(t => (
                <div key={t.key} className="flex items-center justify-between py-2.5" style={{ borderTop: '1px solid var(--border-faint)' }}>
                  <div className="flex items-center gap-3" style={{ paddingLeft: 40 }}>
                    <div>
                      <p style={{ color: 'var(--text-primary)', fontSize: '0.875rem', fontWeight: 500 }}>{t.label}</p>
                      <p style={{ color: 'var(--text-muted)', fontSize: 11 }}>{t.desc}</p>
                    </div>
                  </div>
                  <Pill value={settings[t.key] as boolean} onToggle={() => toggleType(t.key)} />
                </div>
              ))}

              {/* Quiet hours */}
              <div className="py-2.5" style={{ borderTop: '1px solid var(--border-faint)', paddingLeft: 40 }}>
                <p style={{ color: 'var(--text-primary)', fontSize: '0.875rem', fontWeight: 500, marginBottom: 8 }}>Quiet hours</p>
                <div className="flex items-center gap-2">
                  <input type="time" value={settings.quietStart} onChange={e => setQuiet('quietStart', e.target.value)}
                    style={{ padding: '6px 10px', borderRadius: 8, fontSize: 13, fontWeight: 600, background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)', outline: 'none' }} />
                  <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>to</span>
                  <input type="time" value={settings.quietEnd} onChange={e => setQuiet('quietEnd', e.target.value)}
                    style={{ padding: '6px 10px', borderRadius: 8, fontSize: 13, fontWeight: 600, background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)', outline: 'none' }} />
                </div>
                <p style={{ color: 'var(--text-dim)', fontSize: 10, marginTop: 6 }}>No notifications sent during this window ({settings.timezone}).</p>
              </div>
            </>
          )}
        </div>
      )}
    </Card>
  )
}
