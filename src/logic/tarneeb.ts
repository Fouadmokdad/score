export const TARNEEB_TARGETS = [31, 41, 61] as const;
export const TARNEEB_DEFAULT_TARGET = 31;
export const TARNEEB_400_TARGET = 41;

export function calcTarneebRound(input: {
  bidderTeam: number;
  bidTricks: number;
  wonTricks: number;
  opponentTricks?: number;
}): { ok: true; deltas: number[]; contractLabel: string } | { ok: false; error: string } {
  const { bidderTeam, bidTricks, wonTricks } = input;
  if (bidderTeam !== 0 && bidderTeam !== 1) return { ok: false, error: 'حدد الفريق صاحب الطلب' };
  if (!Number.isFinite(bidTricks) || bidTricks < 7 || bidTricks > 13) return { ok: false, error: 'الطلب يجب أن يكون بين 7 و 13' };
  if (!Number.isFinite(wonTricks) || wonTricks < 0 || wonTricks > 13) return { ok: false, error: 'اللمات يجب أن تكون بين 0 و 13' };

  const opponentTricks = input.opponentTricks ?? 13 - wonTricks;
  if (opponentTricks < 0 || opponentTricks > 13 || wonTricks + opponentTricks !== 13) {
    return { ok: false, error: 'مجموع اللمات يجب أن يكون 13' };
  }

  const deltas = [0, 0];
  const opponent = bidderTeam === 0 ? 1 : 0;
  if (wonTricks >= bidTricks) {
    deltas[bidderTeam] = bidTricks === 13 ? 26 : wonTricks === 13 ? 16 : wonTricks;
  } else {
    deltas[bidderTeam] = bidTricks === 13 ? -16 : -bidTricks;
    deltas[opponent] = opponentTricks;
  }

  return {
    ok: true,
    deltas,
    contractLabel: `طلب ${bidTricks} / أخذ ${wonTricks}`,
  };
}

const TARNEEB_400_BELOW_30: Record<number, number> = {
  2: 2,
  3: 3,
  4: 4,
  5: 10,
  6: 12,
  7: 14,
  8: 16,
  9: 27,
  10: 40,
  11: 40,
  12: 40,
  13: 40,
};

const TARNEEB_400_30_PLUS: Record<number, number> = {
  2: 2,
  3: 3,
  4: 4,
  5: 5,
  6: 6,
  7: 14,
  8: 16,
  9: 27,
  10: 40,
  11: 40,
  12: 40,
  13: 40,
};

export function tarneeb400BidValue(bid: number, currentTotal: number) {
  return (currentTotal >= 30 ? TARNEEB_400_30_PLUS : TARNEEB_400_BELOW_30)[bid] ?? 0;
}

export function tarneeb400MinBid(currentTotal: number) {
  if (currentTotal >= 50) return 5;
  if (currentTotal >= 40) return 4;
  if (currentTotal >= 30) return 3;
  return 2;
}

export function tarneeb400MinTotalBid(totals: number[]) {
  const high = Math.max(...totals);
  if (high >= 50) return 14;
  if (high >= 40) return 13;
  if (high >= 30) return 12;
  return 11;
}

export function calcTarneeb400Round(input: {
  bids: number[];
  tricks: number[];
  totalsBefore: number[];
}): { ok: true; deltas: number[]; contractLabel: string } | { ok: false; error: string } {
  const { bids, tricks, totalsBefore } = input;
  if (bids.length !== 4 || tricks.length !== 4 || totalsBefore.length !== 4) return { ok: false, error: 'يجب إدخال 4 لاعبين' };

  for (let i = 0; i < 4; i++) {
    const minBid = tarneeb400MinBid(totalsBefore[i]);
    if (!Number.isFinite(bids[i]) || bids[i] < minBid || bids[i] > 13) {
      return { ok: false, error: `طلب اللاعب ${i + 1} يجب أن يكون بين ${minBid} و 13` };
    }
    if (!Number.isFinite(tricks[i]) || tricks[i] < 0 || tricks[i] > 13) {
      return { ok: false, error: `لمات اللاعب ${i + 1} يجب أن تكون بين 0 و 13` };
    }
  }

  const totalBids = bids.reduce((sum, bid) => sum + bid, 0);
  const minTotal = tarneeb400MinTotalBid(totalsBefore);
  if (totalBids < minTotal) return { ok: false, error: `مجموع الطلبات يجب أن يكون ${minTotal} أو أكثر (الحالي ${totalBids})` };

  const totalTricks = tricks.reduce((sum, trick) => sum + trick, 0);
  if (totalTricks !== 13) return { ok: false, error: `مجموع اللمات يجب أن يكون 13 (الحالي ${totalTricks})` };

  const deltas = bids.map((bid, i) => {
    const value = tarneeb400BidValue(bid, totalsBefore[i]);
    return tricks[i] >= bid ? value : -value;
  });

  return { ok: true, deltas, contractLabel: `طلبات ${totalBids}` };
}

export function getTarneeb400Winner(totals: number[]) {
  for (let i = 0; i < totals.length; i++) {
    const partner = (i + 2) % 4;
    if (totals[i] >= TARNEEB_400_TARGET && totals[partner] > 0) return i;
  }
  return -1;
}
