// Interactive SVG body map — front & back views.
// Clean non-overlapping muscle regions, centered figure, vertical rank dots.

import { useState, useCallback } from 'react'
import type { MuscleScoreResult } from '../lib/muscleScore'
import { RANKS, MUSCLES } from '../lib/muscleScore'

interface Props {
  view:           'front' | 'back'
  scores:         MuscleScoreResult[]
  selected:       string | null
  onSelect:       (key: string) => void
  imbalancedKeys?: Set<string>
}

const EMPTY_COLOR  = '#14143a'
const EMPTY_BORDER = '#2a2a52'

// ── Shared SVG defs ───────────────────────────────────────────────────────────

function SvgDefs() {
  return (
    <defs>
      {RANKS.filter(r => r.tier > 0).map(rank => {
        const hi = rank.glow !== 'none' ? rank.glow : '#ffffff'
        return (
          <linearGradient key={rank.id} id={`grad-${rank.id}`} x1="20%" y1="0%" x2="80%" y2="100%">
            <stop offset="0%"   stopColor={hi}         stopOpacity={0.45} />
            <stop offset="45%"  stopColor={rank.color} stopOpacity={0.97} />
            <stop offset="100%" stopColor={rank.color} stopOpacity={1}    />
          </linearGradient>
        )
      })}
      <linearGradient id="body-fill" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%"   stopColor="#161636" stopOpacity={1} />
        <stop offset="100%" stopColor="#0a0a1e" stopOpacity={1} />
      </linearGradient>
      <filter id="muscleGlow" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur" />
        <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
      </filter>
      <filter id="muscleGlowStrong" x="-40%" y="-40%" width="180%" height="180%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
        <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
      </filter>
      <filter id="bodyEdge" x="-6%" y="-2%" width="112%" height="104%">
        <feDropShadow dx="0" dy="4" stdDeviation="5" floodColor="#000" floodOpacity="0.75" />
      </filter>
    </defs>
  )
}

// ── Muscle polygon ────────────────────────────────────────────────────────────

interface PolyProps {
  muscleKey:       string
  points:          string
  scores:          MuscleScoreResult[]
  selected:        string | null
  hovered:         string | null
  onSelect:        (key: string) => void
  onHover:         (key: string | null) => void
  imbalancedKeys?: Set<string>
}

function MP({ muscleKey, points, scores, selected, hovered, onSelect, onHover, imbalancedKeys }: PolyProps) {
  const result       = scores.find(r => r.muscleKey === muscleKey)
  const rank         = result?.rank
  const tier         = rank?.tier ?? 0
  const isSelected   = selected === muscleKey
  const isHovered    = hovered  === muscleKey
  const isImbalanced = imbalancedKeys?.has(muscleKey) ?? false
  const glow         = rank?.glow ?? 'none'

  const fill   = tier > 0 ? `url(#grad-${rank!.id})` : EMPTY_COLOR
  const stroke = isSelected
    ? (glow !== 'none' ? glow : 'var(--accent)')
    : isImbalanced
      ? '#e07830'
      : isHovered
        ? (glow !== 'none' ? `${glow}cc` : 'rgba(255,255,255,0.4)')
        : (rank?.border ?? EMPTY_BORDER)

  const filter = (isHovered && tier > 0) || tier >= 16
    ? 'url(#muscleGlowStrong)'
    : isImbalanced ? 'url(#muscleGlow)'
    : tier >= 10 ? 'url(#muscleGlow)'
    : 'none'

  const rankClass = tier >= 16 ? 'muscle-ranked muscle-top'
                  : tier >= 7  ? 'muscle-ranked muscle-high'
                  : tier > 0   ? 'muscle-ranked'
                  : ''

  return (
    <polygon
      points={points}
      fill={fill}
      stroke={stroke}
      strokeWidth={isSelected ? 2.6 : isImbalanced ? 2.0 : isHovered ? 1.8 : tier > 0 ? 1.0 : 0.5}
      filter={filter}
      style={{
        cursor: 'pointer',
        transition: 'stroke 0.15s ease, stroke-width 0.15s ease',
        transformBox: 'fill-box',
        transformOrigin: 'center',
        transform: isSelected ? 'scale(1.02)' : 'scale(1)',
        ['--muscle-glow' as string]: glow !== 'none' ? glow : 'rgba(255,255,255,0.4)',
      }}
      className={`${rankClass}${isSelected ? ' muscle-selected' : ''}`}
      onClick={() => onSelect(muscleKey)}
      onMouseEnter={() => onHover(muscleKey)}
      onMouseLeave={() => onHover(null)}
    />
  )
}

// ── Rank legend — vertical, God → Bronze (major tiers only) ─────────────────

const LEGEND_IDS = ['god', 'champion', 'elite', 'diamond3', 'platinum3', 'gold3', 'silver3', 'bronze3']

function RankLegend() {
  const legendRanks = RANKS.filter(r => LEGEND_IDS.includes(r.id)).reverse() // God first (RANKS is asc)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, padding: '4px 10px' }}>
      {legendRanks.map(r => {
        // Strip roman numeral suffix for compact label
        const shortLabel = r.label.replace(/ I{1,3}$/, '')
        return (
          <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{
              width: 13, height: 13, borderRadius: '50%', flexShrink: 0,
              backgroundColor: r.color,
              border: `1.5px solid ${r.border}`,
              boxShadow: r.glow !== 'none' ? `0 0 6px ${r.glow}88` : 'none',
            }} />
            <span style={{
              fontSize: 9, fontWeight: 700, whiteSpace: 'nowrap',
              color: r.glow !== 'none' ? r.glow : '#888',
              fontFamily: 'Cinzel, serif', letterSpacing: '0.03em',
            }}>
              {shortLabel}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ── Hover / selected label ────────────────────────────────────────────────────

function MuscleLabel({ muscleKey, scores }: { muscleKey: string | null; scores: MuscleScoreResult[] }) {
  if (!muscleKey) {
    return (
      <p style={{ textAlign: 'center', fontSize: 11, color: '#666', marginTop: 8, height: 30, lineHeight: '30px' }}>
        Tap a muscle to inspect
      </p>
    )
  }
  const muscle = MUSCLES.find(m => m.key === muscleKey)
  const result = scores.find(r => r.muscleKey === muscleKey)
  const glow   = result?.rank.glow ?? 'none'
  const tier   = result?.rank.tier ?? 0

  return (
    <div className="pop-in" style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '7px 14px', marginTop: 8, borderRadius: 10, width: '100%',
      background: tier > 0 ? `${result!.rank.color}cc` : 'rgba(255,255,255,0.03)',
      border: `1px solid ${tier > 0 ? result!.rank.border : 'rgba(255,255,255,0.07)'}`,
      boxShadow: tier > 0 && glow !== 'none' ? `0 0 12px ${glow}33` : 'none',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 10, color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{muscle?.group}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#e0e0f0' }}>{muscle?.name ?? muscleKey}</span>
      </div>
      {tier > 0 && result
        ? <span style={{ fontSize: 11, color: glow !== 'none' ? glow : '#aaa', fontFamily: 'Cinzel, serif', fontWeight: 700 }}>{result.rank.icon} {result.rank.label}</span>
        : <span style={{ fontSize: 10, color: '#444' }}>Unranked</span>
      }
    </div>
  )
}

type SP = {
  scores:          MuscleScoreResult[]
  selected:        string | null
  hovered:         string | null
  onSelect:        (k: string) => void
  onHover:         (k: string | null) => void
  imbalancedKeys?: Set<string>
}

// ── FRONT VIEW ───────────────────────────────────────────────────────────────
// All muscle regions share exact boundary lines — no overlap possible.
//
// Coordinate map (viewBox 0 0 200 430):
//   Shoulder line y=68 | Chest top y=68 | Chest bot y=132
//   Abs y=134–182     | Hip y=206        | Knee y=322
//   Calf y=328–388

function FrontView({ scores, selected, hovered, onSelect, onHover, imbalancedKeys }: SP) {
  const p = (key: string, pts: string, side?: string) =>
    <MP key={`${key}-${side ?? 'c'}`} muscleKey={key} points={pts}
      scores={scores} selected={selected} hovered={hovered} onSelect={onSelect} onHover={onHover} imbalancedKeys={imbalancedKeys} />

  return (
    <svg viewBox="0 0 200 430" style={{ width: '100%', maxWidth: 300, display: 'block', userSelect: 'none' }}>
      {/* ── Body silhouette ── */}
      <polygon points="54,68 146,68 153,84 155,100 142,118 136,164 130,192 126,208 100,208 74,208 70,192 64,164 58,118 45,100 47,84"
        fill="url(#body-fill)" filter="url(#bodyEdge)" stroke="none" />
      <polygon points="38,70 56,68 54,182 46,224 33,220 35,178" fill="url(#body-fill)" stroke="none" />
      <polygon points="144,68 162,70 165,178 167,220 154,224 146,182" fill="url(#body-fill)" stroke="none" />
      <polygon points="70,210 100,208 98,328 64,322" fill="url(#body-fill)" stroke="none" />
      <polygon points="100,208 130,210 136,322 102,328" fill="url(#body-fill)" stroke="none" />
      <polygon points="64,330 96,328 94,390 62,384" fill="url(#body-fill)" stroke="none" />
      <polygon points="104,328 136,330 138,384 106,390" fill="url(#body-fill)" stroke="none" />

      {/* Head + neck */}
      <ellipse cx="100" cy="26" rx="20" ry="24" fill="#111128" stroke="#1e1e3a" strokeWidth="1" />
      <polygon points="91,48 109,48 112,68 88,68" fill="#111128" stroke="#1a1a30" strokeWidth="0.8" />

      {/* ── CHEST (shared exact boundaries, no overlap) ── */}
      {/* Upper: y68 → y90, slight inward taper */}
      {p('chest_upper', '76,68 124,68 122,90 78,90')}
      {/* Mid: y90 → y114 */}
      {p('chest_mid',   '78,90 122,90 120,114 80,114')}
      {/* Lower: diagonal fold, y114 → y132 */}
      {p('chest_lower', '80,114 120,114 116,132 84,132')}

      {/* ── SHOULDERS — share exact boundary with chest sides ── */}
      {/* Front delt L: fills gap between neck/side-delt and chest_upper left edge */}
      {p('delt_front', '54,68 76,68 78,90 74,96 52,88',  'L')}
      {p('delt_front', '124,68 146,68 148,88 126,96 122,90', 'R')}
      {/* Side delt L: outer arm cap */}
      {p('delt_side', '36,70 56,68 54,90 34,84', 'L')}
      {p('delt_side', '144,68 164,70 166,84 146,90', 'R')}

      {/* ── BICEPS — start where delt ends ── */}
      {p('biceps', '34,86 54,92 52,174 32,168', 'L')}
      {p('biceps', '146,92 166,86 168,168 148,174', 'R')}

      {/* ── FOREARMS ── */}
      {p('forearms', '32,170 52,176 48,222 34,218', 'L')}
      {p('forearms', '148,176 168,170 166,218 152,222', 'R')}

      {/* ── CORE — abs share exact boundaries with each other & obliques ── */}
      {/* Upper abs: y132 → y158 */}
      {p('upper_abs', '80,132 120,132 118,158 82,158')}
      {/* Lower abs: y158 → y178 */}
      {p('lower_abs', '82,158 118,158 114,178 86,178')}
      {/* Obliques: flank, exact shared boundary with abs */}
      {p('obliques', '58,118 80,132 82,158 82,178 68,184 54,152 52,130', 'L')}
      {p('obliques', '120,132 142,118 148,130 146,152 132,184 118,178 118,158', 'R')}

      {/* ── QUADS ── */}
      {p('quads', '70,210 100,208 98,322 64,316', 'L')}
      {p('quads', '100,208 130,210 136,316 102,322', 'R')}

      {/* ── CALVES front ── */}
      {p('calves_gastro', '64,330 92,328 90,388 64,382', 'LF')}
      {p('calves_gastro', '108,328 136,330 136,382 110,388', 'RF')}

      {/* ── Structural details ── */}
      <ellipse cx="81"  cy="325" rx="14" ry="5" fill="#0d0d20" stroke="#1a1a32" strokeWidth="0.7" />
      <ellipse cx="119" cy="325" rx="14" ry="5" fill="#0d0d20" stroke="#1a1a32" strokeWidth="0.7" />
      <polygon points="76,180 124,180 128,196 72,196" fill="#0a0a1e" stroke="none" />
      <polygon points="58,384 94,382 92,402 56,400" fill="#0d0d20" stroke="#181830" strokeWidth="1" />
      <polygon points="106,382 142,384 144,400 108,402" fill="#0d0d20" stroke="#181830" strokeWidth="1" />
      <polygon points="28,220 46,220 44,244 26,242" fill="#0d0d20" stroke="#181830" strokeWidth="1" />
      <polygon points="154,220 172,220 174,242 156,244" fill="#0d0d20" stroke="#181830" strokeWidth="1" />
      <line x1="88" y1="68" x2="58" y2="76" stroke="#1e1e38" strokeWidth="0.9" />
      <line x1="112" y1="68" x2="142" y2="76" stroke="#1e1e38" strokeWidth="0.9" />
      <line x1="100" y1="68" x2="100" y2="132" stroke="#18183a" strokeWidth="0.7" strokeDasharray="2 3" />
      <line x1="100" y1="132" x2="100" y2="178" stroke="#18183a" strokeWidth="0.6" strokeDasharray="2 3" />
      <line x1="82" y1="158" x2="118" y2="158" stroke="#18183a" strokeWidth="0.5" strokeDasharray="2 4" />
    </svg>
  )
}

// ── BACK VIEW ────────────────────────────────────────────────────────────────
// All muscle regions share exact boundary lines.

function BackView({ scores, selected, hovered, onSelect, onHover, imbalancedKeys }: SP) {
  const p = (key: string, pts: string, side?: string) =>
    <MP key={`${key}-${side ?? 'c'}`} muscleKey={key} points={pts}
      scores={scores} selected={selected} hovered={hovered} onSelect={onSelect} onHover={onHover} imbalancedKeys={imbalancedKeys} />

  return (
    <svg viewBox="0 0 200 430" style={{ width: '100%', maxWidth: 300, display: 'block', userSelect: 'none' }}>
      {/* ── Body silhouette ── */}
      <polygon points="54,68 146,68 154,84 156,102 144,120 136,166 128,198 126,212 100,212 74,212 72,198 64,166 56,120 44,102 46,84"
        fill="url(#body-fill)" filter="url(#bodyEdge)" stroke="none" />
      <polygon points="33,72 56,68 54,182 44,228 30,222 31,178" fill="url(#body-fill)" stroke="none" />
      <polygon points="144,68 167,72 169,178 170,222 156,228 146,182" fill="url(#body-fill)" stroke="none" />
      <polygon points="70,214 100,212 98,332 64,326" fill="url(#body-fill)" stroke="none" />
      <polygon points="100,212 130,214 136,326 102,332" fill="url(#body-fill)" stroke="none" />
      <polygon points="64,334 96,332 94,394 62,388" fill="url(#body-fill)" stroke="none" />
      <polygon points="104,332 136,334 138,388 106,394" fill="url(#body-fill)" stroke="none" />

      <ellipse cx="100" cy="26" rx="20" ry="24" fill="#111128" stroke="#1e1e3a" strokeWidth="1" />
      <polygon points="91,48 109,48 112,68 88,68" fill="#111128" stroke="#1a1a30" strokeWidth="0.8" />

      {/* ── TRAPS — diamond from neck-base to mid-back ── */}
      {p('traps', '82,62 118,62 140,84 134,110 100,118 66,110 60,84')}

      {/* ── REAR DELTS — share exact boundary with traps outer edge ── */}
      {p('delt_rear', '36,74 62,70 58,98 34,88', 'L')}
      {p('delt_rear', '138,70 164,74 166,88 142,98', 'R')}

      {/* ── SIDE DELTS back — share boundary with rear delt bottom ── */}
      {p('delt_side', '31,90 56,100 54,120 29,110', 'LB')}
      {p('delt_side', '144,100 169,90 171,110 146,120', 'RB')}

      {/* ── RHOMBOIDS — inner upper back, shares boundary with traps bottom & lats inner ── */}
      {p('rhomboids', '68,112 132,112 130,148 70,148')}

      {/* ── LATS — wings, share boundary with rhomboids inner edge ── */}
      {p('lats', '46,100 68,112 70,148 66,184 46,170 40,148 42,114', 'L')}
      {p('lats', '130,112 154,100 158,114 160,148 154,170 134,184 130,148', 'R')}

      {/* ── LOWER BACK — erectors, share boundary with rhomboids bottom ── */}
      {p('lower_back', '70,150 130,150 128,198 72,198')}

      {/* ── TRICEPS — back of arm ── */}
      {p('triceps', '31,92 56,102 52,180 29,172', 'L')}
      {p('triceps', '144,102 169,92 171,172 148,180', 'R')}

      {/* ── FOREARMS back ── */}
      {p('forearms', '29,174 52,182 48,226 31,220', 'LB')}
      {p('forearms', '148,182 171,174 169,220 152,226', 'RB')}

      {/* ── GLUTES — share boundary with lower back bottom ── */}
      {p('glutes', '70,200 100,196 100,258 66,262', 'L')}
      {p('glutes', '100,196 130,200 134,262 100,258', 'R')}

      {/* ── HAMSTRINGS — share boundary with glutes bottom ── */}
      {p('hamstrings', '64,264 100,260 100,304 62,300', 'L')}
      {p('hamstrings', '100,260 136,264 138,300 100,304', 'R')}

      {/* ── GASTROCNEMIUS ── */}
      {p('calves_gastro', '62,312 90,310 88,364 62,358', 'LB')}
      {p('calves_gastro', '110,310 138,312 138,358 112,364', 'RB')}

      {/* ── SOLEUS — share boundary with gastro bottom ── */}
      {p('calves_soleus', '62,360 88,366 86,388 62,382', 'L')}
      {p('calves_soleus', '112,366 138,360 138,382 114,388', 'R')}

      {/* ── Structural ── */}
      <ellipse cx="81"  cy="329" rx="13" ry="4" fill="#0c0c1e" stroke="#1a1a30" strokeWidth="0.7" />
      <ellipse cx="119" cy="329" rx="13" ry="4" fill="#0c0c1e" stroke="#1a1a30" strokeWidth="0.7" />
      <line x1="100" y1="68" x2="100" y2="198" stroke="#1a1a30" strokeWidth="1" strokeDasharray="3 4" />
      <line x1="93"  y1="150" x2="93"  y2="199" stroke="#18183a" strokeWidth="0.6" strokeDasharray="2 4" />
      <line x1="107" y1="150" x2="107" y2="199" stroke="#18183a" strokeWidth="0.6" strokeDasharray="2 4" />
      <polygon points="58,390 94,388 92,406 56,404" fill="#0d0d20" stroke="#181830" strokeWidth="1" />
      <polygon points="106,388 142,390 144,404 108,406" fill="#0d0d20" stroke="#181830" strokeWidth="1" />
      <polygon points="17,222 33,222 31,248 15,246" fill="#0d0d20" stroke="#181830" strokeWidth="1" />
      <polygon points="167,222 183,222 185,246 169,248" fill="#0d0d20" stroke="#181830" strokeWidth="1" />
    </svg>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────

export function BodyMap({ view, scores, selected, onSelect, imbalancedKeys }: Props) {
  const [hovered, setHovered] = useState<string | null>(null)
  const handleHover = useCallback((key: string | null) => setHovered(key), [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0, width: '100%' }}>
      <svg aria-hidden="true" style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <SvgDefs />
      </svg>

      {/* Body centered, rank legend on right via absolute positioning */}
      <div style={{ position: 'relative', width: '100%', display: 'flex', justifyContent: 'center' }}>
        {view === 'front'
          ? <FrontView scores={scores} selected={selected} hovered={hovered} onSelect={onSelect} onHover={handleHover} imbalancedKeys={imbalancedKeys} />
          : <BackView  scores={scores} selected={selected} hovered={hovered} onSelect={onSelect} onHover={handleHover} imbalancedKeys={imbalancedKeys} />
        }
        <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, display: 'flex', alignItems: 'center' }}>
          <RankLegend />
        </div>
      </div>

      <MuscleLabel muscleKey={hovered ?? selected} scores={scores} />
    </div>
  )
}
