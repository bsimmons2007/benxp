interface MarkProps {
  size?:  number
  color?: string
}

// The primary brand mark: italic XP + baseline-aligned coral dot.
// Space Grotesk has no italic variant — skewX(-10deg) synthesizes the lean.
export function Mark({ size = 28, color = 'var(--color-coral)' }: MarkProps) {
  const dotSize = size * 0.22
  const gap     = size * 0.02

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'baseline',
      gap,
      lineHeight: 1,
      whiteSpace: 'nowrap',
      flexShrink: 0,
    }}>
      <span style={{
        fontFamily:    '"Space Grotesk", system-ui, sans-serif',
        fontWeight:    700,
        fontSize:      size,
        letterSpacing: '-0.08em',
        color,
        lineHeight:    1,
        display:       'inline-block',
        transform:     'skewX(-10deg)',
        transformOrigin: 'bottom left',
      }}>XP</span>
      <span style={{
        width:          dotSize,
        height:         dotSize,
        borderRadius:   '50%',
        background:     color,
        display:        'inline-block',
        verticalAlign:  'baseline',
        flexShrink:     0,
      }} />
    </span>
  )
}
