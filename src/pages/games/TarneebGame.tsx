import { useNavigate, useParams } from 'react-router-dom';
import { useState } from 'react';
import { Flag, Plus } from 'lucide-react';
import { Layout } from '../../components/Layout';
import { ManualFinishMatch } from '../../components/ManualFinishMatch';
import { ScoreTable } from '../../components/ScoreTable';
import { ShareButton } from '../../components/ShareButton';
import { GameScoreHeader } from '../../components/GameScoreHeader';
import { copy, gameText } from '../../i18n';
import {
  calcTarneeb400Round,
  calcTarneebRound,
  getTarneeb400Winner,
  TARNEEB_400_TARGET,
  TARNEEB_DEFAULT_TARGET,
  tarneeb400MinBid,
  tarneeb400MinTotalBid,
} from '../../logic/tarneeb';
import { computeTotals, useMatches } from '../../store/matches';
import { useSettings } from '../../store/settings';

type Variant = 'regular' | '400';

export default function TarneebGame({ variant }: { variant: Variant }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getMatch, addRound, finishMatch } = useMatches();
  const { language } = useSettings();
  const t = copy[language];
  const en = language === 'en';
  const match = id ? getMatch(id) : undefined;

  const [showRoundForm, setShowRoundForm] = useState(false);
  const [error, setError] = useState('');

  const [bidderTeam, setBidderTeam] = useState(0);
  const [bidTricks, setBidTricks] = useState(7);
  const [wonTricks, setWonTricks] = useState('');

  const [bids, setBids] = useState<string[]>(['2', '2', '2', '2']);
  const [tricks, setTricks] = useState<string[]>(['', '', '', '']);

  if (!match) {
    return (
      <Layout back title={variant === '400' ? gameText[language].labels['tarneeb-400'] : gameText[language].labels.tarneeb}>
        <div className="card">{en ? 'Match not found.' : 'المباراة غير موجودة.'}</div>
      </Layout>
    );
  }

  const totals = computeTotals(match);
  const target = variant === '400' ? TARNEEB_400_TARGET : match.config.target ?? TARNEEB_DEFAULT_TARGET;
  const winnerIndex = variant === '400' ? getTarneeb400Winner(totals) : totals.findIndex((total) => total >= target);
  const matchOver = winnerIndex !== -1;

  const submitRegular = () => {
    const r = calcTarneebRound({
      bidderTeam,
      bidTricks,
      wonTricks: Number(wonTricks) || 0,
    });
    if (!r.ok) return setError(r.error);
    setError('');
    addRound(match.id, {
      deltas: r.deltas,
      meta: { contractLabel: r.contractLabel, bidderTeam, bidTricks, wonTricks: Number(wonTricks) || 0 },
    });
    setWonTricks('');
    setShowRoundForm(false);
  };

  const submit400 = () => {
    const parsedBids = bids.map((bid) => Number(bid) || 0);
    const parsedTricks = tricks.map((trick) => Number(trick) || 0);
    const r = calcTarneeb400Round({ bids: parsedBids, tricks: parsedTricks, totalsBefore: totals });
    if (!r.ok) return setError(r.error);
    setError('');
    addRound(match.id, { deltas: r.deltas, meta: { contractLabel: r.contractLabel, bids: parsedBids, tricks: parsedTricks } });
    setTricks(['', '', '', '']);
    setShowRoundForm(false);
  };

  const finish = () => {
    finishMatch(match.id, winnerIndex >= 0 ? winnerIndex : undefined);
    navigate('/');
  };

  const title = variant === '400' ? gameText[language].labels['tarneeb-400'] : gameText[language].labels.tarneeb;

  return (
    <Layout back title={title} headerAction={<ShareButton targetId="score-table-capture" />}>
      <div id="score-table-capture" className="bg-[#f8fafc] dark:bg-[#1b1a17] -mx-1 px-1 pb-2">
        <GameScoreHeader match={match} />
        <div className="game-status">
          <span>{t.round} {match.rounds.length + 1}</span>
          <span>{en ? 'Target' : 'الهدف'}: {target}</span>
        </div>

        <ScoreTable match={match} />
      </div>

      {!matchOver && <ManualFinishMatch match={match} />}

      {!matchOver && !showRoundForm && (
        <button className="btn-primary mt-4 w-full py-4 text-lg" onClick={() => setShowRoundForm(true)}>
          <Plus className="h-4 w-4" /> {en ? 'New round' : 'جولة جديدة'}
        </button>
      )}

      {!matchOver && showRoundForm && (
        <div className="card mt-4 space-y-3">
          <h3 className="font-bold">{en ? 'New round' : 'جولة جديدة'}</h3>
          {variant === 'regular' ? (
            <RegularRoundForm
              en={en}
              teams={match.players}
              bidderTeam={bidderTeam}
              setBidderTeam={setBidderTeam}
              bidTricks={bidTricks}
              setBidTricks={setBidTricks}
              wonTricks={wonTricks}
              setWonTricks={setWonTricks}
            />
          ) : (
            <Tarneeb400RoundForm
              en={en}
              players={match.players}
              totals={totals}
              bids={bids}
              setBids={setBids}
              tricks={tricks}
              setTricks={setTricks}
            />
          )}

          {error && <div className="rounded-lg bg-red-100 p-2 text-sm text-red-700 dark:bg-red-900/40 dark:text-red-300">{error}</div>}

          <div className="flex gap-2">
            <button className="btn-primary flex-1" onClick={variant === 'regular' ? submitRegular : submit400}>
              <Plus className="h-4 w-4" /> {en ? 'Save round' : 'حفظ الجولة'}
            </button>
            <button
              className="btn-secondary"
              onClick={() => {
                setShowRoundForm(false);
                setError('');
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
            {en ? 'Winner' : 'الفائز'}: {match.players[winnerIndex]} ({totals[winnerIndex]})
          </div>
          <button className="btn-primary w-full" onClick={finish}>
            <Flag className="h-4 w-4" /> {en ? 'Finish match' : 'إنهاء المباراة'}
          </button>
        </div>
      )}
    </Layout>
  );
}

function RegularRoundForm({
  en,
  teams,
  bidderTeam,
  setBidderTeam,
  bidTricks,
  setBidTricks,
  wonTricks,
  setWonTricks,
}: {
  en: boolean;
  teams: string[];
  bidderTeam: number;
  setBidderTeam: (value: number) => void;
  bidTricks: number;
  setBidTricks: (value: number) => void;
  wonTricks: string;
  setWonTricks: (value: string) => void;
}) {
  const opponentTricks = wonTricks === '' ? 13 : 13 - (Number(wonTricks) || 0);
  return (
    <>
      <div>
        <label className="label">{en ? 'Bidding team' : 'الفريق صاحب الطلب'}</label>
        <div className="choice-grid">
          {teams.map((team, i) => (
            <button
              key={team}
              className={'choice-btn ' + (bidderTeam === i ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300 dark:border-slate-700')}
              onClick={() => setBidderTeam(i)}
            >
              {team}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">{en ? 'Bid' : 'الطلب'}</label>
          <select className="input" value={bidTricks} onChange={(e) => setBidTricks(Number(e.target.value))}>
            {[7, 8, 9, 10, 11, 12, 13].map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">{en ? 'Tricks won' : 'لمات الفريق'}</label>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={13}
            className="input"
            value={wonTricks}
            onChange={(e) => setWonTricks(e.target.value === '' ? '' : String(Math.max(0, Math.min(13, Number(e.target.value) || 0))))}
          />
          <div className="mt-1 text-xs text-slate-500">{en ? 'Opponent' : 'الخصم'}: {opponentTricks}</div>
        </div>
      </div>
    </>
  );
}

function Tarneeb400RoundForm({
  en,
  players,
  totals,
  bids,
  setBids,
  tricks,
  setTricks,
}: {
  en: boolean;
  players: string[];
  totals: number[];
  bids: string[];
  setBids: (value: string[]) => void;
  tricks: string[];
  setTricks: (value: string[]) => void;
}) {
  const minTotal = tarneeb400MinTotalBid(totals);
  const bidTotal = bids.reduce((sum, bid) => sum + (Number(bid) || 0), 0);
  const tricksTotal = tricks.reduce((sum, trick) => sum + (Number(trick) || 0), 0);

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-slate-200 p-3 text-xs text-slate-500 dark:border-white/10">
        {en ? 'Total bids minimum' : 'أقل مجموع للطلبات'}: {minTotal} • {en ? 'Current' : 'الحالي'}: {bidTotal}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {players.map((player, i) => {
          const minBid = tarneeb400MinBid(totals[i]);
          return (
            <div key={player} className="rounded-xl border border-slate-200 p-2 dark:border-white/10">
              <div className="mb-2 truncate text-xs font-bold text-slate-500">{player} ({totals[i]})</div>
              <label className="mb-1 block text-[10px] font-bold text-slate-400">{en ? 'Bid' : 'الطلب'}</label>
              <select
                className="input mb-2"
                value={bids[i]}
                onChange={(e) => {
                  const next = [...bids];
                  next[i] = e.target.value;
                  setBids(next);
                }}
              >
                {Array.from({ length: 14 - minBid }, (_, idx) => minBid + idx).map((value) => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </select>
              <label className="mb-1 block text-[10px] font-bold text-slate-400">{en ? 'Tricks' : 'اللمات'}</label>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                max={13}
                className="input"
                value={tricks[i]}
                onChange={(e) => {
                  const next = [...tricks];
                  next[i] = e.target.value === '' ? '' : String(Math.max(0, Math.min(13, Number(e.target.value) || 0)));
                  setTricks(next);
                }}
              />
            </div>
          );
        })}
      </div>
      <div className={'text-xs ' + (tricksTotal === 13 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500')}>
        {en ? 'Tricks total' : 'مجموع اللمات'}: {tricksTotal} / 13
      </div>
    </div>
  );
}
