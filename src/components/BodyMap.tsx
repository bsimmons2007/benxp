// Interactive SVG body map — front & back views.
// Clean flat design: rounded-rect + ellipse muscle shapes, rank-colored fills, no glow filters.

import { useState, useCallback } from 'react'
import type { MuscleScoreResult } from '../lib/muscleScore'
import { MUSCLES } from '../lib/muscleScore'

interface Props {
  view:            'front' | 'back'
  scores:          MuscleScoreResult[]
  selected:        string | null
  onSelect:        (key: string) => void
  imbalancedKeys?: Set<string>
}

// ── Color ─────────────────────────────────────────────────────────────────────

function rankFlatFill(result: MuscleScoreResult | undefined): string {
  if (!result || result.rank.tier === 0) return '#8b93a1'
  return result.rank.glow !== 'none' ? result.rank.glow : result.rank.color
}

// ── Per-shape SVG attributes ──────────────────────────────────────────────────

type SVGAttrs = React.SVGAttributes<SVGElement>

function sha(
  key:  string,
  scores: MuscleScoreResult[],
  sel:  string | null,
  hov:  string | null,
  imb?: Set<string>,
): SVGAttrs {
  const result = scores.find(r => r.muscleKey === key)
  const tier   = result?.rank.tier ?? 0
  const isSel  = sel === key
  const isHov  = hov === key
  const isImb  = imb?.has(key) ?? false

  return {
    fill:        rankFlatFill(result),
    fillOpacity: tier > 0 ? (isHov ? 1 : 0.88) : (isHov ? 0.68 : 0.46),
    stroke:      isSel ? 'var(--accent)' : isImb ? '#e07830' : 'var(--surface-0)',
    strokeWidth: isSel ? 2.2 : isImb ? 1.8 : 1.4,
    style:       { cursor: 'pointer', transition: 'fill-opacity 0.12s, stroke 0.12s' },
  }
}

// ── Muscle label ──────────────────────────────────────────────────────────────

function MuscleLabel({ muscleKey, scores }: { muscleKey: string | null; scores: MuscleScoreResult[] }) {
  if (!muscleKey) {
    return (
      <p style={{
        textAlign: 'center', fontSize: 11, color: 'var(--text-tertiary)',
        marginTop: 8, height: 28, lineHeight: '28px', letterSpacing: '0.02em',
      }}>
        Tap a muscle to inspect
      </p>
    )
  }

  const muscle = MUSCLES.find(m => m.key === muscleKey)
  const result = scores.find(r => r.muscleKey === muscleKey)
  const tier   = result?.rank.tier ?? 0
  const color  = tier > 0
    ? (result!.rank.glow !== 'none' ? result!.rank.glow : 'var(--text-secondary)')
    : 'var(--text-disabled)'

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '7px 12px', marginTop: 8, borderRadius: 10,
      background: 'var(--surface-2)', border: '1px solid var(--border-subtle)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{
          fontSize: 10, color: 'var(--text-tertiary)', textTransform: 'uppercase',
          fontFamily: 'var(--font-mono)', letterSpacing: '0.08em',
        }}>
          {muscle?.group}
        </span>
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
          {muscle?.name ?? muscleKey}
        </span>
      </div>
      {tier > 0 && result
        ? <span style={{ fontSize: 11, fontWeight: 700, color }}>{result.rank.icon} {result.rank.label}</span>
        : <span style={{ fontSize: 10, color: 'var(--text-disabled)' }}>Unranked</span>
      }
    </div>
  )
}

// ── Silhouette (shared front & back) ─────────────────────────────────────────

function Silhouette() {
  const s: SVGAttrs = { fill: 'var(--surface-2)', stroke: 'var(--border-subtle)', strokeWidth: 0.8 }
  return (
    <g>
      <ellipse cx="130" cy="44"  rx="22" ry="27" {...s} />
      <rect    x="119"  y="64"  width="22"  height="22"  rx="9"  {...s} />
      <path    d="M84,108 Q83,140 96,150 L100,205 Q102,252 113,264 L147,264 Q158,252 160,205 L164,150 Q177,140 176,108 Q150,96 130,96 Q110,96 84,108 Z" {...s} />
      {/* Left arm */}
      <rect x="52"  y="106" width="26" height="90"  rx="13" {...s} />
      <rect x="48"  y="188" width="22" height="84"  rx="11" {...s} />
      <ellipse cx="59"  cy="280" rx="12" ry="15" {...s} />
      {/* Right arm */}
      <rect x="182" y="106" width="26" height="90"  rx="13" {...s} />
      <rect x="190" y="188" width="22" height="84"  rx="11" {...s} />
      <ellipse cx="201" cy="280" rx="12" ry="15" {...s} />
      {/* Left leg */}
      <rect x="97"  y="256" width="31" height="168" rx="15" {...s} />
      <rect x="101" y="414" width="25" height="122" rx="12" {...s} />
      <ellipse cx="113" cy="546" rx="15" ry="10" {...s} />
      {/* Right leg */}
      <rect x="132" y="256" width="31" height="168" rx="15" {...s} />
      <rect x="134" y="414" width="25" height="122" rx="12" {...s} />
      <ellipse cx="147" cy="546" rx="15" ry="10" {...s} />
    </g>
  )
}

// ── View props ────────────────────────────────────────────────────────────────

interface VP {
  scores: MuscleScoreResult[]
  sel:    string | null
  hov:    string | null
  onSel:  (k: string) => void
  onHov:  (k: string | null) => void
  imb?:   Set<string>
}

// ── Front view ────────────────────────────────────────────────────────────────

function FrontView({ scores, sel, hov, onSel, onHov, imb }: VP) {
  const a = (k: string): SVGAttrs => sha(k, scores, sel, hov, imb)
  const h = (k: string) => ({
    onClick:      () => onSel(k),
    onMouseEnter: () => onHov(k),
    onMouseLeave: () => onHov(null),
  })

  return (
    <svg viewBox="0 0 260 580" style={{ width: '100%', maxWidth: 220, display: 'block', userSelect: 'none' }}>
      <Silhouette />

      {/* Front delts */}
      <ellipse cx="79"  cy="112" rx="14" ry="14" {...a('delt_front')} {...h('delt_front')} />
      <ellipse cx="181" cy="112" rx="14" ry="14" {...a('delt_front')} {...h('delt_front')} />

      {/* Upper chest — pec ball (ellipse) + upper pad (rect) */}
      <ellipse cx="92"  cy="116" rx="15" ry="14" {...a('chest_upper')} {...h('chest_upper')} />
      <ellipse cx="168" cy="116" rx="15" ry="14" {...a('chest_upper')} {...h('chest_upper')} />
      <rect x="95"  y="110" width="31" height="19" rx="7" {...a('chest_upper')} {...h('chest_upper')} />
      <rect x="134" y="110" width="31" height="19" rx="7" {...a('chest_upper')} {...h('chest_upper')} />

      {/* Mid chest */}
      <rect x="95"  y="131" width="31" height="21" rx="7" {...a('chest_mid')} {...h('chest_mid')} />
      <rect x="134" y="131" width="31" height="21" rx="7" {...a('chest_mid')} {...h('chest_mid')} />

      {/* Lower chest */}
      <rect x="99"  y="154" width="27" height="17" rx="7" {...a('chest_lower')} {...h('chest_lower')} />
      <rect x="134" y="154" width="27" height="17" rx="7" {...a('chest_lower')} {...h('chest_lower')} />

      {/* Biceps */}
      <rect x="54"  y="126" width="22" height="62" rx="11" {...a('biceps')} {...h('biceps')} />
      <rect x="184" y="126" width="22" height="62" rx="11" {...a('biceps')} {...h('biceps')} />

      {/* Forearms */}
      <rect x="49"  y="192" width="20" height="76" rx="10" {...a('forearms')} {...h('forearms')} />
      <rect x="191" y="192" width="20" height="76" rx="10" {...a('forearms')} {...h('forearms')} />

      {/* Obliques */}
      <rect x="96"  y="180" width="13" height="64" rx="6" {...a('obliques')} {...h('obliques')} />
      <rect x="151" y="180" width="13" height="64" rx="6" {...a('obliques')} {...h('obliques')} />

      {/* Upper abs */}
      <rect x="111" y="178" width="38" height="30" rx="7" {...a('upper_abs')} {...h('upper_abs')} />

      {/* Lower abs */}
      <rect x="113" y="211" width="34" height="36" rx="7" {...a('lower_abs')} {...h('lower_abs')} />

      {/* Quads */}
      <rect x="99"  y="290" width="28" height="122" rx="13" {...a('quads')} {...h('quads')} />
      <rect x="133" y="290" width="28" height="122" rx="13" {...a('quads')} {...h('quads')} />

      {/* Calves gastrocnemius (visible from front) */}
      <rect x="102" y="420" width="21" height="68" rx="10" {...a('calves_gastro')} {...h('calves_gastro')} />
      <rect x="137" y="420" width="21" height="68" rx="10" {...a('calves_gastro')} {...h('calves_gastro')} />
    </svg>
  )
}

// ── Back view ─────────────────────────────────────────────────────────────────

function BackView({ scores, sel, hov, onSel, onHov, imb }: VP) {
  const a = (k: string): SVGAttrs => sha(k, scores, sel, hov, imb)
  const h = (k: string) => ({
    onClick:      () => onSel(k),
    onMouseEnter: () => onHov(k),
    onMouseLeave: () => onHov(null),
  })

  return (
    <svg viewBox="0 0 260 580" style={{ width: '100%', maxWidth: 220, display: 'block', userSelect: 'none' }}>
      <Silhouette />

      {/* Traps — horizontal band + narrowing below */}
      <rect x="90"  y="86"  width="80" height="18" rx="7" {...a('traps')} {...h('traps')} />
      <rect x="98"  y="104" width="64" height="16" rx="7" {...a('traps')} {...h('traps')} />

      {/* Lats — wings (render before triceps so triceps sit on top) */}
      <rect x="61"  y="108" width="22" height="74" rx="10" {...a('lats')} {...h('lats')} />
      <rect x="177" y="108" width="22" height="74" rx="10" {...a('lats')} {...h('lats')} />

      {/* Rear delts */}
      <ellipse cx="70"  cy="110" rx="14" ry="13" {...a('delt_rear')} {...h('delt_rear')} />
      <ellipse cx="190" cy="110" rx="14" ry="13" {...a('delt_rear')} {...h('delt_rear')} />

      {/* Rhomboids — between shoulder blades */}
      <rect x="101" y="122" width="58" height="34" rx="8" {...a('rhomboids')} {...h('rhomboids')} />

      {/* Triceps */}
      <rect x="54"  y="120" width="22" height="60" rx="11" {...a('triceps')} {...h('triceps')} />
      <rect x="184" y="120" width="22" height="60" rx="11" {...a('triceps')} {...h('triceps')} />

      {/* Forearms */}
      <rect x="49"  y="192" width="20" height="76" rx="10" {...a('forearms')} {...h('forearms')} />
      <rect x="191" y="192" width="20" height="76" rx="10" {...a('forearms')} {...h('forearms')} />

      {/* Lower back — erectors */}
      <rect x="106" y="162" width="48" height="78" rx="10" {...a('lower_back')} {...h('lower_back')} />

      {/* Glutes */}
      <rect x="97"  y="256" width="30" height="52" rx="13" {...a('glutes')} {...h('glutes')} />
      <rect x="133" y="256" width="30" height="52" rx="13" {...a('glutes')} {...h('glutes')} />

      {/* Hamstrings */}
      <rect x="99"  y="310" width="28" height="100" rx="13" {...a('hamstrings')} {...h('hamstrings')} />
      <rect x="133" y="310" width="28" height="100" rx="13" {...a('hamstrings')} {...h('hamstrings')} />

      {/* Gastrocnemius */}
      <rect x="102" y="418" width="22" height="74" rx="10" {...a('calves_gastro')} {...h('calves_gastro')} />
      <rect x="136" y="418" width="22" height="74" rx="10" {...a('calves_gastro')} {...h('calves_gastro')} />

      {/* Soleus */}
      <rect x="103" y="494" width="21" height="34" rx="8" {...a('calves_soleus')} {...h('calves_soleus')} />
      <rect x="136" y="494" width="21" height="34" rx="8" {...a('calves_soleus')} {...h('calves_soleus')} />

      {/* Spine guide line */}
      <line
        x1="130" y1="86" x2="130" y2="242"
        stroke="var(--border-subtle)" strokeWidth="0.8" strokeDasharray="3 4"
        style={{ pointerEvents: 'none' }}
      />
    </svg>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────

export function BodyMap({ view, scores, selected, onSelect, imbalancedKeys }: Props) {
  const [hovered, setHovered] = useState<string | null>(null)
  const handleHover = useCallback((key: string | null) => setHovered(key), [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
      {view === 'front'
        ? <FrontView scores={scores} sel={selected} hov={hovered} onSel={onSelect} onHov={handleHover} imb={imbalancedKeys} />
        : <BackView  scores={scores} sel={selected} hov={hovered} onSel={onSelect} onHov={handleHover} imb={imbalancedKeys} />
      }
      <MuscleLabel muscleKey={hovered ?? selected} scores={scores} />
    </div>
  )
}
