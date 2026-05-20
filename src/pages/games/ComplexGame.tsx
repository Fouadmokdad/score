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
        <div className="card mt-4 space-y-3">
          <div>
            <label className="label">{en ? 'Request' : 'الطلب'}</label>
            <div className="grid grid-cols-2 gap-2">
              {(['complex', 'trix'] as const).map((value) => (
                <button
                  key={value}
                  className={'choice-btn ' + (contract === value ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300 dark:border-slate-700')}
                  onClick={() => setContract(value)}
                >
                  {value === 'complex' ? (en ? 'Complex' : 'كومبلكس') : 'Trix'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label">{en ? 'Kingdom owner' : 'صاحب المملكة'}</label>
            <div className="choice-grid">
              {match.players.map((p, i) => (
                <button
                  key={p}
                  disabled={played[`${i}-${contract}`]}
                  className={'choice-btn disabled:opacity-40 ' + (declarer === i ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-300 dark:border-slate-700')}
                  onClick={() => setDeclarer(i)}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

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
            <div>
              <label className="label">{en ? 'Finish order' : 'ترتيب الإنهاء'}</label>
              <div className="choice-grid">
                {match.players.map((p, i) => {
                  const pos = trixOrder.indexOf(i);
                  return (
                    <button
                      key={p}
                      className={'choice-btn ' + (pos >= 0 ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300 dark:border-slate-700')}
                      onClick={() => togglePos(i)}
                    >
                      {p} {pos >= 0 && <span className="opacity-80">({pos + 1})</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {error && <div className="rounded-lg bg-red-100 p-2 text-sm text-red-700 dark:bg-red-900/40 dark:text-red-300">{error}</div>}

          <div className="flex gap-2">
            <button className="btn-primary flex-1" onClick={submit}>
              <Plus className="h-4 w-4" /> {en ? 'Save round' : 'حفظ الجولة'}
            </button>
            <button className="btn-secondary" onClick={() => { setShowRoundForm(false); setError(''); }}>
              {en ? 'Cancel' : 'إلغاء'}
            </button>
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

  return (
    <div className="space-y-3">
      <div>
        <label className="label">{en ? 'Who took King of Hearts?' : 'من أخذ ملك الكبة؟'}</label>
        <div className="choice-grid">
          {players.map((p, i) => (
            <button
              key={p}
              className={'choice-btn ' + (kingTaker === i ? 'border-rose-600 bg-rose-600 text-white' : 'border-slate-300 dark:border-slate-700')}
              onClick={() => setKingTaker(i)}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {[
        { label: en ? 'Queens' : 'البنات', total: 4, values: queens, setter: setQueens },
        { label: en ? 'Diamonds' : 'الديناري', total: 13, values: diamonds, setter: setDiamonds },
        { label: en ? 'Tricks' : 'اللطوش', total: 13, values: tricks, setter: setTricks },
      ].map((group) => (
        <div key={group.label}>
          <label className="label">{group.label} ({en ? 'total' : 'المجموع'} = {group.total})</label>
          <div className="grid grid-cols-2 gap-2">
            {players.map((p, i) => (
              <div key={p}>
                <div className="mb-1 truncate text-xs text-slate-500">{p}</div>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  className="input"
                  value={group.values[i]}
                  onChange={(e) => update(group.values, group.setter, i, e.target.value)}
                />
              </div>
            ))}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {en ? 'Current' : 'الحالي'}: {group.values.reduce((sum, value) => sum + (Number(value) || 0), 0)} / {group.total}
          </div>
        </div>
      ))}

      <label className="flex items-center gap-2 text-sm font-semibold">
        <input type="checkbox" checked={doubleCards} onChange={(e) => setDoubleCards(e.target.checked)} />
        <Crown className="h-4 w-4 text-amber-500" /> {en ? 'Double King/Queens' : 'تدبيل الملك/البنات'}
      </label>
    </div>
  );
}
