import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Flag, Plus, Crown, Trophy } from 'lucide-react';
import { Layout } from '../../components/Layout';
import { ManualFinishMatch } from '../../components/ManualFinishMatch';
import { ScoreTable } from '../../components/ScoreTable';
import { ShareButton } from '../../components/ShareButton';
import { GameScoreHeader } from '../../components/GameScoreHeader';
import { gameText } from '../../i18n';
import { calcTrixRound } from '../../logic/trix';
import { computeTotals, useMatches } from '../../store/matches';
import { useSettings } from '../../store/settings';
import { ShareMatchCardModal } from '../../components/ShareMatchCardModal';

type ComplexContract = 'complex' | 'trix';

const TOTAL_COMPLEX_ROUNDS = 8;

export default function ComplexGame({ variant = 'solo' }: { variant?: 'solo' | 'partners' }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getMatch, addRound, finishMatch } = useMatches();
  const { language } = useSettings();
  const en = language === 'en';
  const match = id ? getMatch(id) : undefined;

  const [showRoundForm, setShowRoundForm] = useState(false);
  const [contract, setContract] = useState<ComplexContract>('complex');
  const [declarer, setDeclarer] = useState(0);
  const [kingTaker, setKingTaker] = useState(0);
  const [queens, setQueens] = useState<string[]>(['', '', '', '']);
  const [diamonds, setDiamonds] = useState<string[]>(['', '', '', '']);
  const [tricks, setTricks] = useState<string[]>(['', '', '', '']);
  const [trixOrder, setTrixOrder] = useState<number[]>([]);
  const [doubleCards, setDoubleCards] = useState(false);
  const [error, setError] = useState('');
  const [showShareCard, setShowShareCard] = useState(false);

  if (!match) {
    return (
      <Layout back title={gameText[language].labels[variant === 'partners' ? 'complex-partners' : 'complex-solo']}>
        <div className="card">{en ? 'Match not found.' : 'المباراة غير موجودة.'}</div>
      </Layout>
    );
  }

  const played = useMemo(() => {
    const map: Record<string, boolean> = {};
    for (const r of match.rounds) map[`${r.meta?.declarer}-${r.meta?.contract}`] = true;
    return map;
  }, [match.rounds]);

  const remaining = TOTAL_COMPLEX_ROUNDS - match.rounds.length;
  const isPlayed = played[`${declarer}-${contract}`];
  const displayTotals = computeTotals(match);
  const teamLabels = [
    `${match.players[0]} ${en ? '&' : 'و'} ${match.players[2]}`,
    `${match.players[1]} ${en ? '&' : 'و'} ${match.players[3]}`,
  ];
  const teamAvatarGroups = [
    [match.players[0], match.players[2]],
    [match.players[1], match.players[3]],
  ];
  const teamTotals = [displayTotals[0] + displayTotals[2], displayTotals[1] + displayTotals[3]];
  const tableMatch = variant === 'partners'
    ? {
        ...match,
        players: teamLabels,
        teams: 2,
        rounds: match.rounds.map((round) => ({
          ...round,
          deltas: [(round.deltas[0] || 0) + (round.deltas[2] || 0), (round.deltas[1] || 0) + (round.deltas[3] || 0)],
        })),
      }
    : match;

  const submit = () => {
    if (isPlayed) return setError(en ? 'This request was already played for this player' : 'هذا الطلب لُعب مسبقاً لهذا اللاعب');

    if (contract === 'trix') {
      const r = calcTrixRound({ contract: 'trix', declarerIndex: declarer, trixOrder });
      if (!r.ok) return setError(r.error);
      setError('');
      addRound(match.id, { deltas: r.deltas, meta: { contract, declarer, contractLabel: r.contractLabel } });
      setTrixOrder([]);
      setShowRoundForm(false);
      return;
    }

    const parsedQueens = queens.map((value) => Number(value) || 0);
    const parsedDiamonds = diamonds.map((value) => Number(value) || 0);
    const parsedTricks = tricks.map((value) => Number(value) || 0);
    const queenTotal = parsedQueens.reduce((sum, value) => sum + value, 0);
    const diamondTotal = parsedDiamonds.reduce((sum, value) => sum + value, 0);
    const trickTotal = parsedTricks.reduce((sum, value) => sum + value, 0);

    if (queenTotal !== 4) return setError(en ? `Queens total must be 4. Current total is ${queenTotal}.` : `مجموع البنات يجب أن يكون 4 (الحالي ${queenTotal})`);
    if (diamondTotal !== 13) return setError(en ? `Diamonds total must be 13. Current total is ${diamondTotal}.` : `مجموع الديناري يجب أن يكون 13 (الحالي ${diamondTotal})`);
    if (trickTotal !== 13) return setError(en ? `Tricks total must be 13. Current total is ${trickTotal}.` : `مجموع اللطوش يجب أن يكون 13 (الحالي ${trickTotal})`);

    const mul = doubleCards ? 2 : 1;
    const deltas = [0, 0, 0, 0];
    deltas[kingTaker] -= 75 * mul;
    for (let i = 0; i < 4; i++) {
      deltas[i] -= parsedQueens[i] * 25 * mul;
      deltas[i] -= parsedDiamonds[i] * 10;
      deltas[i] -= parsedTricks[i] * 15;
    }

    setError('');
    addRound(match.id, {
      deltas,
      meta: { contract, declarer, contractLabel: doubleCards ? 'كومبلكس ×2' : 'كومبلكس' },
    });
    setQueens(['', '', '', '']);
    setDiamonds(['', '', '', '']);
    setTricks(['', '', '', '']);
    setDoubleCards(false);
    setShowRoundForm(false);
  };

  const togglePos = (i: number) => {
    if (trixOrder.includes(i)) setTrixOrder(trixOrder.filter((x) => x !== i));
    else if (trixOrder.length < 4) setTrixOrder([...trixOrder, i]);
  };

  const finish = () => {
    if (variant === 'partners') {
      finishMatch(match.id, teamTotals[0] >= teamTotals[1] ? 0 : 1);
    } else {
      const totals = computeTotals(match);
      const max = Math.max(...totals);
      finishMatch(match.id, totals.indexOf(max));
    }
    navigate('/');
  };

  const title = gameText[language].labels[variant === 'partners' ? 'complex-partners' : 'complex-solo'];

  return (
    <Layout back title={title} headerAction={<ShareButton targetId="score-table-capture" />}>
      <div id="score-table-capture" className="bg-[#f8fafc] dark:bg-[#1b1a17] -mx-1 px-1 pb-2">
        <GameScoreHeader
          match={match}
          totals={variant === 'partners' ? teamTotals : undefined}
          labels={variant === 'partners' ? teamLabels : undefined}
          avatarGroups={variant === 'partners' ? teamAvatarGroups : undefined}
        />
        <div className="game-status">
          <span>{en ? 'Round' : 'جولة'} {match.rounds.length + 1} {en ? 'of' : 'من'} {TOTAL_COMPLEX_ROUNDS}</span>
          <span>{en ? 'Remaining' : 'المتبقي'}: {remaining}</span>
        </div>
        <ScoreTable match={tableMatch} />
      </div>

      {remaining > 0 && <ManualFinishMatch match={match} winnerIndex={variant === 'partners' ? (teamTotals[0] >= teamTotals[1] ? 0 : 1) : undefined} />}

      {remaining > 0 && !showRoundForm && (
        <button className="btn-primary mt-4 w-full py-4 text-lg" onClick={() => setShowRoundForm(true)}>
          <Plus className="h-4 w-4" /> {en ? 'New round' : 'جولة جديدة'}
        </button>
      )}

      {remaining > 0 && showRoundForm && (
        <div className="relative overflow-hidden rounded-[2.25rem] border border-slate-200/60 bg-white shadow-2xl shadow-black/10 backdrop-blur-xl dark:border-white/[0.07] dark:bg-[#18171380] dark:shadow-black/40 mt-5 animate-in fade-in slide-in-from-bottom-4 duration-300">
          {/* Top accent gradient bar */}
          <div className="absolute top-0 inset-x-0 h-[3px] bg-gradient-to-r from-rose-500 via-pink-400 to-fuchsia-500 rounded-t-[2.25rem]" />
          <div className="p-6 pt-7 space-y-5">

            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-white/[0.06]">
              <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2.5">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
                </span>
                <span>{en ? 'New Round' : 'جولة جديدة'}</span>
              </h3>
              <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-gradient-to-br from-slate-100 to-slate-50 dark:from-white/[0.06] dark:to-white/[0.02] text-slate-400 dark:text-slate-500 border border-slate-200/40 dark:border-white/[0.04] shadow-sm">
                {variant === 'partners' ? (en ? 'Partners' : 'شراكة') : (en ? 'Solo' : 'فردي')}
              </span>
            </div>

            {/* Contract Type */}
            <div className="space-y-2.5">
              <label className="flex items-center gap-1.5 text-[11px] font-black tracking-widest text-slate-400 dark:text-slate-500 uppercase">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 text-rose-500">
                  <path d="M15.98 1.804a1 1 0 0 0-1.96 0l-.24 1.192a1 1 0 0 1-.784.785l-1.192.24a1 1 0 0 0 0 1.962l1.192.24a1 1 0 0 1 .784.785l.24 1.192a1 1 0 0 0 1.962 0l.24-1.192a1 1 0 0 1 .784-.785l1.192-.24a1 1 0 0 0 0-1.962l-1.192-.24a1 1 0 0 1-.784-.785l-.24-1.192ZM6.949 5.684a1 1 0 0 0-1.898 0l-.683 2.051a1 1 0 0 1-.633.633l-2.051.683a1 1 0 0 0 0 1.898l2.051.684a1 1 0 0 1 .633.632l.683 2.051a1 1 0 0 0 1.898 0l.683-2.051a1 1 0 0 1 .633-.633l2.051-.683a1 1 0 0 0 0-1.898l-2.051-.683a1 1 0 0 1-.633-.633L6.95 5.684Z" />
                </svg>
                {en ? 'Request Type' : 'الطلب'}
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(['complex', 'trix'] as const).map((value) => {
                  const isSelected = contract === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      className={
                        'relative flex items-center justify-center gap-2 rounded-[1.25rem] border-2 px-4 py-3 text-sm font-black transition-all duration-300 active:scale-[0.97] ' +
                        (isSelected
                          ? 'border-rose-500/70 bg-gradient-to-br from-rose-500/12 to-pink-500/6 text-rose-700 dark:text-rose-300 shadow-[0_3px_16px_rgba(244,63,94,0.16)]'
                          : 'border-slate-200/60 bg-slate-50/50 text-slate-500 hover:border-slate-300 hover:bg-slate-100/70 dark:border-white/[0.04] dark:bg-white/[0.02] dark:text-slate-400')
                      }
                      onClick={() => setContract(value)}
                    >
                      {isSelected && (
                        <div className="absolute top-1.5 right-1.5 h-4 w-4 rounded-full bg-rose-500 text-white flex items-center justify-center">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-2.5 h-2.5">
                            <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                      {value === 'complex' ? (en ? 'Complex' : 'كومبلكس') : 'Trix'}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Kingdom Owner / Declarer */}
            <div className="space-y-2.5">
              <label className="flex items-center gap-1.5 text-[11px] font-black tracking-widest text-slate-400 dark:text-slate-500 uppercase">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 text-amber-500">
                  <path fillRule="evenodd" d="M10 1a4.5 4.5 0 0 0-4.5 4.5V9H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-.5V5.5A4.5 4.5 0 0 0 10 1Zm3 8V5.5a3 3 0 1 0-6 0V9h6Z" clipRule="evenodd" />
                </svg>
                {en ? 'Kingdom Owner' : 'صاحب المملكة'}
              </label>
              <div className="grid grid-cols-2 gap-2">
                {match.players.map((p, i) => {
                  const isSelected = declarer === i;
                  const isDisabled = played[`${i}-${contract}`];
                  return (
                    <button
                      key={p}
                      type="button"
                      disabled={isDisabled}
                      className={
                        'relative flex items-center justify-center rounded-[1.25rem] border-2 px-3 py-3 text-sm font-black transition-all duration-300 active:scale-[0.96] disabled:opacity-35 disabled:cursor-not-allowed ' +
                        (isSelected
                          ? 'border-blue-500/70 bg-gradient-to-br from-blue-500/12 to-indigo-500/6 text-blue-700 dark:text-blue-300 shadow-[0_3px_16px_rgba(59,130,246,0.16)]'
                          : 'border-slate-200/60 bg-slate-50/50 text-slate-500 hover:border-slate-300 hover:bg-slate-100/70 dark:border-white/[0.04] dark:bg-white/[0.02] dark:text-slate-400')
                      }
                      onClick={() => setDeclarer(i)}
                    >
                      {isSelected && (
                        <div className="absolute top-1.5 right-1.5 h-4 w-4 rounded-full bg-blue-500 text-white flex items-center justify-center">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-2.5 h-2.5">
                            <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                      {p}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Complex or Trix sub-form */}
            {contract === 'complex' ? (
              <ComplexCountsForm
                en={en}
                players={match.players}
                kingTaker={kingTaker}
                setKingTaker={setKingTaker}
                queens={queens}
                setQueens={setQueens}
                diamonds={diamonds}
                setDiamonds={setDiamonds}
                tricks={tricks}
                setTricks={setTricks}
                doubleCards={doubleCards}
                setDoubleCards={setDoubleCards}
              />
            ) : (
              <div className="space-y-2.5">
                <label className="flex items-center gap-1.5 text-[11px] font-black tracking-widest text-slate-400 dark:text-slate-500 uppercase">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 text-[rgb(var(--accent))]">
                    <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
                  </svg>
                  {en ? 'Finish Order (1st → 4th)' : 'ترتيب الإنهاء (الأول → الرابع)'}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {match.players.map((p, i) => {
                    const pos = trixOrder.indexOf(i);
                    const isSelected = pos >= 0;
                    return (
                      <button
                        key={p}
                        type="button"
                        className={
                          'relative flex items-center justify-between gap-2 rounded-[1.25rem] border-2 px-3.5 py-3 text-sm font-black transition-all duration-300 active:scale-[0.96] ' +
                          (isSelected
                            ? 'border-[rgba(var(--accent),0.7)] bg-[rgba(var(--accent),0.12)] text-[rgb(var(--accent))] shadow-[0_3px_16px_rgba(var(--accent),0.14)]'
                            : 'border-slate-200/60 bg-slate-50/50 text-slate-500 hover:border-slate-300 hover:bg-slate-100/70 dark:border-white/[0.04] dark:bg-white/[0.02] dark:text-slate-400')
                        }
                        onClick={() => togglePos(i)}
                      >
                        <span>{p}</span>
                        {isSelected && (
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[rgb(var(--accent))] text-white text-xs font-black shadow-sm">
                            {pos + 1}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                <div className="text-center text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                  {en ? 'Rewards: 200 / 150 / 100 / 50' : 'المكافآت: 200 / 150 / 100 / 50'}
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-2xl bg-red-500/10 border border-red-500/20 p-3.5 text-xs font-black text-red-600 dark:text-red-400 text-center">
                {error}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col gap-2 pt-1">
              <button
                type="button"
                className="btn-primary w-full py-4 rounded-2xl text-[15px] font-black flex items-center justify-center gap-2"
                onClick={submit}
              >
                <Plus className="h-5 w-5 stroke-[3]" />
                {en ? 'Save Round' : 'حفظ الجولة'}
              </button>
              <button
                type="button"
                className="w-full py-3 rounded-2xl border border-slate-200/60 dark:border-white/[0.05] bg-transparent text-slate-400 dark:text-slate-500 text-sm font-bold hover:bg-slate-100/60 dark:hover:bg-white/[0.03] active:scale-[0.98] transition-all duration-200"
                onClick={() => { setShowRoundForm(false); setError(''); }}
              >
                {en ? 'Cancel' : 'إلغاء'}
              </button>
            </div>
          </div>
        </div>
      )}

      {remaining <= 0 && (
        <div className="mt-4 space-y-2">
          <div className="flex gap-2">
            <button className="btn-primary flex-1" onClick={finish}>
              <Flag className="h-4 w-4" /> {en ? 'Finish match' : 'إنهاء المباراة'}
            </button>
            <button
              className="border-2 border-amber-500/30 bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 dark:text-amber-400 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl text-sm font-bold transition-all"
              onClick={() => setShowShareCard(true)}
            >
              <Trophy className="h-4 w-4 text-amber-500" />
              <span>{en ? 'Share Victory' : 'بطاقة الفوز'}</span>
            </button>
          </div>
        </div>
      )}

      {showShareCard && (
        <ShareMatchCardModal matchId={match.id} onClose={() => setShowShareCard(false)} />
      )}
    </Layout>
  );
}

function ComplexCountsForm({
  en,
  players,
  kingTaker,
  setKingTaker,
  queens,
  setQueens,
  diamonds,
  setDiamonds,
  tricks,
  setTricks,
  doubleCards,
  setDoubleCards,
}: {
  en: boolean;
  players: string[];
  kingTaker: number;
  setKingTaker: (value: number) => void;
  queens: string[];
  setQueens: (value: string[]) => void;
  diamonds: string[];
  setDiamonds: (value: string[]) => void;
  tricks: string[];
  setTricks: (value: string[]) => void;
  doubleCards: boolean;
  setDoubleCards: (value: boolean) => void;
}) {
  const update = (values: string[], setter: (value: string[]) => void, idx: number, value: string) => {
    const next = [...values];
    next[idx] = value === '' ? '' : String(Math.max(0, Number(value) || 0));
    setter(next);
  };

  const groups = [
    { label: en ? 'Queens (\u2666\uFE0F)' : '\u0627\u0644\u0628\u0646\u0627\u062a', total: 4, values: queens, setter: setQueens, color: 'text-rose-500', iconColor: 'bg-rose-500/10' },
    { label: en ? 'Diamonds' : '\u0627\u0644\u062f\u064a\u0646\u0627\u0631\u064a', total: 13, values: diamonds, setter: setDiamonds, color: 'text-blue-500', iconColor: 'bg-blue-500/10' },
    { label: en ? 'Tricks' : '\u0627\u0644\u0644\u0637\u0648\u0634', total: 13, values: tricks, setter: setTricks, color: 'text-purple-500', iconColor: 'bg-purple-500/10' },
  ];

  return (
    <div className="space-y-4">
      {/* King Taker */}
      <div className="space-y-2.5">
        <label className="flex items-center gap-1.5 text-[11px] font-black tracking-widest text-slate-400 dark:text-slate-500 uppercase">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 text-rose-500">
            <path fillRule="evenodd" d="M10 2c-2.236 0-4.43.18-6.57.524C1.993 2.755 1 4.014 1 5.426v5.148c0 1.413.993 2.67 2.43 2.902.848.137 1.705.248 2.57.331v3.443a.75.75 0 0 0 1.28.53l3.58-3.579a.78.78 0 0 1 .527-.224 41.202 41.202 0 0 0 5.183-.5c1.437-.232 2.43-1.49 2.43-2.903V5.426c0-1.413-.993-2.67-2.43-2.902A41.289 41.289 0 0 0 10 2Z" clipRule="evenodd" />
          </svg>
          {en ? 'Who Took King of Hearts?' : '\u0645\u0646 \u0623\u062e\u0630 \u0645\u0644\u0643 \u0627\u0644\u0643\u0628\u0629\u061f'}
        </label>
        <div className="grid grid-cols-2 gap-2">
          {players.map((p, i) => {
            const isSelected = kingTaker === i;
            return (
              <button
                key={p}
                type="button"
                className={
                  'relative flex items-center justify-center rounded-[1.25rem] border-2 px-3 py-3 text-sm font-black transition-all duration-300 active:scale-[0.96] ' +
                  (isSelected
                    ? 'border-rose-500/70 bg-gradient-to-br from-rose-500/12 to-pink-500/6 text-rose-700 dark:text-rose-300 shadow-[0_3px_16px_rgba(244,63,94,0.16)]'
                    : 'border-slate-200/60 bg-slate-50/50 text-slate-500 hover:border-slate-300 hover:bg-slate-100/70 dark:border-white/[0.04] dark:bg-white/[0.02] dark:text-slate-400')
                }
                onClick={() => setKingTaker(i)}
              >
                {isSelected && (
                  <div className="absolute top-1.5 right-1.5 h-4 w-4 rounded-full bg-rose-500 text-white flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-2.5 h-2.5">
                      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
                {p}
              </button>
            );
          })}
        </div>
      </div>

      {/* Score Inputs: Queens / Diamonds / Tricks */}
      {groups.map((group) => {
        const groupTotal = group.values.reduce((sum, v) => sum + (Number(v) || 0), 0);
        const isReady = groupTotal === group.total;
        return (
          <div key={group.label} className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-[11px] font-black tracking-widest text-slate-400 dark:text-slate-500 uppercase">
                <span className={`text-[11px] ${group.color}`}>♦</span>
                {group.label}
              </label>
              <span className={`text-[11px] font-black px-2 py-0.5 rounded-full ${
                isReady ? 'bg-[rgba(var(--accent),0.1)] text-[rgb(var(--accent))] dark:text-[rgb(var(--accent-dark))]' : 'bg-slate-100 dark:bg-white/5 text-slate-400'
              }`}>
                {groupTotal} / {group.total}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {players.map((p, i) => (
                <div key={p} className="flex flex-col gap-1.5 rounded-[1.25rem] border border-slate-200/60 bg-slate-50/50 p-2.5 dark:border-white/[0.04] dark:bg-white/[0.02]">
                  <div className="truncate text-center text-[10px] font-bold text-slate-500 dark:text-slate-400">{p}</div>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    className="w-full h-10 text-center text-base font-black placeholder:text-slate-300 dark:placeholder:text-slate-700 bg-white/70 dark:bg-[#1a1915]/60 border-2 border-slate-200/80 dark:border-white/5 rounded-xl outline-none focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 dark:focus:ring-rose-500/20 transition-all duration-200"
                    placeholder="0"
                    value={group.values[i]}
                    onChange={(e) => update(group.values, group.setter, i, e.target.value)}
                  />
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* Double Cards Toggle */}
      <button
        type="button"
        className={`w-full flex items-center justify-between rounded-2xl border-2 px-4 py-3 transition-all duration-300 active:scale-[0.98] ${
          doubleCards
            ? 'border-amber-500/60 bg-gradient-to-br from-amber-500/12 to-orange-500/6 shadow-[0_2px_12px_rgba(245,158,11,0.18)]'
            : 'border-slate-200/60 bg-slate-50/50 dark:border-white/[0.04] dark:bg-white/[0.02]'
        }`}
        onClick={() => setDoubleCards(!doubleCards)}
      >
        <div className="flex items-center gap-2">
          <Crown className={`h-4 w-4 ${doubleCards ? 'text-amber-500' : 'text-slate-400'}`} />
          <span className={`text-sm font-black ${doubleCards ? 'text-amber-700 dark:text-amber-300' : 'text-slate-500 dark:text-slate-400'}`}>
            {en ? 'Double King/Queens ×2' : '\u062a\u062f\u0628\u064a\u0644 \u0627\u0644\u0645\u0644\u0643/\u0627\u0644\u0628\u0646\u0627\u062a \u00d72'}
          </span>
        </div>
        <div className={`h-6 w-11 rounded-full transition-all duration-300 relative ${
          doubleCards ? 'bg-amber-500' : 'bg-slate-200 dark:bg-white/10'
        }`}>
          <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all duration-300 ${
            doubleCards ? 'left-[calc(100%-1.375rem)]' : 'left-0.5'
          }`} />
        </div>
      </button>
    </div>
  );
}
