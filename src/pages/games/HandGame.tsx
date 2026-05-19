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
  HAND_ROUNDS_TO_WIN,
  calcHandRound,
  countHandWins,
  isHandMatchOver,
  type HandKind,
} from '../../logic/hand';
import { Plus, Undo2, Flag, Trophy, CalendarDays } from 'lucide-react';
import { copy, gameText } from '../../i18n';
import { useSettings } from '../../store/settings';
import { ShareButton } from '../../components/ShareButton';

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

  const title =
    gameText[language].labels[variant === 'solo' ? 'hand-solo' : 'hand-partners'] +
    ` • ${HAND_ROUNDS_TO_WIN}/${HAND_MAX_ROUNDS}`;

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
        <div className="card mt-4 space-y-3">
          <h3 className="font-bold">{en ? 'New round' : 'جولة جديدة'}</h3>

          <div>
            <label className="label mb-2">{en ? 'Round winner' : variant === 'partners' ? 'الفريق الفائز بهذه الجولة' : 'الفائز بهذه الجولة'}</label>
            <div className="grid grid-cols-2 gap-3">
              {match.players.map((p, i) => (
                <button
                  key={i}
                  className={
                    'flex min-h-[3rem] items-center justify-center truncate rounded-2xl border px-3 py-2 text-sm font-bold transition ' +
                    (winner === i
                      ? 'border-emerald-600 bg-emerald-600/90 text-white shadow-md shadow-emerald-900/20'
                      : 'border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10')
                  }
                  onClick={() => setWinner(i)}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label mb-2 mt-4">{en ? 'Round type' : 'نوع الجولة'}</label>
            <div className="grid grid-cols-2 gap-3">
              {HAND_KINDS.map((k) => (
                <button
                  key={k.id}
                  className={
                    'flex min-h-[3rem] items-center justify-center rounded-2xl border px-3 py-2 text-sm font-bold transition ' +
                    (kind === k.id
                      ? 'border-blue-600 bg-blue-600/90 text-white shadow-md shadow-blue-900/20'
                      : 'border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10')
                  }
                  onClick={() => setKind(k.id)}
                >
                  {handKindLabel(k.id, en)}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-slate-500">
              {kindHelp(kind, en)}
            </p>
          </div>

          <div>
            <label className="label mb-2 mt-4">{en ? 'Card points this round' : 'نقاط الورق هذه الجولة'}</label>
            <div className={isPartners ? "grid grid-cols-1 gap-3" : "grid grid-cols-2 gap-3"}>
              {isPartners ? (
                // Only show inputs for the losing team
                [0, 1].map(teamIdx => teamIdx !== winner && (
                  <div key={teamIdx} className="flex flex-col gap-3 rounded-xl border border-blue-200 bg-blue-50/50 p-3 dark:border-blue-900/30 dark:bg-blue-900/10">
                    <div className="truncate px-1 text-center text-xs font-bold text-slate-500">{match.players[teamIdx]}</div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1">
                        <div className="truncate px-1 text-center text-xs font-semibold text-slate-600 dark:text-slate-300">{originalNames[teamIdx]}</div>
                        <input
                          type="number"
                          inputMode="numeric"
                          min={0}
                          className="input h-12 text-center text-lg font-bold placeholder:text-slate-300 dark:bg-[#1a1915] dark:placeholder:text-slate-700"
                          placeholder="0"
                          value={loserCards[teamIdx] ?? ''}
                          onChange={(e) => {
                            const next = [...loserCards];
                            next[teamIdx] = e.target.value === '' ? '' : String(Math.max(0, Number(e.target.value) || 0));
                            setLoserCards(next);
                          }}
                        />
                      </div>
                      
                      <div className="flex flex-col gap-1">
                        <div className="truncate px-1 text-center text-xs font-semibold text-slate-600 dark:text-slate-300">{originalNames[teamIdx + 2]}</div>
                        <input
                          type="number"
                          inputMode="numeric"
                          min={0}
                          className="input h-12 text-center text-lg font-bold placeholder:text-slate-300 dark:bg-[#1a1915] dark:placeholder:text-slate-700"
                          placeholder="0"
                          value={loserCards[teamIdx + 2] ?? ''}
                          onChange={(e) => {
                            const next = [...loserCards];
                            next[teamIdx + 2] = e.target.value === '' ? '' : String(Math.max(0, Number(e.target.value) || 0));
                            setLoserCards(next);
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                match.players.map((p, i) => i !== winner && (
                  <div key={i} className="flex flex-col">
                    <div className="mb-1 truncate px-1 text-xs font-semibold text-slate-500">{p}</div>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      className="input h-12 text-center text-lg font-bold placeholder:text-slate-300 dark:bg-[#1a1915] dark:placeholder:text-slate-700"
                      placeholder="0"
                      value={loserCards[i] ?? ''}
                      onChange={(e) => {
                        const next = [...loserCards];
                        next[i] = e.target.value === '' ? '' : String(Math.max(0, Number(e.target.value) || 0));
                        setLoserCards(next);
                      }}
                    />
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Live preview */}
          <div className="rounded-xl border border-dashed border-slate-300 p-2 text-xs dark:border-slate-700">
            {en ? 'Preview:' : 'معاينة:'}{' '}
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

              return match.players
                .map((player, i) => `${player}: ${deltas[i] > 0 ? '+' : ''}${deltas[i]}`)
                .join(' • ');
            })()}
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
                setWinner(0);
                setKind('normal');
                setLoserCards(new Array(variant === 'partners' ? 4 : match.players.length).fill(''));
              }}
            >
              {en ? 'Cancel' : 'إلغاء'}
            </button>
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
          <button className="btn-primary w-full" onClick={finish}>
            <Flag className="h-4 w-4" /> {en ? 'Finish match' : 'إنهاء المباراة'}
          </button>
        </div>
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
