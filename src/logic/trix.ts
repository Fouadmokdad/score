/** Trix game logic — 5 contracts × 4 dealers = 20 rounds. */

export type TrixContract = 'kingHearts' | 'queens' | 'diamonds' | 'tricks' | 'trix';

export interface TrixContractDef {
  id: TrixContract;
  label: string;
  /** Negative contract: total points distributed; positive contract has place rewards */
  type: 'negative-count' | 'negative-taker' | 'positive-trix';
  maxCount: number;
  perUnit?: number;
  takerPoints?: number;
  /** trix order rewards: 1st .. 4th */
  trixRewards?: number[];
}

export const TRIX_CONTRACTS: TrixContractDef[] = [
  { id: 'kingHearts', label: 'الملك', type: 'negative-taker', maxCount: 1, takerPoints: 75 },
  { id: 'queens', label: 'البنات', type: 'negative-count', maxCount: 4, perUnit: 25 },
  { id: 'diamonds', label: 'الدياميند', type: 'negative-count', maxCount: 13, perUnit: 10 },
  { id: 'tricks', label: 'اللطوش', type: 'negative-count', maxCount: 13, perUnit: 15 },
  { id: 'trix', label: 'تركس', type: 'positive-trix', maxCount: 4, trixRewards: [200, 150, 100, 50] },
];

export interface TrixRoundInput {
  contract: TrixContract;
  declarerIndex: number;
  /** Crown multiplier (1 by default; 2 after crown trigger) */
  multiplier?: number;
  /** For negative-count: counts per player (sum = maxCount) */
  counts?: number[];
  /** For negative-taker: taker index */
  takerIndex?: number;
  /** For trix: order indices [first, second, third, fourth] */
  trixOrder?: number[];
}

export interface TrixCalcOk {
  ok: true;
  deltas: number[];
  contractLabel: string;
}
export interface TrixCalcErr {
  ok: false;
  error: string;
}

export function calcTrixRound(input: TrixRoundInput): TrixCalcOk | TrixCalcErr {
  const def = TRIX_CONTRACTS.find((c) => c.id === input.contract)!;
  const mul = input.multiplier ?? 1;
  const deltas = [0, 0, 0, 0];

  if (def.type === 'negative-count') {
    const counts = input.counts ?? [];
    if (counts.length !== 4) return { ok: false, error: 'يجب إدخال 4 قيم' };
    const sum = counts.reduce((a, b) => a + (b || 0), 0);
    if (sum !== def.maxCount)
      return { ok: false, error: `المجموع يجب أن يساوي ${def.maxCount} (الحالي ${sum})` };
    for (let i = 0; i < 4; i++) deltas[i] = -((counts[i] || 0) * (def.perUnit || 0)) * mul;
  } else if (def.type === 'negative-taker') {
    const t = input.takerIndex;
    if (t === undefined || t < 0 || t > 3) return { ok: false, error: 'حدد آخذ الملك' };
    deltas[t] = -(def.takerPoints || 0) * mul;
  } else {
    // trix
    const order = input.trixOrder ?? [];
    if (order.length !== 4 || new Set(order).size !== 4)
      return { ok: false, error: 'حدد ترتيب اللاعبين الأربعة' };
    const rewards = def.trixRewards!;
    for (let pos = 0; pos < 4; pos++) {
      const playerIdx = order[pos];
      if (playerIdx < 0 || playerIdx > 3) return { ok: false, error: 'ترتيب غير صالح' };
      deltas[playerIdx] = rewards[pos] * mul;
    }
  }
  return { ok: true, deltas, contractLabel: def.label + (mul > 1 ? ` ×${mul}` : '') };
}

/** Total rounds for a full Trix kingdom: 5 contracts × 4 dealers = 20. */
export function totalTrixRounds() {
  return TRIX_CONTRACTS.length * 4;
}
