/**
 * IDs stay open so that a generated game does not require an edit in the
 * platform package. Registries validate membership at composition time.
 */
export type GameId = string;
export type PhotoVariant = 'thumb' | 'card' | 'game';
export type QualityTier = 'LOW' | 'NORMAL' | 'HIGH';
export type GameDifficulty = 'normal' | 'desafio';

export interface GameCover {
  /** Optional local artwork; the shell has a CSS fallback while assets are deferred. */
  assetUrl?: string;
  /** Meaningful description of the small cover preview. */
  alt: string;
}

export interface GameDefinition {
  id: GameId;
  displayName: string;
  shortDescription: string;
  /** One sentence that teaches the first action before Phaser is mounted. */
  shortRule: string;
  cover: GameCover;
  minPhotos: number;
  recommendedPhotos: number;
  photoSelection: 'single' | 'subset' | 'all';
  supportsMixedOrientation: boolean;
}

export interface Photo {
  id: string;
  width: number;
  height: number;
  aspectRatio: number;
  orientation: 'portrait' | 'landscape' | 'square';
  variants: Record<PhotoVariant, string>;
}

export interface Session {
  id: string;
  publicToken: string;
  displayName: string;
  photos: readonly Photo[];
}

/** Correlates every event to one concrete, replayable game run. */
export interface GameEventIdentity {
  gameId: GameId;
  runId: string;
  sequence: number;
}

export type AnalyticsEvent =
  | (GameEventIdentity & { type: 'GAME_OPENED' })
  | (GameEventIdentity & { type: 'GAME_READY' })
  | (GameEventIdentity & { type: 'GAME_STARTED' })
  | (GameEventIdentity & { type: 'GAME_PAUSED' })
  | (GameEventIdentity & { type: 'GAME_RESUMED' })
  | (GameEventIdentity & { type: 'GAME_COMPLETED'; durationMs: number })
  | (GameEventIdentity & { type: 'GAME_EXITED' });

export type GameBridgeEvent =
  | AnalyticsEvent
  | (GameEventIdentity & { type: 'GAME_INTERACTION_SETTLED' })
  | (GameEventIdentity & { type: 'GAME_ASSET_RETRY'; attempt: number })
  | (GameEventIdentity & { type: 'GAME_ASSET_FAILED'; reason: string });

export interface Clock {
  now(): number;
}

export interface Random {
  next(): number;
  int(minInclusive: number, maxInclusive: number): number;
}

export interface Analytics {
  track(event: AnalyticsEvent): void;
}

export interface Haptics {
  impact(style: 'light' | 'medium' | 'heavy'): Promise<void>;
}

export type GameRunState =
  'idle' | 'opened' | 'ready' | 'started' | 'paused' | 'completed' | 'exited';

export interface GameRun {
  readonly runId: string;
  readonly state: GameRunState;
  open(): void;
  ready(): void;
  start(): void;
  /** Signals that a player interaction has completed its visible game-side work. */
  interactionSettled(): void;
  pause(): void;
  resume(): void;
  /** Emits a bounded, non-analytics diagnostic for a retried required asset. */
  assetRetry(attempt: number): void;
  /** Emits a privacy-safe asset failure code; it must not contain a URL or user data. */
  assetFailed(reason: string): void;
  complete(): number;
  exit(): void;
  elapsedMs(): number;
}

export interface GameContext {
  session: Session;
  selectedPhoto: Photo;
  clock: Clock;
  random: Random;
  /** Securely generated seed, recorded with the run for deterministic replay. */
  runSeed: number;
  analytics: Analytics;
  haptics: Haptics;
  quality: QualityTier;
  /**
   * Voluntary player-selected progression. A game without a challenge mode
   * keeps its normal rules when the shell omits this value.
   */
  difficulty?: GameDifficulty;
  /**
   * Explicit player preferences supplied by the app shell. A game must retain
   * its safe defaults when a host from an older shell omits these values.
   */
  preferences?: Readonly<{
    reducedMotion?: boolean;
    soundEnabled?: boolean;
  }>;
  /**
   * Local-only diagnostic input. It is never derived from a session URL or
   * transmitted by the platform; a game treats an omitted value as production.
   */
  development?: Readonly<{
    scenario?: string;
  }>;
  run: GameRun;
}

/** Values that may safely outlive a concrete Phaser game instance. */
export type GameContextSeed = Omit<GameContext, 'run' | 'random' | 'runSeed'>;

export interface GameController {
  destroy(): Promise<void>;
}

/**
 * The platform describes a module without importing Phaser. The app supplies
 * the engine and DOM host, keeping the platform independent of concrete games.
 */
export interface GameModule<Engine, Host> {
  definition: GameDefinition;
  create(
    engine: Engine,
    parent: Host,
    context: GameContext,
    bridge: { emit(event: GameBridgeEvent): void },
  ): GameController | Promise<GameController>;
}

export interface SessionRepository {
  getByToken(token: string): Promise<Session>;
}

export interface PhotoCatalog {
  list(sessionId: string): Promise<readonly Photo[]>;
}
