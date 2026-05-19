export type GameKind = 'likha' | 'hand-solo' | 'hand-partners' | 'trix' | 'complex' | 'tarneeb' | 'tarneeb-400';

export const GAME_LABELS: Record<GameKind, string> = {
  likha: 'ليخة',
  'hand-solo': 'هند فردي',
  'hand-partners': 'هند شراكة',
  trix: 'تركس',
  complex: 'كومبلكس',
  tarneeb: 'طرنيب',
  'tarneeb-400': 'طرنيب 400',
};

export const GAME_DESCRIPTIONS: Record<GameKind, string> = {
  likha: 'ليخة: أدخل نقاط الجولة مباشرة، مجموع كل جولة 36، وأول من يصل 101 تنتهي اللعبة',
  'hand-solo': 'هند فردي 1×1، أول من يربح 5 جولات من 9',
  'hand-partners': 'هند شراكة 2×2، أول فريق يربح 5 جولات من 9',
  trix: '5 عقود × 4 جولات مع التتويج والمضاعفة',
  complex: 'مزيج بلوت/هند مع تركس على مرحلتين',
  tarneeb: 'طرنيب شراكة 2×2، طلب ولمّات حتى الهدف',
  'tarneeb-400': 'طرنيب 400 بحساب فردي وشراكة للفوز',
};

/** A single round entry; structure depends on game kind. */
export interface Round {
  id: string;
  /** Per-player or per-team delta scores for this round, by index */
  deltas: number[];
  /** Optional metadata for display (contract name, declarer, etc) */
  meta?: Record<string, any>;
  createdAt: number;
}

export interface Match {
  id: string;
  kind: GameKind;
  /** Player names (or team names) */
  players: string[];
  /** For team-based games: number of teams (else undefined) */
  teams?: number;
  /** Per-game configuration (target score, edition, etc.) */
  config: Record<string, any>;
  rounds: Round[];
  createdAt: number;
  updatedAt: number;
  finished: boolean;
  /** Index of the winner (player or team index) */
  winnerIndex?: number;
}

export interface PlayerStat {
  name: string;
  matches: number;
  wins: number;
  losses: number;
  totalScore: number;
}
