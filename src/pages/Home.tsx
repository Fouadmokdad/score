import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Layout } from '../components/Layout';
import { type GameKind } from '../types';
import { useMatches, computeTotals } from '../store/matches';
import { Spade, Users, Layers, Crown, Heart, Trash2, Sparkles, Plus, ChevronLeft, Gem } from 'lucide-react';
import { copy, gameText } from '../i18n';
import { useSettings } from '../store/settings';
import { PlayerAvatar } from '../components/PlayerAvatar';
import { countHandWins } from '../logic/hand';
import { useConfirm } from '../components/ConfirmDialog';
import { BottomSheet } from '../components/BottomSheet';
import { EmptyState } from '../components/EmptyState';
import { CountUp } from '../components/CountUp';

const ICONS: Record<GameKind, React.ReactNode> = {
  likha: <Spade className="h-7 w-7 drop-shadow-sm" />,
  'hand-solo': <Heart className="h-7 w-7 drop-shadow-sm" />,
  'hand-partners': <Users className="h-7 w-7 drop-shadow-sm" />,
  trix: <Crown className="h-7 w-7 drop-shadow-sm" />,
  'trix-solo': <Crown className="h-7 w-7 drop-shadow-sm" />,
  'trix-partners': <Crown className="h-7 w-7 drop-shadow-sm" />,
  complex: <Layers className="h-7 w-7 drop-shadow-sm" />,
  'complex-solo': <Layers className="h-7 w-7 drop-shadow-sm" />,
  'complex-partners': <Layers className="h-7 w-7 drop-shadow-sm" />,
  tarneeb: <Gem className="h-7 w-7 drop-shadow-sm" />,
  'tarneeb-400': <Spade className="h-7 w-7 drop-shadow-sm" />,
};

const GRADIENTS: Record<GameKind, string> = {
  likha: 'from-[#6366f1] to-[#a855f7]',
  'hand-solo': 'from-[#f43f5e] to-[#fb923c]',
  'hand-partners': 'from-[#f59e0b] to-[#ef4444]',
  trix: 'from-[#0ea5e9] to-[#2563eb]',
  'trix-solo': 'from-[#b91c1c] to-[#ef4444]',
  'trix-partners': 'from-[#991b1b] to-[#dc2626]',
  complex: 'from-[#10b981] to-[#0d9488]',
  'complex-solo': 'from-[#991b1b] to-[#ef4444]',
  'complex-partners': 'from-[#7f1d1d] to-[#dc2626]',
  tarneeb: 'from-[#7c3aed] to-[#db2777]',
  'tarneeb-400': 'from-[#0891b2] to-[#16a34a]',
};

const GAMES: GameKind[] = ['likha', 'hand-solo', 'hand-partners', 'trix-solo', 'trix-partners', 'complex-solo', 'complex-partners', 'tarneeb', 'tarneeb-400'];

const GAME_IMAGES: Partial<Record<GameKind, string>> = {
  likha: '/games/likha.png',
  'hand-solo': '/games/hand.png',
  'hand-partners': '/games/hand-partners.png',
  'trix-solo': '/games/trix.png',
  'trix-partners': '/games/trix.png',
  'complex-solo': '/games/trix-complex.png',
  'complex-partners': '/games/trix-complex.png',
  tarneeb: '/games/tarneeb-400.png',
  'tarneeb-400': '/games/tarneeb-400.png',
};

function GameArt({ game, label }: { game: GameKind; label: string }) {
  const [failed, setFailed] = useState(false);
  const image = GAME_IMAGES[game];

  if (!image || failed) {
    return <>{ICONS[game]}</>;
  }

  return (
    <img
      src={image}
      alt=""
      aria-label={label}
      className="h-full w-full object-contain p-1"
      onError={() => setFailed(true)}
    />
  );
}

export default function Home() {
  const navigate = useNavigate();
  const { matches, deleteMatch } = useMatches();
  const { language } = useSettings();
  const confirm = useConfirm();
  const t = copy[language];
  const en = language === 'en';
  const ongoing = matches.filter((m) => !m.finished).slice(0, 5);
  
  useEffect(() => {
    if (ongoing.length === 1 && !sessionStorage.getItem('auto_resumed')) {
      sessionStorage.setItem('auto_resumed', 'true');
      const m = ongoing[0];
      navigate(`/match/${m.id}/${m.kind}`);
    }
  }, [ongoing, navigate]);

  const [showPicker, setShowPicker] = useState(false);

  return (
    <Layout title={t.appName}>
      <section className="hero-card mb-5 overflow-hidden rounded-3xl p-4 text-white shadow-sm sm:mb-6 sm:p-5 relative">
        {/* Floating card suit decorations */}
        <div className="absolute -right-4 -top-4 text-[80px] font-black text-white/[0.04] pointer-events-none select-none rotate-12">♠</div>
        <div className="absolute -left-2 -bottom-3 text-[60px] font-black text-white/[0.04] pointer-events-none select-none -rotate-12">♥</div>
        <div className="absolute right-12 bottom-1 text-[40px] font-black text-white/[0.04] pointer-events-none select-none rotate-6">♦</div>

        <div className="relative flex items-start justify-between gap-4">
          <div>
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur">
              <Sparkles className="h-3 w-3" /> {t.appName}
            </div>
            <h2 className="text-xl font-black tracking-tight sm:text-2xl">{t.professionalTitle}</h2>
            <p className="mt-1 max-w-md text-xs leading-relaxed text-white/80">{t.professionalSubtitle}</p>
          </div>
          <div className="flex shrink-0 flex-col items-center justify-center rounded-2xl bg-white/10 px-4 py-3 text-center backdrop-blur border border-white/10 shadow-inner">
            <div className="text-2xl font-black leading-none"><CountUp value={matches.length} /></div>
            <div className="mt-1 text-[9px] font-bold uppercase tracking-wider text-white/70">{t.matches}</div>
          </div>
        </div>
      </section>

      {ongoing.length > 0 ? (
        <section className="mb-24">
          <h2 className="mb-3 text-lg font-bold">{t.ongoingMatches}</h2>
          <div className="space-y-4">
            {ongoing.map((m) => {
              const totals = computeTotals(m);
              const matchDate = new Date(m.createdAt);
              const dateStr = language === 'en'
                ? matchDate.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })
                : matchDate.toLocaleDateString('ar-SY-u-nu-latn', { day: 'numeric', month: 'long', year: 'numeric' });

              return (
                <Link
                  key={m.id}
                  to={`/match/${m.id}/${m.kind}`}
                  className={`group relative block overflow-hidden rounded-3xl border border-black/5 dark:border-white/5 bg-white dark:bg-[#1a1915] p-4 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg`}
                >
                  {/* Top row: Game Pill and Date */}
                  <div className="mb-4 flex items-center justify-between">
                    <span className={'rounded-full px-4 py-1.5 text-xs font-bold text-white bg-gradient-to-br shadow-md ' + GRADIENTS[m.kind]}>
                      {gameText[language].labels[m.kind]}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-400">{dateStr}</span>
                  </div>
                  
                  {/* Scores and Players */}
                  {totals.length === 2 && (m.kind.includes('partners') || m.kind === 'tarneeb') ? (() => {
                    // Team layout (Partners)
                    let t1p1, t1p2, t2p1, t2p2;
                    if (m.config?.originalNames && m.config.originalNames.length >= 4) {
                      t1p1 = m.config.originalNames[0];
                      t2p1 = m.config.originalNames[1];
                      t1p2 = m.config.originalNames[2];
                      t2p2 = m.config.originalNames[3];
                    } else {
                      const s1 = m.players[0]?.split(/ و | & /) || [];
                      const s2 = m.players[1]?.split(/ و | & /) || [];
                      t1p1 = s1[0] || 'P1';
                      t1p2 = s1[1] || 'P2';
                      t2p1 = s2[0] || 'P3';
                      t2p2 = s2[1] || 'P4';
                    }

                    // Adjusted diff: each win counts as -100 from effective score
                    const isHand = m.kind === 'hand-partners' || m.kind === 'hand-solo';
                    const wins = isHand ? countHandWins(m.rounds, m.players.length) : [0, 0];
                    const effective0 = totals[0] - wins[0] * 100;
                    const effective1 = totals[1] - wins[1] * 100;
                    const scoreDiff = Math.abs(effective0 - effective1);
                    return (
                      <div className="relative flex items-center justify-between px-1">
                        {/* Team 1 */}
                        <div className="flex flex-1 flex-col items-center gap-2">
                          <div className="flex items-center justify-center -space-x-2 space-x-reverse">
                            <div className="z-10 rounded-full ring-2 ring-white dark:ring-[#1a1915]">
                              <PlayerAvatar name={t1p1} size="sm" />
                            </div>
                            <div className="z-0 rounded-full ring-2 ring-white dark:ring-[#1a1915]">
                              <PlayerAvatar name={t1p2} size="sm" />
                            </div>
                          </div>
                          <div className="text-[10px] font-black text-slate-500 dark:text-slate-400 truncate w-full text-center max-w-[85px]">
                            {m.players[0]}
                          </div>
                          <div className={`mt-0.5 px-3 py-1.5 rounded-2xl text-lg font-black leading-none shadow-sm transition-all border ${
                            totals[0] < 0 
                              ? 'bg-red-500/10 text-red-500 border-red-500/20 dark:bg-red-500/20' 
                              : 'bg-slate-50 text-slate-800 border-slate-200/50 dark:bg-white/[0.03] dark:text-white dark:border-white/[0.05]'
                          }`}>
                            <CountUp value={totals[0]} />
                          </div>
                        </div>
                        
                        {/* Divider + Score Diff */}
                        <div className="relative mx-3 flex flex-col items-center">
                          <div className="h-20 w-[1px] bg-black/5 dark:bg-white/10" />
                          {m.rounds.length > 0 && (
                            <div
                              className={
                                'absolute top-1/2 -translate-y-1/2 flex flex-col items-center justify-center rounded-full border px-2.5 py-1.5 shadow-md backdrop-blur-md min-w-[2.25rem] transition-all ' +
                                (scoreDiff >= 200
                                  ? 'border-red-500/30 bg-red-500/95 text-white'
                                  : scoreDiff >= 100
                                    ? 'border-amber-500/30 bg-amber-500/95 text-white'
                                    : 'border-slate-200/60 bg-white/95 text-slate-600 dark:border-white/10 dark:bg-[#1a1915]/95 dark:text-slate-300')
                              }
                            >
                              <span className="text-[7px] font-black uppercase tracking-wider leading-none opacity-85">{language === 'en' ? 'DIFF' : 'فرق'}</span>
                              <span className="text-[11px] font-black leading-tight mt-0.5">{scoreDiff}</span>
                            </div>
                          )}
                        </div>
                        
                        {/* Team 2 */}
                        <div className="flex flex-1 flex-col items-center gap-2">
                          <div className="flex items-center justify-center -space-x-2 space-x-reverse">
                            <div className="z-10 rounded-full ring-2 ring-white dark:ring-[#1a1915]">
                              <PlayerAvatar name={t2p1} size="sm" />
                            </div>
                            <div className="z-0 rounded-full ring-2 ring-white dark:ring-[#1a1915]">
                              <PlayerAvatar name={t2p2} size="sm" />
                            </div>
                          </div>
                          <div className="text-[10px] font-black text-slate-500 dark:text-slate-400 truncate w-full text-center max-w-[85px]">
                            {m.players[1]}
                          </div>
                          <div className={`mt-0.5 px-3 py-1.5 rounded-2xl text-lg font-black leading-none shadow-sm transition-all border ${
                            totals[1] < 0 
                              ? 'bg-red-500/10 text-red-500 border-red-500/20 dark:bg-red-500/20' 
                              : 'bg-slate-50 text-slate-800 border-slate-200/50 dark:bg-white/[0.03] dark:text-white dark:border-white/[0.05]'
                          }`}>
                            <CountUp value={totals[1]} />
                          </div>
                        </div>
                      </div>
                    );
                  })() : (
                    // Individual layout (Solo, Likha, etc)
                    <div className="flex items-center justify-between gap-2 px-1">
                      {totals.map((tot, idx) => (
                        <div key={idx} className="flex flex-1 flex-col items-center gap-2">
                          <PlayerAvatar name={m.players[idx]} size="sm" />
                          <div className="text-[10px] font-black text-slate-500 dark:text-slate-400 truncate w-full text-center max-w-[70px]">
                            {m.players[idx]}
                          </div>
                          <div className={`mt-0.5 px-2.5 py-1.5 rounded-2xl text-sm font-black leading-none shadow-sm transition-all border ${
                            tot < 0 
                              ? 'bg-red-500/10 text-red-500 border-red-500/20 dark:bg-red-500/20' 
                              : 'bg-slate-50 text-slate-800 border-slate-200/50 dark:bg-white/[0.03] dark:text-white dark:border-white/[0.05]'
                          }`}>
                            <CountUp value={tot} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Bottom: Round count & Arrow */}
                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <ChevronLeft className="h-5 w-5 text-slate-400 transition-colors group-hover:text-slate-800 dark:text-slate-500 dark:group-hover:text-white" />
                      <button
                        onClick={async (e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const ok = await confirm({
                            title: en ? 'Delete match?' : 'حذف المباراة؟',
                            message: en
                              ? 'This match and all of its rounds will be permanently removed.'
                              : 'سيتم حذف المباراة وكل جولاتها بشكل نهائي.',
                            confirmText: en ? 'Delete' : 'حذف',
                            cancelText: en ? 'Cancel' : 'إلغاء',
                            tone: 'danger',
                          });
                          if (ok) deleteMatch(m.id);
                        }}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500/10 text-red-500 transition-all hover:bg-red-500 hover:text-white"
                        aria-label="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <span className="text-xs font-medium text-slate-500">{language === 'en' ? 'Rounds: ' : 'جولة: '}{m.rounds.length}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      ) : (
        <EmptyState
          icon={Layers}
          title={language === 'en' ? 'No ongoing games' : 'لا توجد مباريات جارية'}
          description={language === 'en' ? 'Start a new match and it will stay here until it is finished.' : 'ابدأ مباراة جديدة وستبقى هنا حتى تنتهي.'}
          action={{ label: language === 'en' ? 'New Game' : 'لعبة جديدة', onClick: () => setShowPicker(true) }}
        />
      )}

      {/* Floating Action Button */}
      <div className="fixed bottom-24 left-1/2 z-40 -translate-x-1/2">
        <motion.button
          onClick={() => setShowPicker(true)}
          className="btn-primary flex items-center gap-2 rounded-full px-8 py-4 text-lg font-bold shadow-xl shadow-[rgba(var(--accent),0.3)] transition-transform hover:scale-105 active:scale-95"
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.94 }}
          animate={{ scale: showPicker ? 0.92 : 1 }}
          transition={{ type: 'spring', stiffness: 420, damping: 24 }}
        >
          <Plus className="h-5 w-5" /> {language === 'en' ? 'New Game' : 'لعبة جديدة'}
        </motion.button>
      </div>

      <BottomSheet
        open={showPicker}
        onClose={() => setShowPicker(false)}
        title={language === 'en' ? 'Choose your game' : 'اختر لعبتك'}
      >
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {GAMES.map((g) => (
            <button
              key={g}
              onClick={() => navigate(`/new/${g}`)}
              className="group relative flex w-full flex-col items-stretch overflow-hidden rounded-[1.5rem] border border-white/[0.08] bg-white shadow-md shadow-black/8 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/14 active:scale-[0.96] dark:bg-[#1c1b18]"
            >
              {/* Image / Icon Panel */}
              <div className={'relative flex h-24 w-full shrink-0 items-center justify-center overflow-hidden bg-gradient-to-br text-white ' + GRADIENTS[g]}>
                {/* Shimmer overlay */}
                <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/10 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                {/* Inner glow bottom */}
                <div className="absolute bottom-0 inset-x-0 h-8 bg-gradient-to-t from-black/20 to-transparent" />
                <div className="relative z-10 drop-shadow-lg scale-110 group-hover:scale-125 transition-transform duration-300">
                  <GameArt game={g} label={gameText[language].labels[g]} />
                </div>
              </div>

              {/* Label */}
              <div className="flex items-center justify-center px-2 py-3">
                <span className="text-center text-[13px] font-black leading-tight text-slate-800 dark:text-slate-100">
                  {gameText[language].labels[g]}
                </span>
              </div>

              {/* Bottom accent line matching gradient */}
              <div className={'absolute bottom-0 inset-x-0 h-[2.5px] bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity duration-300 ' + GRADIENTS[g]} />
            </button>
          ))}
        </div>
      </BottomSheet>
    </Layout>
  );
}
