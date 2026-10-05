import { containsPoint, photoDistanceToSegment } from './GloboGeometry.js';
import type { NormalizedRect, Point } from './GloboGeometry.js';

export interface SteamCell extends Point {
  revealed: boolean;
  weight: number;
}

export interface SteamGridOptions {
  threshold?: number;
  safeZone?: NormalizedRect | undefined;
}

/**
 * Bounded mathematical grid representing frosted steam/condensation on the glass.
 * Zero pixel reads, zero DOM/canvas dependencies, zero per-frame object allocations.
 */
export class SteamGrid {
  readonly cells: SteamCell[];
  readonly columns: number;
  readonly rows: number;
  readonly totalWeight: number;
  readonly threshold: number;
  private clearedWeight = 0;

  constructor(
    readonly aspect: number,
    options: SteamGridOptions = {},
  ) {
    if (!Number.isFinite(aspect) || aspect <= 0) {
      throw new Error('Aspect ratio must be a positive finite number.');
    }
    this.threshold = options.threshold ?? 0.65;
    this.columns = Math.min(32, Math.max(12, Math.round(16 * Math.max(1, aspect))));
    this.rows = Math.min(32, Math.max(12, Math.round(16 * Math.max(1, 1 / aspect))));

    let weightSum = 0;
    this.cells = Array.from({ length: this.columns * this.rows }, (_, index) => {
      const point = {
        x: ((index % this.columns) + 0.5) / this.columns,
        y: (Math.floor(index / this.columns) + 0.5) / this.rows,
      };
      // Double weight for face safe zone cells to reward wiping family faces
      const inFaceZone = options.safeZone ? containsPoint(options.safeZone, point, 0.02) : false;
      const weight = inFaceZone ? 2 : 1;
      weightSum += weight;
      return {
        ...point,
        revealed: false,
        weight,
      };
    });

    this.totalWeight = weightSum;
  }

  get progress(): number {
    return this.totalWeight > 0 ? this.clearedWeight / this.totalWeight : 0;
  }

  get isCleared(): boolean {
    return this.progress >= this.threshold;
  }

  /**
   * Wipes steam along a touch gesture line segment [from, to] with a given radius.
   * Returns the count of newly wiped cells.
   */
  wipe(from: Point, to: Point, radius = 0.12): number {
    if (
      !Number.isFinite(from.x) ||
      !Number.isFinite(from.y) ||
      !Number.isFinite(to.x) ||
      !Number.isFinite(to.y) ||
      !Number.isFinite(radius) ||
      radius <= 0
    ) {
      return 0;
    }

    let newlyCleared = 0;
    for (const cell of this.cells) {
      if (!cell.revealed && photoDistanceToSegment(cell, from, to, this.aspect) <= radius) {
        cell.revealed = true;
        this.clearedWeight += cell.weight;
        newlyCleared++;
      }
    }

    return newlyCleared;
  }
}
