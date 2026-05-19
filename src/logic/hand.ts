/**
 * Hand game (Solo players or Partners 2v2).
 *
 * - A match is best-of-9: first side to win 5 rounds wins the match.
 * - Lower cumulative score is better (penalty points).
 *
 * Per round, the side/player that wins picks one of:
 *   - Normal:   winner -20, each loser += card points × 1
 *   - Hand 100: winner -40, each loser += card points × 1
 *   - Hand 150: winner -40, each loser += card points × 1.5
 *   - Hand 200: winner -40, each loser += card points × 2
 *
 * `loserCards` = the points value of the cards/tricks the losing side took
 * during this round (input by the user).
 */

export const HAND_ROUNDS_TO_WIN = 5;
export const HAND_MAX_ROUNDS = 9;

export type HandKind = 'normal' | 'h100' | 'h150' | 'h200';

export interface HandKindDef {
  id: HandKind;
  label: string;
  winnerDelta: number;
  multiplier: number;
}

export const HAND_KINDS: HandKindDef[] = [
  { id: 'normal', label: 'عادية', winnerDelta: -20, multiplier: 1 },
  { id: 'h100', label: 'هند 100', winnerDelta: -40, multiplier: 1 },
  { id: 'h150', label: 'هند 150', winnerDelta: -40, multiplier: 1.5 },
  { id: 'h200', label: 'هند 200', winnerDelta: -40, multiplier: 2 },
];

export interface HandRoundInput {
  /** Number of sides/players playing */
  sides: number;
  /** Index of the winning side/player */
  winnerIndex: number;
  /** Hand kind */
  kind: HandKind;
  /** Card points each losing side/player took this round */
  loserCards: number | number[];
}

export interface HandCalcOk {
  ok: true;
  /** Per-side/player deltas */
  deltas: number[];
  contractLabel: string;
}
export interface HandCalcErr {
  ok: false;
  error: string;
}

export function calcHandRound(input: HandRoundInput): HandCalcOk | HandCalcErr {
  const def = HAND_KINDS.find((k) => k.id === input.kind);
  if (!def) return { ok: false, error: 'نوع غير معروف' };
  if (!Number.isInteger(input.sides) || input.sides < 2)
    return { ok: false, error: 'عدد اللاعبين غير صحيح' };
  if (!Number.isInteger(input.winnerIndex) || input.winnerIndex < 0 || input.winnerIndex >= input.sides)
    return { ok: false, error: 'حدد الفائز' };

  const loserCards = input.loserCards;
  const cards: number[] = Array.isArray(loserCards)
    ? loserCards
    : Array.from({ length: input.sides }, () => loserCards);
  if (cards.length !== input.sides)
    return { ok: false, error: 'عدد خانات نقاط الورق غير مطابق لعدد اللاعبين' };
  if (cards.some((v) => v < 0 || !Number.isFinite(v)))
    return { ok: false, error: 'نقاط الورق يجب أن تكون أرقاماً موجبة' };

  const deltas = new Array(input.sides).fill(0);
  const w = input.winnerIndex;
  deltas[w] = def.winnerDelta;
  for (let i = 0; i < input.sides; i++) {
    if (i !== w) deltas[i] = Math.round(cards[i] * def.multiplier);
  }
  return { ok: true, deltas, contractLabel: def.label };
}

/**
 * Count round wins per side/player from match rounds.
 */
export function countHandWins(rounds: { meta?: any }[], sides = 2): number[] {
  const wins = new Array(sides).fill(0);
  for (const r of rounds) {
    const winner = r.meta?.handWinner;
    if (Number.isInteger(winner) && winner >= 0 && winner < sides) wins[winner]++;
  }
  return wins;
}

export function isHandMatchOver(rounds: { meta?: any }[], sides = 2): { over: boolean; winner?: number } {
  const wins = countHandWins(rounds, sides);
  const winner = wins.findIndex((w) => w >= HAND_ROUNDS_TO_WIN);
  if (winner !== -1) return { over: true, winner };
  return { over: false };
}
