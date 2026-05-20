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
        <div className="card mt-4 space-y-3">
          <h3 className="font-bold">{en ? 'New round' : 'جولة جديدة'}</h3>
          <p className="text-xs text-slate-500">
            {en ? 'Enter each player score directly. Round total must be 36.' : 'أدخل نقاط كل لاعب مباشرة. مجموع الجولة يجب أن يكون 36.'}
          </p>

          <div>
            <label className="label mb-2">{en ? 'Score per player (total = 36)' : 'نقاط كل لاعب (المجموع = 36)'}</label>
            <div className="grid grid-cols-2 gap-3">
              {match.players.map((p, i) => (
                <div key={i} className="flex flex-col">
                  <div className="mb-1 truncate px-1 text-xs font-semibold text-slate-500">{p}</div>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={LIKHA_PER_HAND}
                    className="input h-12 text-center text-lg font-bold placeholder:text-slate-300 dark:bg-[#1a1915] dark:placeholder:text-slate-700"
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
                </div>
              ))}
            </div>
            <div
              className={
                'mt-1 text-xs ' +
                (roundTotal === LIKHA_PER_HAND ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500')
              }
            >
              {en ? 'Current total' : 'المجموع الحالي'}: {roundTotal} / {LIKHA_PER_HAND}
            </div>
          </div>

          {error && (
            <div className="rounded-lg bg-red-100 p-2 text-sm text-red-700 dark:bg-red-900/40 dark:text-red-300">
              {error}
            </div>
          )}

          <div className="flex gap-2">
            <button className="btn-primary flex-1" onClick={submit}>
              <Plus className="h-4 w-4" /> {en ? 'Save round' : 'حفظ الجولة'}
            </button>
            <button
              className="btn-secondary"
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
