import type { Match, GameKind } from '../types';
import { computeTotals } from '../store/matches';

export interface EloPoint {
  matchId: string;
  gameKind: GameKind;
  date: string;
  elo: number;
  delta: number;
}

export interface PlayerEloData {
  name: string;
  elo: number;
  history: EloPoint[];
}

export interface H2HComparison {
  totalGames: number;
  p1Wins: number;
  p2Wins: number;
  directRivalryGames: number; // Opponents
  p1RivalWins: number;
  p2RivalWins: number;
  partnershipGames: number; // Same team
  partnerWins: number;
  partnerLosses: number;
  p1BestScore: number;
  p1WorstScore: number;
  p2BestScore: number;
  p2WorstScore: number;
  combinedHistory: {
    date: string;
    matchId: string;
    gameKind: GameKind;
    p1Elo: number;
    p2Elo: number;
  }[];
}

/**
 * Calculates ELO ratings chronologically for all players
 */
export function calculateEloData(matches: Match[], gameFilter: 'all' | GameKind = 'all'): Record<string, PlayerEloData> {
  const finishedMatches = matches
    .filter((m) => {
      if (!m.finished) return false;
      if (gameFilter !== 'all' && m.kind !== gameFilter) return false;
      return true;
    })
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const eloMap: Record<string, PlayerEloData> = {};

  const getOrCreatePlayer = (name: string): PlayerEloData => {
    const clean = name.trim();
    if (!eloMap[clean]) {
      eloMap[clean] = {
        name: clean,
        elo: 1000,
        history: [{ matchId: 'initial', gameKind: 'likha', date: 'Initial', elo: 1000, delta: 0 }],
      };
    }
    return eloMap[clean];
  };

  const K = 32;

  for (const m of finishedMatches) {
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
      if (playerScores[i] === best) {
        winners.push(p.trim());
      }
    });

    const matchElosBefore: Record<string, number> = {};
    playerNames.forEach((p) => {
      const player = getOrCreatePlayer(p);
      matchElosBefore[player.name] = player.elo;
    });

    const matchDeltas: Record<string, number> = {};
    playerNames.forEach((p) => {
      matchDeltas[p.trim()] = 0;
    });

    if (playerNames.length >= 2) {
      const losers = playerNames.filter((p) => !winners.includes(p.trim()));
      
      winners.forEach((w) => {
        losers.forEach((l) => {
          const wElo = matchElosBefore[w.trim()];
          const lElo = matchElosBefore[l.trim()];
          const expected = 1 / (1 + Math.pow(10, (lElo - wElo) / 400));
          const delta = Math.round(K * (1 - expected));
          
          matchDeltas[w.trim()] += delta;
          matchDeltas[l.trim()] -= delta;
        });
      });
    }

    playerNames.forEach((p) => {
      const clean = p.trim();
      const pData = eloMap[clean];
      const delta = matchDeltas[clean];
      pData.elo += delta;
      pData.history.push({
        matchId: m.id,
        gameKind: m.kind,
        date: m.createdAt.toString(),
        elo: pData.elo,
        delta,
      });
    });
  }

  return eloMap;
}

/**
 * Calculates detailed Head-to-Head comparative statistics between two players
 */
export function calculateH2HStats(matches: Match[], player1: string, player2: string): H2HComparison {
  const p1 = player1.trim();
  const p2 = player2.trim();

  const comparison: H2HComparison = {
    totalGames: 0,
    p1Wins: 0,
    p2Wins: 0,
    directRivalryGames: 0,
    p1RivalWins: 0,
    p2RivalWins: 0,
    partnershipGames: 0,
    partnerWins: 0,
    partnerLosses: 0,
    p1BestScore: -Infinity,
    p1WorstScore: Infinity,
    p2BestScore: -Infinity,
    p2WorstScore: Infinity,
    combinedHistory: [],
  };

  if (!p1 || !p2 || p1.toLowerCase() === p2.toLowerCase()) {
    return comparison;
  }

  // Calculate ELO histories chronologically
  const eloHistory = calculateEloData(matches, 'all');
  const p1Data = eloHistory[p1];
  const p2Data = eloHistory[p2];

  // Helper to determine team and rivalry inside matches
  const finishedMatches = matches
    .filter((m) => m.finished)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  for (const m of finishedMatches) {
    const totals = computeTotals(m);
    const lower = m.kind === 'likha';
    const best = lower ? Math.min(...totals) : Math.max(...totals);

    const isPartners =
      (m.kind === 'hand-partners' ||
        m.kind === 'tarneeb' ||
        m.kind === 'trix-partners' ||
        m.kind === 'complex-partners') &&
      m.config?.originalNames?.length >= 4;

    let p1InMatch = false;
    let p2InMatch = false;
    let p1Score = 0;
    let p2Score = 0;
    let p1Won = false;
    let p2Won = false;
    let arePartners = false;

    if (isPartners) {
      const oNames = m.config.originalNames as string[];
      const p1Index = oNames.findIndex((name) => name.trim().toLowerCase() === p1.toLowerCase());
      const p2Index = oNames.findIndex((name) => name.trim().toLowerCase() === p2.toLowerCase());

      if (p1Index !== -1 && p2Index !== -1) {
        p1InMatch = true;
        p2InMatch = true;
        // Team indices: Team 1 is indices 0,2; Team 2 is indices 1,3
        const p1Team = p1Index % 2;
        const p2Team = p2Index % 2;

        p1Score = totals[p1Team];
        p2Score = totals[p2Team];
        p1Won = p1Score === best;
        p2Won = p2Score === best;

        arePartners = p1Team === p2Team;
      }
    } else {
      const p1Index = m.players.findIndex((name) =>
        name.split(/ و | & /).some((n) => n.trim().toLowerCase() === p1.toLowerCase())
      );
      const p2Index = m.players.findIndex((name) =>
        name.split(/ و | & /).some((n) => n.trim().toLowerCase() === p2.toLowerCase())
      );

      if (p1Index !== -1 && p2Index !== -1) {
        p1InMatch = true;
        p2InMatch = true;
        p1Score = totals[p1Index];
        p2Score = totals[p2Index];
        p1Won = p1Score === best;
        p2Won = p2Score === best;
        arePartners = p1Index === p2Index; // split names were the same team
      }
    }

    if (p1InMatch && p2InMatch) {
      comparison.totalGames += 1;
      if (p1Won) comparison.p1Wins += 1;
      if (p2Won) comparison.p2Wins += 1;

      // Track individual high/low scores against each other
      if (p1Score > comparison.p1BestScore) comparison.p1BestScore = p1Score;
      if (p1Score < comparison.p1WorstScore) comparison.p1WorstScore = p1Score;
      if (p2Score > comparison.p2BestScore) comparison.p2BestScore = p2Score;
      if (p2Score < comparison.p2WorstScore) comparison.p2WorstScore = p2Score;

      if (arePartners) {
        comparison.partnershipGames += 1;
        if (p1Won) comparison.partnerWins += 1;
        else comparison.partnerLosses += 1;
      } else {
        comparison.directRivalryGames += 1;
        if (p1Won) comparison.p1RivalWins += 1;
        if (p2Won) comparison.p2RivalWins += 1;
      }

      // Add a chart progression node
      // Find the ELO values for this specific match from chronological data
      const p1MatchElo = p1Data?.history.find((h) => h.matchId === m.id)?.elo ?? 1000;
      const p2MatchElo = p2Data?.history.find((h) => h.matchId === m.id)?.elo ?? 1000;

      comparison.combinedHistory.push({
        date: m.createdAt.toString(),
        matchId: m.id,
        gameKind: m.kind,
        p1Elo: p1MatchElo,
        p2Elo: p2MatchElo,
      });
    }
  }

  // Adjust high/low if no games were found
  if (comparison.totalGames === 0) {
    comparison.p1BestScore = 0;
    comparison.p1WorstScore = 0;
    comparison.p2BestScore = 0;
    comparison.p2WorstScore = 0;
  }

  return comparison;
}
