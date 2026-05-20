import { useNavigate, useParams } from 'react-router-dom';
import { useState } from 'react';
import { Layout } from '../../components/Layout';
import { ScoreTable } from '../../components/ScoreTable';
import { PlayerAvatar } from '../../components/PlayerAvatar';
import { ManualFinishMatch } from '../../components/ManualFinishMatch';
import { useMatches, computeTotals } from '../../store/matches';
import { calcLikhaRound, LIKHA_DEFAULT_TARGET, LIKHA_PER_HAND } from '../../logic/likha';
import { Plus, Undo2, Flag, CalendarDays, Trophy, Target } from 'lucide-react';
import { copy, gameText } from '../../i18n';
import { useSettings } from '../../store/settings';
import { ShareButton } from '../../components/ShareButton';
import { ShareMatchCardModal } from '../../components/ShareMatchCardModal';

export default function LikhaGame() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getMatch, addRound, removeLastRound, finishMatch } = useMatches();
  const { language } = useSettings();
  const t = copy[language];
  const en = language === 'en';
  const match = id ? getMatch(id) : undefined;

  const [scores, setScores] = useState<string[]>(['', '', '', '']);
  const [showRoundForm, setShowRoundForm] = useState(false);
  const [error, setError] = useState('');
  const [showShareCard, setShowShareCard] = useState(false);

  if (!match) {
    return (
      <Layout back title={gameText[language].labels.likha}>
        <div className="card">{en ? 'Match not found.' : 'المباراة غير موجودة.'}</div>
      </Layout>
    );
  }

  const target = match.config.target ?? LIKHA_DEFAULT_TARGET;
  const totals = computeTotals(match);
  const reachedIdx = totals.findIndex((t) => t >= target);
  const matchOver = reachedIdx !== -1;

  const parsedScores = scores.map((score) => Number(score) || 0);
  const roundTotal = parsedScores.reduce((a, b) => a + b, 0);

  const fillRemainingScore = (nextScores: string[]) => {
    const emptyIndexes = nextScores
      .map((score, idx) => (score === '' ? idx : -1))
      .filter((idx) => idx !== -1);

    if (emptyIndexes.length !== 1) return nextScores;

    const sum = nextScores.reduce((acc, val) => acc + (Number(val) || 0), 0);
    if (sum > LIKHA_PER_HAND) return nextScores;

    const filled = [...nextScores];
    filled[emptyIndexes[0]] = String(LIKHA_PER_HAND - sum);
    return filled;
  };

  const submit = () => {
    const r = calcLikhaRound({ scores: parsedScores });
    if (!r.ok) {
      setError(r.error);
      return;
    }
    setError('');
    addRound(match.id, { deltas: r.deltas, meta: { contractLabel: r.contractLabel } });
    setScores(['', '', '', '']);
    setShowRoundForm(false);
  };

  const finish = () => {
    const min = Math.min(...totals);
    finishMatch(match.id, totals.indexOf(min));
    navigate('/');
  };

  const matchDate = new Date(match.createdAt);
  const dateStr = en
    ? matchDate.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' })
    : matchDate.toLocaleDateString('ar-SY-u-nu-latn', { weekday: 'long', day: 'numeric', month: 'long' });
  const timeStr = matchDate.toLocaleTimeString(en ? 'en-US' : 'ar-SY-u-nu-latn', { hour: 'numeric', minute: '2-digit', hour12: true });

  return (
    <Layout back title={gameText[language].labels.likha} headerAction={<ShareButton targetId="score-table-capture" />}>
      <div id="score-table-capture" className="bg-[#f8fafc] dark:bg-[#1b1a17] -mx-1 px-1 pb-2">
      {/* Hero card — players, scores, date */}
      <div className="card mb-3 space-y-4">
        {/* Individual player avatars */}
        <div className="flex items-center justify-between gap-2">
          {match.players.map((p, i) => {
            const isBest = totals[i] === Math.min(...totals) && match.rounds.length > 0;
            return (
              <div key={i} className="flex flex-1 flex-col items-center gap-1">
                <PlayerAvatar name={p} size="lg" />
                <span className="max-w-full truncate text-xs font-semibold text-slate-600 dark:text-slate-300">
                  {p}
                </span>
                <div
                  className={
                    'mt-1 w-full max-w-[4.5rem] rounded-xl border-2 py-1.5 text-center text-sm font-extrabold transition ' +
                    (isBest
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : 'border-slate-300/60 text-slate-700 dark:border-white/10 dark:text-slate-200')
                  }
                >
                  {totals[i]}
                </div>
                {/* Distance to target */}
                <div className="mt-2 flex min-w-[4.5rem] items-center justify-center gap-1.5 rounded-full bg-slate-100/90 px-2.5 py-1 text-xs font-extrabold text-slate-500 shadow-sm dark:bg-white/7 dark:text-slate-400">
                  <Target className="h-4 w-4 text-red-400" />
                  <span className={totals[i] >= target ? 'text-red-600 dark:text-red-400' : ''}>
                    {Math.max(0, target - totals[i])}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Match date */}
        <div className="flex items-center justify-end gap-1.5 text-xs text-slate-500 dark:text-slate-400">
          <CalendarDays className="h-3.5 w-3.5" />
          <span>{dateStr}، {timeStr}</span>
        </div>
      </div>

      <div className="mb-3 text-center text-xs text-slate-500">
        {en ? 'Winner: lowest score' : 'الفائز: الأقل نقاطاً'}
      </div>

      <ScoreTable match={match} lowerIsBetter editTotalRequired={LIKHA_PER_HAND} />
      </div>
      {!matchOver && <ManualFinishMatch match={match} lowerIsBetter />}

      {!matchOver && !showRoundForm && (
        <button className="btn-primary mt-4 w-full py-4 text-lg" onClick={() => setShowRoundForm(true)}>
          <Plus className="h-4 w-4" /> {en ? 'New round' : 'جولة جديدة'}
        </button>
      )}

      {!matchOver && showRoundForm && (
        <div className="relative overflow-hidden rounded-[2.25rem] border border-slate-200/60 bg-white shadow-2xl shadow-black/10 backdrop-blur-xl dark:border-white/[0.07] dark:bg-[#18171380] dark:shadow-black/40 mt-5 animate-in fade-in slide-in-from-bottom-4 duration-300">
          {/* Top accent gradient bar */}
          <div className="absolute top-0 inset-x-0 h-[3px] bg-gradient-to-r from-violet-500 via-purple-400 to-pink-500 rounded-t-[2.25rem]" />
          <div className="p-6 pt-7 space-y-5">

            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-white/[0.06]">
              <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2.5">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-violet-500"></span>
                </span>
                <span>{en ? 'New Round' : 'جولة جديدة'}</span>
              </h3>
              <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-gradient-to-br from-slate-100 to-slate-50 dark:from-white/[0.06] dark:to-white/[0.02] text-slate-400 dark:text-slate-500 border border-slate-200/40 dark:border-white/[0.04] shadow-sm">
                {en ? 'Likha' : 'ليخة'}
              </span>
            </div>

            {/* Info callout */}
            <div className="flex items-start gap-2.5 rounded-[1.25rem] border border-violet-500/10 bg-gradient-to-br from-violet-500/6 to-purple-500/4 p-3 text-xs text-violet-700/80 dark:text-violet-300/80">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-lg bg-violet-500/12 text-violet-500 mt-px">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                  <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A1.75 1.75 0 0 0 10.747 15H11a.75.75 0 0 0 0-1.5h-.253a.25.25 0 0 1-.244-.304l.459-2.066A1.75 1.75 0 0 0 9.253 9H9Z" clipRule="evenodd" />
                </svg>
              </span>
              <span className="font-semibold leading-relaxed">
                {en
                  ? `Enter each player's card points. Total must equal ${LIKHA_PER_HAND}. The last empty field auto-fills.`
                  : `أدخل نقاط الورق لكل لاعب. المجموع يجب أن يساوي ${LIKHA_PER_HAND}. آخر حقل فارغ يُملأ تلقائياً.`}
              </span>
            </div>

            {/* Player Score Inputs */}
            <div className="space-y-3">
              <label className="flex items-center gap-1.5 text-[11px] font-black tracking-widest text-slate-400 dark:text-slate-500 uppercase">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 text-violet-500">
                  <path d="M1 4.25a3.733 3.733 0 0 1 2.25-.75h13.5c.844 0 1.623.279 2.25.75A2.25 2.25 0 0 0 16.75 2H3.25A2.25 2.25 0 0 0 1 4.25ZM1 7.25a3.733 3.733 0 0 1 2.25-.75h13.5c.844 0 1.623.279 2.25.75A2.25 2.25 0 0 0 16.75 5H3.25A2.25 2.25 0 0 0 1 7.25ZM7 8a1 1 0 0 1 1 1 2 2 0 1 0 4 0 1 1 0 1 1 2 0v6.75A2.25 2.25 0 0 1 11.75 18H3.25A2.25 2.25 0 0 1 1 15.75V9a1 1 0 0 1 1-1h5Z" />
                </svg>
                {en ? 'Points per player' : 'نقاط كل لاعب'}
              </label>
              <div className="grid grid-cols-2 gap-3">
                {match.players.map((p, i) => (
                  <div key={i} className="flex flex-col gap-2 rounded-[1.5rem] border border-slate-200/60 bg-slate-50/60 p-3 dark:border-white/[0.04] dark:bg-white/[0.02]">
                    <div className="flex items-center justify-center gap-1.5 px-1">
                      <PlayerAvatar name={p} size="sm" />
                      <span className="truncate text-xs font-bold text-slate-600 dark:text-slate-300 max-w-[5rem]">{p}</span>
                    </div>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={LIKHA_PER_HAND}
                      className="w-full h-12 text-center text-lg font-black placeholder:text-slate-300 dark:placeholder:text-slate-700 bg-white/70 dark:bg-[#1a1915]/60 border-2 border-slate-200/80 dark:border-white/5 rounded-2xl outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-500/10 dark:focus:ring-violet-500/20 transition-all duration-200"
                      placeholder="0"
                      value={scores[i]}
                      onChange={(e) => {
                        const next = [...scores];
                        const value = e.target.value;
                        next[i] = value === '' ? '' : String(Math.max(0, Math.min(LIKHA_PER_HAND, Number(value) || 0)));
                        setScores(next);
                      }}
                      onBlur={() => setScores((current) => fillRemainingScore(current))}
                      onFocus={() => {
                        if (scores[i] === '' && scores.filter((score) => score === '').length === 1) {
                          setScores((current) => fillRemainingScore(current));
                        }
                      }}
                    />
                    {/* Quick-add chips */}
                    <div className="flex justify-center gap-1">
                      {[5, 10, 16].map((inc) => (
                        <button
                          key={inc}
                          type="button"
                          className="flex-1 inline-flex h-6 items-center justify-center rounded-lg border border-slate-200/80 bg-white text-[10px] font-black text-slate-500 shadow-sm transition hover:bg-slate-50 active:scale-95 dark:border-white/[0.04] dark:bg-white/[0.02] dark:text-slate-400 dark:hover:bg-white/10"
                          onClick={() => {
                            const next = [...scores];
                            const cur = Number(next[i]) || 0;
                            next[i] = String(Math.min(LIKHA_PER_HAND, cur + inc));
                            setScores(next);
                          }}
                        >
                          +{inc}
                        </button>
                      ))}
                      <button
                        type="button"
                        className="inline-flex h-6 w-6 items-center justify-center rounded-lg border border-red-200/50 bg-red-50/50 text-[10px] font-black text-red-500 shadow-sm transition hover:bg-red-50 active:scale-95 dark:border-red-500/10 dark:bg-red-500/5 dark:text-red-400"
                        onClick={() => {
                          const next = [...scores];
                          next[i] = '';
                          setScores(next);
                        }}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Live Total Progress */}
            <div className="overflow-hidden rounded-[1.25rem] border border-slate-200/60 dark:border-white/[0.06] bg-slate-50/80 dark:bg-white/[0.02]">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-200/60 dark:border-white/[0.04]">
                <div className="flex items-center gap-2">
                  <div className={`h-1.5 w-1.5 rounded-full ${roundTotal === LIKHA_PER_HAND ? 'bg-emerald-400' : 'bg-violet-400'} animate-pulse`} />
                  <span className="text-[10px] font-black tracking-widest uppercase text-slate-400 dark:text-slate-500">
                    {en ? 'Round Total' : 'مجموع الجولة'}
                  </span>
                </div>
                <span className={`text-sm font-black ${roundTotal === LIKHA_PER_HAND ? 'text-emerald-600 dark:text-emerald-400' : roundTotal > LIKHA_PER_HAND ? 'text-red-500' : 'text-slate-600 dark:text-slate-300'}`}>
                  {roundTotal} <span className="font-normal text-slate-400">/ {LIKHA_PER_HAND}</span>
                </span>
              </div>
              {/* Progress bar */}
              <div className="px-4 py-3">
                <div className="h-2 w-full rounded-full bg-slate-200/60 dark:bg-white/[0.05] overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${roundTotal === LIKHA_PER_HAND ? 'bg-gradient-to-r from-emerald-500 to-teal-400' : roundTotal > LIKHA_PER_HAND ? 'bg-red-500' : 'bg-gradient-to-r from-violet-500 to-purple-400'}`}
                    style={{ width: `${Math.min(100, (roundTotal / LIKHA_PER_HAND) * 100)}%` }}
                  />
                </div>
                {roundTotal === LIKHA_PER_HAND && (
                  <p className="mt-1.5 text-center text-[10px] font-black text-emerald-600 dark:text-emerald-400 animate-in fade-in duration-200">
                    {en ? '✓ Ready to save!' : '✓ جاهز للحفظ!'}
                  </p>
                )}
              </div>
            </div>

            {error && (
              <div className="rounded-2xl bg-red-500/10 border border-red-500/20 p-3.5 text-xs font-black text-red-600 dark:text-red-400 text-center">
                {error}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col gap-2 pt-1">
              <button
                type="button"
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-violet-600 to-purple-500 hover:from-violet-500 hover:to-purple-400 text-white text-[15px] font-black shadow-xl shadow-violet-600/25 hover:shadow-violet-500/35 active:scale-[0.97] transition-all duration-200 flex items-center justify-center gap-2"
                onClick={submit}
              >
                <Plus className="h-5 w-5 stroke-[3]" />
                {en ? 'Save Round' : 'حفظ الجولة'}
              </button>
              <button
                type="button"
                className="w-full py-3 rounded-2xl border border-slate-200/60 dark:border-white/[0.05] bg-transparent text-slate-400 dark:text-slate-500 text-sm font-bold hover:bg-slate-100/60 dark:hover:bg-white/[0.03] active:scale-[0.98] transition-all duration-200"
                onClick={() => {
                  setShowRoundForm(false);
                  setError('');
                  setScores(['', '', '', '']);
                }}
              >
                {en ? 'Cancel' : 'إلغاء'}
              </button>
            </div>
          </div>
        </div>
      )}

      {matchOver && (
        <div className="mt-4 space-y-2">
          <div className="card text-center font-bold text-emerald-600 dark:text-emerald-400">
            {en ? 'Winner' : 'الفائز'}: {match.players[totals.indexOf(Math.min(...totals))]} (
            {Math.min(...totals)} {en ? 'pts' : 'نقطة'})
            <div className="mt-1 text-xs font-normal text-slate-500">
              {en ? `${match.players[reachedIdx]} reached ${totals[reachedIdx]} points, so the game ended` : `${match.players[reachedIdx]} وصل ${totals[reachedIdx]} نقطة فانتهت اللعبة`}
            </div>
          </div>
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
