import type { NormalizedRect, Point } from './GloboGeometry.js';
import { MusicalGems } from './MusicalGems.js';
import type { GemTapResult } from './MusicalGems.js';
import { SnowTurbulenceModel } from './SnowTurbulenceModel.js';
import { SteamGrid } from './SteamGrid.js';
import { WindingTracker } from './WindingTracker.js';

export const globoStates = [
  'PRELOAD',
  'INTRO',
  'DORMANT',
  'WINDING',
  'STEAM_DISCOVERY',
  'CLEARING',
  'GEMS_AWAKENING',
  'ILLUMINATING',
  'MUSIC_BOX_STARTING',
  'CELEBRATING',
  'PHOTO_HERO',
  'FREE_PLAY',
  'COMPLETE',
] as const;

export type GloboState = (typeof globoStates)[number];

export type GloboDomainEvent =
  | { type: 'STATE_ENTERED'; state: GloboState; atMs: number }
  | { type: 'STATE_EXITED'; state: GloboState; atMs: number }
  | { type: 'RATCHET_CLICK'; count: number; progress: number; atMs: number }
  | { type: 'STEAM_PROGRESS'; progress: number; atMs: number }
  | { type: 'GEM_LIT'; gem: GemTapResult; atMs: number }
  | { type: 'CELEBRATION_TRIGGERED'; atMs: number };

const STATE_TIMERS: Partial<Record<GloboState, readonly [number, GloboState]>> = {
  INTRO: [1200, 'DORMANT'],
  STEAM_DISCOVERY: [1000, 'CLEARING'],
  GEMS_AWAKENING: [900, 'ILLUMINATING'],
  MUSIC_BOX_STARTING: [1000, 'CELEBRATING'],
  CELEBRATING: [1800, 'PHOTO_HERO'],
  PHOTO_HERO: [3000, 'FREE_PLAY'],
};

export interface GloboStateMachineOptions {
  aspect?: number;
  safeZone?: NormalizedRect | undefined;
  particleCount?: number;
}

/**
 * Deterministic domain state machine orchestrating the Snow Globe experience.
 * Fully isolated from Phaser, React, DOM and random side effects.
 */
export class SnowGlobeStateMachine {
  state: GloboState = 'PRELOAD';
  readonly winding: WindingTracker;
  readonly steam: SteamGrid;
  readonly gems: MusicalGems;
  readonly snow: SnowTurbulenceModel;

  elapsedMs = 0;
  stateElapsedMs = 0;
  private readonly events: GloboDomainEvent[] = [];

  constructor(options: GloboStateMachineOptions = {}) {
    const aspect = options.aspect ?? 1.0;
    this.winding = new WindingTracker();
    this.steam = new SteamGrid(aspect, { safeZone: options.safeZone });
    this.gems = new MusicalGems();
    this.snow = new SnowTurbulenceModel({
      count: options.particleCount ?? 60,
      safeZone: options.safeZone,
    });
  }

  ready(): void {
    if (this.state === 'PRELOAD') {
      this.enter('INTRO');
    }
  }

  update(deltaMs: number): void {
    if (
      !Number.isFinite(deltaMs) ||
      deltaMs <= 0 ||
      this.state === 'PRELOAD' ||
      this.state === 'COMPLETE'
    ) {
      return;
    }

    let remaining = deltaMs;
    while (remaining > 0) {
      const timer = STATE_TIMERS[this.state];
      const step = timer
        ? Math.min(remaining, Math.max(0, timer[0] - this.stateElapsedMs))
        : remaining;

      this.elapsedMs += step;
      this.stateElapsedMs += step;
      this.snow.step(step / 1000);
      remaining -= step;

      if (timer && this.stateElapsedMs >= timer[0]) {
        this.enter(timer[1]);
      } else {
        break;
      }
    }
  }

  rotateKey(currentAngleRad: number): number {
    if (this.state === 'PRELOAD' || this.state === 'COMPLETE') {
      return 0;
    }

    const clicks = this.winding.rotate(currentAngleRad);
    if (clicks > 0) {
      if (this.state === 'DORMANT') {
        this.enter('WINDING');
      }

      this.events.push({
        type: 'RATCHET_CLICK',
        count: clicks,
        progress: this.winding.progress,
        atMs: this.elapsedMs,
      });

      this.checkCelebration();
      if (this.winding.isFullyWound && this.state === 'WINDING') {
        this.enter('STEAM_DISCOVERY');
      }
    }
    return clicks;
  }

  tapKey(): number {
    if (this.state === 'PRELOAD' || this.state === 'COMPLETE') {
      return 0;
    }

    const clicks = this.winding.tapStep();
    if (clicks > 0) {
      if (this.state === 'DORMANT') {
        this.enter('WINDING');
      }

      this.events.push({
        type: 'RATCHET_CLICK',
        count: clicks,
        progress: this.winding.progress,
        atMs: this.elapsedMs,
      });

      this.checkCelebration();
      if (this.winding.isFullyWound && this.state === 'WINDING') {
        this.enter('STEAM_DISCOVERY');
      }
    }
    return clicks;
  }

  wipeSteam(from: Point, to: Point, radius = 0.12): number {
    if (this.state === 'PRELOAD' || this.state === 'COMPLETE') {
      return 0;
    }

    const newlyCleared = this.steam.wipe(from, to, radius);
    if (newlyCleared > 0) {
      this.events.push({
        type: 'STEAM_PROGRESS',
        progress: this.steam.progress,
        atMs: this.elapsedMs,
      });

      this.checkCelebration();
      if (this.steam.isCleared && this.state === 'CLEARING') {
        this.enter('GEMS_AWAKENING');
      }
    }
    return newlyCleared;
  }

  tapGem(index: number): GemTapResult | undefined {
    if (this.state === 'PRELOAD' || this.state === 'COMPLETE') {
      return undefined;
    }

    const result = this.gems.tap(index);
    if (result) {
      this.events.push({
        type: 'GEM_LIT',
        gem: result,
        atMs: this.elapsedMs,
      });

      this.checkCelebration();
    }
    return result;
  }

  private checkCelebration(): void {
    if (
      this.gems.isComplete &&
      this.winding.isFullyWound &&
      this.state !== 'MUSIC_BOX_STARTING' &&
      this.state !== 'CELEBRATING' &&
      this.state !== 'PHOTO_HERO' &&
      this.state !== 'FREE_PLAY' &&
      this.state !== 'COMPLETE'
    ) {
      this.enter('MUSIC_BOX_STARTING');
      this.events.push({
        type: 'CELEBRATION_TRIGGERED',
        atMs: this.elapsedMs,
      });
    }
  }

  swirlSnow(x: number, y: number, impulseX: number, impulseY: number): void {
    this.snow.applyVortex(x, y, impulseX, impulseY);
  }

  finish(): void {
    if (this.state === 'FREE_PLAY') {
      this.enter('COMPLETE');
    }
  }

  drainEvents(): GloboDomainEvent[] {
    return this.events.splice(0);
  }

  private enter(next: GloboState): void {
    if (next === this.state) return;
    this.events.push({ type: 'STATE_EXITED', state: this.state, atMs: this.elapsedMs });
    this.state = next;
    this.stateElapsedMs = 0;
    this.events.push({ type: 'STATE_ENTERED', state: next, atMs: this.elapsedMs });
  }
}
