import { useState, useMemo } from 'react';
import { Layout } from '../components/Layout';
import { useMatches, computeTotals } from '../store/matches';
import type { Match, GameKind } from '../types';
import { copy, gameText } from '../i18n';
import { useSettings } from '../store/settings';
import { PlayerAvatar } from '../components/PlayerAvatar';
import { AvatarPickerModal } from '../components/AvatarPickerModal';
import { PlayerSelect } from '../components/PlayerSelect';
import { calculateEloData, calculateH2HStats } from '../utils/elo';
import {
  Trophy,
  Target,
  TrendingDown,
  Hash,
  Crown,
  Medal,
  Flame,
  Percent,
  Swords,
  TrendingUp,
  Award,
  ChevronDown,
} from 'lucide-react';

const GAME_FILTERS: ('all' | GameKind)[] = [
  'all',
  'likha',
  'hand-solo',
  'hand-partners',
  'trix-solo',
  'trix-partners',
  'complex-solo',
  'complex-partners',
  'tarneeb',
  'tarneeb-400',
];

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

    const playerNames: string[] = [];
    const playerScores: number[] = [];

    const isPartners =
      (m.kind === 'hand-partners' ||
        m.kind === 'tarneeb' ||
        m.kind === 'trix-partners' ||
        m.kind === 'complex-partners') &&
      m.config?.originalNames?.length >= 4;

    if (isPartners) {
      const oNames = m.config.originalNames as string[];
      playerNames.push(oNames[0], oNames[1], oNames[2], oNames[3]);
      playerScores.push(totals[0], totals[1], totals[0], totals[1]);
    } else {
      m.players.forEach((p, i) => {
        const parts = p.split(/ و | & /);
        parts.forEach((name) => {
          playerNames.push(name.trim());
          playerScores.push(totals[i]);
        });
      });
    }

    const winners: string[] = [];
    playerNames.forEach((p, i) => {
      if (playerScores[i] === best) winners.push(p);
    });

    playerNames.forEach((p, i) => {
      const s = map.get(p) ?? {
        name: p,
        matches: 0,
        wins: 0,
        losses: 0,
        total: 0,
        bestScore: -Infinity,
        worstScore: Infinity,
        nemesisCounts: {},
        partnerWinCounts: {},
        elo: 1000,
      };
      s.matches += 1;
      s.total += playerScores[i];

      const won = playerScores[i] === best;
      if (won) s.wins += 1;
      else s.losses += 1;

      if (playerScores[i] > s.bestScore) s.bestScore = playerScores[i];
      if (playerScores[i] < s.worstScore) s.worstScore = playerScores[i];

      if (!won) {
        winners.forEach((w) => {
          if (w !== p) s.nemesisCounts[w] = (s.nemesisCounts[w] || 0) + 1;
        });
      }

      if (won && winners.length > 1) {
        winners.forEach((w) => {
          if (w !== p) s.partnerWinCounts[w] = (s.partnerWinCounts[w] || 0) + 1;
        });
      }

      map.set(p, s);
    });
  }

  const result = Array.from(map.values()).map((s) => {
    let maxNem = 0;
    for (const [nem, count] of Object.entries(s.nemesisCounts)) {
      if (count > maxNem) {
        maxNem = count;
        s.nemesis = nem;
      }
    }
    let maxPart = 0;
    for (const [part, count] of Object.entries(s.partnerWinCounts)) {
      if (count > maxPart) {
        maxPart = count;
        s.bestPartner = part;
      }
    }
    return s;
  });

  return result;
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
function LeaderboardRow({
  stat,
  rank,
  language,
  onClick,
}: {
  stat: PStat;
  rank: number;
  language: 'en' | 'ar';
  onClick?: () => void;
}) {
  const t = copy[language];
  const winRate = stat.matches > 0 ? Math.round((stat.wins / stat.matches) * 100) : 0;

  const rankBadge =
    rank <= 3 ? (
      <div
        className={
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-black ' +
          (rank === 1
            ? 'bg-gradient-to-br from-yellow-400 to-amber-500 text-white shadow-lg shadow-yellow-500/30'
            : rank === 2
            ? 'bg-gradient-to-br from-slate-300 to-slate-400 text-white shadow-lg shadow-slate-400/30'
            : 'bg-gradient-to-br from-amber-600 to-amber-700 text-white shadow-lg shadow-amber-700/30')
        }
      >
        {rank}
      </div>
    ) : (
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black/5 dark:bg-white/10 text-sm font-bold text-slate-400">
        {rank}
      </div>
    );

  return (
    <div
      onClick={onClick}
      className={
        'flex items-center gap-3 rounded-2xl p-3 transition cursor-pointer active:scale-98 ' +
        (rank <= 3
          ? 'border border-black/5 dark:border-white/5 bg-white dark:bg-white/5 shadow-sm hover:bg-black/[0.01] dark:hover:bg-white/[0.01]'
          : 'hover:bg-black/[0.02] dark:hover:bg-white/[0.02]')
      }
    >
      {rankBadge}
      <PlayerAvatar name={stat.name} size="md" />
      <div className="flex-1 min-w-0">
        <div className="font-bold text-sm text-slate-800 dark:text-white truncate flex items-center gap-1.5">
          <span>{stat.name}</span>
          <span className="text-[9px] font-black text-slate-400 bg-black/5 dark:bg-white/5 px-1.5 py-0.5 rounded uppercase tracking-wider">
            Edit ✏️
          </span>
        </div>
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
        <div
          className={`mt-0.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${
            getRank(stat.elo).text
          } bg-black/[0.03] dark:bg-white/[0.06]`}
        >
          {getRank(stat.elo).emoji} {language === 'ar' ? getRank(stat.elo).labelAr : getRank(stat.elo).label}
        </div>
      </div>
    </div>
  );
}

/* ─── ELO Progression Line Chart ─── */
function EloLineChart({ history, language }: { history: { date: string; elo: number }[]; language: 'en' | 'ar' }) {
  const en = language === 'en';
  if (history.length <= 1) {
    return (
      <div className="flex h-40 items-center justify-center text-xs text-slate-400">
        {en ? 'Not enough matches to plot rating trends.' : 'لا يوجد مباريات كافية لعرض مخطط التصنيف.'}
      </div>
    );
  }

  const width = 500;
  const height = 220;
  const paddingX = 45;
  const paddingY = 30;

  const ratings = history.map((h) => h.elo);
  const minRating = Math.min(...ratings, 900) - 20;
  const maxRating = Math.max(...ratings, 1100) + 20;
  const ratingRange = maxRating - minRating;

  const points = history.map((pt, idx) => {
    const x = paddingX + (idx / (history.length - 1)) * (width - 2 * paddingX);
    const y = height - paddingY - ((pt.elo - minRating) / ratingRange) * (height - 2 * paddingY);
    return { x, y, elo: pt.elo };
  });

  let pathD = '';
  points.forEach((pt, idx) => {
    if (idx === 0) pathD = `M ${pt.x} ${pt.y}`;
    else pathD += ` L ${pt.x} ${pt.y}`;
  });

  const areaD = `${pathD} L ${points[points.length - 1].x} ${height - paddingY} L ${points[0].x} ${height - paddingY} Z`;

  const gridLevels: number[] = [];
  const minGrid = Math.ceil(minRating / 100) * 100;
  const maxGrid = Math.floor(maxRating / 100) * 100;
  for (let l = minGrid; l <= maxGrid; l += 100) {
    gridLevels.push(l);
  }

  return (
    <div className="relative w-full overflow-hidden rounded-3xl bg-white/40 dark:bg-black/20 p-4 border border-black/5 dark:border-white/5 backdrop-blur-sm">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
        <defs>
          <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
          </linearGradient>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Gridlines */}
        {gridLevels.map((lvl) => {
          const y = height - paddingY - ((lvl - minRating) / ratingRange) * (height - 2 * paddingY);
          return (
            <g key={lvl} className="opacity-20 dark:opacity-10">
              <line x1={paddingX} y1={y} x2={width - paddingX} y2={y} stroke="currentColor" strokeWidth={1} strokeDasharray="4 4" />
              <text
                x={paddingX - 8}
                y={y + 4}
                textAnchor="end"
                className="text-[10px] font-extrabold fill-slate-400 dark:fill-slate-500"
              >
                {lvl}
              </text>
            </g>
          );
        })}

        {/* Area fill */}
        <path d={areaD} fill="url(#chartGradient)" />

        {/* Line Path */}
        <path
          d={pathD}
          fill="none"
          stroke="#10b981"
          strokeWidth={3.5}
          filter="url(#glow)"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Dynamic dots with labels */}
        {points.map((pt, idx) => (
          <g key={idx} className="group/dot cursor-pointer">
            <circle
              cx={pt.x}
              cy={pt.y}
              r={4}
              className="fill-[#10b981] stroke-white dark:stroke-slate-900 stroke-2 hover:r-6 transition-all duration-150"
            />
            {/* Value popups on hover */}
            <g className="opacity-0 group-hover/dot:opacity-100 transition-opacity duration-200 pointer-events-none">
              <rect
                x={Math.min(width - 70, Math.max(10, pt.x - 30))}
                y={pt.y - 30}
                width={60}
                height={20}
                rx={6}
                className="fill-slate-800 dark:fill-slate-900 shadow-xl"
              />
              <text
                x={Math.min(width - 70, Math.max(10, pt.x - 30)) + 30}
                y={pt.y - 17}
                textAnchor="middle"
                className="text-[9px] font-black fill-white"
              >
                {pt.elo}
              </text>
            </g>
          </g>
        ))}

        {/* X Axis boundaries */}
        <text x={paddingX} y={height - paddingY + 18} textAnchor="middle" className="text-[10px] font-bold fill-slate-400">
          {en ? 'Start' : 'البداية'}
        </text>
        <text
          x={width - paddingX}
          y={height - paddingY + 18}
          textAnchor="middle"
          className="text-[10px] font-bold fill-slate-400"
        >
          {en ? 'Now' : 'الآن'}
        </text>
      </svg>
    </div>
  );
}

/* ─── Dual H2H Rating Progression Line Chart ─── */
function H2HDualChart({
  history,
  player1,
  player2,
  language,
}: {
  history: any[];
  player1: string;
  player2: string;
  language: 'en' | 'ar';
}) {
  const en = language === 'en';
  if (history.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-xs text-slate-400">
        {en ? 'No head-to-head match history to plot.' : 'لا يوجد تاريخ مواجهات لعرض المخطط.'}
      </div>
    );
  }

  const width = 500;
  const height = 220;
  const paddingX = 45;
  const paddingY = 30;

  const ratings = history.flatMap((h) => [h.p1Elo, h.p2Elo]);
  const minRating = Math.min(...ratings, 900) - 20;
  const maxRating = Math.max(...ratings, 1100) + 20;
  const ratingRange = maxRating - minRating;

  // Prepend starting baseline of 1000 ELO for visual progression
  const data = [{ matchId: 'start', p1Elo: 1000, p2Elo: 1000 }, ...history];

  const points = data.map((pt, idx) => {
    const x = paddingX + (idx / (data.length - 1)) * (width - 2 * paddingX);
    const y1 = height - paddingY - ((pt.p1Elo - minRating) / ratingRange) * (height - 2 * paddingY);
    const y2 = height - paddingY - ((pt.p2Elo - minRating) / ratingRange) * (height - 2 * paddingY);
    return { x, y1, y2, p1Elo: pt.p1Elo, p2Elo: pt.p2Elo };
  });

  let pathD1 = '';
  let pathD2 = '';
  points.forEach((pt, idx) => {
    if (idx === 0) {
      pathD1 = `M ${pt.x} ${pt.y1}`;
      pathD2 = `M ${pt.x} ${pt.y2}`;
    } else {
      pathD1 += ` L ${pt.x} ${pt.y1}`;
      pathD2 += ` L ${pt.x} ${pt.y2}`;
    }
  });

  const gridLevels: number[] = [];
  const minGrid = Math.ceil(minRating / 100) * 100;
  const maxGrid = Math.floor(maxRating / 100) * 100;
  for (let l = minGrid; l <= maxGrid; l += 100) {
    gridLevels.push(l);
  }

  return (
    <div className="relative w-full overflow-hidden rounded-3xl bg-white/40 dark:bg-black/20 p-4 border border-black/5 dark:border-white/5 backdrop-blur-sm">
      {/* Chart Legend */}
      <div className="mb-3 flex items-center justify-center gap-5 text-xs font-black">
        <div className="flex items-center gap-1.5 text-emerald-500">
          <span className="h-3 w-3 rounded-full bg-emerald-500 shadow-md shadow-emerald-500/30" />
          <span className="truncate max-w-[6rem]">{player1}</span>
        </div>
        <div className="flex items-center gap-1.5 text-amber-500">
          <span className="h-3 w-3 rounded-full bg-amber-500 shadow-md shadow-amber-500/30" />
          <span className="truncate max-w-[6rem]">{player2}</span>
        </div>
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
        <defs>
          <filter id="glowP1" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Gridlines */}
        {gridLevels.map((lvl) => {
          const y = height - paddingY - ((lvl - minRating) / ratingRange) * (height - 2 * paddingY);
          return (
            <g key={lvl} className="opacity-20 dark:opacity-10">
              <line x1={paddingX} y1={y} x2={width - paddingX} y2={y} stroke="currentColor" strokeWidth={1} strokeDasharray="4 4" />
              <text
                x={paddingX - 8}
                y={y + 4}
                textAnchor="end"
                className="text-[10px] font-extrabold fill-slate-400 dark:fill-slate-500"
              >
                {lvl}
              </text>
            </g>
          );
        })}

        {/* Player 1 Emerald Line */}
        <path
          d={pathD1}
          fill="none"
          stroke="#10b981"
          strokeWidth={3}
          filter="url(#glowP1)"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Player 2 Gold Line */}
        <path
          d={pathD2}
          fill="none"
          stroke="#f59e0b"
          strokeWidth={3}
          filter="url(#glowP1)"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Points for P1 */}
        {points.map((pt, idx) => (
          <g key={`p1-${idx}`} className="group/dot1 cursor-pointer">
            <circle cx={pt.x} cy={pt.y1} r={3.5} className="fill-[#10b981] stroke-white dark:stroke-slate-900 stroke-2 hover:r-5" />
            <g className="opacity-0 group-hover/dot1:opacity-100 transition-opacity duration-200 pointer-events-none">
              <rect
                x={Math.min(width - 70, Math.max(10, pt.x - 30))}
                y={pt.y1 - 28}
                width={60}
                height={18}
                rx={4}
                className="fill-slate-800 dark:fill-slate-900 shadow"
              />
              <text
                x={Math.min(width - 70, Math.max(10, pt.x - 30)) + 30}
                y={pt.y1 - 16}
                textAnchor="middle"
                className="text-[8px] font-black fill-white"
              >
                {pt.p1Elo}
              </text>
            </g>
          </g>
        ))}

        {/* Points for P2 */}
        {points.map((pt, idx) => (
          <g key={`p2-${idx}`} className="group/dot2 cursor-pointer">
            <circle cx={pt.x} cy={pt.y2} r={3.5} className="fill-[#f59e0b] stroke-white dark:stroke-slate-900 stroke-2 hover:r-5" />
            <g className="opacity-0 group-hover/dot2:opacity-100 transition-opacity duration-200 pointer-events-none">
              <rect
                x={Math.min(width - 70, Math.max(10, pt.x - 30))}
                y={pt.y2 - 28}
                width={60}
                height={18}
                rx={4}
                className="fill-slate-800 dark:fill-slate-900 shadow"
              />
              <text
                x={Math.min(width - 70, Math.max(10, pt.x - 30)) + 30}
                y={pt.y2 - 16}
                textAnchor="middle"
                className="text-[8px] font-black fill-white"
              >
                {pt.p2Elo}
              </text>
            </g>
          </g>
        ))}
      </svg>
    </div>
  );
}

/* ─── Game Filter Selector – Premium Expandable Grid ─── */
const GAME_ICONS: Record<string, string> = {
  all: '🎴',
  likha: '♠️',
  'hand-solo': '🤚',
  'hand-partners': '🤝',
  'trix-solo': '🃏',
  'trix-partners': '🃏',
  'complex-solo': '♟️',
  'complex-partners': '♟️',
  tarneeb: '🏆',
  'tarneeb-400': '🏅',
};

function GameFilterSelector({
  gameFilter,
  setGameFilter,
  gameFilterLabel,
  en,
}: {
  gameFilter: 'all' | GameKind;
  setGameFilter: (g: 'all' | GameKind) => void;
  gameFilterLabel: (g: 'all' | GameKind) => string;
  en: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  const handleSelect = (g: 'all' | GameKind) => {
    setGameFilter(g);
    setExpanded(false);
  };

  return (
    <div className="mb-5 relative">
      {/* Active filter preview chip – tappable */}
      <button
        onClick={() => setExpanded(!expanded)}
        className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border transition-all duration-200 active:scale-[0.98] ${
          expanded
            ? 'bg-white/60 dark:bg-black/30 border-emerald-500/30 dark:border-emerald-500/20 shadow-lg shadow-emerald-500/5'
            : 'bg-black/5 dark:bg-white/5 border-black/5 dark:border-white/5 hover:bg-black/10 dark:hover:bg-white/10'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="text-lg">{GAME_ICONS[gameFilter] || '🎴'}</span>
          <div className="min-w-0 text-left rtl:text-right">
            <div className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              {en ? 'Filter' : 'التصفية'}
            </div>
            <div className="font-black text-sm text-slate-800 dark:text-white truncate">
              {gameFilterLabel(gameFilter)}
            </div>
          </div>
        </div>
        <ChevronDown className={`h-4 w-4 text-slate-400 shrink-0 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {/* Expandable grid overlay */}
      {expanded && (
        <div className="mt-2 rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-black/5 dark:border-white/10 shadow-2xl p-3 animate-in fade-in-0 slide-in-from-top-2 duration-200 z-20 relative">
          <div className="grid grid-cols-3 gap-2">
            {GAME_FILTERS.map((g) => {
              const isActive = gameFilter === g;
              return (
                <button
                  key={g}
                  onClick={() => handleSelect(g)}
                  className={`flex flex-col items-center justify-center gap-1 py-3 px-2 rounded-xl text-center transition-all duration-150 active:scale-95 border ${
                    isActive
                      ? `bg-gradient-to-br ${GRADIENTS[g]} text-white shadow-lg border-transparent`
                      : 'bg-black/5 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-black/10 dark:hover:bg-white/10 border-transparent'
                  }`}
                >
                  <span className="text-lg leading-none">{GAME_ICONS[g] || '🎴'}</span>
                  <span className="text-[10px] font-black leading-tight">{gameFilterLabel(g)}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Stats Page Overhaul ─── */
export default function Stats() {
  const { matches } = useMatches();
  const { language } = useSettings();
  const t = copy[language];
  const en = language === 'en';

  const [activeTab, setActiveTab] = useState<'leaderboard' | 'h2h' | 'elo'>('leaderboard');
  const [gameFilter, setGameFilter] = useState<'all' | GameKind>('all');
  const [editingPlayerName, setEditingPlayerName] = useState<string | null>(null);

  // Compute central ELO data chronologically
  const eloData = useMemo(() => calculateEloData(matches, gameFilter), [matches, gameFilter]);

  // Aggregate standard stats
  const baseStats = useMemo(() => buildStats(matches, gameFilter), [matches, gameFilter]);

  // Inject central ELO data into the Leaderboard stats and sort by rating descending
  const stats = useMemo(() => {
    return baseStats
      .map((s) => ({
        ...s,
        elo: eloData[s.name]?.elo ?? 1000,
      }))
      .sort((a, b) => b.elo - a.elo || b.wins - a.wins);
  }, [baseStats, eloData]);

  // Global totals for overview cards
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

  // Player lists for dropdowns
  const allPlayerNames = useMemo(() => stats.map((s) => s.name), [stats]);

  // Selected player selectors for H2H and ELO
  const [p1State, setP1State] = useState<string>('');
  const [p2State, setP2State] = useState<string>('');
  const [eloPlayerState, setEloPlayerState] = useState<string>('');

  const activeP1 = p1State || allPlayerNames[0] || '';
  const activeP2 = p2State || allPlayerNames[1] || '';
  const activeEloPlayer = eloPlayerState || allPlayerNames[0] || '';

  // Calculate detailed Head to Head metrics dynamically
  const h2h = useMemo(() => {
    return calculateH2HStats(matches, activeP1, activeP2);
  }, [matches, activeP1, activeP2]);

  // Calculate ELO progression history for single player charting
  const playerEloPoints = useMemo(() => {
    const pData = eloData[activeEloPlayer];
    if (!pData) return [];
    return pData.history.map((h) => ({
      date: h.date,
      elo: h.elo,
    }));
  }, [eloData, activeEloPlayer]);

  const activeEloRecord = eloData[activeEloPlayer];
  const peakElo = useMemo(() => {
    if (!activeEloRecord) return 1000;
    return Math.max(...activeEloRecord.history.map((h) => h.elo));
  }, [activeEloRecord]);

  const lowestElo = useMemo(() => {
    if (!activeEloRecord) return 1000;
    return Math.min(...activeEloRecord.history.map((h) => h.elo));
  }, [activeEloRecord]);

  const gameFilterLabel = (g: 'all' | GameKind) => {
    if (g === 'all') return language === 'ar' ? 'الكل' : 'All';
    return gameText[language].labels[g];
  };

  return (
    <Layout title={t.stats}>
      {/* Sliding Sub-Navigation Tab Panel */}
      <div className="mb-6 flex rounded-2xl bg-black/5 dark:bg-white/5 p-1 border border-black/5 dark:border-white/5 backdrop-blur-md">
        <button
          onClick={() => setActiveTab('leaderboard')}
          className={`flex-1 py-2.5 text-xs font-black rounded-xl transition-all duration-300 flex items-center justify-center gap-1.5 ${
            activeTab === 'leaderboard'
              ? 'bg-white dark:bg-[#1a1915] text-slate-900 dark:text-white shadow-md'
              : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
          }`}
        >
          <Medal className="h-4.5 w-4.5" />
          <span>{en ? 'Leaderboard' : 'الترتيب'}</span>
        </button>
        <button
          onClick={() => setActiveTab('h2h')}
          className={`flex-1 py-2.5 text-xs font-black rounded-xl transition-all duration-300 flex items-center justify-center gap-1.5 ${
            activeTab === 'h2h'
              ? 'bg-white dark:bg-[#1a1915] text-slate-900 dark:text-white shadow-md'
              : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
          }`}
        >
          <Swords className="h-4.5 w-4.5" />
          <span>{en ? 'Head-to-Head' : 'رأس برأس'}</span>
        </button>
        <button
          onClick={() => setActiveTab('elo')}
          className={`flex-1 py-2.5 text-xs font-black rounded-xl transition-all duration-300 flex items-center justify-center gap-1.5 ${
            activeTab === 'elo'
              ? 'bg-white dark:bg-[#1a1915] text-slate-900 dark:text-white shadow-md'
              : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
          }`}
        >
          <TrendingUp className="h-4.5 w-4.5" />
          <span>{en ? 'ELO Trends' : 'مخطط الـ ELO'}</span>
        </button>
      </div>

      {/* Game Filter – Premium Collapsible Grid */}
      <GameFilterSelector
        gameFilter={gameFilter}
        setGameFilter={setGameFilter}
        gameFilterLabel={gameFilterLabel}
        en={en}
      />

      {stats.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center opacity-60">
          <Trophy className="mb-4 h-12 w-12 text-slate-400 animate-pulse" />
          <p className="text-sm text-slate-500">{t.noStats}</p>
        </div>
      ) : (
        <>
          {/* TAB 1: LEADERBOARD */}
          {activeTab === 'leaderboard' && (
            <div className="animate-in fade-in-50 duration-200">
              {/* Summary Cards */}
              <div className="mb-6 grid grid-cols-2 gap-3">
                <StatCard
                  icon={<Hash className="h-5 w-5" />}
                  label={en ? 'Matches' : 'المباريات'}
                  value={summary.totalMatches}
                  color="from-[#6366f1] to-[#8b5cf6]"
                />
                <StatCard
                  icon={<Target className="h-5 w-5" />}
                  label={en ? 'Rounds' : 'الجولات'}
                  value={summary.totalRounds}
                  color="from-[#0ea5e9] to-[#2563eb]"
                />
                <StatCard
                  icon={<Crown className="h-5 w-5" />}
                  label={en ? 'Players' : 'اللاعبون'}
                  value={summary.totalPlayers}
                  color="from-[#f59e0b] to-[#ef4444]"
                />
                <StatCard
                  icon={<Trophy className="h-5 w-5" />}
                  label={en ? 'Top Rank' : 'الأول بالترتيب'}
                  value={summary.topPlayer?.name ?? '—'}
                  color="from-[#10b981] to-[#059669]"
                />
              </div>

              {/* Leaderboard Section */}
              <div className="mb-3 flex items-center gap-2">
                <Medal className="h-5 w-5 text-amber-500" />
                <h2 className="text-base font-black text-slate-800 dark:text-white">
                  {en ? 'Competitors Rank' : 'ترتيب المحترفين'}
                </h2>
              </div>

              <div className="rounded-[1.5rem] border border-black/5 dark:border-white/5 bg-[#F9F6EE] dark:bg-[#161512] p-2 shadow-lg">
                <div className="space-y-1">
                  {stats.map((s, i) => (
                    <LeaderboardRow
                      key={s.name}
                      stat={s}
                      rank={i + 1}
                      language={language}
                      onClick={() => setEditingPlayerName(s.name)}
                    />
                  ))}
                </div>
              </div>

              {/* Detailed Stats Table */}
              <div className="mt-6 mb-3 flex items-center gap-2">
                <Percent className="h-5 w-5 text-emerald-500" />
                <h2 className="text-base font-black text-slate-800 dark:text-white">
                  {en ? 'Score Details' : 'تفاصيل النقاط'}
                </h2>
              </div>

              <div className="rounded-[1.5rem] border border-black/5 dark:border-white/5 bg-white dark:bg-[#1a1915] overflow-hidden shadow-lg">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.03]">
                      <th className="px-4 py-3 text-start text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                        {t.player}
                      </th>
                      <th className="px-3 py-3 text-center text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                        {en ? 'Total' : 'المجموع'}
                      </th>
                      <th className="px-3 py-3 text-center text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                        {en ? 'Best' : 'أعلى'}
                      </th>
                      <th className="px-3 py-3 text-center text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                        {en ? 'Worst' : 'أدنى'}
                      </th>
                      <th className="px-3 py-3 text-center text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                        {en ? 'Avg' : 'معدل'}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.map((s, i) => {
                      const avg = s.matches > 0 ? Math.round(s.total / s.matches) : 0;
                      return (
                        <tr
                          key={s.name}
                          className={i < stats.length - 1 ? 'border-b border-black/5 dark:border-white/5' : ''}
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <PlayerAvatar name={s.name} size="sm" />
                              <span className="font-bold text-slate-800 dark:text-white text-xs truncate">
                                {s.name}
                              </span>
                            </div>
                          </td>
                          <td className="px-3 py-3 text-center font-bold text-slate-800 dark:text-white text-xs">
                            {s.total}
                          </td>
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
            </div>
          )}

          {/* TAB 2: HEAD TO HEAD (⚔️) */}
          {activeTab === 'h2h' && (
            <div className="space-y-6 animate-in fade-in-50 duration-200">
              {/* Dual Selection Panel */}
              <div className="card space-y-4">
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-wider text-center">
                  {en ? 'Select Rivals to Compare' : 'اختر المنافسين للمقارنة'}
                </h3>

                <div className="grid grid-cols-[1fr_2.5rem_1fr] items-center gap-3">
                  {/* Selector Player 1 */}
                  <PlayerSelect
                    value={activeP1}
                    onChange={setP1State}
                    allPlayers={allPlayerNames}
                    exclude={activeP2}
                  />

                  {/* ⚔️ Icon */}
                  <div className="flex items-center justify-center">
                    <Swords className="h-5 w-5 text-amber-500 shrink-0" />
                  </div>

                  {/* Selector Player 2 */}
                  <PlayerSelect
                    value={activeP2}
                    onChange={setP2State}
                    allPlayers={allPlayerNames}
                    exclude={activeP1}
                  />
                </div>
              </div>

              {/* H2H Validation Empty Case */}
              {activeP1 === activeP2 ? (
                <div className="text-center py-10 text-xs text-slate-400 font-bold">
                  ⚠️ {en ? 'Select two different players to compare.' : 'الرجاء اختيار لاعبين مختلفين للبدء.'}
                </div>
              ) : (
                <>
                  {/* Rivalry Battle Card */}
                  <div className="card space-y-5">
                    <div className="text-center font-black text-xs text-slate-400 uppercase tracking-widest">
                      {en ? 'Direct Rivalry Win Count' : 'المواجهات المباشرة وجهاً لوجه'}
                    </div>

                    <div className="flex items-center justify-between text-center">
                      <div className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
                        <PlayerAvatar name={activeP1} size="lg" />
                        <span className="font-extrabold text-sm text-slate-800 dark:text-white truncate w-full">
                          {activeP1}
                        </span>
                        <span className="text-xs font-black text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                          {h2h.p1RivalWins} {en ? 'Wins' : 'فوز'}
                        </span>
                      </div>

                      <div className="flex flex-col items-center shrink-0 px-4">
                        <span className="text-xl font-black text-slate-700 dark:text-slate-300">
                          {h2h.directRivalryGames}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">
                          {en ? 'Matches' : 'مباراة'}
                        </span>
                      </div>

                      <div className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
                        <PlayerAvatar name={activeP2} size="lg" />
                        <span className="font-extrabold text-sm text-slate-800 dark:text-white truncate w-full">
                          {activeP2}
                        </span>
                        <span className="text-xs font-black text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full">
                          {h2h.p2RivalWins} {en ? 'Wins' : 'فوز'}
                        </span>
                      </div>
                    </div>

                    {/* Tug of war win-loss bar */}
                    {h2h.directRivalryGames > 0 && (() => {
                      const p1Percent = Math.round((h2h.p1RivalWins / h2h.directRivalryGames) * 100);
                      const p2Percent = 100 - p1Percent;
                      return (
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px] font-black text-slate-400">
                            <span>{p1Percent}%</span>
                            <span>{p2Percent}%</span>
                          </div>
                          <div className="h-3 w-full rounded-full bg-slate-100 dark:bg-white/5 overflow-hidden flex">
                            <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${p1Percent}%` }} />
                            <div className="h-full bg-amber-500 transition-all duration-500" style={{ width: `${p2Percent}%` }} />
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Partnership stats */}
                  <div className="card space-y-4">
                    <div className="text-center font-black text-xs text-slate-400 uppercase tracking-widest">
                      {en ? 'Alliance / Partnerships' : 'التحالف والشراكة (كفريق واحد)'}
                    </div>

                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div className="rounded-2xl bg-black/5 dark:bg-white/5 p-3">
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-wide">
                          {en ? 'Games' : 'مباريات'}
                        </div>
                        <div className="text-lg font-black text-slate-800 dark:text-white mt-1">
                          {h2h.partnershipGames}
                        </div>
                      </div>

                      <div className="rounded-2xl bg-black/5 dark:bg-white/5 p-3">
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-wide">
                          {en ? 'Wins' : 'انتصارات'}
                        </div>
                        <div className="text-lg font-black text-emerald-500 mt-1">{h2h.partnerWins}</div>
                      </div>

                      <div className="rounded-2xl bg-black/5 dark:bg-white/5 p-3">
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-wide">
                          {en ? 'Win Rate' : 'نسبة الفوز'}
                        </div>
                        <div className="text-lg font-black text-slate-800 dark:text-white mt-1">
                          {h2h.partnershipGames > 0
                            ? `${Math.round((h2h.partnerWins / h2h.partnershipGames) * 100)}%`
                            : '0%'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Best & Worst records */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="card space-y-2">
                      <div className="text-xs font-black text-slate-400 truncate text-center">
                        {activeP1} {en ? 'vs' : 'ضد'} {activeP2}
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-semibold text-slate-500">{en ? 'Best Score' : 'أعلى نقاط'}</span>
                        <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
                          {h2h.p1BestScore === -Infinity ? '—' : h2h.p1BestScore}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-semibold text-slate-500">{en ? 'Worst Score' : 'أدنى نقاط'}</span>
                        <span className="font-extrabold text-red-500">
                          {h2h.p1WorstScore === Infinity ? '—' : h2h.p1WorstScore}
                        </span>
                      </div>
                    </div>

                    <div className="card space-y-2">
                      <div className="text-xs font-black text-slate-400 truncate text-center">
                        {activeP2} {en ? 'vs' : 'ضد'} {activeP1}
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-semibold text-slate-500">{en ? 'Best Score' : 'أعلى نقاط'}</span>
                        <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
                          {h2h.p2BestScore === -Infinity ? '—' : h2h.p2BestScore}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-semibold text-slate-500">{en ? 'Worst Score' : 'أدنى نقاط'}</span>
                        <span className="font-extrabold text-red-500">
                          {h2h.p2WorstScore === Infinity ? '—' : h2h.p2WorstScore}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Dual ELO chart comparison */}
                  <div className="space-y-2.5">
                    <h4 className="text-sm font-black text-slate-800 dark:text-white flex items-center gap-1.5">
                      <TrendingUp className="h-4.5 w-4.5 text-emerald-500" />
                      {en ? 'Rivalry ELO Charts' : 'مقارنة مسار تصنيف الـ ELO'}
                    </h4>
                    <H2HDualChart
                      history={h2h.combinedHistory}
                      player1={activeP1}
                      player2={activeP2}
                      language={language}
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {/* TAB 3: ELO TRENDS (📈) */}
          {activeTab === 'elo' && (
            <div className="space-y-6 animate-in fade-in-50 duration-200">
              {/* Single Player Selector */}
              <div className="card space-y-3">
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-wider text-center">
                  {en ? 'Select Player to Analyze' : 'اختر اللاعب لتحليل مساره'}
                </h3>
                <PlayerSelect
                  value={activeEloPlayer}
                  onChange={setEloPlayerState}
                  allPlayers={allPlayerNames}
                />
              </div>

              {/* Player tier representation card */}
              {activeEloPlayer && (
                <>
                  <div
                    className={`card bg-gradient-to-br ${
                      getRank(eloData[activeEloPlayer]?.elo ?? 1000).color
                    } text-white shadow-xl relative overflow-hidden flex flex-col items-center justify-center p-6 text-center`}
                  >
                    {/* Floating decoration suit */}
                    <div className="absolute -right-6 -bottom-6 text-[100px] font-black text-white/5 pointer-events-none">
                      🏆
                    </div>

                    <PlayerAvatar name={activeEloPlayer} size="lg" className="scale-110 shadow-2xl" />

                    <h2 className="mt-4 text-xl font-black">{activeEloPlayer}</h2>

                    <div className="mt-2.5 flex items-center gap-1.5 bg-white/10 border border-white/20 px-3.5 py-1.5 rounded-full text-xs font-black tracking-widest uppercase">
                      <span>{getRank(eloData[activeEloPlayer]?.elo ?? 1000).emoji}</span>
                      <span>
                        {language === 'ar'
                          ? getRank(eloData[activeEloPlayer]?.elo ?? 1000).labelAr
                          : getRank(eloData[activeEloPlayer]?.elo ?? 1000).label}{' '}
                        {en ? 'TIER' : 'فئة'}
                      </span>
                    </div>

                    <div className="mt-4 flex items-center gap-2">
                      <span className="text-3xl font-black">
                        {eloData[activeEloPlayer]?.elo ?? 1000}
                      </span>
                      <span className="text-[10px] font-black tracking-wider text-white/60 uppercase">
                        {en ? 'CURRENT RATING' : 'التصنيف الحالي'}
                      </span>
                    </div>
                  </div>

                  {/* Rating stats breakdown */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="card flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
                        <Award className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                          {en ? 'Peak ELO Rating' : 'أعلى تصنيف ELO'}
                        </div>
                        <div className="text-base font-black text-slate-800 dark:text-white">{peakElo}</div>
                      </div>
                    </div>

                    <div className="card flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-500/10 text-red-500">
                        <TrendingDown className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                          {en ? 'Lowest ELO Rating' : 'أدنى تصنيف ELO'}
                        </div>
                        <div className="text-base font-black text-slate-800 dark:text-white">{lowestElo}</div>
                      </div>
                    </div>
                  </div>

                  {/* SVG Chart Progression */}
                  <div className="space-y-2.5">
                    <h4 className="text-sm font-black text-slate-800 dark:text-white flex items-center gap-1.5">
                      <TrendingUp className="h-4.5 w-4.5 text-emerald-500" />
                      {en ? 'Chronological Rating Progress' : 'تطور التصنيف الزمني'}
                    </h4>
                    <EloLineChart history={playerEloPoints} language={language} />
                  </div>
                </>
              )}
            </div>
          )}
        </>
      )}

      {/* Reusable Click-to-edit Avatar Modal */}
      {editingPlayerName && (
        <AvatarPickerModal
          playerName={editingPlayerName}
          onClose={() => setEditingPlayerName(null)}
        />
      )}
    </Layout>
  );
}
