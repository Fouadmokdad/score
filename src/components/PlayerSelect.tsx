import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronDown, Search } from 'lucide-react';
import { PlayerAvatar } from './PlayerAvatar';
import { useMatches } from '../store/matches';
import { calculateEloData } from '../utils/elo';
import { useSettings } from '../store/settings';
import { playHaptic } from '../utils/haptics';
import { ImpactStyle } from '@capacitor/haptics';

interface Props {
  value: string;
  onChange: (value: string) => void;
  allPlayers: string[];
  label?: string;
  exclude?: string;
}

export function PlayerSelect({ value, onChange, allPlayers, label, exclude }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const { language } = useSettings();
  const { matches } = useMatches();
  const en = language === 'en';

  // Get current player's ELO to display next to their name if desired
  const eloData = useMemo(() => calculateEloData(matches), [matches]);

  const filteredPlayers = useMemo(() => {
    return allPlayers
      .filter((p) => {
        const clean = p.trim().toLowerCase();
        const query = search.trim().toLowerCase();
        const matchesQuery = clean.includes(query);
        const notExcluded = exclude ? clean !== exclude.trim().toLowerCase() : true;
        return matchesQuery && notExcluded;
      })
      .sort((a, b) => {
        // Sort alphabetically or by ELO
        const eloA = eloData[a]?.elo ?? 1000;
        const eloB = eloData[b]?.elo ?? 1000;
        return eloB - eloA; // Higher ELO first
      });
  }, [allPlayers, search, exclude, eloData]);

  const handleOpen = () => {
    playHaptic(ImpactStyle.Light);
    setSearch('');
    setIsOpen(true);
  };

  const handleSelect = (name: string) => {
    playHaptic(ImpactStyle.Medium);
    onChange(name);
    setIsOpen(false);
  };

  const handleClose = () => {
    playHaptic(ImpactStyle.Light);
    setIsOpen(false);
  };

  const currentElo = eloData[value]?.elo ?? 1000;

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={handleOpen}
        type="button"
        className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-white/40 dark:bg-black/20 border border-black/5 dark:border-white/5 shadow-sm hover:bg-white/50 dark:hover:bg-black/25 active:scale-[0.98] transition-all duration-150 text-left rtl:text-right"
      >
        <div className="flex items-center gap-3 min-w-0">
          <PlayerAvatar name={value} size="sm" />
          <div className="min-w-0">
            <div className="font-black text-sm text-slate-800 dark:text-white truncate">
              {value}
            </div>
            <div className="text-[10px] font-extrabold text-amber-500/80 dark:text-amber-400/80 mt-0.5">
              ⭐ {currentElo} ELO
            </div>
          </div>
        </div>
        <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
      </button>

      {/* Custom BottomSheet Modal Dropdown */}
      {isOpen && createPortal(
        <div className="fixed inset-0 z-[115] flex items-end sm:items-center justify-center p-0 sm:p-4">
          {/* Backdrop blur overlay */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in-0 duration-200"
            onClick={handleClose}
          />

          {/* Dialog Body Container */}
          <div className="relative z-10 w-full sm:max-w-sm rounded-t-[32px] sm:rounded-[32px] bg-white/80 dark:bg-slate-900/80 border-t sm:border border-white/20 dark:border-white/10 backdrop-blur-xl p-6 shadow-2xl flex flex-col max-h-[85vh] sm:max-h-[75vh] animate-in slide-in-from-bottom-10 sm:zoom-in-95 duration-200">
            
            {/* Grab handle for bottom sheet on mobile */}
            <div className="w-12 h-1.5 bg-black/10 dark:bg-white/10 rounded-full mx-auto mb-4 sm:hidden shrink-0" />

            {/* Header section */}
            <div className="flex items-center justify-between mb-4 shrink-0">
              <h3 className="text-base font-black text-slate-800 dark:text-white">
                {label || (en ? 'Select Player' : 'اختر اللاعب')}
              </h3>
              <button
                onClick={handleClose}
                className="p-1.5 rounded-full bg-black/5 dark:bg-white/5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Search Input bar */}
            <div className="relative mb-4 shrink-0">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={en ? 'Search player...' : 'ابحث عن لاعب...'}
                className="w-full bg-black/5 dark:bg-black/25 text-sm font-bold text-slate-800 dark:text-white pl-10 pr-4 py-2.5 rounded-2xl border border-transparent focus:border-[rgba(var(--accent),0.3)] focus:bg-white/40 dark:focus:bg-black/40 focus:outline-none transition-all duration-150"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400 hover:text-slate-600"
                >
                  {en ? 'Clear' : 'مسح'}
                </button>
              )}
            </div>

            {/* Scrollable list options */}
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 -mr-1">
              {filteredPlayers.length === 0 ? (
                <div className="text-center py-8 text-xs font-extrabold text-slate-400">
                  {en ? 'No players found' : 'لم يتم العثور على لاعبين'}
                </div>
              ) : (
                filteredPlayers.map((name) => {
                  const isSelected = name.trim().toLowerCase() === value.trim().toLowerCase();
                  const pElo = eloData[name]?.elo ?? 1000;
                  
                  return (
                    <button
                      key={name}
                      onClick={() => handleSelect(name)}
                      className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-2xl transition-all duration-150 text-left rtl:text-right border ${
                        isSelected
                          ? 'bg-[rgba(var(--accent),0.15)] border-[rgba(var(--accent),0.2)] dark:bg-[rgba(var(--accent),0.2)] dark:border-[rgba(var(--accent),0.3)]'
                          : 'bg-black/5 border-transparent hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <PlayerAvatar name={name} size="sm" />
                        <div className="min-w-0">
                          <div className={`font-black text-sm truncate ${
                            isSelected ? 'text-[rgb(var(--accent))] dark:text-[rgb(var(--accent-dark))]' : 'text-slate-800 dark:text-white'
                          }`}>
                            {name}
                          </div>
                          <div className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 mt-0.5">
                            ⭐ {pElo} ELO
                          </div>
                        </div>
                      </div>

                      {/* Selected Custom Bullet */}
                      <div className={`h-5 w-5 rounded-full flex items-center justify-center border shrink-0 ${
                        isSelected
                          ? 'border-[rgb(var(--accent))] bg-[rgb(var(--accent))] text-white'
                          : 'border-slate-300 dark:border-slate-700'
                      }`}>
                        {isSelected && (
                          <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
