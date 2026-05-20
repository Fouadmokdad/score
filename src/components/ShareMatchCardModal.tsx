import { useState, useMemo } from 'react';
import { X, Share2, Download, Trophy, Calendar, Sparkles } from 'lucide-react';
import { useMatches, computeTotals } from '../store/matches';
import { calculateEloData } from '../utils/elo';
import { PlayerAvatar } from './PlayerAvatar';
import { useSettings } from '../store/settings';
import { shareElementAsImage } from '../utils/share';
import { playHaptic } from '../utils/haptics';
import { ImpactStyle } from '@capacitor/haptics';
import { GAME_LABELS } from '../types';

interface Props {
  matchId: string;
  onClose: () => void;
}

export function ShareMatchCardModal({ matchId, onClose }: Props) {
  const { matches } = useMatches();
  const { language } = useSettings();
  const en = language === 'en';

  const match = useMemo(() => matches.find((m) => m.id === matchId), [matches, matchId]);
  const [sharing, setSharing] = useState(false);

  // Compute stats for the share card
  const cardData = useMemo(() => {
    if (!match) return null;

    const totals = computeTotals(match);
    const lowerIsBetter = match.kind === 'likha' || match.kind === 'hand-solo' || match.kind === 'hand-partners';
    const best = lowerIsBetter ? Math.min(...totals) : Math.max(...totals);
    const winnerIdx = totals.indexOf(best);
    const winnerName = match.players[winnerIdx];

    // Compute dynamic ELO deltas from our central utility
    const eloData = calculateEloData(matches);
    const playerEloDeltas = match.players.map((p, i) => {
      const clean = p.trim();
      const pData = eloData[clean];
      const pt = pData?.history.find((h) => h.matchId === match.id);
      return {
        name: clean,
        score: totals[i],
        delta: pt ? pt.delta : 0,
        elo: pt ? pt.elo : 1000,
        isWinner: i === winnerIdx,
      };
    });

    // Sort players by standing (winner first)
    const standings = [...playerEloDeltas].sort((a, b) => {
      if (a.isWinner) return -1;
      if (b.isWinner) return 1;
      return lowerIsBetter ? a.score - b.score : b.score - a.score;
    });

    const matchDate = new Date(match.createdAt);
    const dateStr = en
      ? matchDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : matchDate.toLocaleDateString('ar-SY-u-nu-latn', { month: 'short', day: 'numeric', year: 'numeric' });

    return {
      winnerName,
      standings,
      dateStr,
      gameLabel: en
        ? match.kind.replace('-', ' ').toUpperCase()
        : GAME_LABELS[match.kind] || match.kind,
    };
  }, [match, matches, en]);

  if (!match || !cardData) return null;

  const handleShare = async () => {
    setSharing(true);
    playHaptic(ImpactStyle.Medium);
    const success = await shareElementAsImage('premium-share-card-canvas', `victory_${matchId.slice(0,6)}.png`);
    setSharing(false);
    if (success) {
      playHaptic(ImpactStyle.Heavy);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex flex-col items-center justify-center p-4 overflow-y-auto">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/75 backdrop-blur-md animate-in fade-in-0 duration-200" onClick={onClose} />

      {/* Modal Dialog container */}
      <div className="relative z-10 w-full max-w-sm flex flex-col items-center">
        
        {/* Story Card Wrapper (This part is screenshotted) */}
        <div
          id="premium-share-card-canvas"
          className="relative w-full aspect-[9/16] rounded-[2.5rem] p-6 text-white flex flex-col justify-between overflow-hidden shadow-2xl select-none"
          style={{
            background: 'linear-gradient(180deg, #09090b 0%, #111116 35%, #050508 100%)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
            width: '100%',
            maxWidth: '350px',
            height: '622px'
          }}
        >
          {/* Card Suit floating decorations */}
          <div className="absolute -left-12 -top-12 text-[120px] font-black text-white/[0.02] pointer-events-none rotate-12">♥️</div>
          <div className="absolute -right-12 top-1/3 text-[140px] font-black text-white/[0.015] pointer-events-none -rotate-12">♠️</div>
          <div className="absolute left-1/3 bottom-12 text-[100px] font-black text-white/[0.02] pointer-events-none rotate-45">♦️</div>
          <div className="absolute right-0 -bottom-8 text-[120px] font-black text-white/[0.01] pointer-events-none rotate-12">♣️</div>

          {/* Premium overlay neon glows */}
          <div className="absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-amber-500/10 to-transparent pointer-events-none blur-3xl rounded-full" />
          <div className="absolute bottom-0 inset-x-0 h-32 bg-gradient-to-t from-emerald-500/5 to-transparent pointer-events-none blur-2xl" />

          {/* Card Header */}
          <div className="relative z-10 flex flex-col items-center">
            <div className="flex items-center gap-1 bg-white/5 border border-white/10 px-3 py-1 rounded-full text-[10px] font-black tracking-widest text-amber-400 uppercase">
              <Sparkles className="h-3 w-3 animate-pulse" />
              <span>{cardData.gameLabel}</span>
            </div>
            
            <div className="mt-2.5 flex items-center gap-1.5 text-[10px] font-semibold text-slate-400">
              <Calendar className="h-3.5 w-3.5" />
              <span>{cardData.dateStr}</span>
            </div>
          </div>

          {/* Card Center: Winner Crown and Avatar */}
          <div className="relative z-10 flex flex-col items-center my-auto">
            {/* Crown and Avatar Ring */}
            <div className="relative">
              <div className="absolute -top-11 left-1/2 -translate-x-1/2 z-20 drop-shadow-[0_4px_10px_rgba(245,158,11,0.5)] animate-bounce duration-1000">
                <Trophy className="h-10 w-10 text-amber-400 fill-amber-400" />
              </div>
              <div className="absolute inset-0 rounded-full bg-amber-400/25 blur-xl animate-pulse" />
              
              <div className="relative rounded-full ring-4 ring-amber-400 p-1 bg-gradient-to-br from-amber-400 to-yellow-600 shadow-[0_0_25px_rgba(245,158,11,0.35)]">
                <PlayerAvatar name={cardData.winnerName} size="lg" className="scale-110" />
              </div>
            </div>

            {/* Winner Text details */}
            <h2 className="mt-5 text-2xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 text-center uppercase">
              {en ? 'VICTORY' : 'انتصار ساحق'}
            </h2>
            <div className="mt-1.5 text-lg font-black text-white text-center">
              {cardData.winnerName}
            </div>
            
            {/* Calculated ELO display */}
            {(() => {
              const winStat = cardData.standings.find(s => s.name === cardData.winnerName);
              if (!winStat) return null;
              return (
                <div className="mt-2.5 flex items-center gap-2 bg-emerald-500/15 border border-emerald-500/20 px-3.5 py-1.5 rounded-2xl">
                  <span className="text-xs font-black text-emerald-400">
                    +{winStat.delta} ELO
                  </span>
                  <span className="h-3 w-px bg-emerald-500/30" />
                  <span className="text-[10px] font-black text-slate-400 tracking-wider">
                    {winStat.elo} {en ? 'RATING' : 'تصنيف'}
                  </span>
                </div>
              );
            })()}
          </div>

          {/* Card Footer: Final standings */}
          <div className="relative z-10 w-full bg-white/[0.03] border border-white/5 p-4 rounded-3xl backdrop-blur-md">
            <h4 className="text-[9px] font-bold text-slate-400 tracking-wider uppercase mb-3 text-center">
              {en ? 'Final Leaderboard' : 'الترتيب النهائي للمباراة'}
            </h4>
            
            <div className="space-y-2.5">
              {cardData.standings.map((p, idx) => (
                <div key={p.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-black w-3.5 text-center ${p.isWinner ? 'text-amber-400' : 'text-slate-500'}`}>
                      {idx + 1}
                    </span>
                    <PlayerAvatar name={p.name} size="sm" />
                    <span className={`font-bold ${p.isWinner ? 'text-amber-300' : 'text-slate-300'} truncate max-w-[6.5rem]`}>
                      {p.name}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <span className="font-extrabold text-slate-100">
                      {p.score}
                    </span>
                    <span className={`font-bold text-[10px] w-12 text-end ${p.delta > 0 ? 'text-emerald-400' : p.delta < 0 ? 'text-red-400' : 'text-slate-400'}`}>
                      {p.delta > 0 ? `+${p.delta}` : p.delta} ELO
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tiny Brand Footer */}
          <div className="relative z-10 text-center text-[8px] font-bold tracking-widest text-slate-500 uppercase mt-2">
            ♠  ♥  {en ? 'Score Card Calculator' : 'حاسبة نقاط الكوتشينة'}  ♦  ♣
          </div>
        </div>

        {/* Action Controls for Sharing */}
        <div className="mt-5 w-full flex items-center justify-between gap-3">
          <button
            onClick={handleShare}
            disabled={sharing}
            className="btn-primary flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 rounded-2xl shadow-xl hover:scale-105 active:scale-95 transition"
          >
            {sharing ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>{en ? 'Generating...' : 'جاري التحميل...'}</span>
              </>
            ) : (
              <>
                <Share2 className="h-4.5 w-4.5" />
                <span>{en ? 'Share Story Card' : 'نشر كحالة / قصة'}</span>
              </>
            )}
          </button>
          
          <button
            onClick={onClose}
            className="btn-secondary py-3 px-4 rounded-2xl hover:scale-105 active:scale-95 transition"
            aria-label="Close"
          >
            <X className="h-4.5 w-4.5 text-slate-500 dark:text-slate-300" />
          </button>
        </div>
      </div>
    </div>
  );
}
