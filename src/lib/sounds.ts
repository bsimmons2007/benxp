// ── Sound system ──────────────────────────────────────────────
// SFX: Web Audio API synthesis
// Ambient: direct MP3 file playback from public/ambient/{id}.mp3

let _ctx: AudioContext | null = null

function getCtx(): AudioContext {
  if (!_ctx) {
    _ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
  }
  if (_ctx.state === 'suspended') _ctx.resume()
  return _ctx
}

// ── SFX settings ──────────────────────────────────────────────
export function sfxEnabled(): boolean {
  return localStorage.getItem('benxp-sfx') !== 'false'
}
export function setSFX(on: boolean) {
  localStorage.setItem('benxp-sfx', on ? 'true' : 'false')
}

// ── Tone primitive ────────────────────────────────────────────
function tone(
  ac: AudioContext,
  freq: number,
  start: number,
  duration: number,
  peakGain: number,
  type: OscillatorType = 'sine',
) {
  const osc = ac.createOscillator()
  const g   = ac.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, start)
  g.gain.setValueAtTime(0.001, start)
  g.gain.linearRampToValueAtTime(peakGain, start + Math.min(0.015, duration * 0.1))
  g.gain.exponentialRampToValueAtTime(0.001, start + duration)
  osc.connect(g)
  g.connect(ac.destination)
  osc.start(start)
  osc.stop(start + duration + 0.05)
}

// ── Sound effects ─────────────────────────────────────────────
export function playXPGain() {
  if (!sfxEnabled()) return
  const ac = getCtx()
  const t  = ac.currentTime
  tone(ac, 523.25, t,        0.14, 0.15)
  tone(ac, 659.25, t + 0.09, 0.20, 0.12)
}

export function playLevelUp() {
  if (!sfxEnabled()) return
  const ac = getCtx()
  const t  = ac.currentTime
  const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50]
  notes.forEach((freq, i) => tone(ac, freq, t + i * 0.09, 0.35, 0.18))
  tone(ac, 1046.50, t + notes.length * 0.09, 0.6, 0.12)
}

export function playPR() {
  if (!sfxEnabled()) return
  const ac = getCtx()
  const t  = ac.currentTime
  tone(ac, 196.00, t,        0.45, 0.14, 'sawtooth')
  tone(ac, 294.00, t,        0.45, 0.11, 'sawtooth')
  tone(ac, 392.00, t,        0.45, 0.09, 'sawtooth')
  tone(ac, 523.25, t + 0.38, 0.55, 0.16)
  tone(ac, 659.25, t + 0.52, 0.65, 0.13)
  tone(ac, 783.99, t + 0.68, 0.55, 0.10)
}

export function playGoalComplete() {
  if (!sfxEnabled()) return
  const ac = getCtx()
  const t  = ac.currentTime
  const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99, 1046.50, 1318.51]
  notes.forEach((freq, i) => tone(ac, freq, t + i * 0.07, 0.45, 0.14))
}

export function playRankUp() {
  if (!sfxEnabled()) return
  const ac = getCtx()
  const t  = ac.currentTime
  // Rising power chord then shimmer
  tone(ac, 174.61, t,        0.30, 0.12, 'sawtooth')
  tone(ac, 261.63, t,        0.30, 0.10, 'sawtooth')
  tone(ac, 349.23, t + 0.12, 0.35, 0.14, 'sawtooth')
  tone(ac, 523.25, t + 0.26, 0.50, 0.16)
  tone(ac, 698.46, t + 0.42, 0.55, 0.13)
  tone(ac, 1046.50, t + 0.58, 0.45, 0.10)
  tone(ac, 1396.91, t + 0.70, 0.60, 0.08)
}

export function playTabSwitch() {
  if (!sfxEnabled()) return
  const ac = getCtx()
  const t  = ac.currentTime
  tone(ac, 440, t,       0.08, 0.06)
  tone(ac, 660, t + 0.06, 0.10, 0.05)
}

export function playButtonClick() {
  if (!sfxEnabled()) return
  const ac = getCtx()
  const t  = ac.currentTime
  tone(ac, 880, t, 0.05, 0.04)
}

// ── Ambient scene definitions ─────────────────────────────────

export interface AmbientScene {
  id:          string
  name:        string
  emoji:       string
  description: string
}

export const AMBIENT_SCENES: AmbientScene[] = [
  { id: 'cosmic',  name: 'Cosmic Void',   emoji: 'Cosmic', description: 'Deep space resonance & stellar drift' },
  { id: 'forest',  name: 'Dark Forest',   emoji: 'Forest', description: 'Jungle insects, wind & rustling leaves' },
  { id: 'ocean',   name: 'Deep Ocean',    emoji: 'Ocean',  description: 'Rolling waves, tide & oceanic depth' },
  { id: 'ember',   name: 'Ember & Fire',  emoji: 'Fire',   description: 'Crackling fire, warm analog saturation' },
  { id: 'arctic',  name: 'Arctic Wind',   emoji: 'Ice',    description: 'Howling blizzard & frozen resonance' },
  { id: 'lofi',    name: 'Lo-fi Study',   emoji: 'Lo-fi',  description: 'Vinyl crackle, soft rain & warm chords' },
]

// Maps visual theme IDs → ambient scene ID
const THEME_AMBIENT_MAP: Record<string, string> = {
  // ── Cosmic / space ────────────────────────────────────────────
  void:     'cosmic', galaxy:   'cosmic', midnight: 'cosmic', indigo: 'cosmic',
  slate:    'cosmic', steel:    'cosmic', carbon:   'cosmic', ash:    'cosmic',
  gold:     'cosmic', grape:    'cosmic', plum:     'cosmic',
  aurora:   'cosmic', lavender: 'cosmic', mercury:  'cosmic',
  // ── Forest / nature ───────────────────────────────────────────
  forest:   'forest', jade:  'forest', sage:  'forest',
  walnut:   'forest', mocha: 'forest', lime:  'forest',
  toxic:    'forest', pine:  'forest',
  // ── Ocean ─────────────────────────────────────────────────────
  ocean:    'ocean', cobalt: 'ocean', navy: 'ocean', teal: 'ocean', sky: 'ocean',
  // ── Arctic ────────────────────────────────────────────────────
  arctic:   'arctic', ice: 'arctic', storm: 'arctic',
  // ── Ember / fire ──────────────────────────────────────────────
  ember:    'ember', crimson: 'ember', wine:    'ember', rose:    'ember',
  rust:     'ember', copper:  'ember', dusk:    'ember', sakura:  'ember',
  amber:    'ember', sunrise: 'ember', hellfire:'ember', cherry:  'ember', bronze: 'ember',
  // ── Lo-fi / chill ─────────────────────────────────────────────
  matrix:   'lofi', cyber: 'lofi', neon: 'lofi',
  lemon:    'lofi', sand:  'lofi', blush: 'lofi',
}

export function getAmbientForTheme(themeId: string): string {
  return THEME_AMBIENT_MAP[themeId] ?? 'cosmic'
}

export function ambientScene(): string {
  return localStorage.getItem('benxp-ambient-scene') ?? 'cosmic'
}

// ── Ambient volume ────────────────────────────────────────────
export function getAmbientVolume(): number {
  const v = parseFloat(localStorage.getItem('benxp-ambient-vol') ?? '')
  return isNaN(v) ? 0.6 : Math.max(0, Math.min(1, v))
}

export function setAmbientVolume(v: number) {
  const clamped = Math.max(0, Math.min(1, v))
  localStorage.setItem('benxp-ambient-vol', String(clamped))
  if (_active) _active.audio.volume = clamped
}

// ── Ambient state ─────────────────────────────────────────────
// Each audio element owns its own fade interval to avoid conflicts
interface ActiveAmbient {
  audio:    HTMLAudioElement
  interval: ReturnType<typeof setInterval> | null
}

let _active: ActiveAmbient | null = null

export function ambientEnabled(): boolean {
  return localStorage.getItem('benxp-ambient') === 'true'
}

export function ambientPlaying(): boolean {
  return _active !== null
}

export function setAmbient(on: boolean) {
  localStorage.setItem('benxp-ambient', on ? 'true' : 'false')
  if (on) startAmbient()
  else stopAmbient()
}

export function setAmbientSceneId(id: string, autoStart = true) {
  localStorage.setItem('benxp-ambient-scene', id)
  stopAmbient()
  if (autoStart && ambientEnabled()) {
    setTimeout(startAmbient, 600)
  }
}

// ── Volume fade (per-element, owns its own interval) ──────────
function fadeElement(
  el:      HTMLAudioElement,
  target:  number,
  ms:      number,
  onDone?: () => void,
): ReturnType<typeof setInterval> {
  const steps  = Math.max(20, Math.round(ms / 50))
  const stepMs = ms / steps
  const start  = el.volume
  const delta  = (target - start) / steps

  const id = setInterval(() => {
    el.volume = Math.max(0, Math.min(1, el.volume + delta))
    const done = delta >= 0 ? el.volume >= target : el.volume <= target
    if (done) {
      el.volume = target
      clearInterval(id)
      onDone?.()
    }
  }, stepMs)

  return id
}

// ── Start ambient ─────────────────────────────────────────────
export function startAmbient() {
  if (_active) return  // already running — caller should stopAmbient first

  const src   = `/ambient/${ambientScene()}.mp3`
  const audio = new Audio(src)
  audio.loop   = true
  audio.volume = 0

  const entry: ActiveAmbient = { audio, interval: null }
  _active = entry

  audio.play().then(() => {
    entry.interval = fadeElement(audio, getAmbientVolume(), 3000)
  }).catch(err => {
    console.warn('[ambient] play failed:', err)
    if (_active === entry) _active = null
  })
}

// ── Stop ambient ──────────────────────────────────────────────
export function stopAmbient() {
  if (!_active) return

  const { audio, interval } = _active
  _active = null                    // null immediately — blocks new plays stacking

  if (interval) clearInterval(interval)

  // Fade out then hard-stop
  const id = fadeElement(audio, 0, 1200, () => {
    audio.pause()
    audio.src = ''
  })

  // Safety: force-kill after 1.5s regardless
  setTimeout(() => {
    clearInterval(id)
    try { audio.pause() } catch { /* ok */ }
    audio.src = ''
  }, 1500)
}

// ── Stubs kept for Settings.tsx compatibility ─────────────────
export async function checkAmbientFile(_id: string): Promise<boolean> { return true }
export async function checkAllAmbientFiles(): Promise<Record<string, boolean>> {
  return Object.fromEntries(AMBIENT_SCENES.map(s => [s.id, true]))
}
