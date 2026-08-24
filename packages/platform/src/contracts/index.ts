/**
 * IDs stay open so that a generated game does not require an edit in the
 * platform package. Registries validate membership at composition time.
 */
export type GameId = string;
export type PhotoVariant = 'thumb' | 'card' | 'game';
export type QualityTier = 'LOW' | 'NORMAL' | 'HIGH';

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
