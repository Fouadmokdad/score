import { useMemo } from 'react';
import { makePlayer, useSavedPlayers } from '../store/players';
import { useMatches } from '../store/matches';
import { getPlayerBadges } from '../utils/achievements';

interface Props {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  showName?: boolean;
  className?: string;
}

const sizes = {
  sm: 'h-8 w-8 text-sm',
  md: 'h-10 w-10 text-base',
  lg: 'h-14 w-14 text-2xl',
};

export function PlayerAvatar({ name, size = 'md', showName, className = '' }: Props) {
  const players = useSavedPlayers((s) => s.players);
  const matches = useMatches((s) => s.matches);
  const displayName = name || '';
  const normalizedName = displayName.trim().replace(/\s+/g, ' ');
  const player = useMemo(
    () =>
      players.find((p) => p.name.toLowerCase() === normalizedName.toLowerCase()) ??
      makePlayer(displayName),
    [displayName, normalizedName, players]
  );

  const badges = useMemo(() => getPlayerBadges(normalizedName, matches), [normalizedName, matches]);

  const isImage = player.avatar.includes('/') || player.avatar.startsWith('data:image/');
  const avatarUrl = player.avatar.startsWith('/') ? player.avatar.substring(1) : player.avatar;

  return (
    <span className={'relative inline-flex min-w-0 items-center gap-2 ' + className} title={displayName}>
      <span
        className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br ${player.color} ${sizes[size]} font-black text-white shadow-lg shadow-black/25 ring-2 ring-white/80 dark:ring-white/70`}
      >
        {isImage ? (
          <img src={avatarUrl} alt="" className="h-full w-full object-cover" aria-hidden="true" />
        ) : (
          <span aria-hidden="true">{player.avatar}</span>
        )}
      </span>
      {badges.length > 0 && (
        <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-white text-[10px] shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
          {badges[badges.length - 1]}
        </span>
      )}
      {showName && <span className="truncate font-semibold">{displayName}</span>}
    </span>
  );
}

export function PlayerAvatarGroup({ names, limit = 4 }: { names: string[]; limit?: number }) {
  const visible = names.slice(0, limit);
  const extra = names.length - visible.length;

  return (
    <div className="flex items-center -space-x-2 rtl:space-x-reverse">
      {visible.map((name) => (
        <PlayerAvatar key={name} name={name} size="sm" />
      ))}
      {extra > 0 && (
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-700 ring-2 ring-white dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-950">
          +{extra}
        </span>
      )}
    </div>
  );
}
