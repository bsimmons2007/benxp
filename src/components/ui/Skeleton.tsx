import type { CSSProperties } from 'react'

interface SkeletonProps {
  width?:        string | number
  height?:       string | number
  borderRadius?: string | number
  style?:        CSSProperties
}

export function Skeleton({ width = '100%', height = 16, borderRadius = 8, style }: SkeletonProps) {
  return (
    <div
      style={{
        width, height, borderRadius,
        background: 'linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.4s ease-in-out infinite',
        flexShrink: 0,
        ...style,
      }}
    />
  )
}

/** Matches the StatCard shape exactly */
export function StatCardSkeleton() {
  return (
    <div style={{
      padding: '10px 12px', borderRadius: 12,
      background: 'rgba(16,24,52,0.6)', border: '1px solid rgba(255,255,255,0.08)',
    }}>
      <Skeleton height={10} width="55%" borderRadius={4} style={{ marginBottom: 10 }} />
      <Skeleton height={20} width="70%" borderRadius={4} />
    </div>
  )
}

/** A generic single-line text placeholder */
export function TextSkeleton({ width = '60%' }: { width?: string | number }) {
  return <Skeleton height={12} width={width} borderRadius={4} />
}
