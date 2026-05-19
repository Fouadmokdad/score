import { useNavigate, useParams } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { Layout } from '../../components/Layout';
import { ScoreTable } from '../../components/ScoreTable';
import { ManualFinishMatch } from '../../components/ManualFinishMatch';
import { useMatches, computeTotals } from '../../store/matches';
import { calcLikhaRound, LIKHA_PER_HAND } from '../../logic/likha';
import { TRIX_CONTRACTS, calcTrixRound, type TrixContract } from '../../logic/trix';
import { Plus, Undo2, Flag } from 'lucide-react';

type Phase = 'likha' | 'trix';

/**
 * Complex (كومبلكس) — Likha (Hearts) phase (10 hands) then Trix (5×4 = 20 rounds).
 * Total = 30 rounds. Phase auto-switches when likha phase done.
 */
const COMPLEX_LIKHA_HANDS = 10;
const COMPLEX_TRIX_HANDS = 20;
const COMPLEX_TOTAL = COMPLEX_LIKHA_HANDS + COMPLEX_TRIX_HANDS;
export default function ComplexGame() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getMatch, addRound, removeLastRound, finishMatch } = useMatches();
  const match = id ? getMatch(id) : undefined;

  if (!match) {
    return (
      <Layout back title="كومبلكس">
        <div className="card">المباراة غير موجودة.</div>
      </Layout>
    );
  }

  // Determine phase based on phaseTag in meta
  const likhaCount = match.rounds.filter((r) => r.meta?.phase === 'likha').length;
  const phase: Phase = likhaCount < COMPLEX_LIKHA_HANDS ? 'likha' : 'trix';
  const trixCount = match.rounds.filter((r) => r.meta?.phase === 'trix').length;
  const totalCount = COMPLEX_TOTAL;
  const done = match.rounds.length;

  return phase === 'likha' ? (
    <ComplexLikhaPhase match={match} done={done} totalCount={totalCount} likhaCount={likhaCount}
      addRound={addRound} removeLastRound={removeLastRound} finishMatch={finishMatch} navigate={navigate} />
  ) : (
    <ComplexTrixPhase match={match} done={done} totalCount={totalCount} trixCount={trixCount}
      addRound={addRound} removeLastRound={removeLastRound} finishMatch={finishMatch} navigate={navigate} />
  );
}

function ComplexLikhaPhase({ match, done, totalCount, likhaCount, addRound, removeLastRound }: any) {
  const [scores, setScores] = useState<string[]>(['', '', '', '']);
  const [showRoundForm, setShowRoundForm] = useState(false);
  const [error, setError] = useState('');
  const parsedScores = scores.map((score) => Number(score) || 0);

  const submit = () => {
    const r = calcLikhaRound({ scores: parsedScores });
    if (!r.ok) return setError(r.error);
    setError('');
    addRound(match.id, {
      deltas: r.deltas,
      meta: { phase: 'likha', contractLabel: r.contractLabel },
    });
    setScores(['', '', '', '']);
    setShowRoundForm(false);
  };

  const roundTotal = parsedScores.reduce((a, b) => a + b, 0);

  return (
    <Layout back title={`كومبلكس • مرحلة الليخة (${likhaCount}/${COMPLEX_LIKHA_HANDS})`}>
      <div className="game-status">
        الجولة {done + 1} من {totalCount}
      </div>

      <ScoreTable match={match} lowerIsBetter editTotalRequired={LIKHA_PER_HAND} />
      <ManualFinishMatch match={match} />

      {!showRoundForm && (
        <button className="btn-primary mt-4 w-full py-4 text-lg" onClick={() => setShowRoundForm(true)}>
          <Plus className="h-4 w-4" /> جولة جديدة
        </button>
      )}

      {showRoundForm && (
      <div className="card mt-4 space-y-3">
        <p className="text-xs text-slate-500">
          أدخل نقاط كل لاعب مباشرة. مجموع الجولة يجب أن يكون 36.
        </p>

        <div>
          <label className="label">نقاط كل لاعب (المجموع = 36)</label>
          <div className="choice-grid">
            {match.players.map((p: string, i: number) => (
              <div key={i}>
                <div className="mb-1 text-xs text-slate-500">{p}</div>
                <input
                  type="number"
                  min={0}
                  max={LIKHA_PER_HAND}
                  className="input text-center"
                  value={scores[i]}
                  onChange={(e) => {
                    const n = [...scores];
                    const value = e.target.value;
                    n[i] = value === '' ? '' : String(Math.max(0, Math.min(LIKHA_PER_HAND, Number(value) || 0)));
                    setScores(n);
                  }}
                />
              </div>
            ))}
          </div>
          <div className={'mt-1 text-xs ' + (roundTotal === LIKHA_PER_HAND ? 'text-emerald-600' : 'text-slate-500')}>
            المجموع الحالي: {roundTotal} / {LIKHA_PER_HAND}
          </div>
        </div>

        {error && <div className="rounded-lg bg-red-100 p-2 text-sm text-red-700 dark:bg-red-900/40 dark:text-red-300">{error}</div>}

        <div className="flex gap-2">
          <button className="btn-primary flex-1" onClick={submit}><Plus className="h-4 w-4" /> حفظ الجولة</button>
          <button className="btn-secondary" onClick={() => { setShowRoundForm(false); setError(''); }}>
            إلغاء
          </button>
          <button className="btn-secondary" onClick={() => removeLastRound(match.id)} disabled={match.rounds.length === 0}>
            <Undo2 className="h-4 w-4" /> تراجع
          </button>
        </div>
      </div>
      )}
    </Layout>
  );
}

function ComplexTrixPhase({ match, done, totalCount, trixCount, addRound, removeLastRound, finishMatch, navigate }: any) {
  const [contract, setContract] = useState<TrixContract>('kingHearts');
  const [declarer, setDeclarer] = useState(0);
  const [counts, setCounts] = useState<string[]>(['', '', '', '']);
  const [taker, setTaker] = useState(0);
  const [trixOrder, setTrixOrder] = useState<number[]>([]);
  const [showRoundForm, setShowRoundForm] = useState(false);
  const [error, setError] = useState('');
  const def = useMemo(() => TRIX_CONTRACTS.find((c) => c.id === contract)!, [contract]);
  const parsedCounts = counts.map((count) => Number(count) || 0);

  const submit = () => {
    const r = calcTrixRound({
      contract,
      declarerIndex: declarer,
      counts: def.type === 'negative-count' ? parsedCounts : undefined,
      takerIndex: def.type === 'negative-taker' ? taker : undefined,
      trixOrder: def.type === 'positive-trix' ? trixOrder : undefined,
    });
    if (!r.ok) return setError(r.error);
    setError('');
    addRound(match.id, { deltas: r.deltas, meta: { phase: 'trix', contract, declarer, contractLabel: r.contractLabel } });
    setCounts(['', '', '', '']);
    setTrixOrder([]);
    setShowRoundForm(false);
  };

  const togglePos = (i: number) => {
    if (trixOrder.includes(i)) setTrixOrder(trixOrder.filter((x) => x !== i));
    else if (trixOrder.length < 4) setTrixOrder([...trixOrder, i]);
  };

  const finish = () => {
    const totals = computeTotals(match);
    const max = Math.max(...totals);
    finishMatch(match.id, totals.indexOf(max));
    navigate('/');
  };

  return (
    <Layout back title={`كومبلكس • مرحلة التركس (${trixCount}/20)`}>
      <div className="game-status">
        الجولة {done + 1} من {totalCount}
      </div>

      <ScoreTable match={match} />
      {trixCount < COMPLEX_TRIX_HANDS && <ManualFinishMatch match={match} />}

      {trixCount < COMPLEX_TRIX_HANDS && !showRoundForm && (
        <button className="btn-primary mt-4 w-full py-4 text-lg" onClick={() => setShowRoundForm(true)}>
          <Plus className="h-4 w-4" /> جولة جديدة
        </button>
      )}

      {trixCount < COMPLEX_TRIX_HANDS && showRoundForm && (
        <div className="card mt-4 space-y-3">
          <div>
            <label className="label">العقد</label>
            <div className="flex flex-wrap gap-2">
              {TRIX_CONTRACTS.map((c) => (
                <button key={c.id}
                  className={'rounded-full border px-3 py-1.5 text-sm font-semibold ' + (contract === c.id ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-300 dark:border-slate-700')}
                  onClick={() => setContract(c.id)}>{c.label}</button>
              ))}
            </div>
          </div>

          <div>
            <label className="label">صاحب الدور</label>
            <div className="choice-grid">
              {match.players.map((p: string, i: number) => (
                <button key={i}
                  className={'choice-btn ' + (declarer === i ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-300 dark:border-slate-700')}
                  onClick={() => setDeclarer(i)}>{p}</button>
              ))}
            </div>
          </div>

          {def.type === 'negative-count' && (
            <div>
              <label className="label">العدد لكل لاعب (المجموع = {def.maxCount})</label>
              <div className="choice-grid">
                {match.players.map((p: string, i: number) => (
                  <div key={i}>
                    <div className="mb-1 text-xs text-slate-500">{p}</div>
                    <input type="number" min={0} max={def.maxCount} className="input" value={counts[i]}
                      onChange={(e) => {
                        const n = [...counts];
                        const value = e.target.value;
                        n[i] = value === '' ? '' : String(Math.max(0, Number(value) || 0));
                        setCounts(n);
                      }} />
                  </div>
                ))}
              </div>
            </div>
          )}
          {def.type === 'negative-taker' && (
            <div>
              <label className="label">من أخذ الملك؟</label>
              <div className="choice-grid">
                {match.players.map((p: string, i: number) => (
                  <button key={i}
                    className={'choice-btn ' + (taker === i ? 'border-rose-600 bg-rose-600 text-white' : 'border-slate-300 dark:border-slate-700')}
                    onClick={() => setTaker(i)}>{p}</button>
                ))}
              </div>
            </div>
          )}
          {def.type === 'positive-trix' && (
            <div>
              <label className="label">ترتيب الإنهاء</label>
              <div className="choice-grid">
                {match.players.map((p: string, i: number) => {
                  const pos = trixOrder.indexOf(i);
                  return (
                    <button key={i}
                      className={'choice-btn ' + (pos >= 0 ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300 dark:border-slate-700')}
                      onClick={() => togglePos(i)}>
                      {p} {pos >= 0 && <span className="opacity-80">({['1','2','3','4'][pos]})</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {error && <div className="rounded-lg bg-red-100 p-2 text-sm text-red-700 dark:bg-red-900/40 dark:text-red-300">{error}</div>}

          <div className="flex gap-2">
            <button className="btn-primary flex-1" onClick={submit}><Plus className="h-4 w-4" /> حفظ الجولة</button>
            <button className="btn-secondary" onClick={() => { setShowRoundForm(false); setError(''); }}>
              إلغاء
            </button>
            <button className="btn-secondary" onClick={() => removeLastRound(match.id)} disabled={match.rounds.length === 0}>
              <Undo2 className="h-4 w-4" /> تراجع
            </button>
          </div>
        </div>
      )}

      {trixCount >= COMPLEX_TRIX_HANDS && (
        <button className="btn-primary mt-4 w-full" onClick={finish}>
          <Flag className="h-4 w-4" /> إنهاء المباراة
        </button>
      )}
    </Layout>
  );
}
