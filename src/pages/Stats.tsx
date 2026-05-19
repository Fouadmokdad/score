import { useState, useMemo } from 'react';
import { Layout } from '../components/Layout';
import { useMatches, computeTotals } from '../store/matches';
import type { Match, GameKind } from '../types';
import { copy, gameText } from '../i18n';
import { useSettings } from '../store/settings';
import { PlayerAvatar } from '../components/PlayerAvatar';
import { Trophy, Target, TrendingDown, Hash, Crown, Medal, Flame, Percent } from 'lucide-react';

const GAME_FILTERS: ('all' | GameKind)[] = ['all', 'likha', 'hand-solo', 'hand-partners', 'trix-solo', 'trix-partners', 'complex-solo', 'complex-partners', 'tarneeb', 'tarneeb-400'];

const GRADIENTS: Record<string, string> = {
  all: 'from-[#10b981] to-[#059669]',
  likha: 'from-[#6366f1] to-[#a855f7]',
  'hand-solo': 'from-[#f43f5e] to-[#fb923c]',
  'hand-partners': 'from-[#f59e0b] to-[#ef4444]',
  trix: 'from-[#0ea5e9] to-[#2563eb]',
  'trix-solo': 'from-[#b91c1c] to-[#ef4444]',
  'trix-partners': 'from-[#991b1b] to-[#dc2626]',
  complex: 'from-[#10b981] to-[#0d9488]',
  'complex-solo': 'from-[#991b1b] to-[#ef4444]',
  'complex-partners': 'from-[#7f1d1d] to-[#dc2626]',
  tarneeb: 'from-[#7c3aed] to-[#db2777]',
  'tarneeb-400': 'from-[#0891b2] to-[#16a34a]',
};

interface PStat {
  name: string;
  matches: number;
  wins: number;
  losses: number;
  total: number;
  bestScore: number;
  worstScore: number;
  nemesisCounts: Record<string, number>;
  partnerWinCounts: Record<string, number>;
  nemesis?: string;
  bestPartner?: string;
  elo: number;
}

const RANK_TIERS = [
  { min: 0, label: 'Bronze', labelAr: 'برونزي', emoji: '🥉', color: 'from-amber-700 to-amber-800', text: 'text-amber-700 dark:text-amber-500' },
  { min: 1050, label: 'Silver', labelAr: 'فضي', emoji: '🥈', color: 'from-slate-400 to-slate-500', text: 'text-slate-500 dark:text-slate-300' },
  { min: 1150, label: 'Gold', labelAr: 'ذهبي', emoji: '🥇', color: 'from-yellow-400 to-amber-500', text: 'text-yellow-600 dark:text-yellow-400' },
  { min: 1300, label: 'Platinum', labelAr: 'بلاتيني', emoji: '💎', color: 'from-cyan-400 to-cyan-600', text: 'text-cyan-600 dark:text-cyan-400' },
  { min: 1500, label: 'Diamond', labelAr: 'ماسي', emoji: '👑', color: 'from-violet-400 to-purple-600', text: 'text-violet-600 dark:text-violet-400' },
] as const;

function getRank(elo: number) {
  let tier = RANK_TIERS[0] as typeof RANK_TIERS[number];
  for (const t of RANK_TIERS) {
    if (elo >= t.min) tier = t;
  }
  return tier;
}

function buildStats(matches: Match[], gameFilter: 'all' | GameKind): PStat[] {
  const filtered = matches.filter((m) => {
    if (!m.finished) return false;
    if (gameFilter !== 'all' && m.kind !== gameFilter) return false;
    return true;
  });

  const map = new Map<string, PStat>();
  for (const m of filtered) {
    const totals = computeTotals(m);
    const lower = m.kind === 'likha';
    const best = lower ? Math.min(...totals) : Math.max(...totals);

    // For partners, expand team names to individual players
    const playerNames: string[] = [];
    const playerScores: number[] = [];

    if ((m.kind === 'hand-partners' || m.kind === 'tarneeb' || m.kind === 'trix-partners' || m.kind === 'complex-partners') && m.config?.originalNames?.length >= 4) {
      // Team 1: originalNames[0] + originalNames[2], Team 2: originalNames[1] + originalNames[3]
      const oNames = m.config.originalNames as string[];
      playerNames.push(oNames[0], oNames[1], oNames[2], oNames[3]);
      playerScores.push(totals[0], totals[1], totals[0], totals[1]);
    } else {
      m.players.forEach((p, i) => {
        // Split partner names like "A و B"
        const parts = p.split(/ و | & /);
        parts.forEach((name) => {
          playerNames.push(name.trim());
          playerScores.push(totals[i]);
        });
      });
    }

    // Identify winners for nemesis calculation
    const winners: string[] = [];
    playerNames.forEach((p, i) => {
      if (playerScores[i] === best) winners.push(p);
    });

    playerNames.forEach((p, i) => {
      const s = map.get(p) ?? { name: p, matches: 0, wins: 0, losses: 0, total: 0, bestScore: -Infinity, worstScore: Infinity, nemesisCounts: {}, partnerWinCounts: {}, elo: 1000 };
      s.matches += 1;
      s.total += playerScores[i];
      
      const won = playerScores[i] === best;
      if (won) s.wins += 1;
      else s.losses += 1;
      
      if (playerScores[i] > s.bestScore) s.bestScore = playerScores[i];
      if (playerScores[i] < s.worstScore) s.worstScore = playerScores[i];

      // If they lost, the winners get points as their nemesis
      if (!won) {
        winners.forEach(w => {
          if (w !== p) s.nemesisCounts[w] = (s.nemesisCounts[w] || 0) + 1;
        });
      }

      // If they won in a team, the other team members get points as best partner
      if (won && winners.length > 1) {
        winners.forEach(w => {
          if (w !== p) s.partnerWinCounts[w] = (s.partnerWinCounts[w] || 0) + 1;
        });
      }

      map.set(p, s);
    });

    // ELO update: winners gain from losers
    const K = 32;
    const numPlayers = playerNames.length;
    if (numPlayers >= 2) {
      const losers = playerNames.filter((_, i) => playerScores[i] !== best);
      winners.forEach(w => {
        const ws = map.get(w)!;
        losers.forEach(l => {
          const ls = map.get(l)!;
          const expected = 1 / (1 + Math.pow(10, (ls.elo - ws.elo) / 400));
          const delta = Math.round(K * (1 - expected));
          ws.elo += delta;
          ls.elo -= delta;
        });
      });
    }
  }

  const result = Array.from(map.values()).map(s => {
    // calculate top nemesis
    let maxNem = 0;
    for (const [nem, count] of Object.entries(s.nemesisCounts)) {
      if (count > maxNem) { maxNem = count; s.nemesis = nem; }
    }
    // calculate best partner
    let maxPart = 0;
    for (const [part, count] of Object.entries(s.partnerWinCounts)) {
      if (count > maxPart) { maxPart = count; s.bestPartner = part; }
    }
    return s;
  });

  return result.sort((a, b) => b.wins - a.wins || a.losses - b.losses);
}

/* ─── Stat Card Component ─── */
function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-black/5 dark:border-white/5 bg-white dark:bg-white/5 p-4 shadow-sm">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${color} text-white shadow-inner`}>
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">{label}</div>
        <div className="text-lg font-black text-slate-800 dark:text-white truncate">{value}</div>
      </div>
    </div>
  );
}

/* ─── Leaderboard Row ─── */
function LeaderboardRow({ stat, rank, language }: { stat: PStat; rank: number; language: 'en' | 'ar' }) {
  const t = copy[language];
  const winRate = stat.matches > 0 ? Math.round((stat.wins / stat.matches) * 100) : 0;

  const rankBadge = rank <= 3 ? (
    <div className={
      'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-black ' +
      (rank === 1 ? 'bg-gradient-to-br from-yellow-400 to-amber-500 text-white shadow-lg shadow-yellow-500/30' :
       rank === 2 ? 'bg-gradient-to-br from-slate-300 to-slate-400 text-white shadow-lg shadow-slate-400/30' :
       'bg-gradient-to-br from-amber-600 to-amber-700 text-white shadow-lg shadow-amber-700/30')
    }>
      {rank}
    </div>
  ) : (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black/5 dark:bg-white/10 text-sm font-bold text-slate-400">
      {rank}
    </div>
  );

  return (
    <div className={
      'flex items-center gap-3 rounded-2xl p-3 transition ' +
      (rank <= 3
        ? 'border border-black/5 dark:border-white/5 bg-white dark:bg-white/5 shadow-sm'
        : 'hover:bg-black/[0.02] dark:hover:bg-white/[0.02]')
    }>
      {rankBadge}
      <PlayerAvatar name={stat.name} size="md" />
      <div className="flex-1 min-w-0">
        <div className="font-bold text-sm text-slate-800 dark:text-white truncate">{stat.name}</div>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">{stat.wins}W</span>
          <span className="text-[11px] font-semibold text-red-500">{stat.losses}L</span>
          <span className="text-[11px] font-semibold text-slate-400">{stat.matches} {language === 'ar' ? 'مب' : 'G'}</span>
        </div>
        {(stat.nemesis || stat.bestPartner) && (
          <div className="mt-1 flex flex-wrap gap-2">
            {stat.nemesis && (
              <span className="inline-flex items-center gap-1 rounded bg-red-50 dark:bg-red-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-red-600 dark:text-red-400">
                😈 {language === 'ar' ? 'العدو:' : 'Nemesis:'} {stat.nemesis}
              </span>
            )}
            {stat.bestPartner && (
              <span className="inline-flex items-center gap-1 rounded bg-emerald-50 dark:bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                🤝 {language === 'ar' ? 'الشريك:' : 'Partner:'} {stat.bestPartner}
              </span>
            )}
          </div>
        )}
      </div>
      <div className="text-end shrink-0">
        <div className="text-sm font-black text-slate-800 dark:text-white">{winRate}%</div>
        <div className="text-[10px] font-semibold text-slate-400">{language === 'ar' ? 'فوز' : 'Win rate'}</div>
        <div className={`mt-0.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${getRank(stat.elo).text} bg-black/[0.03] dark:bg-white/[0.06]`}>
          {getRank(stat.elo).emoji} {language === 'ar' ? getRank(stat.elo).labelAr : getRank(stat.elo).label}
        </div>
      </div>
    </div>
  );
}

/* ─── Stats Page ─── */
export default function Stats() {
  const { matches } = useMatches();
  const { language } = useSettings();
  const t = copy[language];
  const [gameFilter, setGameFilter] = useState<'all' | GameKind>('all');

  const stats = useMemo(() => buildStats(matches, gameFilter), [matches, gameFilter]);

  // Summary stats
  const summary = useMemo(() => {
    const finishedMatches = matches.filter((m) => {
      if (!m.finished) return false;
      if (gameFilter !== 'all' && m.kind !== gameFilter) return false;
      return true;
    });
    const totalMatches = finishedMatches.length;
    const totalRounds = finishedMatches.reduce((acc, m) => acc + m.rounds.length, 0);
    const totalPlayers = stats.length;
    const topPlayer = stats.length > 0 ? stats[0] : null;
    return { totalMatches, totalRounds, totalPlayers, topPlayer };
  }, [matches, gameFilter, stats]);

  const gameFilterLabel = (g: 'all' | GameKind) => {
    if (g === 'all') return language === 'ar' ? 'الكل' : 'All';
    return gameText[language].labels[g];
  };

  return (
    <Layout title={t.stats}>
      {/* Game Filter Pills */}
      <div className="mb-5 flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {GAME_FILTERS.map((g) => {
          const isActive = gameFilter === g;
          return (
            <button
              key={g}
              onClick={() => setGameFilter(g)}
              className={
                'shrink-0 rounded-xl px-4 py-2.5 text-xs font-bold transition-all active:scale-95 ' +
                (isActive
                  ? `bg-gradient-to-br ${GRADIENTS[g]} text-white shadow-lg`
                  : 'bg-black/5 dark:bg-white/10 text-slate-600 dark:text-slate-300 hover:bg-black/10 dark:hover:bg-white/15')
              }
            >
              {gameFilterLabel(g)}
            </button>
          );
        })}
      </div>

      {stats.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center opacity-60">
          <Trophy className="mb-4 h-12 w-12 text-slate-400" />
          <p className="text-sm text-slate-500">{t.noStats}</p>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="mb-6 grid grid-cols-2 gap-3">
            <StatCard
              icon={<Hash className="h-5 w-5" />}
              label={language === 'ar' ? 'المباريات' : 'Matches'}
              value={summary.totalMatches}
              color="from-[#6366f1] to-[#8b5cf6]"
            />
            <StatCard
              icon={<Target className="h-5 w-5" />}
              label={language === 'ar' ? 'الجولات' : 'Rounds'}
              value={summary.totalRounds}
              color="from-[#0ea5e9] to-[#2563eb]"
            />
            <StatCard
              icon={<Crown className="h-5 w-5" />}
              label={language === 'ar' ? 'اللاعبون' : 'Players'}
              value={summary.totalPlayers}
              color="from-[#f59e0b] to-[#ef4444]"
            />
            <StatCard
              icon={<Flame className="h-5 w-5" />}
              label={language === 'ar' ? 'الأفضل' : 'Top Player'}
              value={summary.topPlayer?.name ?? '—'}
              color="from-[#10b981] to-[#059669]"
            />
          </div>

          {/* Leaderboard */}
          <div className="mb-3 flex items-center gap-2">
            <Medal className="h-5 w-5 text-amber-500" />
            <h2 className="text-base font-bold text-slate-800 dark:text-white">
              {language === 'ar' ? 'ترتيب اللاعبين' : 'Leaderboard'}
            </h2>
          </div>

          <div className="rounded-[1.5rem] border border-black/5 dark:border-white/5 bg-[#F9F6EE] dark:bg-[#1a1915] p-2 shadow-lg">
            <div className="space-y-1">
              {stats.map((s, i) => (
                <LeaderboardRow key={s.name} stat={s} rank={i + 1} language={language} />
              ))}
            </div>
          </div>

          {/* Detailed Stats Table */}
          <div className="mt-6 mb-3 flex items-center gap-2">
            <Percent className="h-5 w-5 text-emerald-500" />
            <h2 className="text-base font-bold text-slate-800 dark:text-white">
              {language === 'ar' ? 'تفاصيل النقاط' : 'Score Details'}
            </h2>
          </div>

          <div className="rounded-[1.5rem] border border-black/5 dark:border-white/5 bg-white dark:bg-[#1a1915] overflow-hidden shadow-lg">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.03]">
                  <th className="px-4 py-3 text-start text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    {t.player}
                  </th>
                  <th className="px-3 py-3 text-center text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    {language === 'ar' ? 'مج' : 'Total'}
                  </th>
                  <th className="px-3 py-3 text-center text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    {language === 'ar' ? 'أعلى' : 'Best'}
                  </th>
                  <th className="px-3 py-3 text-center text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    {language === 'ar' ? 'أدنى' : 'Worst'}
                  </th>
                  <th className="px-3 py-3 text-center text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    {language === 'ar' ? 'معدل' : 'Avg'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {stats.map((s, i) => {
                  const avg = s.matches > 0 ? Math.round(s.total / s.matches) : 0;
                  return (
                    <tr key={s.name} className={i < stats.length - 1 ? 'border-b border-black/5 dark:border-white/5' : ''}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <PlayerAvatar name={s.name} size="sm" />
                          <span className="font-bold text-slate-800 dark:text-white text-xs truncate">{s.name}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-center font-bold text-slate-800 dark:text-white text-xs">{s.total}</td>
                      <td className="px-3 py-3 text-center font-bold text-emerald-600 dark:text-emerald-400 text-xs">
                        {s.bestScore === -Infinity ? '—' : s.bestScore}
                      </td>
                      <td className="px-3 py-3 text-center font-bold text-red-500 text-xs">
                        {s.worstScore === Infinity ? '—' : s.worstScore}
                      </td>
                      <td className="px-3 py-3 text-center font-bold text-slate-500 text-xs">{avg}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Layout>
  );
}
