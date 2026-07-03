import { GameLogPage } from '../components/GameLogPage'
import type { GameLogConfig } from '../components/GameLogPage'
import { usePageTitle } from '../hooks/usePageTitle'
import { XP_RATES } from '../lib/xp'
import { SpikeballIcon } from '../components/ui/Icon'
import type { SpikeballGame } from '../types'

const config: GameLogConfig<SpikeballGame> = {
  table: 'spikeball_games',
  title: 'Spikeball',
  backTo: '/hobbies',
  Icon: SpikeballIcon,
  emptyTitle: 'No games logged yet',
  emptySub: 'Log your first spikeball game to start tracking wins and streaks.',
  logButtonLabel: 'Log Game',
  resultMode: 'winloss',
  hasScores: true,
  textFields: [
    { key: 'partner', label: 'Partner (optional)', placeholder: 'Name…' },
    { key: 'opponents', label: 'Opponents (optional)', placeholder: 'Names…' },
    { key: 'notes', label: 'Notes (optional)', placeholder: 'Location…' },
  ],
  buildInsert: (d) => ({ partner: d.partner || null, opponents: d.opponents || null, notes: d.notes || null }),
  xp: (win) => XP_RATES.spikeball_game + (win ? XP_RATES.spikeball_win : 0),
  toast: (r) => (r === 'win' ? 'Spike!' : 'Keep it up!'),
  historySub: (r) => (r.partner ? `w/ ${r.partner}` : null),
}

export function Spikeball() {
  usePageTitle('Spikeball')
  return <GameLogPage cfg={config} />
}
