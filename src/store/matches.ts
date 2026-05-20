import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Match, Round } from '../types';
import { celebrateWin } from '../utils/confetti';
import { playRoundAdded, playWin } from '../utils/sound';

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

interface MatchesState {
  matches: Match[];
  createMatch: (m: Omit<Match, 'id' | 'rounds' | 'createdAt' | 'updatedAt' | 'finished'>) => string;
  getMatch: (id: string) => Match | undefined;
  addRound: (matchId: string, round: Omit<Round, 'id' | 'createdAt'>) => void;
  updateRound: (matchId: string, roundId: string, patch: Partial<Pick<Round, 'deltas' | 'meta'>>) => void;
  removeLastRound: (matchId: string) => void;
  removeRound: (matchId: string, roundId: string) => void;
  finishMatch: (matchId: string, winnerIndex?: number) => void;
  deleteMatch: (matchId: string) => void;
  updateMatchConfig: (matchId: string, config: Record<string, any>) => void;
  clearAll: () => void;
}

export const useMatches = create<MatchesState>()(
  persist(
    (set, get) => ({
      matches: [],
      createMatch: (m) => {
        const id = uid();
        const now = Date.now();
        const match: Match = {
          ...m,
          id,
          rounds: [],
          createdAt: now,
          updatedAt: now,
          finished: false,
        };
        set({ matches: [match, ...get().matches] });
        return id;
      },
      getMatch: (id) => get().matches.find((x) => x.id === id),
      addRound: (matchId, round) => {
        set({
          matches: get().matches.map((m) =>
            m.id === matchId
              ? {
                  ...m,
                  rounds: [...m.rounds, { ...round, id: uid(), createdAt: Date.now() }],
                  updatedAt: Date.now(),
                }
              : m
          ),
        });
        playRoundAdded();
      },
      updateRound: (matchId, roundId, patch) => {
        set({
          matches: get().matches.map((m) =>
            m.id === matchId
              ? {
                  ...m,
                  rounds: m.rounds.map((round) =>
                    round.id === roundId ? { ...round, ...patch } : round
                  ),
                  updatedAt: Date.now(),
                  finished: false,
                  winnerIndex: undefined,
                }
              : m
          ),
        });
      },
      removeLastRound: (matchId) => {
        set({
          matches: get().matches.map((m) =>
            m.id === matchId
              ? { ...m, rounds: m.rounds.slice(0, -1), updatedAt: Date.now(), finished: false, winnerIndex: undefined }
              : m
          ),
        });
      },
      removeRound: (matchId, roundId) => {
        set({
          matches: get().matches.map((m) =>
            m.id === matchId
              ? { ...m, rounds: m.rounds.filter(r => r.id !== roundId), updatedAt: Date.now(), finished: false, winnerIndex: undefined }
              : m
          ),
        });
      },
      finishMatch: (matchId, winnerIndex) => {
        const shouldCelebrate = get().matches.some((m) => m.id === matchId && !m.finished);
        set({
          matches: get().matches.map((m) =>
            m.id === matchId ? { ...m, finished: true, winnerIndex, updatedAt: Date.now() } : m
          ),
        });
        if (shouldCelebrate) {
          playWin();
          celebrateWin();
        }
      },
      deleteMatch: (matchId) => {
        set({ matches: get().matches.filter((m) => m.id !== matchId) });
      },
      updateMatchConfig: (matchId, config) => {
        set({
          matches: get().matches.map((m) =>
            m.id === matchId ? { ...m, config: { ...m.config, ...config }, updatedAt: Date.now() } : m
          ),
        });
      },
      clearAll: () => set({ matches: [] }),
    }),
    { name: 'score-matches' }
  )
);

/** Compute totals (sum of deltas per index) */
export function computeTotals(match: Match): number[] {
  const n = match.teams ?? match.players.length;
  const totals = new Array(n).fill(0);
  for (const r of match.rounds) {
    r.deltas.forEach((d, i) => {
      totals[i] += d || 0;
    });
  }
  return totals;
}
