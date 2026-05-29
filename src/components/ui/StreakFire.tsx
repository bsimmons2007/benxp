// Flame decoration rendered next to streak counts >= 7

export function StreakFire() {
  return (
    <span
      aria-hidden
      style={{
        display: 'inline-block', width: 14, height: 20,
        position: 'relative', verticalAlign: 'middle', marginLeft: 3,
        flexShrink: 0,
      }}
    >
      {/* Outer flame */}
      <span style={{
        position: 'absolute', bottom: 0, left: '50%',
        width: 10, height: 16,
        background: 'linear-gradient(to top, #ef4444, #f97316)',
        borderRadius: '50% 50% 40% 40% / 60% 60% 40% 40%',
        animation: 'flameFlicker 0.65s ease-in-out infinite',
        opacity: 0.85,
      }} />
      {/* Inner flame */}
      <span style={{
        position: 'absolute', bottom: 2, left: '50%',
        width: 6, height: 10,
        background: 'linear-gradient(to top, #f97316, #fbbf24)',
        borderRadius: '50% 50% 40% 40% / 60% 60% 40% 40%',
        animation: 'flameFlicker 0.5s ease-in-out infinite 0.15s',
        opacity: 0.9,
      }} />
      {/* Core */}
      <span style={{
        position: 'absolute', bottom: 3, left: '50%',
        width: 3, height: 6,
        background: 'linear-gradient(to top, #fbbf24, #fef3c7)',
        borderRadius: '50% 50% 40% 40% / 60% 60% 40% 40%',
        animation: 'flameFlicker 0.4s ease-in-out infinite 0.08s',
        opacity: 0.95,
      }} />
    </span>
  )
}
