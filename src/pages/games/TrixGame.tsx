import { useNavigate, useParams } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { Layout } from '../../components/Layout';
import { ScoreTable } from '../../components/ScoreTable';
import { ManualFinishMatch } from '../../components/ManualFinishMatch';
import { useMatches, computeTotals } from '../../store/matches';
import { TRIX_CONTRACTS, calcTrixRound, type TrixContract, totalTrixRounds } from '../../logic/trix';
import { Plus, Undo2, Flag, Crown, Trophy } from 'lucide-react';
import { copy, gameText } from '../../i18n';
import { useSettings } from '../../store/settings';
import { ShareButton } from '../../components/ShareButton';
import { GameScoreHeader } from '../../components/GameScoreHeader';
import { ShareMatchCardModal } from '../../components/ShareMatchCardModal';

export default function TrixGame({ variant = 'solo' }: { variant?: 'solo' | 'partners' }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getMatch, addRound, removeLastRound, finishMatch } = useMatches();
  const { language } = useSettings();
  const t = copy[language];
  const en = language === 'en';
  const match = id ? getMatch(id) : undefined;

  const [contract, setContract] = useState<TrixContract>('kingHearts');
  const [declarer, setDeclarer] = useState(0);
  const [counts, setCounts] = useState<string[]>(['', '', '', '']);
  const [taker, setTaker] = useState<number>(0);
  const [trixOrder, setTrixOrder] = useState<number[]>([]);
  const [crown, setCrown] = useState(false);
  const [showRoundForm, setShowRoundForm] = useState(false);
  const [error, setError] = useState('');
  const [showShareCard, setShowShareCard] = useState(false);

  const def = useMemo(() => TRIX_CONTRACTS.find((c) => c.id === contract)!, [contract]);
  const parsedCounts = counts.map((count) => Number(count) || 0);

  if (!match) {
    return (
      <Layout back title={gameText[language].labels[variant === 'partners' ? 'trix-partners' : 'trix-solo']}>
        <div className="card">{en ? 'Match not found.' : 'المباراة غير موجودة.'}</div>
      </Layout>
    );
  }

  /** Played contracts grid: declarerIndex × contract */
  const played = useMemo(() => {
    const map: Record<string, boolean> = {};
    for (const r of match.rounds) {
      const k = `${r.meta?.declarer}-${r.meta?.contract}`;
      map[k] = true;
    }
    return map;
  }, [match.rounds]);

  const total = totalTrixRounds();
  const remaining = total - match.rounds.length;
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
    if (isPlayed) {
      setError(en ? 'This contract was already played for this player' : 'هذا العقد لُعب مسبقاً لهذا اللاعب');
      return;
    }
    const r = calcTrixRound({
      contract,
      declarerIndex: declarer,
      counts: def.type === 'negative-count' ? parsedCounts : undefined,
      takerIndex: def.type === 'negative-taker' ? taker : undefined,
      trixOrder: def.type === 'positive-trix' ? trixOrder : undefined,
      multiplier: crown ? 2 : 1,
    });
    if (!r.ok) {
      setError(r.error);
      return;
    }
    setError('');
    addRound(match.id, {
      deltas: r.deltas,
      meta: { contract, declarer, contractLabel: r.contractLabel },
    });
    setCounts(['', '', '', '']);
    setTrixOrder([]);
    setCrown(false);
    setShowRoundForm(false);
  };

  const togglePos = (i: number) => {
    if (trixOrder.includes(i)) {
      setTrixOrder(trixOrder.filter((x) => x !== i));
    } else if (trixOrder.length < 4) {
      setTrixOrder([...trixOrder, i]);
    }
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

  return (
    <Layout back title={gameText[language].labels[variant === 'partners' ? 'trix-partners' : 'trix-solo']} headerAction={<ShareButton targetId="score-table-capture" />}>
      <div id="score-table-capture" className="bg-[#f8fafc] dark:bg-[#1b1a17] -mx-1 px-1 pb-2">
      <GameScoreHeader
        match={match}
        totals={variant === 'partners' ? teamTotals : undefined}
        labels={variant === 'partners' ? teamLabels : undefined}
        avatarGroups={variant === 'partners' ? teamAvatarGroups : undefined}
      />
      <div className="game-status">
        <span>{t.round} {match.rounds.length + 1} {en ? 'of' : 'من'} {total}</span>
        <span>{en ? 'Remaining' : 'المتبقي'}: {remaining}</span>
      </div>

      <ScoreTable match={tableMatch} />
      {remaining > 0 && <ManualFinishMatch match={match} winnerIndex={variant === 'partners' ? (teamTotals[0] >= teamTotals[1] ? 0 : 1) : undefined} />}

      {/* Played grid */}
      <div className="card mt-4 p-0">
        <div className="border-b border-slate-200 p-3 text-sm font-bold dark:border-slate-800">
          {en ? 'Played contracts' : 'العقود الملعوبة'}
        </div>
        <div className="overflow-x-auto p-3">
          <table className="w-full text-xs">
            <thead>
              <tr>
                <th className="table-cell">{t.player}</th>
                {TRIX_CONTRACTS.map((c) => (
                  <th key={c.id} className="table-cell">{trixLabel(c.id, en)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {match.players.map((p, i) => (
                <tr key={i} className="border-t border-slate-200 dark:border-slate-800">
                  <td className="table-cell font-bold">{p}</td>
                  {TRIX_CONTRACTS.map((c) => {
                    const ok = played[`${i}-${c.id}`];
                    return (
                      <td key={c.id} className="table-cell">
                        {ok ? <span className="text-emerald-500">✓</span> : '–'}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      </div>

      {remaining > 0 && !showRoundForm && (
        <button className="btn-primary mt-4 w-full py-4 text-lg" onClick={() => setShowRoundForm(true)}>
          <Plus className="h-4 w-4" /> {en ? 'New round' : 'جولة جديدة'}
        </button>
      )}

      {remaining > 0 && showRoundForm && (
        <div className="relative overflow-hidden rounded-[2.25rem] border border-slate-200/60 bg-white shadow-2xl shadow-black/10 backdrop-blur-xl dark:border-white/[0.07] dark:bg-[#18171380] dark:shadow-black/40 mt-5 animate-in fade-in slide-in-from-bottom-4 duration-300">
          {/* Top accent gradient bar */}
          <div className="absolute top-0 inset-x-0 h-[3px] bg-gradient-to-r from-yellow-500 via-orange-400 to-rose-500 rounded-t-[2.25rem]" />
          <div className="p-6 pt-7 space-y-5">

            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-white/[0.06]">
              <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2.5">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-yellow-500"></span>
                </span>
                <span>{en ? 'New Round' : 'جولة جديدة'}</span>
              </h3>
              <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-gradient-to-br from-slate-100 to-slate-50 dark:from-white/[0.06] dark:to-white/[0.02] text-slate-400 dark:text-slate-500 border border-slate-200/40 dark:border-white/[0.04] shadow-sm">
                Trix
              </span>
            </div>

            {/* Contract Selection */}
            <div className="space-y-2.5">
              <label className="flex items-center gap-1.5 text-[11px] font-black tracking-widest text-slate-400 dark:text-slate-500 uppercase">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 text-yellow-500">
                  <path d="M15.98 1.804a1 1 0 0 0-1.96 0l-.24 1.192a1 1 0 0 1-.784.785l-1.192.24a1 1 0 0 0 0 1.962l1.192.24a1 1 0 0 1 .784.785l.24 1.192a1 1 0 0 0 1.962 0l.24-1.192a1 1 0 0 1 .784-.785l1.192-.24a1 1 0 0 0 0-1.962l-1.192-.24a1 1 0 0 1-.784-.785l-.24-1.192Z" />
                </svg>
                {en ? 'Contract' : 'العقد'}
              </label>
              <div className="flex flex-wrap gap-2">
                {TRIX_CONTRACTS.map((c) => {
                  const isSelected = contract === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      className={
                        'rounded-2xl border-2 px-3.5 py-2 text-xs font-black transition-all duration-300 active:scale-[0.97] ' +
                        (isSelected
                          ? 'border-yellow-500/70 bg-gradient-to-br from-yellow-500/15 to-orange-500/8 text-yellow-700 dark:text-yellow-300 shadow-[0_3px_12px_rgba(234,179,8,0.18)]'
                          : 'border-slate-200/60 bg-slate-50/50 text-slate-500 hover:border-slate-300 hover:bg-slate-100/70 dark:border-white/[0.04] dark:bg-white/[0.02] dark:text-slate-400')
                      }
                      onClick={() => setContract(c.id)}
                    >
                      {trixLabel(c.id, en)}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Declarer */}
            <div className="space-y-2.5">
              <label className="flex items-center gap-1.5 text-[11px] font-black tracking-widest text-slate-400 dark:text-slate-500 uppercase">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 text-blue-500">
                  <path fillRule="evenodd" d="M10 1a4.5 4.5 0 0 0-4.5 4.5V9H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-.5V5.5A4.5 4.5 0 0 0 10 1Zm3 8V5.5a3 3 0 1 0-6 0V9h6Z" clipRule="evenodd" />
                </svg>
                {en ? 'Declarer' : 'صاحب الدور'}
              </label>
              <div className="grid grid-cols-2 gap-2">
                {match.players.map((p, i) => {
                  const usedAll = TRIX_CONTRACTS.every((c) => played[`${i}-${c.id}`]);
                  const thisDone = !!played[`${i}-${contract}`];
                  const isSelected = declarer === i;
                  return (
                    <button
                      key={i}
                      type="button"
                      disabled={usedAll || thisDone}
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

            {/* Negative Count Input */}
            {def.type === 'negative-count' && (
              <div className="space-y-2.5">
                <label className="flex items-center gap-1.5 text-[11px] font-black tracking-widest text-slate-400 dark:text-slate-500 uppercase">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 text-rose-400">
                    <path d="M1 4.25a3.733 3.733 0 0 1 2.25-.75h13.5c.844 0 1.623.279 2.25.75A2.25 2.25 0 0 0 16.75 2H3.25A2.25 2.25 0 0 0 1 4.25Z" />
                    <path d="M1 7.25a3.733 3.733 0 0 1 2.25-.75h13.5c.844 0 1.623.279 2.25.75A2.25 2.25 0 0 0 16.75 5H3.25A2.25 2.25 0 0 0 1 7.25Z" />
                    <path d="M7 8a1 1 0 0 1 1 1 2 2 0 1 0 4 0 1 1 0 1 1 2 0v6.75A2.25 2.25 0 0 1 11.75 18H3.25A2.25 2.25 0 0 1 1 15.75V9a1 1 0 0 1 1-1h5Z" />
                  </svg>
                  {en ? `Count per player (total = ${def.maxCount})` : `العدد لكل لاعب (المجموع = ${def.maxCount})`}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {match.players.map((p, i) => (
                    <div key={i} className="flex flex-col gap-1.5 rounded-[1.25rem] border border-slate-200/60 bg-slate-50/50 p-2.5 dark:border-white/[0.04] dark:bg-white/[0.02]">
                      <div className="truncate text-center text-[10px] font-bold text-slate-500 dark:text-slate-400">{p}</div>
                      <input
                        type="number"
                        min={0}
                        max={def.maxCount}
                        className="w-full h-10 text-center text-base font-black placeholder:text-slate-300 dark:placeholder:text-slate-700 bg-white/70 dark:bg-[#1a1915]/60 border-2 border-slate-200/80 dark:border-white/5 rounded-xl outline-none focus:border-yellow-500 focus:ring-4 focus:ring-yellow-500/10 transition-all duration-200"
                        placeholder="0"
                        value={counts[i]}
                        onChange={(e) => {
                          const next = [...counts];
                          const value = e.target.value;
                          next[i] = value === '' ? '' : String(Math.max(0, Number(value) || 0));
                          setCounts(next);
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* King Taker */}
            {def.type === 'negative-taker' && (
              <div className="space-y-2.5">
                <label className="flex items-center gap-1.5 text-[11px] font-black tracking-widest text-slate-400 dark:text-slate-500 uppercase">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 text-rose-500">
                    <path fillRule="evenodd" d="M10 2c-2.236 0-4.43.18-6.57.524C1.993 2.755 1 4.014 1 5.426v5.148c0 1.413.993 2.67 2.43 2.902.848.137 1.705.248 2.57.331v3.443a.75.75 0 0 0 1.28.53l3.58-3.579a.78.78 0 0 1 .527-.224 41.202 41.202 0 0 0 5.183-.5c1.437-.232 2.43-1.49 2.43-2.903V5.426c0-1.413-.993-2.67-2.43-2.902A41.289 41.289 0 0 0 10 2Z" clipRule="evenodd" />
                  </svg>
                  {en ? 'Who took the king?' : 'من أخذ الملك؟'}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {match.players.map((p, i) => {
                    const isSelected = taker === i;
                    return (
                      <button
                        key={i}
                        type="button"
                        className={
                          'relative flex items-center justify-center rounded-[1.25rem] border-2 px-3 py-3 text-sm font-black transition-all duration-300 active:scale-[0.96] ' +
                          (isSelected
                            ? 'border-rose-500/70 bg-gradient-to-br from-rose-500/12 to-pink-500/6 text-rose-700 dark:text-rose-300 shadow-[0_3px_16px_rgba(244,63,94,0.16)]'
                            : 'border-slate-200/60 bg-slate-50/50 text-slate-500 hover:border-slate-300 hover:bg-slate-100/70 dark:border-white/[0.04] dark:bg-white/[0.02] dark:text-slate-400')
                        }
                        onClick={() => setTaker(i)}
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
            )}

            {/* Trix Finish Order */}
            {def.type === 'positive-trix' && (
              <div className="space-y-2.5">
                <label className="flex items-center gap-1.5 text-[11px] font-black tracking-widest text-slate-400 dark:text-slate-500 uppercase">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 text-emerald-500">
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
                        key={i}
                        type="button"
                        className={
                          'relative flex items-center justify-between gap-2 rounded-[1.25rem] border-2 px-3.5 py-3 text-sm font-black transition-all duration-300 active:scale-[0.96] ' +
                          (isSelected
                            ? 'border-emerald-500/70 bg-gradient-to-br from-emerald-500/12 to-teal-500/6 text-emerald-700 dark:text-emerald-300 shadow-[0_3px_16px_rgba(16,185,129,0.14)]'
                            : 'border-slate-200/60 bg-slate-50/50 text-slate-500 hover:border-slate-300 hover:bg-slate-100/70 dark:border-white/[0.04] dark:bg-white/[0.02] dark:text-slate-400')
                        }
                        onClick={() => togglePos(i)}
                      >
                        <span>{p}</span>
                        {isSelected && (
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white text-xs font-black shadow-sm">
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

            {/* Crown Toggle */}
            <button
              type="button"
              className={`w-full flex items-center justify-between rounded-2xl border-2 px-4 py-3 transition-all duration-300 active:scale-[0.98] ${
                crown
                  ? 'border-amber-500/60 bg-gradient-to-br from-amber-500/12 to-orange-500/6 shadow-[0_2px_12px_rgba(245,158,11,0.18)]'
                  : 'border-slate-200/60 bg-slate-50/50 dark:border-white/[0.04] dark:bg-white/[0.02]'
              }`}
              onClick={() => setCrown(!crown)}
            >
              <div className="flex items-center gap-2">
                <Crown className={`h-4 w-4 ${crown ? 'text-amber-500' : 'text-slate-400'}`} />
                <span className={`text-sm font-black ${crown ? 'text-amber-700 dark:text-amber-300' : 'text-slate-500 dark:text-slate-400'}`}>
                  {en ? 'Crown (double ×2)' : 'تتويج (مضاعفة ×2)'}
                </span>
              </div>
              <div className={`h-6 w-11 rounded-full transition-all duration-300 relative ${crown ? 'bg-amber-500' : 'bg-slate-200 dark:bg-white/10'}`}>
                <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all duration-300 ${crown ? 'left-[calc(100%-1.375rem)]' : 'left-0.5'}`} />
              </div>
            </button>

            {error && (
              <div className="rounded-2xl bg-red-500/10 border border-red-500/20 p-3.5 text-xs font-black text-red-600 dark:text-red-400 text-center">
                {error}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col gap-2 pt-1">
              <button
                type="button"
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-yellow-500 to-orange-400 hover:from-yellow-400 hover:to-orange-300 text-white text-[15px] font-black shadow-xl shadow-yellow-500/25 hover:shadow-yellow-400/35 active:scale-[0.97] transition-all duration-200 flex items-center justify-center gap-2"
                onClick={submit}
              >
                <Plus className="h-5 w-5 stroke-[3]" />
                {en ? 'Save Round' : 'حفظ الجولة'}
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  className="py-3 rounded-2xl border border-slate-200/60 dark:border-white/[0.05] bg-transparent text-slate-400 dark:text-slate-500 text-sm font-bold hover:bg-slate-100/60 dark:hover:bg-white/[0.03] active:scale-[0.98] transition-all duration-200"
                  onClick={() => {
                    setShowRoundForm(false);
                    setError('');
                    setContract('kingHearts');
                    setCounts(['', '', '', '']);
                    setTrixOrder([]);
                    setCrown(false);
                  }}
                >
                  {en ? 'Cancel' : 'إلغاء'}
                </button>
                <button
                  type="button"
                  className="py-3 rounded-2xl border border-slate-200/60 dark:border-white/[0.05] bg-transparent text-slate-400 dark:text-slate-500 text-sm font-bold hover:bg-slate-100/60 dark:hover:bg-white/[0.03] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-1.5 disabled:opacity-30"
                  onClick={() => removeLastRound(match.id)}
                  disabled={match.rounds.length === 0}
                >
                  <Undo2 className="h-4 w-4" />
                  {en ? 'Undo' : 'تراجع'}
                </button>
              </div>
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

function trixLabel(contract: TrixContract, en: boolean): string {
  if (!en) return TRIX_CONTRACTS.find((c) => c.id === contract)?.label ?? contract;
  switch (contract) {
    case 'kingHearts':
      return 'King';
    case 'queens':
      return 'Queens';
    case 'diamonds':
      return 'Diamonds';
    case 'tricks':
      return 'Tricks';
    case 'trix':
      return 'Trix';
  }
}
