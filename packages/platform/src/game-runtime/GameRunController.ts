import type {
  Analytics,
  GameBridgeEvent,
  GameEventIdentity,
  GameId,
  GameRun,
  GameRunState,
} from '../contracts/index.js';
import type { ActiveGameClock } from './ActiveGameClock.js';

export interface GameEventSink {
  emit(event: GameBridgeEvent): void;
}

/**
 * The single owner of a game's run state. Calls are idempotent so React
 * cleanup, Phaser shutdown and a user exit cannot double-count analytics.
 */
export class GameRunController implements GameRun {
  private currentState: GameRunState = 'idle';
  private eventSequence = 0;
  private lastSoundEnabled: boolean | undefined;
  private readonly pauseReasons = new Set<'game' | 'visibility'>();
  private readonly milestones = new Set<string>();

  constructor(
    private readonly gameId: GameId,
    readonly runId: string,
    private readonly clock: ActiveGameClock,
    private readonly analytics: Analytics,
    private readonly bridge: GameEventSink,
  ) {}

  get state(): GameRunState {
    return this.currentState;
  }

  open(): void {
    if (this.currentState !== 'idle') return;
    this.currentState = 'opened';
    this.clock.start();
    this.emit('GAME_OPENED');
  }

  ready(): void {
    if (this.currentState !== 'opened') return;
    this.currentState = 'ready';
    this.emit('GAME_READY');
  }

  start(): void {
    if (this.currentState !== 'ready') return;
    this.currentState = 'started';
    this.emit('GAME_STARTED');
  }

  interactionSettled(): void {
    if (this.currentState !== 'started') return;
    this.bridge.emit({ type: 'GAME_INTERACTION_SETTLED', ...this.nextIdentity() });
  }

  milestone(name: string): void {
    if (this.currentState !== 'started' && this.currentState !== 'completed') return;
    if (
      !/^[a-z][a-z0-9-]{0,47}$/.test(name) ||
      this.milestones.size >= 64 ||
      this.milestones.has(name)
    )
      return;
    this.milestones.add(name);
    this.analytics.track({
      type: 'GAME_MILESTONE',
      ...this.nextIdentity(),
      name,
      elapsedMs: this.clock.elapsedMs(),
    });
  }

  pause(reason: 'game' | 'visibility' = 'game'): void {
    if (this.currentState !== 'started' && this.currentState !== 'paused') return;
    this.pauseReasons.add(reason);
    if (this.currentState === 'paused') return;
    this.currentState = 'paused';
    this.clock.pause();
    this.emit('GAME_PAUSED');
  }

  soundChanged(enabled: boolean): void {
    if (
      this.currentState === 'idle' ||
      this.currentState === 'exited' ||
      this.lastSoundEnabled === enabled
    )
      return;
    this.lastSoundEnabled = enabled;
    this.bridge.emit({ type: 'GAME_SOUND_CHANGED', ...this.nextIdentity(), enabled });
  }

  resume(reason: 'game' | 'visibility' = 'game'): void {
    this.pauseReasons.delete(reason);
    if (this.pauseReasons.size > 0) return;
    if (this.currentState !== 'paused') return;
    this.currentState = 'started';
    this.clock.resume();
    this.emit('GAME_RESUMED');
  }

  assetRetry(attempt: number): void {
    if (this.currentState === 'exited') return;
    if (!Number.isInteger(attempt) || attempt < 1) {
      throw new Error('Asset retry attempts must be positive integers.');
    }
    this.bridge.emit({ type: 'GAME_ASSET_RETRY', ...this.nextIdentity(), attempt });
  }

  assetFailed(reason: string): void {
    if (this.currentState === 'exited') return;
    if (!/^[a-z0-9][a-z0-9-]{0,79}$/.test(reason)) {
      throw new Error('Asset failure reasons must be privacy-safe kebab-case codes.');
    }
    this.bridge.emit({ type: 'GAME_ASSET_FAILED', ...this.nextIdentity(), reason });
  }

  complete(): number {
    if (this.currentState === 'completed') return this.clock.elapsedMs();
    if (this.currentState !== 'started') return this.clock.elapsedMs();
    this.currentState = 'completed';
    this.clock.stop();
    const durationMs = this.clock.elapsedMs();
    const event = { type: 'GAME_COMPLETED' as const, ...this.nextIdentity(), durationMs };
    this.analytics.track(event);
    this.bridge.emit(event);
    return durationMs;
  }

  exit(): void {
    if (this.currentState === 'exited') return;
    this.clock.stop();
    this.pauseReasons.clear();
    this.currentState = 'exited';
    const event = { type: 'GAME_EXITED' as const, ...this.nextIdentity() };
    this.analytics.track(event);
    this.bridge.emit(event);
  }

  elapsedMs(): number {
    return this.clock.elapsedMs();
  }

  private emit(
    type: Extract<
      GameBridgeEvent['type'],
      'GAME_OPENED' | 'GAME_READY' | 'GAME_STARTED' | 'GAME_PAUSED' | 'GAME_RESUMED'
    >,
  ): void {
    const event = { type, ...this.nextIdentity() } as Extract<
      GameBridgeEvent,
      { type: typeof type }
    >;
    this.analytics.track(event);
    this.bridge.emit(event);
  }

  private nextIdentity(): GameEventIdentity {
    this.eventSequence += 1;
    return {
      gameId: this.gameId,
      runId: this.runId,
      sequence: this.eventSequence,
    };
  }
}
