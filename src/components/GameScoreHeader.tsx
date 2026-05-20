import type { Match } from '../types';
import { computeTotals } from '../store/matches';
import { PlayerAvatar } from './PlayerAvatar';
import { CountUp } from './CountUp';

export function GameScoreHeader({
  match,
  totals: totalsOverride,
  labels: labelsOverride,
  avatarGroups,
}: {
  match: Match;
  totals?: number[];
  labels?: string[];
  avatarGroups?: string[][];
}) {
  const totals = totalsOverride ?? computeTotals(match);
  const labels = labelsOverride ?? match.players;

  return (
    <div className="card mb-3">
      <div className="flex items-center justify-between gap-2">
        {labels.map((player, i) => {
          const score = totals[i] ?? 0;
          const isBest = score === Math.max(...totals) && match.rounds.length > 0;
          const avatars = avatarGroups?.[i] ?? [player];
          return (
            <div key={`${player}-${i}`} className="flex min-w-0 flex-1 flex-col items-center gap-1">
              <div className="flex min-h-14 items-center justify-center -space-x-3 rtl:space-x-reverse">
                {avatars.map((name) => (
                  <PlayerAvatar key={name} name={name} size="lg" />
                ))}
              </div>
              <span className="max-w-full truncate text-xs font-semibold text-slate-600 dark:text-slate-300">
                {player}
              </span>
              <div
                className={
                  'mt-1 w-full max-w-[4.5rem] rounded-xl border-2 py-1.5 text-center text-sm font-extrabold transition ' +
                  (isBest
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : 'border-slate-300/60 text-slate-700 dark:border-white/10 dark:text-slate-200')
                }
              >
                <CountUp value={score} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
