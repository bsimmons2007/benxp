import { GameLogPage } from '../components/GameLogPage'
import type { GameLogConfig } from '../components/GameLogPage'
import { usePageTitle } from '../hooks/usePageTitle'
import { XP_RATES } from '../lib/xp'
import { TargetIcon } from '../components/ui/Icon'
import type { PickleballGame } from '../types'

const config: GameLogConfig<PickleballGame> = {
  table: 'pickleball_games',
  title: 'Pickleball',
  backTo: '/hobbies',
  Icon: TargetIcon,
  emptyTitle: 'No games logged yet',
  emptySub: 'Log your first pickleball game to start tracking wins and streaks.',
  logButtonLabel: 'Log Game',
  resultMode: 'winloss',
  hasScores: true,
  selectField: { key: 'game_type', label: 'Game Type', options: ['Singles', 'Doubles'] },
  filterField: 'game_type',
  textFields: [
    { key: 'opponent', label: 'Opponent (optional)', placeholder: 'John' },
    { key: 'notes', label: 'Notes (optional)', placeholder: 'Great drop shots' },
  ],
  buildInsert: (d) => ({ opponent: d.opponent || null, notes: d.notes || null }),
  xp: (win) => XP_RATES.pickleball_game + (win ? XP_RATES.pickleball_win : 0),
  toast: (r) => (r === 'win' ? 'Dink master!' : 'Keep grinding!'),
  historyTag: (r) => r.game_type,
  historySub: (r) => (r.opponent ? `vs ${r.opponent}` : null),
}

export function Pickleball() {
  usePageTitle('Pickleball')
  return <GameLogPage cfg={config} />
}
