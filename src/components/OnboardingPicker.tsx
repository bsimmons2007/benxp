import { useState } from 'react'
import { Wordmark } from './brand/Wordmark'
import { SectionIcon, CheckIcon } from './ui/Icon'
import { DEFAULT_ORDER, saveSectionOrder, saveHiddenSections } from '../lib/sections'
import type { SectionKey } from '../lib/sections'
import { setPref } from '../lib/prefs'

// First-run interest picker: seeds section order (tap order = nav order),
// hides unpicked sections, and seeds the Home stat widgets. Quests stay
// visible regardless — they adapt to whatever the user logs.

const INTERESTS: { key: SectionKey; label: string; sub: string; stats: string[] }[] = [
  { key: 'lifting',   label: 'Lifting',        sub: 'Sets, PRs & strength',      stats: ['bench', 'squat', 'deadlift'] },
  { key: 'cardio',    label: 'Cardio',         sub: 'Runs, rides & miles',       stats: ['cardio_miles', 'run_miles'] },
  { key: 'sleep',     label: 'Sleep',          sub: 'Hours, quality & debt',     stats: ['sleep_avg'] },
  { key: 'nutrition', label: 'Nutrition',      sub: 'Meals & calories',          stats: [] },
  { key: 'water',     label: 'Water',          sub: 'Daily hydration',           stats: ['water_today'] },
  { key: 'mood',      label: 'Mood',           sub: 'Daily check-ins',           stats: ['mood_avg'] },
  { key: 'books',     label: 'Reading',        sub: 'Books finished',            stats: ['books'] },
  { key: 'hobbies',   label: 'Sports & Games', sub: 'Pickleball, golf, chess…',  stats: [] },
]

export function OnboardingPicker({ onDone, preview = false }: { onDone: () => void; preview?: boolean }) {
  const [picked, setPicked] = useState<SectionKey[]>([])

  function toggle(key: SectionKey) {
    setPicked(p => p.includes(key) ? p.filter(k => k !== key) : [...p, key])
  }

  function finish(selection: SectionKey[]) {
    // preview (from /dev): render-only — never touch prefs or section config
    if (preview) { onDone(); return }
    if (selection.length > 0) {
      const rest = DEFAULT_ORDER.filter(k => !selection.includes(k))
      saveSectionOrder([...selection, ...rest])
      const hideable = DEFAULT_ORDER.filter(k => k !== 'challenges')
      saveHiddenSections(hideable.filter(k => !selection.includes(k)))
      const stats = selection.flatMap(k => INTERESTS.find(i => i.key === k)?.stats ?? []).slice(0, 6)
      if (stats.length) setPref('homeStatPicks', stats)
    }
    setPref('onboardingDone', true)
    onDone()
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 'var(--z-modal)',
      background: 'var(--base-bg)', overflowY: 'auto',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '48px 24px calc(32px + env(safe-area-inset-bottom))',
    }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: 28 }}>
          <Wordmark size={30} showPulse={false} />
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)', marginTop: 20, letterSpacing: '-0.02em' }}>
            What do you want to track?
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6, lineHeight: 1.5 }}>
            Pick a few — they become your nav tabs, in the order you tap them.
            You can change everything later in Settings.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 24 }}>
          {INTERESTS.map(item => {
            const idx = picked.indexOf(item.key)
            const selected = idx >= 0
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => toggle(item.key)}
                aria-pressed={selected}
                style={{
                  position: 'relative', textAlign: 'left', cursor: 'pointer',
                  padding: '14px 12px', borderRadius: 14,
                  background: selected ? 'color-mix(in srgb, var(--accent) 8%, var(--surface-1))' : 'var(--surface-1)',
                  border: selected ? '1.5px solid var(--accent)' : '1.5px solid var(--border-subtle)',
                  transition: 'border-color 0.15s ease, background 0.15s ease',
                }}
              >
                <SectionIcon sectionKey={item.key} size={20} color={selected ? 'var(--accent)' : 'var(--text-secondary)'} />
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginTop: 8 }}>{item.label}</p>
                <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{item.sub}</p>
                {selected && (
                  <span style={{
                    position: 'absolute', top: 8, right: 8,
                    width: 18, height: 18, borderRadius: '50%',
                    background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {picked.length > 1
                      ? <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--base-bg)', fontFamily: 'var(--font-mono)' }}>{idx + 1}</span>
                      : <CheckIcon size={11} color="var(--base-bg)" />}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        <button
          type="button"
          onClick={() => finish(picked)}
          disabled={picked.length === 0}
          style={{
            width: '100%', padding: '13px 0', borderRadius: 13, border: 'none',
            background: picked.length > 0 ? 'var(--accent)' : 'var(--surface-2)',
            color: picked.length > 0 ? 'var(--base-bg)' : 'var(--text-disabled)',
            fontSize: 15, fontWeight: 700, cursor: picked.length > 0 ? 'pointer' : 'default',
            transition: 'background 0.15s ease',
          }}
        >
          {picked.length === 0 ? 'Pick at least one' : `Continue with ${picked.length}`}
        </button>
        <button
          type="button"
          onClick={() => finish([])}
          style={{
            width: '100%', marginTop: 10, padding: '10px 0', borderRadius: 10,
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-muted)', fontSize: 12, fontWeight: 600,
          }}
        >
          Skip — use the defaults
        </button>
      </div>
    </div>
  )
}
