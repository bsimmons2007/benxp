// Gauge-ring mood face (Style C from design spec).
// value 1–10 drives expression morph, color ramp, and ring fill.
// Created from the YouXP mood face design handoff.

// ── Color math ────────────────────────────────────────────────

function clamp(v: number, a: number, b: number) { return Math.max(a, Math.min(b, v)) }
function lerp(a: number, b: number, t: number)  { return a + (b - a) * t }

function parseRGB(s: string): [number, number, number] {
  if (s[0] === '#') {
    const h = s.slice(1)
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
  }
  const m = s.match(/\d+/g)!
  return [+m[0], +m[1], +m[2]]
}

function mixColor(a: string, b: string, t: number): string {
  const A = parseRGB(a), B = parseRGB(b)
  return `rgb(${A.map((x, i) => Math.round(lerp(x, B[i], t))).join(',')})`
}

type ColorStop = [number, string]
function ramp(stops: ColorStop[], t: number): string {
  for (let i = 0; i < stops.length - 1; i++) {
    const [p0, c0] = stops[i], [p1, c1] = stops[i + 1]
    if (t <= p1) return mixColor(c0, c1, (t - p0) / (p1 - p0))
  }
  return stops[stops.length - 1][1]
}

// Reusable: returns the face fill color for a given mood value.
export function moodFaceColor(value: number): string {
  const t = clamp((value - 1) / 9, 0, 1)
  return ramp([[0, '#9e2b25'], [0.5, '#d6a13c'], [1, '#2f8b52']], t)
}

// ── Parameter computation ─────────────────────────────────────

interface FaceParams {
  faceFill: string; faceEdge: string
  glow: number; gloom: number
  eyeY: number; cxL: number; cxR: number; pupilR: number
  browInY: number; browOutY: number
  my: number; mw: number; k: number; cornerY: number; mouthOpen: number
  lid: number; tear: number; ink: string
}

function moodFaceParams(value: number): FaceParams {
  const t = clamp((value - 1) / 9, 0, 1)
  const m = t * 2 - 1                         // -1 sad … 0 neutral … +1 happy

  const faceFill = ramp([[0, '#9e2b25'], [0.5, '#d6a13c'], [1, '#2f8b52']], t)
  const faceEdge = ramp([[0, '#791f1a'], [0.5, '#b3842c'], [1, '#246b3f']], t)

  const glow  = clamp((t - 0.45) / 0.55, 0, 1)
  const gloom = clamp((0.45 - t) / 0.45, 0, 1)

  const eyeY  = lerp(108, 96, t)
  const cxL   = 70, cxR = 130
  const pupilR = lerp(6.5, 8.5, t)

  const browY    = lerp(78, 66, t)
  const sadAmt   = Math.max(0, -m)
  const hapAmt   = Math.max(0, m)
  const browInY  = browY - sadAmt * 8
  const browOutY = browY + sadAmt * 5 - hapAmt * 3

  const my        = lerp(152, 146, t)
  const mw        = lerp(26, 36, t)
  const k         = m * 32
  const cornerY   = my - m * 12
  const mouthOpen = clamp((t - 0.82) / 0.18, 0, 1)

  const lid  = gloom
  const tear = clamp((0.16 - t) / 0.16, 0, 1)

  return { faceFill, faceEdge, glow, gloom, eyeY, cxL, cxR, pupilR,
    browInY, browOutY, my, mw, k, cornerY, mouthOpen, lid, tear, ink: '#26262f' }
}

// ── Shared face features (eyes / brows / mouth / tear) ────────

function FaceFeatures({ p }: { p: FaceParams }) {
  const { ink } = p
  const cx = 100
  return (
    <g>
      {/* Eyes + sparkle + sad eyelid */}
      {([p.cxL, p.cxR] as number[]).map((ex, i) => (
        <g key={i}>
          <circle cx={ex} cy={p.eyeY} r={p.pupilR} fill={ink} />
          <circle
            cx={ex - p.pupilR * 0.35} cy={p.eyeY - p.pupilR * 0.4}
            r={p.pupilR * 0.32} fill="#fff"
            opacity={0.5 + 0.5 * p.glow}
          />
          <path
            d={`M ${ex - 13} ${p.eyeY - 9} Q ${ex} ${p.eyeY - 4 + 8 * p.lid} ${ex + 13} ${p.eyeY - 9}`}
            fill="none" stroke={ink} strokeWidth={3} strokeLinecap="round" opacity={p.lid}
          />
        </g>
      ))}

      {/* Tear */}
      <path
        d={`M ${p.cxL + 6} ${p.eyeY + 8} q -5 9 0 14 q 5 -5 0 -14 z`}
        fill="#5b9bd6" opacity={p.tear}
      />

      {/* Eyebrows */}
      <path d={`M ${p.cxL - 16} ${p.browOutY} L ${p.cxL + 12} ${p.browInY}`} stroke={ink} strokeWidth={6.5} strokeLinecap="round" />
      <path d={`M ${p.cxR + 16} ${p.browOutY} L ${p.cxR - 12} ${p.browInY}`} stroke={ink} strokeWidth={6.5} strokeLinecap="round" />

      {/* Mouth — open grin at the very top, always the lip stroke */}
      {p.mouthOpen > 0.02 && (
        <path
          d={`M ${cx - p.mw} ${p.cornerY} Q ${cx} ${p.my + p.k} ${cx + p.mw} ${p.cornerY} Q ${cx} ${p.my + p.k * 0.4} ${cx - p.mw} ${p.cornerY} Z`}
          fill="#7a2b2b" opacity={p.mouthOpen}
        />
      )}
      <path
        d={`M ${cx - p.mw} ${p.cornerY} Q ${cx} ${p.my + p.k} ${cx + p.mw} ${p.cornerY}`}
        fill="none" stroke={ink} strokeWidth={6.5} strokeLinecap="round"
      />
    </g>
  )
}

// ── Gauge ring face (Style C — approved) ─────────────────────

export function MoodFaceGauge({ value, size = 92 }: { value: number; size?: number }) {
  const p      = moodFaceParams(value)
  const cx     = 100, cy = 104
  const ringR  = 80, sw = 11
  const C      = 2 * Math.PI * ringR
  const frac   = clamp(value / 10, 0, 1)    // 5 = half ring, 10 = full ring
  const innerR = 60
  const s      = innerR / 84                 // scale features into inner disc
  const fill   = mixColor(p.faceFill, '#ffffff', 0.78)

  return (
    <svg
      viewBox="0 0 200 210"
      width={size}
      height={Math.round(size * 210 / 200)}
      style={{ display: 'block', overflow: 'visible' }}
    >
      {/* Inner face disc */}
      <circle cx={cx} cy={cy} r={innerR} fill={fill} />

      {/* Gauge track + progress ring (starts at 12 o'clock) */}
      <g transform={`rotate(-90 ${cx} ${cy})`}>
        <circle cx={cx} cy={cy} r={ringR} fill="none" stroke="rgba(13,13,26,0.10)" strokeWidth={sw} />
        <circle
          cx={cx} cy={cy} r={ringR} fill="none"
          stroke={p.faceFill} strokeWidth={sw}
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={C * (1 - frac)}
          style={{ transition: 'stroke-dashoffset 0.3s ease, stroke 0.3s ease' }}
        />
      </g>

      {/* Face features scaled into the inner disc */}
      <g transform={`translate(${cx} ${cy}) scale(${s}) translate(${-cx} ${-cy})`}>
        <FaceFeatures p={p} />
      </g>
    </svg>
  )
}
