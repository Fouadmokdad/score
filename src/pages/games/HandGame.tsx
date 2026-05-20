import { useNavigate, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { playHaptic, playVibration } from '../../utils/haptics';
import { ImpactStyle } from '@capacitor/haptics';
import { Layout } from '../../components/Layout';
import { ScoreTable } from '../../components/ScoreTable';
import { PlayerAvatar } from '../../components/PlayerAvatar';
import { ManualFinishMatch } from '../../components/ManualFinishMatch';
import { useMatches, computeTotals } from '../../store/matches';
import {
  HAND_KINDS,
  HAND_MAX_ROUNDS,
  calcHandRound,
  countHandWins,
  isHandMatchOver,
  type HandKind,
} from '../../logic/hand';
import { Plus, Undo2, Flag, Trophy, CalendarDays } from 'lucide-react';
import { copy, gameText } from '../../i18n';
import { useSettings } from '../../store/settings';
import { ShareButton } from '../../components/ShareButton';
import { ShareMatchCardModal } from '../../components/ShareMatchCardModal';

interface Props {
  /** 'solo' (individual players) or 'partners' (2v2, sides already joined into 2 names) */
  variant: 'solo' | 'partners';
}

export default function HandGame({ variant }: Props) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getMatch, addRound, removeLastRound, finishMatch } = useMatches();
  const { language } = useSettings();
  const t = copy[language];
  const en = language === 'en';
  const match = id ? getMatch(id) : undefined;

  const [winner, setWinner] = useState(0);
  const [kind, setKind] = useState<HandKind>('normal');
  const [loserCards, setLoserCards] = useState<string[]>(['', '']);
  const [showRoundForm, setShowRoundForm] = useState(false);
  const [error, setError] = useState('');
  const [showShareCard, setShowShareCard] = useState(false);

  useEffect(() => {
    if (!match) return;
    setWinner((current) => Math.min(current, match.players.length - 1));
    const numPlayers = variant === 'partners' ? 4 : match.players.length;
    setLoserCards((current) => Array.from({ length: numPlayers }, (_, i) => current[i] ?? ''));
  }, [match?.players.length, variant]);

  if (!match) {
    return (
      <Layout back title={variant === 'solo' ? 'هند فردي' : 'هند شراكة'}>
        <div className="card">{en ? 'Match not found.' : 'المباراة غير موجودة.'}</div>
      </Layout>
    );
  }

  const sides = match.players.length;
  const totals = computeTotals(match);
  const wins = countHandWins(match.rounds, sides);
  const status = isHandMatchOver(match.rounds, sides);
  const playedRounds = match.rounds.length;
  const parsedLoserCards = loserCards.map((cards) => Number(cards) || 0);

  // Default card-point values for hand kinds where empty loser fields should auto-fill
  const handKindDefaults: Record<string, number> = { normal: 100, h100: 100, h150: 150, h200: 200 };
  const isPartners = variant === 'partners';

  const submit = () => {
    const def = HAND_KINDS.find((k) => k.id === kind)!;
    const defaultVal = handKindDefaults[kind];
    const deltas = new Array(sides).fill(0);
    deltas[winner] = def.winnerDelta;
    
    const finalLoserCards: (number | string)[] = [];

    for (let teamIdx = 0; teamIdx < sides; teamIdx++) {
      if (teamIdx === winner) {
        if (isPartners) {
          finalLoserCards[teamIdx] = 0;
          finalLoserCards[teamIdx + 2] = 0;
        } else {
          finalLoserCards[teamIdx] = 0;
        }
        continue;
      }

      if (isPartners) {
        const p1 = loserCards[teamIdx];
        const p2 = loserCards[teamIdx + 2];
        let p1Penalty = p1 === '' && defaultVal !== undefined ? defaultVal : Math.round((Number(p1) || 0) * def.multiplier);
        let p2Penalty = p2 === '' && defaultVal !== undefined ? defaultVal : Math.round((Number(p2) || 0) * def.multiplier);
        deltas[teamIdx] = p1Penalty + p2Penalty;
        finalLoserCards[teamIdx] = p1 === '' ? 'empty' : Number(p1) || 0;
        finalLoserCards[teamIdx + 2] = p2 === '' ? 'empty' : Number(p2) || 0;
      } else {
        const p1 = loserCards[teamIdx];
        deltas[teamIdx] = p1 === '' && defaultVal !== undefined ? defaultVal : Math.round((Number(p1) || 0) * def.multiplier);
        finalLoserCards[teamIdx] = p1 === '' ? 'empty' : Number(p1) || 0;
      }
    }

    setError('');
    addRound(match.id, {
      deltas,
      meta: { handWinner: winner, handKind: kind, loserCards: finalLoserCards, contractLabel: def.label },
    });
    playHaptic(ImpactStyle.Medium);
    setLoserCards(new Array(isPartners ? 4 : sides).fill(''));
    setKind('normal');
    setShowRoundForm(false);
  };

  const finish = () => {
    if (status.over && status.winner !== undefined) {
      finishMatch(match.id, status.winner);
    } else {
      // by score (lower better) tie-breaker
      const min = Math.min(...totals);
      finishMatch(match.id, totals.indexOf(min));
    }
    playHaptic(ImpactStyle.Heavy);
    navigate('/');
  };

  const title = gameText[language].labels[variant === 'solo' ? 'hand-solo' : 'hand-partners'];

  // Get original individual player names (for partners mode)
  const originalNames: string[] = match.config?.originalNames ?? match.players;
  // Team grouping for partners: Team 1 = indices 0,2 — Team 2 = indices 1,3

  // Format match date + time
  const matchDate = new Date(match.createdAt);
  const dateStr = en
    ? matchDate.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' })
    : matchDate.toLocaleDateString('ar-SY-u-nu-latn', { weekday: 'long', day: 'numeric', month: 'long' });
  const timeStr = matchDate.toLocaleTimeString(en ? 'en-US' : 'ar-SY-u-nu-latn', { hour: 'numeric', minute: '2-digit', hour12: true });

  return (
    <Layout back title={title} headerAction={<ShareButton targetId="score-table-capture" />}>
      <div id="score-table-capture" className="bg-[#f8fafc] dark:bg-[#1b1a17] -mx-1 px-1 pb-2">
      {/* Hero card — players, scores, date */}
      <div className="card mb-3 space-y-4">
        {/* Individual player avatars */}
        {isPartners ? (
          <div className="flex items-center justify-center gap-0">
            {/* Team 1 players */}
            <div className="flex items-center justify-center gap-3">
              {[0, 2].filter(i => i < originalNames.length).map((idx) => (
                <div key={idx} className="flex flex-col items-center gap-1">
                  <PlayerAvatar name={originalNames[idx]} size="lg" />
                  <span className="max-w-[5rem] truncate text-xs font-semibold text-slate-600 dark:text-slate-300">
                    {originalNames[idx]}
                  </span>
                </div>
              ))}
            </div>
            {/* Divider */}
            <div className="mx-3 h-14 w-px bg-slate-300 dark:bg-white/15" />
            {/* Team 2 players */}
            <div className="flex items-center justify-center gap-3">
              {[1, 3].filter(i => i < originalNames.length).map((idx) => (
                <div key={idx} className="flex flex-col items-center gap-1">
                  <PlayerAvatar name={originalNames[idx]} size="lg" />
                  <span className="max-w-[5rem] truncate text-xs font-semibold text-slate-600 dark:text-slate-300">
                    {originalNames[idx]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
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
                  {/* Wins counter */}
                  <div className="mt-0.5 flex items-center justify-center gap-1 rounded-full bg-slate-100/80 px-2 py-0.5 text-[10px] font-bold text-slate-500 dark:bg-white/5 dark:text-slate-400">
                    <Trophy className="h-3 w-3 text-amber-500" />
                    <span className={status.winner === i ? 'text-emerald-600 dark:text-emerald-400' : ''}>{wins[i]}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Team scores (Partners mode) */}
        {isPartners && (() => {
          // The team with more wins gets -100 per EXTRA win from displayed score
          const winsDiff = wins[0] - wins[1]; // positive = team0 has more wins
          const displayScores = [totals[0], totals[1]];
          if (winsDiff > 0) {
            displayScores[0] = totals[0] - winsDiff * 100;
          } else if (winsDiff < 0) {
            displayScores[1] = totals[1] - Math.abs(winsDiff) * 100;
          }
          const scoreDiff = Math.abs(displayScores[0] - displayScores[1]);
          return (
          <div className="relative flex items-stretch justify-center gap-2">
            {match.players.map((p, i) => {
              const isBest = displayScores[i] === Math.min(...displayScores) && match.rounds.length > 0;
              return (
                <div key={i} className="flex flex-1 flex-col items-center gap-1">
                  <div
                    className={
                      'flex w-full items-center justify-center rounded-2xl border-2 px-3 py-2.5 text-center text-xl font-extrabold transition ' +
                      (isBest
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : 'border-slate-300/60 text-slate-700 dark:border-white/10 dark:text-slate-200')
                    }
                  >
                    {displayScores[i]}
                  </div>
                  {/* Wins counter */}
                  <div className="flex items-center justify-center gap-1.5 rounded-full bg-slate-100/80 px-2.5 py-1 text-xs font-bold text-slate-500 dark:bg-white/5 dark:text-slate-400">
                    <Trophy className="h-3.5 w-3.5 text-amber-500" />
                    <span className={status.winner === i ? 'text-emerald-600 dark:text-emerald-400' : ''}>
                      {wins[i]} {en ? 'wins' : 'جولات'}
                    </span>
                  </div>
                </div>
              );
            })}

            {/* Score difference indicator (centered between the two columns) */}
            {match.rounds.length > 0 && (
              <div className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
                <div
                  className={
                    'flex flex-col items-center justify-center rounded-xl border-2 px-2 py-1 shadow-lg backdrop-blur-sm min-w-[2.5rem] ' +
                    (scoreDiff >= 200
                      ? 'border-red-400 bg-red-500/90 text-white dark:border-red-500'
                      : scoreDiff >= 100
                        ? 'border-amber-400 bg-amber-500/90 text-white dark:border-amber-500'
                        : 'border-slate-300 bg-white/90 text-slate-700 dark:border-white/20 dark:bg-[#1a1915]/90 dark:text-slate-200')
                  }
                >
                  <span className="text-[8px] font-bold uppercase leading-none opacity-75">{en ? 'DIFF' : 'فرق'}</span>
                  <span className="text-sm font-black leading-tight">{scoreDiff}</span>
                </div>
              </div>
            )}
          </div>
          );
        })()}

        {/* Match date */}
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <div className="font-semibold">
            {en ? 'Rounds: ' : 'الجولات: '} {match.rounds.length} / {HAND_MAX_ROUNDS}
          </div>
          <div className="flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5" />
            <span>{dateStr}، {timeStr}</span>
          </div>
        </div>
      </div>

      {/* Score table */}
      <h3 className="mb-2 text-center text-sm font-bold text-slate-600 dark:text-slate-300">{en ? 'Rounds' : 'الجولات'}</h3>
      <ScoreTable match={match} lowerIsBetter />
      </div>

      {!status.over && <ManualFinishMatch match={match} lowerIsBetter winnerIndex={status.winner} />}

      {!status.over && !showRoundForm && (
        <button className="btn-primary mt-4 w-full py-4 text-lg" onClick={() => setShowRoundForm(true)}>
          <Plus className="h-4 w-4" /> {en ? 'New round' : 'جولة جديدة'}
        </button>
      )}

      {!status.over && showRoundForm && (
        <div className="relative overflow-hidden rounded-[2.25rem] border border-slate-200/60 bg-white shadow-2xl shadow-black/10 backdrop-blur-xl dark:border-white/[0.07] dark:bg-[#18171380] dark:shadow-black/40 mt-5 space-y-0 animate-in fade-in slide-in-from-bottom-4 duration-300">
          {/* Top accent gradient bar */}
          <div className="absolute top-0 inset-x-0 h-[3px] bg-gradient-to-r from-emerald-500 via-teal-400 to-blue-500 rounded-t-[2.25rem]" />
          <div className="p-6 pt-7 space-y-5">
          
          {/* Header Bar */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-white/[0.06]">
            <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span>{en ? 'New Round' : 'جولة جديدة'}</span>
            </h3>
            <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-gradient-to-br from-slate-100 to-slate-50 dark:from-white/[0.06] dark:to-white/[0.02] text-slate-400 dark:text-slate-500 border border-slate-200/40 dark:border-white/[0.04] shadow-sm">
              {isPartners ? (en ? 'Partners' : 'شراكة') : (en ? 'Solo' : 'فردي')}
            </span>
          </div>

          {/* Winner Selection */}
          <div className="space-y-2.5">
            <label className="flex items-center gap-1.5 text-[11px] font-black tracking-widest text-slate-400 dark:text-slate-500 uppercase">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 text-emerald-500">
                <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
              </svg>
              {en ? 'Round Winner' : variant === 'partners' ? 'الفريق الفائز' : 'الفائز'}
            </label>
            <div className="grid grid-cols-2 gap-3">
              {match.players.map((p, i) => {
                const isTeam = isPartners && originalNames.length >= 4;
                const isSelected = winner === i;
                return (
                  <button
                    key={i}
                    type="button"
                    className={
                      'group relative overflow-hidden flex flex-col items-center justify-center gap-2.5 rounded-[1.5rem] border-2 px-3 py-4 transition-all duration-300 active:scale-[0.96] ' +
                      (isSelected
                        ? 'border-emerald-500/80 bg-gradient-to-b from-emerald-500/12 to-teal-500/6 shadow-[0_4px_20px_rgba(16,185,129,0.18)] dark:from-emerald-500/15 dark:to-teal-500/8'
                        : 'border-slate-200/70 bg-slate-50/60 hover:border-slate-300/80 hover:bg-slate-100/70 dark:border-white/[0.04] dark:bg-white/[0.02] dark:hover:border-white/[0.07] dark:hover:bg-white/[0.04]')
                    }
                    onClick={() => setWinner(i)}
                  >
                    {/* Selected Glow Behind */}
                    {isSelected && <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 to-transparent pointer-events-none" />}

                    {/* Checkmark badge */}
                    <div className={`absolute top-2 right-2 h-5 w-5 rounded-full flex items-center justify-center transition-all duration-200 ${isSelected ? 'bg-emerald-500 text-white scale-100 opacity-100 shadow-md shadow-emerald-500/30' : 'bg-slate-200/60 dark:bg-white/5 scale-75 opacity-40'}`}>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                        <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                      </svg>
                    </div>

                    {isTeam ? (
                      <>
                        <div className="flex items-center -space-x-3 space-x-reverse">
                          <div className={`z-10 rounded-full ring-[2.5px] transition-all duration-300 ${isSelected ? 'ring-emerald-400/60 shadow-lg shadow-emerald-500/20' : 'ring-white dark:ring-[#201f1b] opacity-75'}`}>
                            <PlayerAvatar name={originalNames[i]} size="md" />
                          </div>
                          <div className={`z-0 rounded-full ring-[2.5px] transition-all duration-300 ${isSelected ? 'ring-emerald-400/60 shadow-lg shadow-emerald-500/20' : 'ring-white dark:ring-[#201f1b] opacity-75'}`}>
                            <PlayerAvatar name={originalNames[i + 2]} size="md" />
                          </div>
                        </div>
                        <span className={`text-[11px] font-black tracking-wide leading-tight text-center transition-all duration-200 ${isSelected ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-500 dark:text-slate-400'}`}>{p}</span>
                      </>
                    ) : (
                      <>
                        <div className={`rounded-full ring-[2.5px] transition-all duration-300 ${isSelected ? 'ring-emerald-400/60 shadow-lg shadow-emerald-500/20' : 'ring-slate-200 dark:ring-white/10 opacity-75'}`}>
                          <PlayerAvatar name={p} size="md" />
                        </div>
                        <span className={`text-[11px] font-black tracking-wide text-center transition-all duration-200 ${isSelected ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-500 dark:text-slate-400'}`}>{p}</span>
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Round Type (Kind) Selection */}
          <div className="space-y-3">
            <label className="flex items-center gap-1.5 text-[11px] font-black tracking-widest text-slate-400 dark:text-slate-500 uppercase">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 text-blue-500">
                <path d="M15.98 1.804a1 1 0 0 0-1.96 0l-.24 1.192a1 1 0 0 1-.784.785l-1.192.24a1 1 0 0 0 0 1.962l1.192.24a1 1 0 0 1 .784.785l.24 1.192a1 1 0 0 0 1.962 0l.24-1.192a1 1 0 0 1 .784-.785l1.192-.24a1 1 0 0 0 0-1.962l-1.192-.24a1 1 0 0 1-.784-.785l-.24-1.192ZM6.949 5.684a1 1 0 0 0-1.898 0l-.683 2.051a1 1 0 0 1-.633.633l-2.051.683a1 1 0 0 0 0 1.898l2.051.684a1 1 0 0 1 .633.632l.683 2.051a1 1 0 0 0 1.898 0l.683-2.051a1 1 0 0 1 .633-.633l2.051-.683a1 1 0 0 0 0-1.898l-2.051-.683a1 1 0 0 1-.633-.633L6.95 5.684Z" />
              </svg>
              {en ? 'Round Type' : 'نوع الجولة'}
            </label>
            {/* 2x2 Segmented Button Grid */}
            <div className="grid grid-cols-2 gap-2">
              {HAND_KINDS.map((k) => {
                const isSelected = kind === k.id;
                const winnerPoints = k.id === 'normal' ? '−20' : '−40';
                const multiplier = k.id === 'h150' ? '×1.5' : k.id === 'h200' ? '×2' : '×1';
                return (
                  <button
                    key={k.id}
                    type="button"
                    className={
                      'group relative overflow-hidden flex items-center justify-between gap-2 rounded-[1.25rem] border-2 px-3.5 py-3 transition-all duration-300 active:scale-[0.97] ' +
                      (isSelected
                        ? 'border-blue-500/70 bg-gradient-to-br from-blue-500/12 to-indigo-500/6 shadow-[0_3px_16px_rgba(59,130,246,0.16)] dark:from-blue-500/15 dark:to-indigo-500/8'
                        : 'border-slate-200/60 bg-slate-50/50 hover:border-slate-300/80 hover:bg-slate-100/70 dark:border-white/[0.04] dark:bg-white/[0.02] dark:hover:border-white/[0.07] dark:hover:bg-white/[0.04]')
                    }
                    onClick={() => setKind(k.id)}
                  >
                    <div className="flex flex-col items-start gap-0.5">
                      <span className={`text-[12px] font-black leading-tight transition-colors ${isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-slate-600 dark:text-slate-300'}`}>
                        {handKindLabel(k.id, en)}
                      </span>
                      <span className={`text-[10px] font-bold transition-colors ${isSelected ? 'text-blue-500/80 dark:text-blue-400/80' : 'text-slate-400 dark:text-slate-500'}`}>
                        {en ? `Loser ${multiplier}` : `خاسر ${multiplier}`}
                      </span>
                    </div>
                    <div className={`shrink-0 flex flex-col items-center justify-center h-8 w-8 rounded-xl text-[10px] font-black transition-all duration-200 ${isSelected ? 'bg-blue-500 text-white shadow-md shadow-blue-500/30' : 'bg-slate-200/70 text-slate-500 dark:bg-white/5 dark:text-slate-400'}`}>
                      {winnerPoints}
                    </div>
                  </button>
                );
              })}
            </div>
            
            {/* Elegant Callout Help Message */}
            <div key={kind} className="flex items-start gap-2.5 rounded-[1.25rem] border border-blue-500/10 bg-gradient-to-br from-blue-500/6 to-indigo-500/4 p-3 text-xs text-blue-700/80 dark:text-blue-300/80 animate-in fade-in duration-200">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-lg bg-blue-500/12 text-blue-500 mt-px">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                  <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A1.75 1.75 0 0 0 10.747 15H11a.75.75 0 0 0 0-1.5h-.253a.25.25 0 0 1-.244-.304l.459-2.066A1.75 1.75 0 0 0 9.253 9H9Z" clipRule="evenodd" />
                </svg>
              </span>
              <span className="font-semibold leading-relaxed">{kindHelp(kind, en)}</span>
            </div>
          </div>

          {/* Card Points Inputs */}
          <div className="space-y-3">
            <label className="flex items-center gap-1.5 text-[11px] font-black tracking-widest text-slate-400 dark:text-slate-500 uppercase">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 text-red-400">
                <path d="M1 4.25a3.733 3.733 0 0 1 2.25-.75h13.5c.844 0 1.623.279 2.25.75A2.25 2.25 0 0 0 16.75 2H3.25A2.25 2.25 0 0 0 1 4.25ZM1 7.25a3.733 3.733 0 0 1 2.25-.75h13.5c.844 0 1.623.279 2.25.75A2.25 2.25 0 0 0 16.75 5H3.25A2.25 2.25 0 0 0 1 7.25ZM7 8a1 1 0 0 1 1 1 2 2 0 1 0 4 0 1 1 0 1 1 2 0v6.75A2.25 2.25 0 0 1 11.75 18H3.25A2.25 2.25 0 0 1 1 15.75V9a1 1 0 0 1 1-1h5Z" />
              </svg>
              {en ? 'Loser Card Points' : 'نقاط ورق الخاسر'}
            </label>
            <div className={isPartners ? "grid grid-cols-1 gap-4" : "grid grid-cols-2 gap-3"}>
              {isPartners ? (
                // Only show inputs for the losing team
                [0, 1].map(teamIdx => teamIdx !== winner && (
                  <div key={teamIdx} className="flex flex-col gap-4 rounded-[2rem] border border-slate-200/60 bg-slate-50/40 p-4 dark:border-white/[0.03] dark:bg-white/[0.01] animate-in fade-in duration-200">
                    <div className="flex items-center justify-between px-1">
                      <span className="text-[10px] font-black tracking-wider text-slate-400 dark:text-slate-500 uppercase">{en ? 'Losing Team' : 'الفريق الخاسر'}</span>
                      <span className="rounded-full bg-red-500/10 px-3 py-0.5 text-[11px] font-extrabold text-red-500 dark:text-red-400 border border-red-500/10">
                        {match.players[teamIdx]}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {/* Player 1 of Losing Team */}
                      <div className="flex flex-col gap-2">
                        <div className="truncate px-1 text-center text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center justify-center gap-1.5">
                          <PlayerAvatar name={originalNames[teamIdx]} size="sm" className="h-5 w-5 ring-1 ring-slate-200 dark:ring-white/10" />
                          <span className="truncate max-w-[5rem]">{originalNames[teamIdx]}</span>
                        </div>
                        <input
                          type="number"
                          inputMode="numeric"
                          min={0}
                          className="w-full h-12 text-center text-lg font-black placeholder:text-slate-300 dark:placeholder:text-slate-700 bg-white/70 dark:bg-[#1a1915]/60 border-2 border-slate-200/80 dark:border-white/5 rounded-2xl outline-none focus:border-red-500 focus:ring-4 focus:ring-red-500/10 dark:focus:ring-red-500/20 transition-all duration-200"
                          placeholder="0"
                          value={loserCards[teamIdx] ?? ''}
                          onChange={(e) => {
                            const next = [...loserCards];
                            next[teamIdx] = e.target.value === '' ? '' : String(Math.max(0, Number(e.target.value) || 0));
                            setLoserCards(next);
                          }}
                        />
                        {/* Increment Shortcuts */}
                        <div className="flex justify-center gap-1">
                          {[10, 20, 50].map((inc) => (
                            <button
                              key={inc}
                              type="button"
                              className="flex-1 inline-flex h-6 items-center justify-center rounded-lg border border-slate-200/80 bg-white text-[10px] font-black text-slate-500 shadow-sm transition hover:bg-slate-50 active:scale-95 dark:border-white/[0.04] dark:bg-white/[0.02] dark:text-slate-400 dark:hover:bg-white/10"
                              onClick={() => {
                                const next = [...loserCards];
                                const currentVal = Number(next[teamIdx]) || 0;
                                next[teamIdx] = String(currentVal + inc);
                                setLoserCards(next);
                              }}
                            >
                              +{inc}
                            </button>
                          ))}
                          <button
                            type="button"
                            className="inline-flex h-6 w-6 items-center justify-center rounded-lg border border-red-200/50 bg-red-50/50 text-[10px] font-black text-red-500 shadow-sm transition hover:bg-red-50 active:scale-95 dark:border-red-500/10 dark:bg-red-500/5 dark:text-red-400"
                            onClick={() => {
                              const next = [...loserCards];
                              next[teamIdx] = '';
                              setLoserCards(next);
                            }}
                          >
                            ×
                          </button>
                        </div>
                      </div>
                      
                      {/* Player 2 of Losing Team */}
                      <div className="flex flex-col gap-2">
                        <div className="truncate px-1 text-center text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center justify-center gap-1.5">
                          <PlayerAvatar name={originalNames[teamIdx + 2]} size="sm" className="h-5 w-5 ring-1 ring-slate-200 dark:ring-white/10" />
                          <span className="truncate max-w-[5rem]">{originalNames[teamIdx + 2]}</span>
                        </div>
                        <input
                          type="number"
                          inputMode="numeric"
                          min={0}
                          className="w-full h-12 text-center text-lg font-black placeholder:text-slate-300 dark:placeholder:text-slate-700 bg-white/70 dark:bg-[#1a1915]/60 border-2 border-slate-200/80 dark:border-white/5 rounded-2xl outline-none focus:border-red-500 focus:ring-4 focus:ring-red-500/10 dark:focus:ring-red-500/20 transition-all duration-200"
                          placeholder="0"
                          value={loserCards[teamIdx + 2] ?? ''}
                          onChange={(e) => {
                            const next = [...loserCards];
                            next[teamIdx + 2] = e.target.value === '' ? '' : String(Math.max(0, Number(e.target.value) || 0));
                            setLoserCards(next);
                          }}
                        />
                        {/* Increment Shortcuts */}
                        <div className="flex justify-center gap-1">
                          {[10, 20, 50].map((inc) => (
                            <button
                              key={inc}
                              type="button"
                              className="flex-1 inline-flex h-6 items-center justify-center rounded-lg border border-slate-200/80 bg-white text-[10px] font-black text-slate-500 shadow-sm transition hover:bg-slate-50 active:scale-95 dark:border-white/[0.04] dark:bg-white/[0.02] dark:text-slate-400 dark:hover:bg-white/10"
                              onClick={() => {
                                const next = [...loserCards];
                                const currentVal = Number(next[teamIdx + 2]) || 0;
                                next[teamIdx + 2] = String(currentVal + inc);
                                setLoserCards(next);
                              }}
                            >
                              +{inc}
                            </button>
                          ))}
                          <button
                            type="button"
                            className="inline-flex h-6 w-6 items-center justify-center rounded-lg border border-red-200/50 bg-red-50/50 text-[10px] font-black text-red-500 shadow-sm transition hover:bg-red-50 active:scale-95 dark:border-red-500/10 dark:bg-red-500/5 dark:text-red-400"
                            onClick={() => {
                              const next = [...loserCards];
                              next[teamIdx + 2] = '';
                              setLoserCards(next);
                            }}
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                match.players.map((p, i) => i !== winner && (
                  <div key={i} className="flex flex-col gap-3 rounded-[2rem] border border-slate-200/60 bg-slate-50/40 p-4 dark:border-white/[0.03] dark:bg-white/[0.01] animate-in fade-in duration-200">
                    <div className="truncate px-1 text-center text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center justify-center gap-1.5">
                      <PlayerAvatar name={p} size="sm" className="h-5 w-5 ring-1 ring-slate-200 dark:ring-white/10" />
                      <span className="truncate max-w-[5rem]">{p}</span>
                    </div>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      className="w-full h-12 text-center text-lg font-black placeholder:text-slate-300 dark:placeholder:text-slate-700 bg-white/70 dark:bg-[#1a1915]/60 border-2 border-slate-200/80 dark:border-white/5 rounded-2xl outline-none focus:border-red-500 focus:ring-4 focus:ring-red-500/10 dark:focus:ring-red-500/20 transition-all duration-200"
                      placeholder="0"
                      value={loserCards[i] ?? ''}
                      onChange={(e) => {
                        const next = [...loserCards];
                        next[i] = e.target.value === '' ? '' : String(Math.max(0, Number(e.target.value) || 0));
                        setLoserCards(next);
                      }}
                    />
                    {/* Increment Shortcuts */}
                    <div className="flex justify-center gap-1">
                      {[10, 20, 50].map((inc) => (
                        <button
                          key={inc}
                          type="button"
                          className="flex-1 inline-flex h-6 items-center justify-center rounded-lg border border-slate-200/80 bg-white text-[10px] font-black text-slate-500 shadow-sm transition hover:bg-slate-50 active:scale-95 dark:border-white/[0.04] dark:bg-white/[0.02] dark:text-slate-400 dark:hover:bg-white/10"
                          onClick={() => {
                            const next = [...loserCards];
                            const currentVal = Number(next[i]) || 0;
                            next[i] = String(currentVal + inc);
                            setLoserCards(next);
                          }}
                        >
                          +{inc}
                        </button>
                      ))}
                      <button
                        type="button"
                        className="inline-flex h-6 w-6 items-center justify-center rounded-lg border border-red-200/50 bg-red-50/50 text-[10px] font-black text-red-500 shadow-sm transition hover:bg-red-50 active:scale-95 dark:border-red-500/10 dark:bg-red-500/5 dark:text-red-400"
                        onClick={() => {
                          const next = [...loserCards];
                          next[i] = '';
                          setLoserCards(next);
                        }}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Live Preview Summary */}
          <div className="overflow-hidden rounded-[1.25rem] border border-slate-200/60 dark:border-white/[0.06] bg-slate-50/80 dark:bg-white/[0.02]">
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-200/60 dark:border-white/[0.04]">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] font-black tracking-widest uppercase text-slate-400 dark:text-slate-500">
                {en ? 'Score Preview' : 'معاينة النقاط'}
              </span>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 p-3.5">
              {(() => {
                const def = HAND_KINDS.find((k) => k.id === kind)!;
                const defaultVal = handKindDefaults[kind];
                const deltas = new Array(sides).fill(0);
                deltas[winner] = def.winnerDelta;

                for (let teamIdx = 0; teamIdx < sides; teamIdx++) {
                  if (teamIdx === winner) continue;
                  if (isPartners) {
                    const p1 = loserCards[teamIdx];
                    const p2 = loserCards[teamIdx + 2];
                    let p1Penalty = p1 === '' && defaultVal !== undefined ? defaultVal : Math.round((Number(p1) || 0) * def.multiplier);
                    let p2Penalty = p2 === '' && defaultVal !== undefined ? defaultVal : Math.round((Number(p2) || 0) * def.multiplier);
                    deltas[teamIdx] = p1Penalty + p2Penalty;
                  } else {
                    const p1 = loserCards[teamIdx];
                    deltas[teamIdx] = p1 === '' && defaultVal !== undefined ? defaultVal : Math.round((Number(p1) || 0) * def.multiplier);
                  }
                }

                return match.players.map((player, i) => {
                  const isWinnerPl = i === winner;
                  const val = deltas[i];
                  return (
                    <div key={i} className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-black shadow-sm ${isWinnerPl ? 'border-emerald-500/20 bg-emerald-500/8 text-emerald-700 dark:text-emerald-300 dark:bg-emerald-500/10' : 'border-red-500/20 bg-red-500/8 text-red-700 dark:text-red-400 dark:bg-red-500/10'}`}>
                      <span className="opacity-70 font-semibold">{player}</span>
                      <span className="text-sm">{val > 0 ? `+${val}` : val}</span>
                    </div>
                  );
                });
              })()}
            </div>
          </div>

          {error && (
            <div className="rounded-2xl bg-red-500/10 border border-red-500/20 p-3.5 text-xs font-black text-red-600 dark:text-red-400 text-center animate-shake">
              {error}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col gap-2 pt-1">
            <button
              type="button"
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-[15px] font-black shadow-xl shadow-emerald-600/25 hover:shadow-emerald-500/35 active:scale-[0.97] transition-all duration-200 flex items-center justify-center gap-2"
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
                setWinner(0);
                setKind('normal');
                setLoserCards(new Array(variant === 'partners' ? 4 : match.players.length).fill(''));
              }}
            >
              {en ? 'Cancel' : 'إلغاء'}
            </button>
          </div>
          </div>
        </div>
      )}

      {status.over && (
        <div className="mt-4 space-y-2">
          <div className="card text-center font-bold text-emerald-600 dark:text-emerald-400">
            {en ? 'Winner' : 'الفائز'}: {match.players[status.winner!]} ({wins[status.winner!]} {en ? 'wins' : 'جولات'})
            <div className="mt-1 text-xs font-normal text-slate-500">
              {en ? 'Final score' : 'النقاط النهائية'}: {match.players.map((p, i) => `${p} ${totals[i]}`).join(' • ')}
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

function handKindLabel(kind: HandKind, en: boolean): string {
  if (!en) return HAND_KINDS.find((k) => k.id === kind)?.label ?? kind;
  switch (kind) {
    case 'normal':
      return 'Normal';
    case 'h100':
      return 'Hand 100';
    case 'h150':
      return 'Hand 150';
    case 'h200':
      return 'Hand 200';
  }
}

function kindHelp(kind: HandKind, en: boolean): string {
  switch (kind) {
    case 'normal':
      return en ? 'Normal: winner -20, loser card points x1' : 'عادية: الفائز −20، الخاسر يضاف عليه نقاط الورق ×1';
    case 'h100':
      return en ? 'Hand 100: winner -40, loser card points x1' : 'هند 100: الفائز −40، الخاسر يضاف عليه نقاط الورق ×1';
    case 'h150':
      return en ? 'Hand 150: winner -40, loser card points x1.5' : 'هند 150: الفائز −40، الخاسر يضاف عليه نقاط الورق ×1.5';
    case 'h200':
      return en ? 'Hand 200: winner -40, loser card points x2' : 'هند 200: الفائز −40، الخاسر يضاف عليه نقاط الورق ×2';
  }
}
