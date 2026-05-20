import { Match } from '../types';

export interface Achievement {
  id: string;
  emoji: string;
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionEn: string;
  /** Number 0..1 progress for the player (or 1 if achieved) */
  progress: number;
  achieved: boolean;
  unlockedAt?: number;
}

interface PlayerSummary {
  name: string;
  matches: number;
  wins: number;
  losses: number;
  finishedMatches: Match[];
  bestSingleRound: number; // most positive delta achieved in a single round
  perfectTarneeb: boolean; // ever bid 13 and made 13
  longestWinStreak: number;
  trixCleanQueens: boolean; // ever scored 0 deltas in a queens contract round (didn't take any queen)
}

function getPlayerSummary(player: string, matches: Match[]): PlayerSummary {
  const finishedMatches = matches.filter((m) => m.finished && m.winnerIndex !== undefined);

  let wins = 0;
  let losses = 0;
  let bestSingleRound = 0;
  let perfectTarneeb = false;
  let trixCleanQueens = false;

  // win-streak tracked over chronologically ordered finished matches the player participated in
  const playerFinished: Match[] = [];

  for (const m of finishedMatches) {
    // Did this player participate?
    let participatedAs: number | null = null;
    if (m.players.includes(player)) {
      participatedAs = m.players.indexOf(player);
    } else if (m.config?.originalNames?.includes?.(player)) {
      const oIdx = m.config.originalNames.indexOf(player);
      // Map originalNames index to team index (partners): 0,2 → team 0; 1,3 → team 1
      if (m.players.length === 2) {
        participatedAs = oIdx % 2;
      } else {
        participatedAs = oIdx;
      }
    }
    if (participatedAs === null) continue;

    playerFinished.push(m);

    if (m.winnerIndex === participatedAs) wins++;
    else losses++;

    // Best single round delta (most negative for likha/hand, most positive for trix)
    for (const r of m.rounds) {
      const d = r.deltas[participatedAs] ?? 0;
      if (m.kind === 'likha' || m.kind.startsWith('hand-')) {
        // lower is better — count "biggest negative" as best
        if (d < bestSingleRound) bestSingleRound = d;
      } else {
        if (d > bestSingleRound) bestSingleRound = d;
      }

      // Perfect tarneeb: bid 13 and made 13 → deltas[bidder] = 26
      if (m.kind === 'tarneeb' && r.deltas[participatedAs] === 26) {
        perfectTarneeb = true;
      }

      // Clean queens (Trix queens contract, took 0 queens)
      if ((m.kind.startsWith('trix') || m.kind.startsWith('complex')) && r.meta?.contract === 'queens' && d === 0) {
        trixCleanQueens = true;
      }
    }
  }

  // Compute longest win streak in chronological order
  const sorted = [...playerFinished].sort((a, b) => a.createdAt - b.createdAt);
  let streak = 0;
  let longestWinStreak = 0;
  for (const m of sorted) {
    let participatedAs: number | null = null;
    if (m.players.includes(player)) participatedAs = m.players.indexOf(player);
    else if (m.config?.originalNames?.includes?.(player)) {
      const oIdx = m.config.originalNames.indexOf(player);
      participatedAs = m.players.length === 2 ? oIdx % 2 : oIdx;
    }
    if (participatedAs === null) continue;
    if (m.winnerIndex === participatedAs) {
      streak++;
      longestWinStreak = Math.max(longestWinStreak, streak);
    } else {
      streak = 0;
    }
  }

  return {
    name: player,
    matches: playerFinished.length,
    wins,
    losses,
    finishedMatches: playerFinished,
    bestSingleRound,
    perfectTarneeb,
    longestWinStreak,
    trixCleanQueens,
  };
}

export function getAchievements(player: string, matches: Match[]): Achievement[] {
  const s = getPlayerSummary(player, matches);

  const list: Achievement[] = [
    {
      id: 'first-win',
      emoji: '🏆',
      titleAr: 'أول فوز',
      titleEn: 'First Win',
      descriptionAr: 'اربح أول مباراة',
      descriptionEn: 'Win your first match',
      progress: Math.min(1, s.wins / 1),
      achieved: s.wins >= 1,
    },
    {
      id: 'streak-3',
      emoji: '🔥',
      titleAr: '3 فوزات متتالية',
      titleEn: 'Hot Streak',
      descriptionAr: 'افز 3 مباريات متتالية',
      descriptionEn: 'Win 3 matches in a row',
      progress: Math.min(1, s.longestWinStreak / 3),
      achieved: s.longestWinStreak >= 3,
    },
    {
      id: 'streak-5',
      emoji: '⚡',
      titleAr: '5 فوزات متتالية',
      titleEn: 'Lightning Streak',
      descriptionAr: 'افز 5 مباريات متتالية',
      descriptionEn: 'Win 5 matches in a row',
      progress: Math.min(1, s.longestWinStreak / 5),
      achieved: s.longestWinStreak >= 5,
    },
    {
      id: 'wins-10',
      emoji: '👑',
      titleAr: 'بطل صاعد',
      titleEn: 'Rising Champion',
      descriptionAr: 'اربح 10 مباريات',
      descriptionEn: 'Win 10 matches',
      progress: Math.min(1, s.wins / 10),
      achieved: s.wins >= 10,
    },
    {
      id: 'wins-50',
      emoji: '💯',
      titleAr: 'أسطورة',
      titleEn: 'Legend',
      descriptionAr: 'اربح 50 مباراة',
      descriptionEn: 'Win 50 matches',
      progress: Math.min(1, s.wins / 50),
      achieved: s.wins >= 50,
    },
    {
      id: 'wins-100',
      emoji: '🏅',
      titleAr: 'مئة فوز',
      titleEn: '100 Wins',
      descriptionAr: 'اربح 100 مباراة',
      descriptionEn: 'Win 100 matches',
      progress: Math.min(1, s.wins / 100),
      achieved: s.wins >= 100,
    },
    {
      id: 'matches-25',
      emoji: '🎴',
      titleAr: 'لاعب نشيط',
      titleEn: 'Regular Player',
      descriptionAr: 'العب 25 مباراة',
      descriptionEn: 'Play 25 matches',
      progress: Math.min(1, s.matches / 25),
      achieved: s.matches >= 25,
    },
    {
      id: 'perfect-tarneeb',
      emoji: '🎯',
      titleAr: 'طرنيب مثالي',
      titleEn: 'Perfect Tarneeb',
      descriptionAr: 'اطلب 13 وحقق 13 لمّة',
      descriptionEn: 'Bid 13 and take all 13 tricks',
      progress: s.perfectTarneeb ? 1 : 0,
      achieved: s.perfectTarneeb,
    },
    {
      id: 'clean-queens',
      emoji: '👸',
      titleAr: 'بدون بنات',
      titleEn: 'Clean Queens',
      descriptionAr: 'انجز عقد البنات بدون أي بنت',
      descriptionEn: 'Finish a queens contract with zero queens taken',
      progress: s.trixCleanQueens ? 1 : 0,
      achieved: s.trixCleanQueens,
    },
  ];

  return list;
}

/** Backwards-compat: returns short emoji badges for an avatar overlay. */
export function getPlayerBadges(playerName: string, matches: Match[]) {
  const achievements = getAchievements(playerName, matches);
  // Show top achieved achievement emoji
  const achieved = achievements.filter((a) => a.achieved);
  if (achieved.length === 0) return [];
  // Prioritize: legend > rising champion > streak > first win
  const priority = ['wins-100', 'wins-50', 'wins-10', 'streak-5', 'streak-3', 'perfect-tarneeb', 'first-win'];
  const top = priority.map((id) => achieved.find((a) => a.id === id)).find(Boolean);
  return top ? [top.emoji] : [achieved[achieved.length - 1].emoji];
}
