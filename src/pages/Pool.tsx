import { GameLogPage } from '../components/GameLogPage'
import type { GameLogConfig } from '../components/GameLogPage'
import { usePageTitle } from '../hooks/usePageTitle'
import { XP_RATES } from '../lib/xp'
import { PoolIcon } from '../components/ui/Icon'
import type { PoolGame } from '../types'

const GAME_TYPES = ['8-Ball', '9-Ball', '10-Ball', 'Straight Pool', 'One Pocket', 'Bank Pool']

const config: GameLogConfig<PoolGame> = {
  table: 'pool_games',
  title: 'Pool',
  backTo: '/hobbies',
  Icon: PoolIcon,
  emptyTitle: 'No games logged yet',
  emptySub: 'Log your first pool game to start tracking wins and break & runs.',
  logButtonLabel: 'Log Game',
  resultMode: 'winloss',
  selectField: { key: 'game_type', label: 'Game Type', options: GAME_TYPES },
  textFields: [
    { key: 'opponent', label: 'Opponent (optional)', placeholder: 'Name…' },
    { key: 'run_count', label: 'Run Count (optional)', placeholder: 'e.g. 5', type: 'number' },
    { key: 'notes', label: 'Notes (optional)', placeholder: 'Location, table…' },
  ],
  toggleField: { key: 'break_and_run', label: 'Break & Run', hint: `+${XP_RATES.pool_break_and_run} XP` },
  buildInsert: (d) => ({
    opponent: d.opponent || null,
    run_count: d.run_count ? parseInt(d.run_count) : null,
    notes: d.notes || null,
  }),
  xp: (win, _r, toggle) => XP_RATES.pool_game + (win ? XP_RATES.pool_win : 0) + (toggle ? XP_RATES.pool_break_and_run : 0),
  toast: (r) => (r === 'win' ? "Rack 'em!" : 'Keep shooting!'),
  extraStats: [
    { label: 'Wins', value: (rows) => rows.filter(g => g.win).length },
    { label: 'Win Rate', value: (rows) => rows.length ? `${Math.round((rows.filter(g => g.win).length / rows.length) * 100)}%` : '—' },
    { label: 'Win Streak', value: (rows) => { let s = 0; for (const g of rows) { if (g.win) s++; else break } return s || '—' } },
    { label: 'Break & Runs', value: (rows) => rows.filter(g => g.break_and_run).length || '—' },
  ],
  historyTag: (r) => r.game_type,
  historySub: (r) => (r.break_and_run ? 'Break & Run' : r.opponent ? `vs ${r.opponent}` : null),
}

export function Pool() {
  usePageTitle('Pool')
  return <GameLogPage cfg={config} />
}
