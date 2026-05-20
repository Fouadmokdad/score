import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Layout } from '../components/Layout';
import { useMatches } from '../store/matches';
import { useSavedPlayers } from '../store/players';
import { useSettings } from '../store/settings';
import { PlayerAvatar } from '../components/PlayerAvatar';
import { EmptyState } from '../components/EmptyState';
import { Trophy, ChevronDown } from 'lucide-react';
import { getAchievements } from '../utils/achievements';

export default function Trophies() {
  const { matches } = useMatches();
  const { players } = useSavedPlayers();
  const { language } = useSettings();
  const en = language === 'en';

  // Pick the player with most participations as default selected
  const allParticipantNames = useMemo(() => {
    const set = new Set<string>();
    matches.forEach((m) => {
      m.players.forEach((p) => set.add(p));
      if (m.config?.originalNames) m.config.originalNames.forEach((p: string) => set.add(p));
    });
    // Filter out joined team names like "X و Y"
    return Array.from(set).filter((n) => !/ و | & /.test(n));
  }, [matches]);

  const allKnownPlayers = useMemo(() => {
    const set = new Set<string>();
    players.forEach((p) => set.add(p.name));
    allParticipantNames.forEach((n) => set.add(n));
    return Array.from(set).sort();
  }, [players, allParticipantNames]);

  const [selectedPlayer, setSelectedPlayer] = useState(allKnownPlayers[0] ?? '');

  const achievements = useMemo(
    () => (selectedPlayer ? getAchievements(selectedPlayer, matches) : []),
    [selectedPlayer, matches]
  );

  const achievedCount = achievements.filter((a) => a.achieved).length;

  if (allKnownPlayers.length === 0) {
    return (
      <Layout title={en ? 'Trophy Room' : 'غرفة الجوائز'}>
        <EmptyState
          icon={Trophy}
          title={en ? 'No trophies yet' : 'لا توجد جوائز بعد'}
          description={en
            ? 'Play a match and finish it to start unlocking achievements'
            : 'العب وأنهِ مباراة لتبدأ بفتح الإنجازات'}
        />
      </Layout>
    );
  }

  return (
    <Layout title={en ? 'Trophy Room' : 'غرفة الجوائز'}>
      {/* Player picker */}
      <div className="mb-5">
        <label className="label">{en ? 'Player' : 'اللاعب'}</label>
        <div className="relative">
          <select
            value={selectedPlayer}
            onChange={(e) => setSelectedPlayer(e.target.value)}
            className="input appearance-none pr-10 font-bold"
          >
            {allKnownPlayers.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        </div>
      </div>

      {/* Header */}
      <div className="hero-card mb-5 overflow-hidden rounded-3xl p-5 text-white">
        <div className="flex items-center gap-3">
          <PlayerAvatar name={selectedPlayer} size="lg" />
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold uppercase tracking-wider text-white/70">
              {en ? 'Achievements' : 'الإنجازات'}
            </div>
            <div className="text-2xl font-black">{selectedPlayer}</div>
          </div>
          <div className="rounded-2xl bg-white/15 px-4 py-2 text-center backdrop-blur">
            <div className="text-2xl font-black leading-none">
              {achievedCount}/{achievements.length}
            </div>
            <div className="mt-1 text-[9px] font-bold uppercase tracking-wider text-white/80">
              {en ? 'Unlocked' : 'مفتوحة'}
            </div>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {achievements.map((a, idx) => (
          <motion.div
            key={a.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: idx * 0.04 }}
            className={
              'relative flex flex-col items-center rounded-2xl border p-4 text-center transition ' +
              (a.achieved
                ? 'border-amber-300/60 bg-gradient-to-br from-amber-50 to-yellow-100 shadow-md shadow-amber-500/10 dark:border-amber-500/40 dark:from-amber-500/15 dark:to-yellow-500/5'
                : 'border-slate-200 bg-white/60 dark:border-white/10 dark:bg-white/5')
            }
          >
            <div
              className={
                'mb-2 flex h-14 w-14 items-center justify-center rounded-2xl text-3xl transition ' +
                (a.achieved
                  ? 'bg-gradient-to-br from-amber-400 to-yellow-500 shadow-lg shadow-amber-500/30'
                  : 'grayscale opacity-40')
              }
            >
              {a.emoji}
            </div>
            <h4
              className={
                'text-xs font-extrabold leading-tight ' +
                (a.achieved ? 'text-amber-700 dark:text-amber-300' : 'text-slate-500')
              }
            >
              {en ? a.titleEn : a.titleAr}
            </h4>
            <p className="mt-1 text-[10px] leading-tight text-slate-500 dark:text-slate-400">
              {en ? a.descriptionEn : a.descriptionAr}
            </p>

            {/* Progress bar */}
            {!a.achieved && (
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-400 to-yellow-500"
                  style={{ width: `${Math.round(a.progress * 100)}%` }}
                />
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </Layout>
  );
}
