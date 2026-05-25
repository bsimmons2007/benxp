// XP-only pulse path: flat under "you", QRS spike under "xp", trails off
const PULSE_PATH = 'M 0 11 L 192 11 L 204 11 L 214 4 L 224 18 L 234 0 L 244 22 L 254 11 L 320 11'

interface WordmarkProps {
  size?:       number
  color?:      string
  accent?:     string
  showPulse?:  boolean
}

export function Wordmark({
  size      = 24,
  color     = 'var(--text-primary)',
  accent    = 'var(--color-coral)',
  showPulse = true,
}: WordmarkProps) {
  const strokeWidth = Math.max(2.6, size * 0.04)

  return (
    <span style={{ display: 'inline-block', lineHeight: 1 }}>
      <span style={{
        display:       'block',
        fontFamily:    '"Space Grotesk", system-ui, sans-serif',
        fontWeight:    700,
        fontSize:      size,
        letterSpacing: '-0.08em',
        lineHeight:    0.9,
        whiteSpace:    'nowrap',
        color,
      }}>
        you<span style={{ color: accent }}>xp</span>
      </span>
      {showPulse && (
        <svg
          width="100%"
          height={size * 0.25}
          viewBox="0 -2 320 28"
          preserveAspectRatio="none"
          style={{ display: 'block', marginTop: size * 0.06 }}
        >
          <path
            d={PULSE_PATH}
            stroke={accent}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinejoin="miter"
            strokeLinecap="square"
          />
        </svg>
      )}
    </span>
  )
}
