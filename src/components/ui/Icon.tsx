/**
 * Icon — lightweight SVG icon system.
 * All icons are 20×20 viewBox, stroke-based, consistent 1.5px stroke.
 * Import named exports: <Icon name="dumbbell" size={18} />
 */

import type { CSSProperties } from 'react'

interface IconProps {
  size?:   number
  color?:  string
  style?:  CSSProperties
  className?: string
}

export type IconComponent = (props: IconProps) => React.ReactElement

// ── Primitives ────────────────────────────────────────────────

const base = (size: number, color: string, style?: CSSProperties, className?: string) => ({
  width:   size,
  height:  size,
  viewBox: '0 0 20 20',
  fill:    'none',
  style:   { display: 'block', flexShrink: 0, ...style },
  className,
  stroke:        color,
  strokeWidth:   1.6,
  strokeLinecap: 'round'  as const,
  strokeLinejoin:'round'  as const,
})

// ── Navigation icons ──────────────────────────────────────────

export const HomeIcon: IconComponent = ({ size = 20, color = 'currentColor', style, className }) => (
  <svg {...base(size, color, style, className)}>
    <path d="M3 9.5L10 3l7 6.5V17a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5Z" />
    <path d="M7.5 18V12h5v6" />
  </svg>
)

export const DumbbellIcon: IconComponent = ({ size = 20, color = 'currentColor', style, className }) => (
  <svg {...base(size, color, style, className)}>
    <path d="M6.5 6.5v7M13.5 6.5v7" />
    <path d="M4 8.5v3M16 8.5v3" />
    <path d="M6.5 10h7" />
    <rect x="3" y="8" width="2" height="4" rx="1" />
    <rect x="15" y="8" width="2" height="4" rx="1" />
    <rect x="5.5" y="6" width="2" height="8" rx="1" />
    <rect x="12.5" y="6" width="2" height="8" rx="1" />
  </svg>
)

export const BookIcon: IconComponent = ({ size = 20, color = 'currentColor', style, className }) => (
  <svg {...base(size, color, style, className)}>
    <path d="M4 3h10a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
    <path d="M7 3v14M7 3h9" />
    <path d="M10 8h4M10 11h4M10 14h2" />
  </svg>
)

export const MoonIcon: IconComponent = ({ size = 20, color = 'currentColor', style, className }) => (
  <svg {...base(size, color, style, className)}>
    <path d="M17.5 12.5A7.5 7.5 0 1 1 7.5 2.5a5.5 5.5 0 0 0 10 10Z" />
  </svg>
)

export const GamepadIcon: IconComponent = ({ size = 20, color = 'currentColor', style, className }) => (
  <svg {...base(size, color, style, className)}>
    <rect x="2" y="6" width="16" height="10" rx="3" />
    <path d="M6 11h4M8 9v4" />
    <circle cx="13" cy="10" r="0.75" fill={color} stroke="none" />
    <circle cx="15" cy="12" r="0.75" fill={color} stroke="none" />
  </svg>
)

export const SwordIcon: IconComponent = ({ size = 20, color = 'currentColor', style, className }) => (
  <svg {...base(size, color, style, className)}>
    <path d="M14.5 2L18 5.5l-9 9-3.5.5.5-3.5 9-9Z" />
    <path d="M2 18l3-3M12 4l4 4" />
  </svg>
)

export const BrainIcon: IconComponent = ({ size = 20, color = 'currentColor', style, className }) => (
  <svg {...base(size, color, style, className)}>
    <path d="M10 4c0-1.1.9-2 2-2a2 2 0 0 1 2 2c1.1 0 2 .9 2 2s-.9 2-2 2v1c1.1 0 2 .9 2 2s-.9 2-2 2a2 2 0 0 1-2 2c0 1.1-.9 2-2 2" />
    <path d="M10 4c0-1.1-.9-2-2-2a2 2 0 0 0-2 2c-1.1 0-2 .9-2 2s.9 2 2 2v1c-1.1 0-2 .9-2 2s.9 2 2 2a2 2 0 0 0 2 2c0 1.1.9 2 2 2" />
    <line x1="10" y1="4" x2="10" y2="18" />
  </svg>
)

export const RunIcon: IconComponent = ({ size = 20, color = 'currentColor', style, className }) => (
  <svg {...base(size, color, style, className)}>
    <circle cx="13" cy="3.5" r="1.5" />
    <path d="M10 7l2 1.5 1 3.5H9.5L7 15" />
    <path d="M12 8.5l2 2.5h3" />
    <path d="M13.5 12l-1.5 4.5" />
    <path d="M8 9l-2 1" />
  </svg>
)

export const DropletIcon: IconComponent = ({ size = 20, color = 'currentColor', style, className }) => (
  <svg {...base(size, color, style, className)}>
    <path d="M10 2L5 10a5 5 0 1 0 10 0L10 2Z" />
  </svg>
)

export const SkateIcon: IconComponent = ({ size = 20, color = 'currentColor', style, className }) => (
  <svg {...base(size, color, style, className)}>
    <path d="M3 13h10l2-5h-4l-2 5" />
    <path d="M4 13l-1 3h12l1-3" />
    <circle cx="6" cy="17" r="1.2" />
    <circle cx="12" cy="17" r="1.2" />
    <path d="M10 8 C10 8, 12 5, 16 6" />
  </svg>
)

// ── Secondary nav icons ───────────────────────────────────────

export const PersonIcon: IconComponent = ({ size = 20, color = 'currentColor', style, className }) => (
  <svg {...base(size, color, style, className)}>
    <circle cx="10" cy="7" r="3.5" />
    <path d="M3 18c0-3.87 3.13-7 7-7s7 3.13 7 7" />
  </svg>
)

export const TargetIcon: IconComponent = ({ size = 20, color = 'currentColor', style, className }) => (
  <svg {...base(size, color, style, className)}>
    <circle cx="10" cy="10" r="7.5" />
    <circle cx="10" cy="10" r="4.5" />
    <circle cx="10" cy="10" r="1.5" fill={color} stroke="none" />
  </svg>
)

export const RulerIcon: IconComponent = ({ size = 20, color = 'currentColor', style, className }) => (
  <svg {...base(size, color, style, className)}>
    <rect x="2" y="6" width="16" height="8" rx="1.5" />
    <path d="M5 10V8M8 10V7M11 10V8M14 10V7" />
  </svg>
)

export const CalendarIcon: IconComponent = ({ size = 20, color = 'currentColor', style, className }) => (
  <svg {...base(size, color, style, className)}>
    <rect x="2.5" y="3.5" width="15" height="15" rx="2" />
    <path d="M2.5 8.5h15" />
    <path d="M6.5 2v3M13.5 2v3" />
    <path d="M6 12h2M11 12h2M6 15.5h2M11 15.5h2" />
  </svg>
)

export const GridIcon: IconComponent = ({ size = 20, color = 'currentColor', style, className }) => (
  <svg {...base(size, color, style, className)}>
    <rect x="2.5" y="2.5" width="6" height="6" rx="1.5" />
    <rect x="11.5" y="2.5" width="6" height="6" rx="1.5" />
    <rect x="2.5" y="11.5" width="6" height="6" rx="1.5" />
    <rect x="11.5" y="11.5" width="6" height="6" rx="1.5" />
  </svg>
)

export const TrophyIcon: IconComponent = ({ size = 20, color = 'currentColor', style, className }) => (
  <svg {...base(size, color, style, className)}>
    <path d="M6 3h8v6a4 4 0 0 1-8 0V3Z" />
    <path d="M6 6H3.5a2.5 2.5 0 0 0 2.5 4" />
    <path d="M14 6h2.5a2.5 2.5 0 0 1-2.5 4" />
    <path d="M10 13v2.5M7 17h6" />
  </svg>
)

export const ShareIcon: IconComponent = ({ size = 20, color = 'currentColor', style, className }) => (
  <svg {...base(size, color, style, className)}>
    <path d="M4 10v6a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-6" />
    <path d="M13 6l-3-3-3 3" />
    <path d="M10 3v10" />
  </svg>
)

export const TrendingIcon: IconComponent = ({ size = 20, color = 'currentColor', style, className }) => (
  <svg {...base(size, color, style, className)}>
    <path d="M2 14l5-5 4 4 7-7" />
    <path d="M14 6h4v4" />
  </svg>
)

export const DotsIcon: IconComponent = ({ size = 20, color = 'currentColor', style, className }) => (
  <svg {...base(size, color, style, className)}>
    <circle cx="5" cy="10" r="1.5" fill={color} stroke="none" />
    <circle cx="10" cy="10" r="1.5" fill={color} stroke="none" />
    <circle cx="15" cy="10" r="1.5" fill={color} stroke="none" />
  </svg>
)

// ── Action icons ──────────────────────────────────────────────

export const EditIcon: IconComponent = ({ size = 14, color = 'currentColor', style, className }) => (
  <svg {...base(size, color, style, className)}>
    <path d="M14 3a1.414 1.414 0 0 1 2 2L5 16H3v-2L14 3Z" />
    <path d="M12 5l2 2" />
  </svg>
)

export const TrashIcon: IconComponent = ({ size = 16, color = 'currentColor', style, className }) => (
  <svg {...base(size, color, style, className)}>
    <path d="M3.5 5.5h13M8.5 5.5V4a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 .5.5v1.5" />
    <path d="M5 5.5l.75 10.5h8.5L15 5.5" />
    <path d="M8 8.5v5M12 8.5v5" />
  </svg>
)

export const CheckIcon: IconComponent = ({ size = 16, color = 'currentColor', style, className }) => (
  <svg {...base(size, color, style, className)}>
    <path d="M3 10l5 5 9-9" />
  </svg>
)

export const ChevronIcon: IconComponent = ({ size = 16, color = 'currentColor', style, className }) => (
  <svg {...base(size, color, style, className)}>
    <path d="M5 7.5l5 5 5-5" />
  </svg>
)

export const ChevronRightIcon: IconComponent = ({ size = 16, color = 'currentColor', style, className }) => (
  <svg {...base(size, color, style, className)}>
    <path d="M7.5 5l5 5-5 5" />
  </svg>
)

export const PlusIcon: IconComponent = ({ size = 16, color = 'currentColor', style, className }) => (
  <svg {...base(size, color, style, className)}>
    <path d="M10 3v14M3 10h14" />
  </svg>
)

export const CloseIcon: IconComponent = ({ size = 16, color = 'currentColor', style, className }) => (
  <svg {...base(size, color, style, className)}>
    <path d="M4 4l12 12M16 4L4 16" />
  </svg>
)

export const FlameIcon: IconComponent = ({ size = 20, color = 'currentColor', style, className }) => (
  <svg {...base(size, color, style, className)}>
    <path d="M10 2C10 2 14 6 14 10a4 4 0 0 1-8 0C6 7 8 5 8 5S7 9 10 10c0 0-1-4 0-8Z" fill={color} stroke="none" />
  </svg>
)

export const ZapIcon: IconComponent = ({ size = 16, color = 'currentColor', style, className }) => (
  <svg {...base(size, color, style, className)}>
    <path d="M11 2L4 11h6l-1 7 7-9h-6l1-7Z" fill={color} stroke="none" />
  </svg>
)

export const StarIcon: IconComponent = ({ size = 16, color = 'currentColor', style, className }) => (
  <svg {...base(size, color, style, className)}>
    <path d="M10 2l2.4 5 5.6.8-4 3.9.9 5.3L10 14.4l-4.9 2.6.9-5.3L2 8.8l5.6-.8L10 2Z" />
  </svg>
)

export const HeartIcon: IconComponent = ({ size = 16, color = 'currentColor', style, className }) => (
  <svg {...base(size, color, style, className)}>
    <path d="M10 16S3 11 3 6.5a4 4 0 0 1 7-2.65A4 4 0 0 1 17 6.5C17 11 10 16 10 16Z" />
  </svg>
)

export const ArrowUpIcon: IconComponent = ({ size = 12, color = 'currentColor', style, className }) => (
  <svg {...base(size, color, style, className)}>
    <path d="M10 15V5M5 10l5-5 5 5" />
  </svg>
)

export const ArrowDownIcon: IconComponent = ({ size = 12, color = 'currentColor', style, className }) => (
  <svg {...base(size, color, style, className)}>
    <path d="M10 5v10M5 10l5 5 5-5" />
  </svg>
)

export const ActivityIcon: IconComponent = ({ size = 20, color = 'currentColor', style, className }) => (
  <svg {...base(size, color, style, className)}>
    <path d="M2 10h3l2.5-6 3 12 2.5-9L15 10h3" />
  </svg>
)

export const BikeIcon: IconComponent = ({ size = 20, color = 'currentColor', style, className }) => (
  <svg {...base(size, color, style, className)}>
    <circle cx="5.5" cy="13.5" r="3.5" />
    <circle cx="14.5" cy="13.5" r="3.5" />
    <path d="M5.5 13.5L9 6.5h4l2 3M9 6.5l3.5 7" />
    <circle cx="13" cy="4.5" r="1.5" />
  </svg>
)

export const SwimIcon: IconComponent = ({ size = 20, color = 'currentColor', style, className }) => (
  <svg {...base(size, color, style, className)}>
    <path d="M3 13c2 0 2-2 4-2s2 2 4 2 2-2 4-2" />
    <path d="M3 16.5c2 0 2-2 4-2s2 2 4 2 2-2 4-2" />
    <circle cx="14" cy="5" r="1.5" />
    <path d="M14 6.5l-5 4.5h3" />
    <path d="M9 11l1.5 2.5" />
  </svg>
)

export const WalkIcon: IconComponent = ({ size = 20, color = 'currentColor', style, className }) => (
  <svg {...base(size, color, style, className)}>
    <circle cx="11" cy="3.5" r="1.5" />
    <path d="M10 6l2 3.5H8.5L7 13M12 9.5l1.5 4.5M7 13l-1.5 3.5M12 9.5L13 14" />
    <path d="M8.5 9.5L7 8" />
  </svg>
)

export const SearchIcon: IconComponent = ({ size = 20, color = 'currentColor', style, className }) => (
  <svg {...base(size, color, style, className)}>
    <circle cx="9" cy="9" r="5.5" />
    <path d="M13.5 13.5l3.5 3.5" />
  </svg>
)

export const CrownIcon: IconComponent = ({ size = 20, color = 'currentColor', style, className }) => (
  <svg {...base(size, color, style, className)}>
    <path d="M3 16h14M3 16v-5l3-7 3 7 1-8 1 8 3-7 3 7v5" />
  </svg>
)

export const ShieldIcon: IconComponent = ({ size = 20, color = 'currentColor', style, className }) => (
  <svg {...base(size, color, style, className)}>
    <path d="M10 2l7 2.5V9c0 4.5-3.5 7.5-7 9-3.5-1.5-7-4.5-7-9V4.5L10 2Z" />
  </svg>
)

export const DiamondIcon: IconComponent = ({ size = 20, color = 'currentColor', style, className }) => (
  <svg {...base(size, color, style, className)}>
    <path d="M4 8l6-6 6 6-6 10-6-10Z" />
    <path d="M4 8h12M7.5 3.5L4 8l6 10M12.5 3.5L16 8l-6 10" />
  </svg>
)

export const RocketIcon: IconComponent = ({ size = 20, color = 'currentColor', style, className }) => (
  <svg {...base(size, color, style, className)}>
    <path d="M10 2c-3 2-4 5-4 7v5h8v-5c0-2-1-5-4-7Z" />
    <path d="M6 14l-2.5 4M14 14l2.5 4" />
    <circle cx="10" cy="9.5" r="1.5" fill="none" />
  </svg>
)

export const MountainIcon: IconComponent = ({ size = 20, color = 'currentColor', style, className }) => (
  <svg {...base(size, color, style, className)}>
    <path d="M2 17L7.5 7l2.5 4 2.5-7L18 17" />
    <path d="M2 17h16" />
  </svg>
)

export const TerminalIcon: IconComponent = ({ size = 20, color = 'currentColor', style, className }) => (
  <svg {...base(size, color, style, className)}>
    <rect x="2" y="3.5" width="16" height="13" rx="2" />
    <path d="M6 9l3.5 3L6 15" />
    <path d="M13 15h3" />
  </svg>
)

export const BasketballIcon: IconComponent = ({ size = 20, color = 'currentColor', style, className }) => (
  <svg {...base(size, color, style, className)}>
    <circle cx="10" cy="10" r="8" />
    <path d="M2 10h16" />
    <path d="M10 2v16" />
    <path d="M4.5 4.5c3 3 3 8.5 0 11" />
    <path d="M15.5 4.5c-3 3-3 8.5 0 11" />
  </svg>
)

// ── Map: section key → icon component ─────────────────────────

const SECTION_ICON_MAP: Record<string, IconComponent> = {
  lifting:    DumbbellIcon,
  books:      BookIcon,
  skate:      SkateIcon,
  sleep:      MoonIcon,
  fortnite:   GamepadIcon,
  challenges: SwordIcon,
  mood:       BrainIcon,
  cardio:     RunIcon,
  water:      DropletIcon,
  basketball: BasketballIcon,
}

const ACTIVITY_ICON_MAP: Record<string, IconComponent> = {
  run:   RunIcon,
  bike:  BikeIcon,
  swim:  SwimIcon,
  walk:  WalkIcon,
  skate: SkateIcon,
}

export function SectionIcon({ sectionKey, size = 20, color = 'currentColor', style }: {
  sectionKey: string; size?: number; color?: string; style?: CSSProperties
}) {
  const Comp = SECTION_ICON_MAP[sectionKey]
  if (!Comp) return <span style={{ fontSize: size * 0.9 }}>●</span>
  return <Comp size={size} color={color} style={style} />
}

export function ActivityIconComp({ activityKey, size = 20, color = 'currentColor', style }: {
  activityKey: string; size?: number; color?: string; style?: CSSProperties
}) {
  const Comp = ACTIVITY_ICON_MAP[activityKey]
  if (!Comp) return <RunIcon size={size} color={color} style={style} />
  return <Comp size={size} color={color} style={style} />
}
