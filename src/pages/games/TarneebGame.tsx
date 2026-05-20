import { useNavigate, useParams } from 'react-router-dom';
import { useState } from 'react';
import { Flag, Plus, Trophy } from 'lucide-react';
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
import { ShareMatchCardModal } from '../../components/ShareMatchCardModal';

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
  const [showShareCard, setShowShareCard] = useState(false);

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
        <div className="relative overflow-hidden rounded-[2.25rem] border border-slate-200/60 bg-white shadow-2xl shadow-black/10 backdrop-blur-xl dark:border-white/[0.07] dark:bg-[#18171380] dark:shadow-black/40 mt-5 animate-in fade-in slide-in-from-bottom-4 duration-300">
          {/* Top accent gradient bar */}
          <div className="absolute top-0 inset-x-0 h-[3px] bg-gradient-to-r from-amber-500 via-orange-400 to-rose-500 rounded-t-[2.25rem]" />
          <div className="p-6 pt-7 space-y-5">

            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-white/[0.06]">
              <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2.5">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                </span>
                <span>{en ? 'New Round' : 'جولة جديدة'}</span>
              </h3>
              <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-gradient-to-br from-slate-100 to-slate-50 dark:from-white/[0.06] dark:to-white/[0.02] text-slate-400 dark:text-slate-500 border border-slate-200/40 dark:border-white/[0.04] shadow-sm">
                {variant === '400' ? 'تَرنيب 400' : (en ? 'Tarneeb' : 'تَرنيب')}
              </span>
            </div>

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

            {error && (
              <div className="rounded-2xl bg-red-500/10 border border-red-500/20 p-3.5 text-xs font-black text-red-600 dark:text-red-400 text-center">
                {error}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col gap-2 pt-1">
              <button
                type="button"
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-400 hover:from-amber-400 hover:to-orange-300 text-white text-[15px] font-black shadow-xl shadow-amber-500/25 hover:shadow-amber-400/35 active:scale-[0.97] transition-all duration-200 flex items-center justify-center gap-2"
                onClick={variant === 'regular' ? submitRegular : submit400}
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
            {en ? 'Winner' : 'الفائز'}: {match.players[winnerIndex]} ({totals[winnerIndex]})
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
      {/* Bidding Team Selection */}
      <div className="space-y-2.5">
        <label className="flex items-center gap-1.5 text-[11px] font-black tracking-widest text-slate-400 dark:text-slate-500 uppercase">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 text-amber-500">
            <path fillRule="evenodd" d="M10 1a4.5 4.5 0 0 0-4.5 4.5V9H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-.5V5.5A4.5 4.5 0 0 0 10 1Zm3 8V5.5a3 3 0 1 0-6 0V9h6Z" clipRule="evenodd" />
          </svg>
          {en ? 'Bidding Team' : 'الفريق صاحب الطلب'}
        </label>
        <div className="grid grid-cols-2 gap-3">
          {teams.map((team, i) => (
            <button
              key={team}
              type="button"
              className={
                'relative flex flex-col items-center justify-center gap-1.5 rounded-[1.5rem] border-2 px-3 py-3.5 text-sm font-black transition-all duration-300 active:scale-[0.96] ' +
                (bidderTeam === i
                  ? 'border-amber-500/80 bg-gradient-to-b from-amber-500/12 to-orange-500/6 text-amber-700 dark:text-amber-300 shadow-[0_4px_20px_rgba(245,158,11,0.18)]'
                  : 'border-slate-200/70 bg-slate-50/60 text-slate-500 hover:border-slate-300/80 hover:bg-slate-100/70 dark:border-white/[0.04] dark:bg-white/[0.02] dark:text-slate-400')
              }
              onClick={() => setBidderTeam(i)}
            >
              <div className={`h-5 w-5 rounded-full flex items-center justify-center transition-all duration-200 ${bidderTeam === i ? 'bg-amber-500 text-white shadow-md shadow-amber-500/30' : 'bg-slate-200/60 dark:bg-white/5'}`}>
                {bidderTeam === i && (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                    <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              {team}
            </button>
          ))}
        </div>
      </div>

      {/* Bid & Tricks Won */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <label className="flex items-center gap-1.5 text-[11px] font-black tracking-widest text-slate-400 dark:text-slate-500 uppercase">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 text-emerald-500">
              <path d="M15.98 1.804a1 1 0 0 0-1.96 0l-.24 1.192a1 1 0 0 1-.784.785l-1.192.24a1 1 0 0 0 0 1.962l1.192.24a1 1 0 0 1 .784.785l.24 1.192a1 1 0 0 0 1.962 0l.24-1.192a1 1 0 0 1 .784-.785l1.192-.24a1 1 0 0 0 0-1.962l-1.192-.24a1 1 0 0 1-.784-.785l-.24-1.192Z" />
            </svg>
            {en ? 'Bid' : 'الطلب'}
          </label>
          <div className="flex items-center justify-center overflow-hidden rounded-2xl border border-slate-200/60 dark:border-white/[0.06]">
            <button
              type="button"
              onClick={() => { if (bidTricks > 7) setBidTricks(bidTricks - 1); }}
              className={`flex h-12 w-10 items-center justify-center text-xl font-black transition-all active:scale-90 ${
                bidTricks <= 7
                  ? 'bg-slate-50 text-slate-300 dark:bg-white/[0.02] dark:text-slate-600 cursor-not-allowed'
                  : 'bg-slate-100/80 text-slate-700 hover:bg-slate-200/60 dark:bg-white/[0.04] dark:text-white dark:hover:bg-white/[0.07]'
              }`}
              disabled={bidTricks <= 7}
            >−</button>
            <div className="flex h-12 flex-1 items-center justify-center bg-emerald-500/10 text-2xl font-black text-emerald-700 dark:text-emerald-400">
              {bidTricks}
            </div>
            <button
              type="button"
              onClick={() => { if (bidTricks < 13) setBidTricks(bidTricks + 1); }}
              className={`flex h-12 w-10 items-center justify-center text-xl font-black transition-all active:scale-90 ${
                bidTricks >= 13
                  ? 'bg-slate-50 text-slate-300 dark:bg-white/[0.02] dark:text-slate-600 cursor-not-allowed'
                  : 'bg-slate-100/80 text-slate-700 hover:bg-slate-200/60 dark:bg-white/[0.04] dark:text-white dark:hover:bg-white/[0.07]'
              }`}
              disabled={bidTricks >= 13}
            >+</button>
          </div>
        </div>
        <div className="space-y-2">
          <label className="flex items-center gap-1.5 text-[11px] font-black tracking-widest text-slate-400 dark:text-slate-500 uppercase">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 text-blue-500">
              <path d="M10 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM6 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM1.49 15.326a.78.78 0 0 1-.358-.442 3 3 0 0 1 4.308-3.516 6.484 6.484 0 0 0-1.905 3.959c-.023.222-.014.442.025.654a4.97 4.97 0 0 1-2.07-.655ZM16.44 15.98a4.97 4.97 0 0 0 2.07-.654.78.78 0 0 0 .357-.442 3 3 0 0 0-4.308-3.517 6.484 6.484 0 0 1 1.907 3.96 2.32 2.32 0 0 1-.026.654ZM18 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM5.304 16.19a.844.844 0 0 1-.277-.71 5 5 0 0 1 9.947 0 .843.843 0 0 1-.277.71A6.975 6.975 0 0 1 10 18a6.974 6.974 0 0 1-4.696-1.81Z" />
            </svg>
            {en ? 'Tricks Won' : 'لمات الفريق'}
          </label>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={13}
            className="w-full h-12 text-center text-lg font-black placeholder:text-slate-300 dark:placeholder:text-slate-700 bg-white/70 dark:bg-[#1a1915]/60 border-2 border-slate-200/80 dark:border-white/5 rounded-2xl outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 dark:focus:ring-amber-500/20 transition-all duration-200"
            placeholder="0"
            value={wonTricks}
            onChange={(e) => setWonTricks(e.target.value === '' ? '' : String(Math.max(0, Math.min(13, Number(e.target.value) || 0))))}
          />
          <div className="text-center text-[11px] font-semibold text-slate-400 dark:text-slate-500">
            {en ? 'Opponent' : 'الخصم'}: <span className="font-black text-slate-600 dark:text-slate-300">{opponentTricks}</span>
          </div>
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
  const bidReady = bidTotal >= minTotal;
  const tricksReady = tricksTotal === 13;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div className={'rounded-2xl border p-3 text-center ' + (bidReady ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-amber-500/40 bg-amber-500/10')}>
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">{en ? 'Bids' : 'الطلبات'}</div>
          <div className="mt-1 text-xl font-extrabold text-slate-900 dark:text-white">{bidTotal}</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">{en ? 'minimum' : 'الأقل'} {minTotal}</div>
        </div>
        <div className={'rounded-2xl border p-3 text-center ' + (tricksReady ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-slate-300/70 dark:border-white/10')}>
          <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">{en ? 'Tricks' : 'اللمات'}</div>
          <div className="mt-1 text-xl font-extrabold text-slate-900 dark:text-white">{tricksTotal}</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">/ 13</div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10">
        <div className="grid grid-cols-[1fr_5rem_5.5rem] gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-extrabold text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
          <span>{en ? 'Player' : 'اللاعب'}</span>
          <span className="text-center">{en ? 'Bid' : 'الطلب'}</span>
          <span className="text-center">{en ? 'Tricks' : 'اللمات'}</span>
        </div>
        {players.map((player, i) => {
          const minBid = tarneeb400MinBid(totals[i]);
          const maxBid = 13;
          const currentBid = Number(bids[i]) || minBid;
          return (
            <div key={player} className="grid grid-cols-[1fr_5rem_5.5rem] items-center gap-2 border-b border-slate-200 px-3 py-2.5 last:border-b-0 dark:border-white/10">
              <div className="min-w-0">
                <div className="truncate text-sm font-extrabold text-slate-800 dark:text-slate-100">{player}</div>
                <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  {en ? 'Score' : 'النقاط'}: {totals[i] ?? 0}
                </div>
              </div>
              {/* Bid Stepper */}
              <div className="flex items-center justify-center gap-0.5">
                <button
                  type="button"
                  onClick={() => {
                    if (currentBid > minBid) {
                      const next = [...bids];
                      next[i] = String(currentBid - 1);
                      setBids(next);
                    }
                  }}
                  className={`flex h-9 w-7 items-center justify-center rounded-l-xl text-sm font-black transition-all active:scale-90 ${
                    currentBid <= minBid
                      ? 'bg-black/5 dark:bg-white/5 text-slate-300 dark:text-slate-600 cursor-not-allowed'
                      : 'bg-black/10 dark:bg-white/10 text-slate-700 dark:text-white hover:bg-black/15 dark:hover:bg-white/15'
                  }`}
                  disabled={currentBid <= minBid}
                >
                  −
                </button>
                <div className="flex h-9 w-9 items-center justify-center bg-emerald-500/15 dark:bg-emerald-500/20 text-base font-black text-emerald-700 dark:text-emerald-400 border-y border-emerald-500/20">
                  {currentBid}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (currentBid < maxBid) {
                      const next = [...bids];
                      next[i] = String(currentBid + 1);
                      setBids(next);
                    }
                  }}
                  className={`flex h-9 w-7 items-center justify-center rounded-r-xl text-sm font-black transition-all active:scale-90 ${
                    currentBid >= maxBid
                      ? 'bg-black/5 dark:bg-white/5 text-slate-300 dark:text-slate-600 cursor-not-allowed'
                      : 'bg-black/10 dark:bg-white/10 text-slate-700 dark:text-white hover:bg-black/15 dark:hover:bg-white/15'
                  }`}
                  disabled={currentBid >= maxBid}
                >
                  +
                </button>
              </div>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                max={13}
                className="input h-11 px-2 text-center text-base font-bold"
                value={tricks[i]}
                placeholder="0"
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
    </div>
  );
}
