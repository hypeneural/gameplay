import type { Clock } from '../contracts/index.js';

/** A monotonic clock that excludes time spent with the game paused. */
export class ActiveGameClock implements Clock {
  private startedAt: number | undefined;
  private pausedAt: number | undefined;
  private accumulatedPausedMs = 0;
  private stoppedElapsedMs: number | undefined;

  constructor(private readonly source: Clock) {}

  start(): void {
    if (this.startedAt !== undefined) return;
    this.startedAt = this.source.now();
  }

  pause(): void {
    if (
      this.startedAt === undefined ||
      this.pausedAt !== undefined ||
      this.stoppedElapsedMs !== undefined
    ) {
      return;
    }
    this.pausedAt = this.source.now();
  }

  resume(): void {
    if (this.pausedAt === undefined || this.stoppedElapsedMs !== undefined) return;
    this.accumulatedPausedMs += Math.max(0, this.source.now() - this.pausedAt);
    this.pausedAt = undefined;
  }

  stop(): void {
    if (this.stoppedElapsedMs !== undefined) return;
    if (this.startedAt === undefined) {
      this.stoppedElapsedMs = 0;
      return;
    }
    if (this.pausedAt !== undefined) {
      this.stoppedElapsedMs = Math.max(
        0,
        this.pausedAt - this.startedAt - this.accumulatedPausedMs,
      );
      this.pausedAt = undefined;
      return;
    }
    this.stoppedElapsedMs = this.elapsedMs();
  }

  elapsedMs(): number {
    if (this.stoppedElapsedMs !== undefined) return this.stoppedElapsedMs;
    if (this.startedAt === undefined) return 0;
    const end = this.pausedAt ?? this.source.now();
    return Math.max(0, end - this.startedAt - this.accumulatedPausedMs);
  }

  now(): number {
    return this.elapsedMs();
  }
}
