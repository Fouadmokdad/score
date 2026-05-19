import { useNavigate, useParams } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { Layout } from '../../components/Layout';
import { ScoreTable } from '../../components/ScoreTable';
import { ManualFinishMatch } from '../../components/ManualFinishMatch';
import { useMatches, computeTotals } from '../../store/matches';
import { TRIX_CONTRACTS, calcTrixRound, type TrixContract, totalTrixRounds } from '../../logic/trix';
import { Plus, Undo2, Flag, Crown } from 'lucide-react';
import { copy, gameText } from '../../i18n';
import { useSettings } from '../../store/settings';
import { ShareButton } from '../../components/ShareButton';
import { GameScoreHeader } from '../../components/GameScoreHeader';

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
    const totals = computeTotals(match);
    if (variant === 'partners') {
      const teamTotals = [totals[0] + totals[2], totals[1] + totals[3]];
      finishMatch(match.id, teamTotals[0] >= teamTotals[1] ? 0 : 1);
    } else {
      const max = Math.max(...totals);
      finishMatch(match.id, totals.indexOf(max));
    }
    navigate('/');
  };

  return (
    <Layout back title={`${gameText[language].labels[variant === 'partners' ? 'trix-partners' : 'trix-solo']} • ${match.players.join(' / ')}`} headerAction={<ShareButton targetId="score-table-capture" />}>
      <div id="score-table-capture" className="bg-[#f8fafc] dark:bg-[#1b1a17] -mx-1 px-1 pb-2">
      <GameScoreHeader match={match} />
      <div className="game-status">
        <span>{t.round} {match.rounds.length + 1} {en ? 'of' : 'من'} {total}</span>
        <span>{en ? 'Remaining' : 'المتبقي'}: {remaining}</span>
      </div>

      <ScoreTable match={match} />
      {remaining > 0 && <ManualFinishMatch match={match} />}

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
        <div className="card mt-4 space-y-3">
          <h3 className="font-bold">{en ? 'New round' : 'جولة جديدة'}</h3>

          <div>
            <label className="label">{en ? 'Contract' : 'العقد'}</label>
            <div className="flex flex-wrap gap-2">
              {TRIX_CONTRACTS.map((c) => (
                <button
                  key={c.id}
                  className={
                    'rounded-full border px-3 py-1.5 text-sm font-semibold ' +
                    (contract === c.id ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-300 dark:border-slate-700')
                  }
                  onClick={() => setContract(c.id)}
                >
                  {trixLabel(c.id, en)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label">{en ? 'Declarer' : 'صاحب الدور (المعلِن)'}</label>
            <div className="choice-grid">
              {match.players.map((p, i) => {
                const usedAll = TRIX_CONTRACTS.every((c) => played[`${i}-${c.id}`]);
                const thisDone = !!played[`${i}-${contract}`];
                return (
                  <button
                    key={i}
                    disabled={usedAll || thisDone}
                    className={
                      'choice-btn disabled:opacity-40 ' +
                      (declarer === i ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-300 dark:border-slate-700')
                    }
                    onClick={() => setDeclarer(i)}
                  >
                    {p}
                  </button>
                );
              })}
            </div>
          </div>

          {def.type === 'negative-count' && (
            <div>
              <label className="label">{en ? `Count per player (total = ${def.maxCount})` : `العدد لكل لاعب (المجموع = ${def.maxCount})`}</label>
              <div className="choice-grid">
                {match.players.map((p, i) => (
                  <div key={i}>
                    <div className="mb-1 text-xs text-slate-500">{p}</div>
                    <input
                      type="number"
                      min={0}
                      max={def.maxCount}
                      className="input"
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

          {def.type === 'negative-taker' && (
            <div>
              <label className="label">{en ? 'Who took the king?' : 'من أخذ الملك؟'}</label>
              <div className="choice-grid">
                {match.players.map((p, i) => (
                  <button
                    key={i}
                    className={
                      'choice-btn ' +
                      (taker === i ? 'border-rose-600 bg-rose-600 text-white' : 'border-slate-300 dark:border-slate-700')
                    }
                    onClick={() => setTaker(i)}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          )}

          {def.type === 'positive-trix' && (
            <div>
              <label className="label">{en ? 'Finish order (tap first to fourth)' : 'ترتيب الإنهاء (انقر بالترتيب: الأول → الرابع)'}</label>
              <div className="choice-grid">
                {match.players.map((p, i) => {
                  const pos = trixOrder.indexOf(i);
                  return (
                    <button
                      key={i}
                      className={
                        'choice-btn ' +
                        (pos >= 0 ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300 dark:border-slate-700')
                      }
                      onClick={() => togglePos(i)}
                    >
                      {p} {pos >= 0 && <span className="opacity-80">({['1','2','3','4'][pos]})</span>}
                    </button>
                  );
                })}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                {en ? 'Rewards' : 'المكافآت'}: 200 / 150 / 100 / 50
              </div>
            </div>
          )}

          <label className="flex items-center gap-2 text-sm font-semibold">
            <input type="checkbox" checked={crown} onChange={(e) => setCrown(e.target.checked)} />
            <Crown className="h-4 w-4 text-amber-500" /> {en ? 'Crown (double x2)' : 'تتويج (مضاعفة ×2)'}
          </label>

          {error && <div className="rounded-lg bg-red-100 p-2 text-sm text-red-700 dark:bg-red-900/40 dark:text-red-300">{error}</div>}

          <div className="flex gap-2">
            <button className="btn-primary flex-1" onClick={submit}>
              <Plus className="h-4 w-4" /> {en ? 'Save round' : 'حفظ الجولة'}
            </button>
            <button
              className="btn-secondary"
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
              className="btn-secondary"
              onClick={() => removeLastRound(match.id)}
              disabled={match.rounds.length === 0}
            >
              <Undo2 className="h-4 w-4" /> {en ? 'Undo' : 'تراجع'}
            </button>
          </div>
        </div>
      )}

      {remaining <= 0 && (
        <button className="btn-primary mt-4 w-full" onClick={finish}>
          <Flag className="h-4 w-4" /> {en ? 'Finish match' : 'إنهاء المباراة'}
      </button>
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
