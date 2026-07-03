import { GameLogPage } from '../components/GameLogPage'
import type { GameLogConfig } from '../components/GameLogPage'
import { usePageTitle } from '../hooks/usePageTitle'
import { XP_RATES } from '../lib/xp'
import { TableTennisIcon } from '../components/ui/Icon'
import type { TableTennisGame } from '../types'

const config: GameLogConfig<TableTennisGame> = {
  table: 'table_tennis_games',
  title: 'Table Tennis',
  backTo: '/hobbies',
  Icon: TableTennisIcon,
  emptyTitle: 'No games logged yet',
  emptySub: 'Log your first table tennis game to start tracking wins and streaks.',
  logButtonLabel: 'Log Game',
  resultMode: 'winloss',
  hasScores: true,
  selectField: { key: 'game_type', label: 'Game Type', options: ['Singles', 'Doubles'] },
  filterField: 'game_type',
  textFields: [
    { key: 'opponent', label: 'Opponent (optional)', placeholder: 'John' },
    { key: 'notes', label: 'Notes (optional)', placeholder: 'Best-of-5 match…' },
  ],
  buildInsert: (d) => ({ opponent: d.opponent || null, notes: d.notes || null }),
  xp: (win) => XP_RATES.table_tennis_game + (win ? XP_RATES.table_tennis_win : 0),
  toast: (r) => (r === 'win' ? 'Game, set, match!' : 'Keep grinding!'),
  historyTag: (r) => r.game_type,
  historySub: (r) => (r.opponent ? `vs ${r.opponent}` : null),
}

export function TableTennis() {
  usePageTitle('Table Tennis')
  return <GameLogPage cfg={config} />
}
