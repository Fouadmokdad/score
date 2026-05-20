import { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, type PanInfo } from 'framer-motion';
import { Check, Pencil, X, Trash2 } from 'lucide-react';
import type { Match } from '../types';
import type { Round } from '../types';
import { computeTotals, useMatches } from '../store/matches';
import { copy } from '../i18n';
import { useSettings } from '../store/settings';
import { PlayerAvatar } from './PlayerAvatar';
import { MatchChart } from './MatchChart';
import { countHandWins } from '../logic/hand';
import { playHaptic } from '../utils/haptics';
import { useConfirm } from './ConfirmDialog';
import { CountUp } from './CountUp';

interface Props {
  match: Match;
  /** Names override (e.g. team names) */
  names?: string[];
  /** Fewer-is-better (Likha) — winner is min */
  lowerIsBetter?: boolean;
  editTotalRequired?: number;
}

export function ScoreTable({ match, names, lowerIsBetter, editTotalRequired }: Props) {
  const { language } = useSettings();
  const { updateRound } = useMatches();
  const confirm = useConfirm();
  const t = copy[language];
  const en = language === 'en';
  const totals = computeTotals(match);
  const labels = names ?? match.players;
  const best = lowerIsBetter ? Math.min(...totals) : Math.max(...totals);
  const compact = true;
  const [editingRound, setEditingRound] = useState<Round | null>(null);
  const [editValues, setEditValues] = useState<string[]>([]);
  const [editError, setEditError] = useState('');

  const startEdit = (round: Round) => {
    setEditingRound(round);
    setEditValues(labels.map((_, i) => String(round.deltas[i] ?? 0)));
    setEditError('');
  };

  const saveEdit = () => {
    if (!editingRound) return;
    const deltas = editValues.map((value) => Number(value) || 0);
    const total = deltas.reduce((sum, value) => sum + value, 0);
    if (editTotalRequired !== undefined && total !== editTotalRequired) {
      setEditError(
        en
          ? `Round total must be ${editTotalRequired}. Current total is ${total}.`
          : `مجموع الجولة يجب أن يكون ${editTotalRequired}. المجموع الحالي ${total}.`
      );
      return;
    }
    updateRound(match.id, editingRound.id, {
      deltas,
    });
    setEditingRound(null);
    setEditValues([]);
    setEditError('');
  };

  const deleteRound = async (round: Round) => {
    playHaptic();
    const ok = await confirm({
      title: en ? 'Delete round?' : 'حذف الجولة؟',
      message: en
        ? 'This round will be removed from the match score. This action cannot be undone.'
        : 'سيتم حذف هذه الجولة من نتيجة المباراة. لا يمكن التراجع عن هذا الإجراء.',
      confirmText: en ? 'Delete' : 'حذف',
      cancelText: en ? 'Cancel' : 'إلغاء',
      tone: 'danger',
    });
    if (ok) {
      useMatches.getState().removeRound(match.id, round.id);
    }
  };

  const handleRowSwipe = (round: Round, info: PanInfo) => {
    if (info.offset.x > 90 || info.velocity.x > 600) {
      startEdit(round);
      return;
    }
    if (info.offset.x < -90 || info.velocity.x < -600) {
      void deleteRound(round);
    }
  };

  const runningTotals = (() => {
    const isHand = match.kind === 'hand-partners' || match.kind === 'hand-solo';
    const sides = match.players.length;
    const wins = isHand ? countHandWins(match.rounds, sides) : new Array(sides).fill(0);
    const winsDiff = sides === 2 ? wins[0] - wins[1] : 0;
    return totals.map((score, i) => {
      if (!isHand || sides !== 2) return score;
      if (winsDiff > 0 && i === 0) return score - winsDiff * 100;
      if (winsDiff < 0 && i === 1) return score - Math.abs(winsDiff) * 100;
      return score;
    });
  })();

  return (
    <div className="w-full max-w-full p-0">
      <MatchChart match={match} />
      <div className="sticky top-[4.75rem] z-30 mb-2 rounded-2xl border border-slate-200/80 bg-white/95 px-3 py-2 shadow-sm backdrop-blur dark:border-white/10 dark:bg-[#201f1b]/95 hide-on-share">
        <div className="mb-1 text-[10px] font-black uppercase tracking-wider text-slate-400">{en ? 'Running total' : 'المجموع الحالي'}</div>
        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${labels.length}, minmax(0, 1fr))` }}>
          {labels.map((label, i) => (
            <div key={`${label}-${i}`} className="min-w-0 rounded-xl bg-slate-100/80 px-2 py-1.5 text-center dark:bg-white/[0.05]">
              <div className="truncate text-[10px] font-semibold text-slate-500 dark:text-slate-400">{label}</div>
              <CountUp value={runningTotals[i] ?? 0} className="text-sm font-black text-slate-900 dark:text-white" />
            </div>
          ))}
        </div>
      </div>
      <table className={(compact ? 'table-fixed text-xs' : 'text-sm') + ' w-full'}>
        <thead className="sticky top-[8.5rem] z-20">
          <tr>
            <th className={(compact ? 'w-7 px-1' : 'w-12') + ' table-cell'}>#</th>
            {labels.map((p, i) => {
              const isTeam = labels.length === 2 && (match.kind.includes('partners') || p.includes(' و ') || p.includes(' & '));
              let t1, t2;
              if (isTeam) {
                if (match.config?.originalNames && match.config.originalNames.length >= 4) {
                  t1 = match.config.originalNames[i];
                  t2 = match.config.originalNames[i + 2];
                } else {
                  const parts = p.split(/ و | & /);
                  t1 = parts[0] || 'P1';
                  t2 = parts[1] || 'P2';
                }
              }

              return (
                <th key={i} className={(compact ? 'px-1' : 'max-w-28 sm:max-w-none') + ' table-cell font-bold'}>
                  {compact ? (
                    <span className="flex min-w-0 flex-col items-center gap-1">
                      {isTeam && t1 && t2 ? (
                        <div className="flex items-center justify-center -space-x-2 space-x-reverse">
                          <div className="z-10 rounded-full ring-2 ring-white dark:ring-[#1a1915]">
                            <PlayerAvatar name={t1} size="sm" />
                          </div>
                          <div className="z-0 rounded-full ring-2 ring-white dark:ring-[#1a1915]">
                            <PlayerAvatar name={t2} size="sm" />
                          </div>
                        </div>
                      ) : (
                        <PlayerAvatar name={p} size="sm" />
                      )}
                      <span className="w-full truncate text-[10px] leading-tight text-slate-500 dark:text-slate-400">
                        {p}
                      </span>
                    </span>
                  ) : (
                    <PlayerAvatar name={p} size="sm" showName className="justify-center" />
                  )}
                </th>
              );
            })}
            <th className="table-cell w-16 px-1 hide-on-share"></th>
          </tr>
        </thead>
        <tbody>
          {match.rounds.map((r, idx) => (
            <motion.tr
              key={r.id}
              layout
              initial={{ opacity: 0, y: -18 }}
              animate={{ opacity: 1, y: 0, x: 0 }}
              exit={{ opacity: 0, y: 18 }}
              transition={{ duration: 0.25 }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.32}
              onDragEnd={(_, info) => handleRowSwipe(r, info)}
              className="border-t border-slate-200 touch-pan-y dark:border-white/10"
            >
              <td className={(compact ? 'px-1' : '') + ' table-cell text-slate-500'}>{idx + 1}</td>
              {r.deltas.map((d, i) => (
                <td key={i} className={(compact ? 'px-1' : '') + ' table-cell'}>
                  <div className="font-semibold">
                    {d > 0 ? `+${d}` : d}
                    {r.meta?.handWinner === i && <span className="ml-0.5 inline-block text-[10px]">⭐</span>}
                  </div>
                  {r.meta?.contractLabels?.[i] && (
                    <div className="text-[10px] text-slate-500">{r.meta.contractLabels[i]}</div>
                  )}
                </td>
              ))}
              <td className="table-cell px-1 hide-on-share">
                <div className="flex items-center justify-center gap-1">
                  <button
                    className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-200 hover:text-emerald-600 dark:hover:bg-white/10"
                    onClick={() => startEdit(r)}
                    aria-label={en ? 'Edit round' : 'تعديل الجولة'}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30"
                    onClick={() => void deleteRound(r)}
                    aria-label={en ? 'Delete round' : 'حذف الجولة'}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </td>
            </motion.tr>
          ))}
          {match.rounds.length === 0 && (
            <tr>
              <td colSpan={labels.length + 2} className="table-cell py-8 text-slate-400">
                {t.noRounds}
              </td>
            </tr>
          )}
        </tbody>
        <tfoot>
          {(() => {
            const isHand = match.kind === 'hand-partners' || match.kind === 'hand-solo';
            const sides = match.players.length;
            const wins = isHand ? countHandWins(match.rounds, sides) : new Array(sides).fill(0);
            const winsDiff = sides === 2 ? wins[0] - wins[1] : 0;
            const displayTotals = totals.map((t, i) => {
              if (!isHand || sides !== 2) return t;
              if (winsDiff > 0 && i === 0) return t - winsDiff * 100;
              if (winsDiff < 0 && i === 1) return t - Math.abs(winsDiff) * 100;
              return t;
            });
            const displayBest = lowerIsBetter ? Math.min(...displayTotals) : Math.max(...displayTotals);
            return (
              <tr>
                <td className={(compact ? 'px-1 text-[10px]' : '') + ' table-cell font-bold'}>{t.total}</td>
                {displayTotals.map((dt, i) => (
                  <td
                    key={i}
                    className={
                      (compact ? 'px-1 text-sm' : 'text-base') +
                      ' table-cell font-extrabold ' +
                      (dt === displayBest && match.rounds.length > 0 ? 'text-emerald-600 dark:text-emerald-400' : '')
                    }
                  >
                    <CountUp value={dt} />
                  </td>
                ))}
                <td className="table-cell px-1"></td>
              </tr>
            );
          })()}
        </tfoot>
      </table>

      {editingRound &&
        createPortal(
          <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/65 px-3 pb-4 pt-16 backdrop-blur-sm sm:items-center sm:p-4">
            <div className="max-h-[calc(100vh-5rem)] w-full max-w-md overflow-y-auto rounded-[1.5rem] p-4 glass-modal">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-lg font-extrabold">
                    {en ? 'Edit round' : 'تعديل الجولة'} #{match.rounds.findIndex((r) => r.id === editingRound.id) + 1}
                  </h2>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    {editTotalRequired
                      ? en
                        ? `Update the saved scores. Total must be ${editTotalRequired}.`
                        : `عدّل نقاط الجولة المحفوظة. المجموع يجب أن يكون ${editTotalRequired}.`
                      : en
                        ? 'Update the saved scores. Empty fields are saved as 0.'
                        : 'عدّل نقاط الجولة المحفوظة. الخانة الفاضية تنحفظ 0.'}
                  </p>
                </div>
                <button className="btn-ghost shrink-0 px-2 py-2" onClick={() => setEditingRound(null)} aria-label={en ? 'Close' : 'إغلاق'}>
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {labels.map((player, i) => (
                  <div key={i} className="min-w-0">
                    <div className="mb-1 truncate text-xs font-semibold text-slate-500">{player}</div>
                    <input
                      type="number"
                      inputMode="numeric"
                      className="input text-center text-lg font-bold"
                      value={editValues[i] ?? ''}
                      onChange={(e) => {
                        const next = [...editValues];
                        const value = e.target.value;
                        next[i] = value === '' ? '' : String(Number(value) || 0);
                        setEditValues(next);
                      }}
                    />
                  </div>
                ))}
              </div>

              {editTotalRequired !== undefined && (
                <div
                  className={
                    'mt-2 text-xs font-semibold ' +
                    (editValues.reduce((sum, value) => sum + (Number(value) || 0), 0) === editTotalRequired
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-slate-500')
                  }
                >
                  {en ? 'Current total' : 'المجموع الحالي'}:{' '}
                  {editValues.reduce((sum, value) => sum + (Number(value) || 0), 0)} / {editTotalRequired}
                </div>
              )}

              {editError && (
                <div className="mt-3 rounded-xl bg-red-100 p-2 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300">
                  {editError}
                </div>
              )}

              <div className="mt-4 grid grid-cols-2 gap-2">
                <button className="btn-secondary" onClick={() => setEditingRound(null)}>
                  {en ? 'Cancel' : 'إلغاء'}
                </button>
                <button className="btn-primary" onClick={saveEdit}>
                  <Check className="h-4 w-4" /> {en ? 'Save' : 'حفظ'}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
