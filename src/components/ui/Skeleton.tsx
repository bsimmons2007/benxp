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
      background: 'rgba(16,24,52,0.6)', border: '1px solid var(--border-faint)',
    }}>
      <Skeleton height={10} width="55%" borderRadius={4} style={{ marginBottom: 10 }} />
      <Skeleton height={20} width="70%" borderRadius={4} />
    </div>
  )
}

/** Matches the PRHeroCard shape — tall card with left accent border */
export function PRHeroSkeleton() {
  return (
    <div style={{
      background: 'var(--card-bg)', border: '1px solid var(--border)',
      borderLeft: '3px solid var(--border)', borderRadius: 14, padding: '14px 16px',
    }}>
      <Skeleton height={10} width="50%" borderRadius={4} style={{ marginBottom: 8 }} />
      <Skeleton height={28} width="65%" borderRadius={5} style={{ marginBottom: 6 }} />
      <Skeleton height={8}  width="30%" borderRadius={4} />
    </div>
  )
}

/** Matches the SecondaryStatCard shape */
export function SecondaryStatSkeleton() {
  return (
    <div style={{
      background: 'var(--card-bg)', border: '1px solid var(--border)',
      borderLeft: '3px solid var(--border)', borderRadius: 12, padding: '12px 14px',
    }}>
      <Skeleton height={10} width="55%" borderRadius={4} style={{ marginBottom: 6 }} />
      <Skeleton height={22} width="60%" borderRadius={4} />
    </div>
  )
}

/** Matches an activity feed row */
export function ActivityRowSkeleton() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '10px 12px', borderRadius: 12,
      background: 'var(--card-bg)', border: '1px solid var(--border-faint)',
    }}>
      <Skeleton width={32} height={32} borderRadius={8} style={{ flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <Skeleton height={11} width="60%" borderRadius={4} style={{ marginBottom: 5 }} />
        <Skeleton height={9}  width="35%" borderRadius={4} />
      </div>
    </div>
  )
}

/** A generic single-line text placeholder */
export function TextSkeleton({ width = '60%' }: { width?: string | number }) {
  return <Skeleton height={12} width={width} borderRadius={4} />
}

/** Animated skeleton that mimics a chart with wavy lines */
export function ChartSkeleton({ height = 150, title }: { height?: number; title?: string }) {
  return (
    <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: 16, padding: '16px 16px 12px' }}>
      {title && <Skeleton height={13} width="40%" borderRadius={4} style={{ marginBottom: 10 }} />}
      <div style={{ position: 'relative', height, overflow: 'hidden' }}>
        {/* Fake chart bars / area */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: '100%', padding: '0 4px' }}>
          {[55, 70, 45, 80, 60, 90, 50, 75, 65, 85].map((h, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: `${h}%`,
                borderRadius: '4px 4px 0 0',
                background: 'linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%)',
                backgroundSize: '200% 100%',
                animation: `shimmer 1.4s ease-in-out infinite`,
                animationDelay: `${i * 0.07}s`,
              }}
            />
          ))}
        </div>
        {/* X-axis skeleton */}
        <div style={{ display: 'flex', gap: 6, marginTop: 8, padding: '0 4px' }}>
          {[40, 60, 35, 55, 45, 65, 40, 55, 50, 60].map((w, i) => (
            <Skeleton key={i} height={7} style={{ flex: 1 }} borderRadius={3} />
          ))}
        </div>
      </div>
    </div>
  )
}

/** Illustrated empty state for a chart with ghost sparkline */
export function ChartEmptyState({ title, message, color = 'var(--accent)' }: { title: string; message: string; color?: string }) {
  return (
    <div style={{
      background: 'var(--card-bg)', border: '1px solid var(--border)',
      borderRadius: 16, padding: '20px 16px 16px',
      marginBottom: 16,
    }}>
      <p style={{ fontFamily: 'Cinzel, serif', fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{title}</p>
      <div style={{ position: 'relative', height: 110, marginBottom: 8 }}>
        {/* Ghost sparkline SVG */}
        <svg width="100%" height="100%" viewBox="0 0 300 90" preserveAspectRatio="none" style={{ opacity: 0.18 }}>
          <defs>
            <linearGradient id="ghost-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.4} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <path d="M0,60 C30,55 60,30 90,35 S150,50 180,25 S240,40 270,20 L300,15 L300,90 L0,90 Z" fill="url(#ghost-grad)" />
          <path d="M0,60 C30,55 60,30 90,35 S150,50 180,25 S240,40 270,20 L300,15" fill="none" stroke={color} strokeWidth="2" strokeDasharray="6 4" />
        </svg>
        {/* Center message */}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>{message}</p>
        </div>
      </div>
    </div>
  )
}
