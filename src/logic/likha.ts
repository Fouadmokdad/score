/**
 * Likha — every hand totals 36 points.
 *
 * The UI records the final penalty points each player took in the hand.
 *
 * The match ends when any player reaches the target (default 101).
 * Lowest cumulative score wins.
 *
 */

export const LIKHA_PER_HAND = 36;
export const LIKHA_DEFAULT_TARGET = 101;

export interface LikhaRoundInput {
  /** Final penalty points per player (length 4, sum must = 36) */
  scores: number[];
}

export interface LikhaCalcOk {
  ok: true;
  deltas: number[];
  contractLabel: string;
}
export interface LikhaCalcErr {
  ok: false;
  error: string;
}

export function calcLikhaRound(input: LikhaRoundInput): LikhaCalcOk | LikhaCalcErr {
  const scores = input.scores;
  if (!scores || scores.length !== 4) return { ok: false, error: 'يجب إدخال نقاط كل لاعب' };
  if (scores.some((score) => score < 0 || !Number.isFinite(score))) {
    return { ok: false, error: 'النقاط يجب أن تكون أرقاماً موجبة' };
  }
  const sum = scores.reduce((a, b) => a + (b || 0), 0);
  if (sum !== LIKHA_PER_HAND) return { ok: false, error: `مجموع الجولة يجب أن يكون ${LIKHA_PER_HAND} (الحالي ${sum})` };

  return { ok: true, deltas: scores, contractLabel: 'جولة' };
}
