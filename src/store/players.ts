import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const normalize = (name: string) => name.trim().replace(/\s+/g, ' ');
export const AVATARS = [
  'adam.png',
  'bandar.png',
  'carmen.png',
  'dana.png',
  'hind.png',
  'jad.png',
  'joud.png',
  'kareem.png',
  'lama.png',
  'maryiam.png',
  'nouf.png',
  'sabri.png',
  'salem.png',
  'tareq.png',
  'iq_abood.png',
  'iq_haitham.png',
];

export const COLORS = [
  'from-sky-500 to-blue-700',
  'from-emerald-500 to-teal-700',
  'from-amber-500 to-orange-700',
  'from-rose-500 to-red-700',
  'from-violet-500 to-fuchsia-700',
  'from-cyan-500 to-indigo-700',
  'from-lime-500 to-green-700',
  'from-slate-500 to-slate-800',
];

export interface SavedPlayer {
  name: string;
  avatar: string;
  color: string;
}

function hash(name: string) {
  return [...name].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
}

export function makePlayer(name: string): SavedPlayer {
  const clean = normalize(name);
  const h = hash(clean);
  return {
    name: clean,
    avatar: `jawaker-assets/avatars/${AVATARS[h % AVATARS.length]}`,
    color: COLORS[h % COLORS.length],
  };
}

interface PlayersState {
  players: SavedPlayer[];
  addPlayer: (name: string) => void;
  addPlayers: (names: string[]) => void;
  removePlayer: (name: string) => void;
  updatePlayer: (name: string, updates: Partial<SavedPlayer>) => void;
  getPlayer: (name: string) => SavedPlayer;
}

export const useSavedPlayers = create<PlayersState>()(
  persist(
    (set, get) => ({
      players: [],
      addPlayer: (name) => {
        const clean = normalize(name);
        if (!clean) return;
        const exists = get().players.some((p) => p.name.toLowerCase() === clean.toLowerCase());
        if (!exists) set({ players: [...get().players, makePlayer(clean)].sort((a, b) => a.name.localeCompare(b.name)) });
      },
      addPlayers: (names) => {
        const next = [...get().players];
        for (const name of names) {
          const clean = normalize(name);
          if (clean && !next.some((p) => p.name.toLowerCase() === clean.toLowerCase())) next.push(makePlayer(clean));
        }
        set({ players: next.sort((a, b) => a.name.localeCompare(b.name)) });
      },
      removePlayer: (name) => set({ players: get().players.filter((p) => p.name !== name) }),
      updatePlayer: (name, updates) => {
        const clean = normalize(name);
        set({
          players: get().players.map((p) =>
            p.name.toLowerCase() === clean.toLowerCase() ? { ...p, ...updates } : p
          ),
        });
      },
      getPlayer: (name) => get().players.find((p) => p.name.toLowerCase() === normalize(name).toLowerCase()) ?? makePlayer(name),
    }),
    {
      name: 'score-saved-players',
      migrate: (persisted: any) => {
        const players = persisted?.players ?? [];
        return {
          ...persisted,
          players: players.map((p: string | SavedPlayer) => {
            if (typeof p === 'string') return makePlayer(p);
            if (p.avatar && p.avatar.startsWith('/jawaker-assets/')) {
              return { ...p, avatar: p.avatar.substring(1) };
            }
            if (!p.avatar) return { ...makePlayer(p.name), color: p.color };
            return p;
          }),
        };
      },
      version: 3,
    }
  )
);
