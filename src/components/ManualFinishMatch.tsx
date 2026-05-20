import { useNavigate } from 'react-router-dom';
import { Flag } from 'lucide-react';
import type { Match } from '../types';
import { computeTotals, useMatches } from '../store/matches';
import { useSettings } from '../store/settings';
import { useConfirm } from './ConfirmDialog';

interface Props {
  match: Match;
  lowerIsBetter?: boolean;
  winnerIndex?: number;
}

export function ManualFinishMatch({ match, lowerIsBetter, winnerIndex }: Props) {
  const navigate = useNavigate();
  const { finishMatch } = useMatches();
  const { language } = useSettings();
  const confirm = useConfirm();
  const en = language === 'en';

  if (match.finished) return null;

  const finish = async () => {
    const ok = await confirm({
      title: en ? 'End match' : 'إنهاء المباراة',
      message: en
        ? 'This match will move to finished history using the current score.'
        : 'ستنقل هذه المباراة إلى السجل كمنتهية اعتماداً على النقاط الحالية.',
      confirmText: en ? 'End match' : 'إنهاء',
      cancelText: en ? 'Cancel' : 'إلغاء',
      tone: 'warning',
    });
    if (!ok) return;

    const totals = computeTotals(match);
    const selectedWinner =
      winnerIndex ??
      (lowerIsBetter
        ? totals.indexOf(Math.min(...totals))
        : totals.indexOf(Math.max(...totals)));

    finishMatch(match.id, selectedWinner);
    navigate('/history');
  };

  return (
    <button
      className="w-full mt-3 py-3 px-4 rounded-2xl border border-amber-500/25 bg-amber-500/5 hover:bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:border-amber-500/40 text-sm font-black transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2 shadow-sm"
      onClick={finish}
    >
      <Flag className="h-4 w-4" /> {en ? 'End match manually' : 'إنهاء المباراة يدوياً'}
    </button>
  );
}
