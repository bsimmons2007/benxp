import type { CSSProperties, FC } from 'react'
import {
  type LucideProps,
  Home, Dumbbell, BookOpen, Moon, Gamepad2, Sword, Brain,
  PersonStanding, Droplets, Wind, User, Target, Ruler, Calendar,
  LayoutGrid, Trophy, Share2, TrendingUp, MoreHorizontal, Pencil,
  Trash2, Check, ChevronDown, ChevronRight, Plus, X, Flame, Zap,
  Bookmark, Bell, Star, Heart, ArrowUp, ArrowDown, Activity,
  Bike, Waves, Footprints, Search, Crown, Shield, Diamond, Rocket,
  Mountain, Snowflake, Terminal, Volleyball, Flag,
  Disc3, Sparkles, Grid3x3, Sun, Sprout, Bird,
  Orbit, Crosshair, Radio, Table2,
} from 'lucide-react'

export type IconProps = { size?: number; color?: string; style?: CSSProperties; className?: string }
export type IconComponent = (props: IconProps) => React.ReactElement

// Adapt Lucide's props to our IconProps interface
function adapt(LucideIcon: FC<LucideProps>): IconComponent {
  return ({ size = 20, color = 'currentColor', style, className }) => (
    <LucideIcon size={size} color={color} style={{ display: 'block', flexShrink: 0, ...style }} className={className} strokeWidth={1.6} />
  )
}

export const HomeIcon        = adapt(Home)
export const DumbbellIcon    = adapt(Dumbbell)
export const BookIcon        = adapt(BookOpen)
export const MoonIcon        = adapt(Moon)
export const GamepadIcon     = adapt(Gamepad2)
export const SwordIcon       = adapt(Sword)
export const BrainIcon       = adapt(Brain)
export const RunIcon         = adapt(PersonStanding)
export const DropletIcon     = adapt(Droplets)
export const SkateIcon       = adapt(Wind)
export const PersonIcon      = adapt(User)
export const TargetIcon      = adapt(Target)
export const RulerIcon       = adapt(Ruler)
export const CalendarIcon    = adapt(Calendar)
export const GridIcon        = adapt(LayoutGrid)
export const TrophyIcon      = adapt(Trophy)
export const ShareIcon       = adapt(Share2)
export const TrendingIcon    = adapt(TrendingUp)
export const DotsIcon        = adapt(MoreHorizontal)
export const EditIcon        = adapt(Pencil)
export const TrashIcon       = adapt(Trash2)
export const CheckIcon       = adapt(Check)
export const ChevronIcon     = adapt(ChevronDown)
export const ChevronRightIcon = adapt(ChevronRight)
export const PlusIcon        = adapt(Plus)
export const CloseIcon       = adapt(X)
export const FlameIcon       = adapt(Flame)
export const ZapIcon         = adapt(Zap)
export const BookmarkIcon    = adapt(Bookmark)
export const BellIcon        = adapt(Bell)
export const StarIcon        = adapt(Star)
export const HeartIcon       = adapt(Heart)
export const ArrowUpIcon     = adapt(ArrowUp)
export const ArrowDownIcon   = adapt(ArrowDown)
export const ActivityIcon    = adapt(Activity)
export const BikeIcon        = adapt(Bike)
export const SwimIcon        = adapt(Waves)
export const WalkIcon        = adapt(Footprints)
export const SearchIcon      = adapt(Search)
export const CrownIcon       = adapt(Crown)
export const ShieldIcon      = adapt(Shield)
export const DiamondIcon     = adapt(Diamond)
export const RocketIcon      = adapt(Rocket)
export const MountainIcon    = adapt(Mountain)
export const SnowflakeIcon   = adapt(Snowflake)
export const TerminalIcon    = adapt(Terminal)
export const VolleyballIcon  = adapt(Volleyball)
export const SpikeballIcon   = adapt(Radio)
export const PoolIcon        = adapt(Crosshair)
export const TableTennisIcon = adapt(Table2)
export const ChessIcon       = adapt(Grid3x3)
export const GolfIcon        = adapt(Flag)
export const DiscIcon        = adapt(Disc3)
export const BasketballIcon  = adapt(Orbit)
export const HobbiesIcon     = adapt(Sparkles)
export const SunIcon         = adapt(Sun)
export const SproutIcon      = adapt(Sprout)
export const BirdIcon        = adapt(Bird)

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
  hobbies:    HobbiesIcon,
}

const ACTIVITY_ICON_MAP: Record<string, IconComponent> = {
  run:          RunIcon,
  bike:         BikeIcon,
  swim:         SwimIcon,
  walk:         WalkIcon,
  skate:        SkateIcon,
  lift:         DumbbellIcon,
  book:         BookIcon,
  game:         GamepadIcon,
  fortnite:     GamepadIcon,
  basketball:   BasketballIcon,
  pickleball:   TargetIcon,
  golf:         GolfIcon,
  disc_golf:    DiscIcon,
  hiking:       MountainIcon,
  table_tennis: TableTennisIcon,
  chess:        ChessIcon,
  pool:         PoolIcon,
  volleyball:   VolleyballIcon,
  spikeball:    SpikeballIcon,
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

// ── Badge icon map ─────────────────────────────────────────────

const BADGE_ICON_MAP: Record<string, IconComponent> = {
  Star:        StarIcon,
  Fire:        FlameIcon,
  Rocket:      RocketIcon,
  Gem:         DiamondIcon,
  Crown:       CrownIcon,
  Zap:         ZapIcon,
  Up:          ArrowUpIcon,
  Target:      TargetIcon,
  Shield:      ShieldIcon,
  Trophy:      TrophyIcon,
  Done:        CheckIcon,
  Sword:       SwordIcon,
  Strong:      DumbbellIcon,
  Chart:       ActivityIcon,
  Cal:         CalendarIcon,
  Skate:       SkateIcon,
  Read:        BookIcon,
  Books:       BookIcon,
  Brain:       BrainIcon,
  Game:        GamepadIcon,
  Moon:        MoonIcon,
  Mtn:         MountainIcon,
  Files:       GridIcon,
  Activity:    ActivityIcon,
  Basketball:  BasketballIcon,
  Golf:        GolfIcon,
  Disc:        DiscIcon,
  Paddle:      TableTennisIcon,
  Chess:       ChessIcon,
  Pool:        PoolIcon,
  Volleyball:  VolleyballIcon,
  Spikeball:   SpikeballIcon,
}

export function BadgeIcon({ icon, size = 18, color = 'currentColor', style }: {
  icon: string; size?: number; color?: string; style?: CSSProperties
}) {
  const Comp = BADGE_ICON_MAP[icon] ?? StarIcon
  return <Comp size={size} color={color} style={style} />
}

// ── Ambient scene icon ─────────────────────────────────────────

const AMBIENT_ICON_MAP: Record<string, IconComponent> = {
  cosmic: RocketIcon,
  forest: MountainIcon,
  ocean:  DropletIcon,
  ember:  FlameIcon,
  arctic: SnowflakeIcon,
  lofi:   BookIcon,
}

export function AmbientSceneIcon({ id, size = 14, color = 'currentColor', style }: {
  id: string; size?: number; color?: string; style?: CSSProperties
}) {
  const Comp = AMBIENT_ICON_MAP[id] ?? ActivityIcon
  return <Comp size={size} color={color} style={style} />
}
