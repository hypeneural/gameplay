import { createHotspots, hitHotspots } from './Hotspots.js';
import type { Hotspot } from './Hotspots.js';
import { IceGrid } from './IceGrid.js';
import { clamp01 } from './PhotoGeometry.js';
import type { NormalizedRect, Point } from './PhotoGeometry.js';

export const magicStates = [
  'PRELOAD',
  'INTRO',
  'GIFT_IDLE',
  'GIFT_TOUCH_1',
  'GIFT_TOUCH_2',
  'GIFT_READY',
  'RIBBON_DRAG',
  'GIFT_OPENING',
  'PHOTO_REVEAL',
  'MAGIC_INTRO',
  'MAGIC_HUNT',
  'MAGIC_COMPLETE',
  'FROST_TRANSITION',
  'ICE_INTERACTION',
  'ICE_CRACK_1',
  'ICE_CRACK_2',
  'ICE_BREAK',
  'FINALE',
  'PHOTO_HERO',
  'FREE_PLAY',
  'COMPLETE',
] as const;
export type MagicState = (typeof magicStates)[number];
export type MagicEvent =
  | { type: 'STATE_ENTERED'; state: MagicState; atMs: number }
  | { type: 'STATE_EXITED'; state: MagicState; atMs: number }
  | { type: 'MAGIC_POINT_FOUND'; hotspot: Hotspot; atMs: number }
  | { type: 'RIBBON_PROGRESS'; progress: number; atMs: number }
  | { type: 'ICE_PROGRESS'; progress: number; atMs: number };

const stateTimers: Partial<Record<MagicState, readonly [number, MagicState]>> = {
  INTRO: [1200, 'GIFT_IDLE'],
  GIFT_OPENING: [1150, 'PHOTO_REVEAL'],
  PHOTO_REVEAL: [1900, 'MAGIC_INTRO'],
  MAGIC_INTRO: [1400, 'MAGIC_HUNT'],
  MAGIC_COMPLETE: [900, 'FROST_TRANSITION'],
  FROST_TRANSITION: [1100, 'ICE_INTERACTION'],
  ICE_BREAK: [1150, 'FINALE'],
  FINALE: [1500, 'PHOTO_HERO'],
  PHOTO_HERO: [3000, 'FREE_PLAY'],
};

/** Owns all progression. Commands outside their state are harmless and idempotent. */
export class MagicPhotoStateMachine {
  state: MagicState = 'PRELOAD';
  readonly hotspots: Hotspot[];
  readonly ice: IceGrid;
  ribbonProgress = 0;
  elapsedMs = 0;
  stateElapsedMs = 0;
  huntIdleMs = 0;
  private readonly events: MagicEvent[] = [];

  constructor(
    readonly aspect: number,
    seed = 0,
    safeZone?: NormalizedRect,
  ) {
    this.hotspots = createHotspots(seed, safeZone);
    this.ice = new IceGrid(aspect, safeZone);
  }

  get found(): number {
    return this.hotspots.filter((point) => point.discovered).length;
  }
  get acceptsIce(): boolean {
    return ['ICE_INTERACTION', 'ICE_CRACK_1', 'ICE_CRACK_2'].includes(this.state);
  }

  ready(): void {
    if (this.state === 'PRELOAD') this.enter('INTRO');
  }

  update(delta: number): void {
    if (
      !Number.isFinite(delta) ||
      delta <= 0 ||
      this.state === 'PRELOAD' ||
      this.state === 'COMPLETE'
    )
      return;
    let remaining = delta;
    while (remaining > 0) {
      const timer = stateTimers[this.state];
      const step = timer
        ? Math.min(remaining, Math.max(0, timer[0] - this.stateElapsedMs))
        : remaining;
      this.elapsedMs += step;
      this.stateElapsedMs += step;
      if (this.state === 'MAGIC_HUNT') this.huntIdleMs += step;
      remaining -= step;
      if (timer && this.stateElapsedMs >= timer[0]) this.enter(timer[1]);
      else break;
    }
  }

  tapGift(): boolean {
    const next: Partial<Record<MagicState, MagicState>> = {
      INTRO: 'GIFT_TOUCH_1',
      GIFT_IDLE: 'GIFT_TOUCH_1',
      GIFT_TOUCH_1: 'GIFT_TOUCH_2',
      GIFT_TOUCH_2: 'GIFT_READY',
    };
    const target = next[this.state];
    if (!target) return false;
    this.enter(target);
    return true;
  }

  startRibbon(): boolean {
    if (this.state !== 'GIFT_READY') return false;
    this.ribbonProgress = 0;
    this.enter('RIBBON_DRAG');
    return true;
  }

  pullRibbon(progress: number): void {
    if (this.state !== 'RIBBON_DRAG') return;
    // Milestones only fire forward, even when the finger moves back down.
    const next = clamp01(progress);
    for (const milestone of [0.35, 0.7]) {
      if (this.ribbonProgress < milestone && next >= milestone)
        this.events.push({ type: 'RIBBON_PROGRESS', progress: milestone, atMs: this.elapsedMs });
    }
    this.ribbonProgress = Math.max(this.ribbonProgress, next);
    if (this.ribbonProgress >= 0.7) this.enter('GIFT_OPENING');
  }

  releaseRibbon(cancelled = false): void {
    if (this.state !== 'RIBBON_DRAG') return;
    if (!cancelled && this.ribbonProgress >= 0.45) this.enter('GIFT_OPENING');
    else {
      this.ribbonProgress = 0;
      this.enter('GIFT_READY');
    }
  }

  hunt(from: Point, to: Point): void {
    if (this.state !== 'MAGIC_HUNT') return;
    for (const hotspot of hitHotspots(this.hotspots, from, to, this.aspect)) {
      hotspot.discovered = true;
      this.huntIdleMs = 0;
      this.events.push({
        type: 'MAGIC_POINT_FOUND',
        hotspot: { ...hotspot },
        atMs: this.elapsedMs,
      });
    }
    if (this.found === 5) this.enter('MAGIC_COMPLETE');
  }

  scratch(from: Point, to: Point, radius = 0.105): boolean {
    if (!this.acceptsIce || this.ice.scratch(from, to, radius) === 0) return false;
    const progress = this.ice.progress;
    this.events.push({ type: 'ICE_PROGRESS', progress, atMs: this.elapsedMs });
    if (progress >= 0.25 && this.state === 'ICE_INTERACTION') this.enter('ICE_CRACK_1');
    if (progress >= 0.45 && this.state === 'ICE_CRACK_1') this.enter('ICE_CRACK_2');
    if (progress >= 0.68) this.enter('ICE_BREAK');
    return true;
  }

  finish(): void {
    if (this.state === 'FREE_PLAY') this.enter('COMPLETE');
  }
  drainEvents(): MagicEvent[] {
    return this.events.splice(0);
  }

  private enter(state: MagicState): void {
    if (state === this.state) return;
    this.events.push({ type: 'STATE_EXITED', state: this.state, atMs: this.elapsedMs });
    this.state = state;
    this.stateElapsedMs = 0;
    this.events.push({ type: 'STATE_ENTERED', state, atMs: this.elapsedMs });
  }
}
