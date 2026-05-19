import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { type GameKind } from '../types';
import { useMatches, computeTotals } from '../store/matches';
import { Spade, Trophy, Users, Layers, Crown, Heart, Trash2, Sparkles, Plus, X, ChevronLeft } from 'lucide-react';
import { copy, gameText } from '../i18n';
import { useSettings } from '../store/settings';
import { PlayerAvatarGroup, PlayerAvatar } from '../components/PlayerAvatar';
import { countHandWins } from '../logic/hand';
import { useConfirm } from '../components/ConfirmDialog';

const ICONS: Record<GameKind, React.ReactNode> = {
  likha: <Spade className="h-7 w-7 drop-shadow-sm" />,
  'hand-solo': <Heart className="h-7 w-7 drop-shadow-sm" />,
  'hand-partners': <Users className="h-7 w-7 drop-shadow-sm" />,
  trix: <Crown className="h-7 w-7 drop-shadow-sm" />,
  complex: <Layers className="h-7 w-7 drop-shadow-sm" />,
};

const GRADIENTS: Record<GameKind, string> = {
  likha: 'from-[#6366f1] to-[#a855f7]',
  'hand-solo': 'from-[#f43f5e] to-[#fb923c]',
  'hand-partners': 'from-[#f59e0b] to-[#ef4444]',
  trix: 'from-[#0ea5e9] to-[#2563eb]',
  complex: 'from-[#10b981] to-[#0d9488]',
};

const GAMES: GameKind[] = ['likha', 'hand-solo', 'hand-partners'];

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
      <section className="hero-card mb-5 overflow-hidden rounded-3xl p-4 text-white shadow-sm sm:mb-6 sm:p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur">
              <Sparkles className="h-3 w-3" /> {t.appName}
            </div>
            <h2 className="text-xl font-black tracking-tight sm:text-2xl">{t.professionalTitle}</h2>
            <p className="mt-1 max-w-md text-xs leading-relaxed text-white/80">{t.professionalSubtitle}</p>
          </div>
          <div className="flex shrink-0 flex-col items-center justify-center rounded-2xl bg-white/10 px-3 py-2 text-center backdrop-blur border border-white/10">
            <div className="text-xl font-black leading-none">{matches.length}</div>
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
                  className="group relative block overflow-hidden rounded-3xl border border-black/5 dark:border-white/5 bg-white dark:bg-[#1a1915] p-4 shadow-sm transition-transform hover:-translate-y-1 hover:shadow-md"
                >
                  {/* Top row: Date and Game Pill */}
                  <div className="mb-4 flex items-center justify-between">
                    <span className="text-[10px] font-semibold text-slate-500">{dateStr}</span>
                    <span className={'rounded-full px-4 py-1 text-xs font-bold text-white bg-gradient-to-br shadow-inner ' + GRADIENTS[m.kind]}>
                      {gameText[language].labels[m.kind]}
                    </span>
                  </div>
                  
                  {/* Scores and Players */}
                  {totals.length === 2 ? (() => {
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
                        <div className="flex flex-1 flex-col items-center">
                          <div className={"text-3xl font-black mb-2 " + (totals[0] < 0 ? 'text-red-500' : 'text-slate-800 dark:text-white')}>{totals[0]}</div>
                          <div className="flex items-center justify-center -space-x-2 space-x-reverse">
                            <div className="z-10 rounded-full ring-2 ring-white dark:ring-[#1a1915]">
                              <PlayerAvatar name={t1p1} size="sm" />
                            </div>
                            <div className="z-0 rounded-full ring-2 ring-white dark:ring-[#1a1915]">
                              <PlayerAvatar name={t1p2} size="sm" />
                            </div>
                          </div>
                          <div className="mt-1.5 text-[10px] font-bold text-slate-500 dark:text-slate-400 truncate w-full text-center">
                            {m.players[0]}
                          </div>
                        </div>
                        
                        {/* Divider + Score Diff */}
                        <div className="relative mx-2 flex flex-col items-center">
                          <div className="h-16 w-[1px] bg-black/5 dark:bg-white/10" />
                          {m.rounds.length > 0 && (
                            <div
                              className={
                                'absolute top-1/2 -translate-y-1/2 flex flex-col items-center justify-center rounded-lg border-2 px-1.5 py-0.5 shadow-md backdrop-blur-sm min-w-[2rem] ' +
                                (scoreDiff >= 200
                                  ? 'border-red-400 bg-red-500/90 text-white'
                                  : scoreDiff >= 100
                                    ? 'border-amber-400 bg-amber-500/90 text-white'
                                    : 'border-slate-200 bg-white/95 text-slate-600 dark:border-white/15 dark:bg-[#1a1915]/95 dark:text-slate-300')
                              }
                            >
                              <span className="text-[7px] font-bold uppercase leading-none opacity-70">{language === 'en' ? 'DIFF' : 'فرق'}</span>
                              <span className="text-xs font-black leading-tight">{scoreDiff}</span>
                            </div>
                          )}
                        </div>
                        
                        {/* Team 2 */}
                        <div className="flex flex-1 flex-col items-center">
                          <div className={"text-3xl font-black mb-2 " + (totals[1] < 0 ? 'text-red-500' : 'text-slate-800 dark:text-white')}>{totals[1]}</div>
                          <div className="flex items-center justify-center -space-x-2 space-x-reverse">
                            <div className="z-10 rounded-full ring-2 ring-white dark:ring-[#1a1915]">
                              <PlayerAvatar name={t2p1} size="sm" />
                            </div>
                            <div className="z-0 rounded-full ring-2 ring-white dark:ring-[#1a1915]">
                              <PlayerAvatar name={t2p2} size="sm" />
                            </div>
                          </div>
                          <div className="mt-1.5 text-[10px] font-bold text-slate-500 dark:text-slate-400 truncate w-full text-center">
                            {m.players[1]}
                          </div>
                        </div>
                      </div>
                    );
                  })() : (
                    // Individual layout (Solo, Likha, etc)
                    <div className="flex items-center justify-between gap-1">
                      {totals.map((tot, idx) => (
                        <div key={idx} className="flex flex-1 flex-col items-center">
                          <div className={"text-xl font-black mb-2 " + (tot < 0 ? 'text-red-500' : 'text-slate-800 dark:text-white')}>{tot}</div>
                          <PlayerAvatar name={m.players[idx]} size="sm" />
                          <div className="mt-1.5 text-[10px] font-bold text-slate-500 dark:text-slate-400 truncate w-full text-center">
                            {m.players[idx]}
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
        <div className="flex flex-col items-center justify-center py-12 text-center opacity-60">
          <Layers className="mb-4 h-12 w-12 text-slate-400" />
          <p>{language === 'en' ? 'No ongoing games' : 'لا توجد مباريات جارية'}</p>
        </div>
      )}

      {/* Floating Action Button */}
      <div className="fixed bottom-24 left-1/2 z-40 -translate-x-1/2">
        <button
          onClick={() => setShowPicker(true)}
          className="btn-primary flex items-center gap-2 rounded-full px-8 py-4 text-lg font-bold shadow-xl shadow-emerald-500/30 transition-transform hover:scale-105 active:scale-95"
        >
          <Plus className="h-5 w-5" /> {language === 'en' ? 'New Game' : 'لعبة جديدة'}
        </button>
      </div>

      {/* Game Picker Modal */}
      {showPicker && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end p-0 sm:items-center sm:justify-center sm:p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowPicker(false)} />
          <div className="relative w-full max-w-md animate-in slide-in-from-bottom-full rounded-t-[2rem] bg-[#F9F6EE] dark:bg-[#1a1915] p-5 pb-10 shadow-2xl sm:rounded-[2rem] sm:pb-6 sm:zoom-in-95 border border-black/5 dark:border-white/5">
            {/* Drag Handle */}
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-black/10 dark:bg-white/10" />
            
            <div className="mb-6 text-center">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">{language === 'en' ? 'Choose your game' : 'اختر لعبتك'}</h3>
            </div>
            
            <div className="flex flex-col gap-3">
              {GAMES.map((g) => {
                const gameImages: Record<string, string> = {
                  'hand-solo': '/games/hand.png',
                  'hand-partners': '/games/hand-partners.png',
                  'likha': '/games/likha.png'
                };
                const hasImg = !!gameImages[g];

                return (
                  <button
                    key={g}
                    onClick={() => navigate(`/new/${g}`)}
                    className="group flex w-full items-center gap-4 overflow-hidden rounded-[1.25rem] border border-black/5 dark:border-white/10 bg-white dark:bg-white/5 p-2.5 text-slate-800 dark:text-white shadow-sm transition-colors hover:bg-slate-50 dark:hover:bg-white/10 active:scale-[0.98]"
                  >
                    <div className={'flex h-14 w-14 shrink-0 items-center justify-center rounded-xl shadow-inner text-white overflow-hidden ' + (hasImg ? '' : `bg-gradient-to-br ${GRADIENTS[g]}`)}>
                      {hasImg ? (
                        <img src={gameImages[g]} alt={gameText[language].labels[g]} className="h-full w-full object-cover" />
                      ) : (
                        ICONS[g]
                      )}
                    </div>
                    
                    <span className="flex-1 text-start text-lg font-bold">{gameText[language].labels[g]}</span>
                    
                    <ChevronLeft className={"mr-2 h-5 w-5 text-slate-400 dark:text-white/50 transition-transform " + (language === 'en' ? 'rotate-180' : '')} />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
