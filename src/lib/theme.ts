export interface Theme {
  id: string
  name: string
  emoji: string
  accent: string
  accentDim: string
  orb1: string
  orb2: string
  orb3: string
  cardBg: string
  navBg: string
  baseBg: string
  bgMid: string
  bgDeep: string
}

export const THEMES: Theme[] = [
  {
    id: 'gold',
    name: 'Gold Rush',
    emoji: '⚡',
    accent: '#F5A623',
    accentDim: 'rgba(245,166,35,0.2)',
    orb1: 'rgba(123,47,190,0.22)',
    orb2: 'rgba(26,188,156,0.16)',
    orb3: 'rgba(245,166,35,0.07)',
    cardBg: 'rgba(16,24,52,0.65)',
    navBg: 'rgba(8,10,24,0.9)',
    baseBg: '#0d0d1a',
    bgMid: '#12152b',
    bgDeep: '#0a1020',
  },
  {
    id: 'cyber',
    name: 'Neon Cyber',
    emoji: '🔵',
    accent: '#00F5FF',
    accentDim: 'rgba(0,245,255,0.2)',
    orb1: 'rgba(255,0,128,0.22)',
    orb2: 'rgba(0,245,255,0.16)',
    orb3: 'rgba(128,0,255,0.08)',
    cardBg: 'rgba(0,10,28,0.7)',
    navBg: 'rgba(0,5,20,0.92)',
    baseBg: '#00040f',
    bgMid: '#000820',
    bgDeep: '#000515',
  },
  {
    id: 'forest',
    name: 'Dark Forest',
    emoji: '🌲',
    accent: '#2ECC71',
    accentDim: 'rgba(46,204,113,0.2)',
    orb1: 'rgba(39,174,96,0.22)',
    orb2: 'rgba(26,188,156,0.18)',
    orb3: 'rgba(46,204,113,0.07)',
    cardBg: 'rgba(4,18,12,0.7)',
    navBg: 'rgba(2,10,6,0.92)',
    baseBg: '#030d07',
    bgMid: '#071209',
    bgDeep: '#041007',
  },
  {
    id: 'crimson',
    name: 'Crimson',
    emoji: '🔴',
    accent: '#E94560',
    accentDim: 'rgba(233,69,96,0.2)',
    orb1: 'rgba(233,69,96,0.25)',
    orb2: 'rgba(156,39,176,0.18)',
    orb3: 'rgba(233,69,96,0.06)',
    cardBg: 'rgba(20,5,10,0.7)',
    navBg: 'rgba(12,2,6,0.92)',
    baseBg: '#0d0306',
    bgMid: '#160508',
    bgDeep: '#0a0204',
  },
  {
    id: 'ocean',
    name: 'Deep Ocean',
    emoji: '🌊',
    accent: '#3498DB',
    accentDim: 'rgba(52,152,219,0.2)',
    orb1: 'rgba(52,152,219,0.22)',
    orb2: 'rgba(26,188,156,0.22)',
    orb3: 'rgba(0,100,200,0.08)',
    cardBg: 'rgba(2,12,28,0.7)',
    navBg: 'rgba(1,6,18,0.92)',
    baseBg: '#01060f',
    bgMid: '#020c1e',
    bgDeep: '#010810',
  },
  {
    id: 'sakura',
    name: 'Sakura',
    emoji: '🌸',
    accent: '#FF6B9D',
    accentDim: 'rgba(255,107,157,0.2)',
    orb1: 'rgba(255,107,157,0.22)',
    orb2: 'rgba(156,39,176,0.2)',
    orb3: 'rgba(255,107,157,0.07)',
    cardBg: 'rgba(20,4,18,0.7)',
    navBg: 'rgba(12,2,10,0.92)',
    baseBg: '#0d0309',
    bgMid: '#160412',
    bgDeep: '#0a0208',
  },
  {
    id: 'slate',
    name: 'Slate',
    emoji: '🪨',
    accent: '#7C83FD',
    accentDim: 'rgba(124,131,253,0.2)',
    orb1: 'rgba(124,131,253,0.18)',
    orb2: 'rgba(100,200,220,0.12)',
    orb3: 'rgba(124,131,253,0.06)',
    cardBg: 'rgba(40,44,68,0.7)',
    navBg: 'rgba(28,30,50,0.95)',
    baseBg: '#1c1e32',
    bgMid: '#242638',
    bgDeep: '#1a1c2e',
  },
  {
    id: 'dusk',
    name: 'Dusk',
    emoji: '🌅',
    accent: '#F0A500',
    accentDim: 'rgba(240,165,0,0.2)',
    orb1: 'rgba(240,100,60,0.2)',
    orb2: 'rgba(240,165,0,0.15)',
    orb3: 'rgba(180,80,40,0.08)',
    cardBg: 'rgba(44,28,20,0.72)',
    navBg: 'rgba(28,16,10,0.95)',
    baseBg: '#1e1208',
    bgMid: '#2a1a0e',
    bgDeep: '#1a0e06',
  },
  {
    id: 'ash',
    name: 'Ash',
    emoji: '🌫️',
    accent: '#A0AEC0',
    accentDim: 'rgba(160,174,192,0.2)',
    orb1: 'rgba(160,174,192,0.12)',
    orb2: 'rgba(120,140,160,0.1)',
    orb3: 'rgba(160,174,192,0.05)',
    cardBg: 'rgba(36,40,46,0.75)',
    navBg: 'rgba(22,24,28,0.95)',
    baseBg: '#18191e',
    bgMid: '#20222a',
    bgDeep: '#16171c',
  },
]

export function applyTheme(theme: Theme) {
  const r = document.documentElement
  r.style.setProperty('--accent', theme.accent)
  r.style.setProperty('--accent-dim', theme.accentDim)
  r.style.setProperty('--orb1', theme.orb1)
  r.style.setProperty('--orb2', theme.orb2)
  r.style.setProperty('--orb3', theme.orb3)
  r.style.setProperty('--card-bg', theme.cardBg)
  r.style.setProperty('--nav-bg', theme.navBg)
  r.style.setProperty('--base-bg', theme.baseBg)
  r.style.setProperty('--bg-mid', theme.bgMid)
  r.style.setProperty('--bg-deep', theme.bgDeep)
}

export function loadTheme(): Theme {
  const saved = localStorage.getItem('benxp-theme')
  return THEMES.find((t) => t.id === saved) ?? THEMES[0]
}

export function saveTheme(theme: Theme) {
  localStorage.setItem('benxp-theme', theme.id)
  applyTheme(theme)
}
