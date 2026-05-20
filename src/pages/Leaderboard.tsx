import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Layout } from '../components/Layout';
import { useMatches } from '../store/matches';
import { useSettings } from '../store/settings';
import { PlayerAvatar } from '../components/PlayerAvatar';
import { EmptyState } from '../components/EmptyState';
import { Crown, Medal, Trophy } from 'lucide-react';

interface PlayerCard {
  name: string;
  matches: number;
  wins: number;
  losses: number;
  winRate: number;
}

function buildLeaderboard(matches: ReturnType<typeof useMatches.getState>['matches']): PlayerCard[] {
  const finished = matches.filter((m) => m.finished && m.winnerIndex !== undefined);
  const map = new Map<string, PlayerCard>();

  for (const m of finished) {
    const playerNames: string[] = [];
    const winnerSet = new Set<string>();

    if ((m.kind === 'hand-partners' || m.kind === 'tarneeb' || m.kind === 'trix-partners' || m.kind === 'complex-partners') && m.config?.originalNames?.length >= 4) {
      const oNames = m.config.originalNames as string[];
      // teams: [0]+[2] vs [1]+[3]
      playerNames.push(oNames[0], oNames[1], oNames[2], oNames[3]);
      const winnerIs = m.winnerIndex!;
      // winnerIndex 0 = team 0 = oNames[0] + oNames[2]
      const winners = winnerIs === 0 ? [oNames[0], oNames[2]] : [oNames[1], oNames[3]];
      winners.forEach((w) => winnerSet.add(w));
    } else {
      m.players.forEach((p, i) => {
        const parts = p.split(/ و | & /);
        parts.forEach((n) => {
          const trimmed = n.trim();
          playerNames.push(trimmed);
          if (i === m.winnerIndex) winnerSet.add(trimmed);
        });
      });
    }

    playerNames.forEach((name) => {
      const existing = map.get(name) ?? { name, matches: 0, wins: 0, losses: 0, winRate: 0 };
      existing.matches += 1;
      if (winnerSet.has(name)) existing.wins += 1;
      else existing.losses += 1;
      map.set(name, existing);
    });
  }

  const list = Array.from(map.values());
  list.forEach((p) => (p.winRate = p.matches > 0 ? p.wins / p.matches : 0));
  return list.sort((a, b) => b.wins - a.wins || b.winRate - a.winRate || a.losses - b.losses);
}

export default function Leaderboard() {
  const { matches } = useMatches();
  const { language } = useSettings();
  const en = language === 'en';

  const board = useMemo(() => buildLeaderboard(matches), [matches]);

  if (board.length === 0) {
    return (
      <Layout title={en ? 'Leaderboard' : 'المتصدرون'}>
        <EmptyState
          icon={Trophy}
          title={en ? 'No standings yet' : 'لا توجد لوحة بعد'}
          description={en ? 'Finish a match to enter the leaderboard' : 'أنهِ مباراة لدخول لوحة المتصدرين'}
        />
      </Layout>
    );
  }

  // Top 3 podium
  const top3 = board.slice(0, 3);
  const rest = board.slice(3);

  return (
    <Layout title={en ? 'Leaderboard' : 'المتصدرون'}>
      {/* Podium */}
      {top3.length > 0 && (
        <div className="mb-6 flex items-end justify-center gap-3 px-2 pt-6">
          {/* 2nd */}
          {top3[1] && (
            <PodiumPillar player={top3[1]} rank={2} height="h-24" en={en} delay={0.1} />
          )}
          {/* 1st */}
          {top3[0] && (
            <PodiumPillar player={top3[0]} rank={1} height="h-32" en={en} delay={0} />
          )}
          {/* 3rd */}
          {top3[2] && (
            <PodiumPillar player={top3[2]} rank={3} height="h-20" en={en} delay={0.2} />
          )}
        </div>
      )}

      {/* Rest of leaderboard */}
      {rest.length > 0 && (
        <div className="card space-y-1 p-2">
          {rest.map((p, idx) => (
            <motion.div
              key={p.name}
              initial={{ opacity: 0, x: en ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: idx * 0.04 }}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-black/[0.02] dark:hover:bg-white/[0.02]"
            >
              <span className="w-6 shrink-0 text-center text-xs font-bold text-slate-400">{idx + 4}</span>
              <PlayerAvatar name={p.name} size="md" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-bold text-slate-800 dark:text-white">{p.name}</div>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">{p.wins}W</span>
                  <span className="text-[11px] font-semibold text-red-500">{p.losses}L</span>
                </div>
              </div>
              <div className="shrink-0 text-end">
                <div className="text-sm font-black text-slate-800 dark:text-white">
                  {Math.round(p.winRate * 100)}%
                </div>
                <div className="text-[9px] font-semibold text-slate-400">{en ? 'Win rate' : 'فوز'}</div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </Layout>
  );
}

function PodiumPillar({
  player,
  rank,
  height,
  en,
  delay,
}: {
  player: PlayerCard;
  rank: 1 | 2 | 3;
  height: string;
  en: boolean;
  delay: number;
}) {
  const rankStyles = {
    1: { bg: 'from-yellow-400 to-amber-500', emoji: '🥇', label: en ? '1st' : 'أول' },
    2: { bg: 'from-slate-300 to-slate-400', emoji: '🥈', label: en ? '2nd' : 'ثاني' },
    3: { bg: 'from-amber-600 to-amber-700', emoji: '🥉', label: en ? '3rd' : 'ثالث' },
  } as const;
  const r = rankStyles[rank];
  const Icon = rank === 1 ? Crown : Medal;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, type: 'spring', stiffness: 220 }}
      className="flex flex-1 flex-col items-center"
    >
      {/* Avatar */}
      <div className="relative mb-2">
        {rank === 1 && <Icon className="absolute -top-5 left-1/2 -translate-x-1/2 h-6 w-6 text-yellow-400 drop-shadow" />}
        <PlayerAvatar name={player.name} size="lg" />
      </div>
      <div className="mb-2 max-w-full truncate text-xs font-bold text-slate-700 dark:text-slate-200">
        {player.name}
      </div>
      <div className="text-2xl">{r.emoji}</div>

      {/* Pillar */}
      <div
        className={
          'mt-2 flex w-full flex-col items-center justify-center rounded-t-2xl bg-gradient-to-b ' +
          r.bg +
          ' px-2 py-3 text-white shadow-xl ' +
          height
        }
      >
        <div className="text-xs font-bold uppercase tracking-wider opacity-80">{r.label}</div>
        <div className="text-2xl font-black">{player.wins}W</div>
        <div className="text-[10px] font-bold opacity-80">
          {Math.round(player.winRate * 100)}%
        </div>
      </div>
    </motion.div>
  );
}
