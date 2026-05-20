import { useEffect, useState } from 'react';
import { Plus, X, UserPlus, Pencil } from 'lucide-react';
import { copy } from '../i18n';
import { useSavedPlayers, AVATARS } from '../store/players';
import { useSettings } from '../store/settings';
import { PlayerAvatar } from './PlayerAvatar';
import { AvatarPickerModal } from './AvatarPickerModal';

interface Props {
  count: number;
  initial?: string[];
  labels?: string[];
  onSubmit: (names: string[]) => void;
  submitLabel?: string;
  extra?: React.ReactNode;
}

export function PlayerSetup({ count, initial, labels, onSubmit, submitLabel, extra }: Props) {
  const { language } = useSettings();
  const t = copy[language];
  const en = language === 'en';
  const { players, addPlayer, addPlayers, removePlayer, updatePlayer } = useSavedPlayers();
  const [activeSlot, setActiveSlot] = useState(0);
  const [pickerSlot, setPickerSlot] = useState<number | null>(null);
  const [avatarPickerFor, setAvatarPickerFor] = useState<string | null>(null);
  const [newPlayer, setNewPlayer] = useState('');
  const [names, setNames] = useState<string[]>(initial ?? Array.from({ length: count }, () => ''));

  useEffect(() => {
    if (initial) return;
    setNames((current) => Array.from({ length: count }, (_, i) => current[i] ?? ''));
    setActiveSlot((slot) => Math.min(slot, count - 1));
  }, [count, initial]);

  const setAt = (i: number, v: string) => {
    const next = [...names];
    next[i] = v;
    setNames(next);
    setPickerSlot(null);
  };

  const fallbackName = (i: number) => `${t.player} ${i + 1}`;
  const saveNewPlayer = () => {
    const trimmed = newPlayer.trim();
    if (!trimmed) return;
    addPlayer(trimmed);
    setNewPlayer('');
  };

  /** Check if we're in partners mode (4 players with team labels) */
  const isPartners = labels && count === 4;

  /** Group players by team for partners mode */
  const renderPlayerRow = (index: number) => {
    const isActive = activeSlot === index;
    return (
      <div key={index} className="space-y-2">
        {/* Player row */}
        <div
          className={
            'flex items-center gap-3 rounded-2xl border px-3 py-2.5 transition-all duration-200 ' +
            (isActive
              ? 'border-emerald-500/60 bg-emerald-500/5 ring-2 ring-emerald-500/20 dark:bg-emerald-500/5'
              : 'border-slate-300/60 bg-white/60 dark:border-white/10 dark:bg-white/[0.03]')
          }
          onClick={() => setActiveSlot(index)}
        >
          {/* + button (left side / start) */}
          <button
            type="button"
            className={
              'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-all duration-200 ' +
              (isActive
                ? 'border-emerald-500/40 text-emerald-500 hover:bg-emerald-500/10'
                : 'border-slate-300 text-slate-400 hover:border-emerald-500 hover:text-emerald-500 dark:border-slate-700')
            }
            onClick={(e) => {
              e.stopPropagation();
              setActiveSlot(index);
              setPickerSlot((slot) => (slot === index ? null : index));
            }}
            aria-label={t.savedPlayers}
          >
            <Plus className="h-4 w-4" />
          </button>

          {/* Input */}
          <div className="min-w-0 flex-1">
            <div className="mb-0.5 text-[11px] font-medium text-slate-400 dark:text-slate-500">
              {labels?.[index] ?? `${en ? 'Player' : 'لاعب'}${index + 1}`}
            </div>
            <input
              className="w-full bg-transparent text-base font-semibold outline-none placeholder:text-slate-400 dark:placeholder:text-slate-600"
              value={names[index] ?? ''}
              onChange={(e) => setAt(index, e.target.value)}
              onFocus={() => setActiveSlot(index)}
              placeholder={`${t.playerName} ${index + 1}`}
            />
          </div>

          {/* Avatar (right side / end) */}
          <button
            type="button"
            className="group relative cursor-pointer overflow-hidden rounded-full transition-transform hover:scale-105 active:scale-95"
            onClick={(e) => {
              e.stopPropagation();
              const nameToEdit = names[index]?.trim() || fallbackName(index);
              addPlayer(nameToEdit); // Ensure it's in the store so it can be edited
              setAvatarPickerFor(nameToEdit);
            }}
          >
            <PlayerAvatar name={names[index]?.trim() || fallbackName(index)} size="lg" />
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
              <Pencil className="h-5 w-5 text-white" />
            </div>
          </button>
        </div>

        {/* Inline saved-players picker */}
        {pickerSlot === index && (() => {
          // Filter out players already selected in other slots
          const takenNames = new Set(
            names
              .filter((_, i) => i !== index)
              .map((n) => n?.trim().toLowerCase() || '')
              .filter(Boolean)
          );
          const available = players.filter((p) => !takenNames.has(p.name.trim().toLowerCase()));
          return (
            <div className="animate-in slide-in-from-top-2 rounded-2xl p-2.5 glass-modal">
              {available.length === 0 ? (
                <div className="px-2 py-2 text-center text-xs text-slate-500">{t.noSavedPlayers}</div>
              ) : (
                <div className="flex max-h-32 flex-wrap gap-2 overflow-y-auto">
                  {available.map((player) => (
                    <button
                      key={player.name}
                      type="button"
                      className="inline-flex max-w-full items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold transition hover:border-emerald-400 hover:bg-emerald-50 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                      onClick={() => setAt(index, player.name)}
                    >
                      <PlayerAvatar name={player.name} size="sm" />
                      <span className="truncate">{player.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })()}
      </div>
    );
  };

  /** Render players — with team grouping for partners, or flat list */
  const renderPlayers = () => {
    if (isPartners) {
      // Partners layout: Team 1 (indices 0, 2) and Team 2 (indices 1, 3)
      const team1 = [0, 2];
      const team2 = [1, 3];
      return (
        <div className="space-y-5">
          {/* Team 1 */}
          <div className="space-y-3">
            <h3 className="text-center text-sm font-bold text-slate-600 dark:text-slate-300">
              {en ? 'Team 1' : 'الفريق الأول'}
            </h3>
            {team1.map((i) => renderPlayerRow(i))}
          </div>

          {/* Team 2 */}
          <div className="space-y-3">
            <h3 className="text-center text-sm font-bold text-slate-600 dark:text-slate-300">
              {en ? 'Team 2' : 'الفريق الثاني'}
            </h3>
            {team2.map((i) => renderPlayerRow(i))}
          </div>
        </div>
      );
    }

    // Default: flat list
    return (
      <div className="space-y-3">
        {Array.from({ length: count }).map((_, i) => renderPlayerRow(i))}
      </div>
    );
  };

  return (
    <div className="grid gap-3 sm:gap-4 lg:grid-cols-[1.2fr_0.8fr]">
      <div className="card space-y-5">
        <div>
          <h2 className="text-center text-2xl font-extrabold sm:text-start sm:text-xl">{t.players}</h2>
          <p className="mt-1 text-center text-sm text-slate-500 dark:text-slate-400 sm:text-start">{t.savedPlayersHint}</p>
        </div>

        {renderPlayers()}

        {extra}
        <button
          className="btn-primary w-full py-4 text-lg"
          onClick={() => {
            const trimmed = names.map((n, i) => n?.trim() || fallbackName(i));
            addPlayers(trimmed);
            onSubmit(trimmed);
          }}
        >
          {submitLabel ?? t.startMatch}
        </button>
      </div>

      <aside className="card space-y-4 self-start">
        <div>
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-extrabold">{t.savedPlayers}</h2>
            <span className="chip">{t.slot} {activeSlot + 1}</span>
          </div>
          <div className="mt-3 flex gap-2">
            <input
              className="input"
              value={newPlayer}
              onChange={(e) => setNewPlayer(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveNewPlayer();
              }}
              placeholder={t.addPlayerPlaceholder}
            />
            <button className="btn-secondary shrink-0 px-3" onClick={saveNewPlayer} aria-label={t.addPlayer}>
              <UserPlus className="h-4 w-4" />
            </button>
          </div>
        </div>
        {players.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 p-4 text-center text-sm text-slate-500 dark:border-slate-700">
            {t.noSavedPlayers}
          </div>
        ) : (
          <div className="flex max-h-56 flex-wrap gap-2 overflow-y-auto pe-1 sm:max-h-none">
            {(() => {
              // Filter out players already selected in other slots
              const takenNames = new Set(
                names
                  .filter((_, i) => i !== activeSlot)
                  .map((n) => n?.trim().toLowerCase() || '')
                  .filter(Boolean)
              );
              return players
                .filter((p) => !takenNames.has(p.name.trim().toLowerCase()))
                .map((player) => (
                  <button
                    key={player.name}
                    className="group inline-flex max-w-full items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold transition hover:border-emerald-400 hover:bg-emerald-50 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                    onClick={() => setAt(activeSlot, player.name)}
                  >
                    <PlayerAvatar name={player.name} size="sm" />
                    <span className="truncate">{player.name}</span>
                    <span
                      className="rounded-full p-0.5 text-slate-400 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-950"
                      onClick={(e) => {
                        e.stopPropagation();
                        removePlayer(player.name);
                      }}
                    >
                      <X className="h-3.5 w-3.5" />
                    </span>
                  </button>
                ));
            })()}
          </div>
        )}
      </aside>

      {/* Avatar Picker Modal */}
      {avatarPickerFor && (
        <AvatarPickerModal
          playerName={avatarPickerFor}
          onClose={() => setAvatarPickerFor(null)}
        />
      )}
    </div>
  );
}
