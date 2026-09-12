import { containsPoint, photoDistanceToSegment } from './PhotoGeometry.js';
import type { NormalizedRect, Point } from './PhotoGeometry.js';

export interface IceCell extends Point {
  eligible: boolean;
  revealed: boolean;
}

/** A bounded logical grid; no pixel reads, browser APIs, or per-frame allocations. */
export class IceGrid {
  readonly cells: IceCell[];
  readonly columns: number;
  readonly rows: number;
  readonly eligibleCount: number;
  private cleared = 0;

  constructor(
    readonly aspect: number,
    safeZone?: NormalizedRect,
  ) {
    if (!Number.isFinite(aspect) || aspect <= 0) throw new Error('Invalid photo aspect ratio');
    this.columns = Math.min(48, Math.round(20 * Math.max(1, aspect)));
    this.rows = Math.min(48, Math.round(20 * Math.max(1, 1 / aspect)));
    this.cells = Array.from({ length: this.columns * this.rows }, (_, index) => {
      const point = {
        x: ((index % this.columns) + 0.5) / this.columns,
        y: (Math.floor(index / this.columns) + 0.5) / this.rows,
      };
      return { ...point, eligible: !safeZone || !containsPoint(safeZone, point), revealed: false };
    });
    // Bad subject metadata must not produce NaN or an unwinnable round.
    if (!this.cells.some((cell) => cell.eligible))
      this.cells.forEach((cell) => {
        cell.eligible = true;
      });
    this.eligibleCount = this.cells.filter((cell) => cell.eligible).length;
  }

  get progress(): number {
    return this.cleared / this.eligibleCount;
  }

  scratch(from: Point, to: Point, radius = 0.105): number {
    if (![from.x, from.y, to.x, to.y, radius].every(Number.isFinite) || radius <= 0) return 0;
    let added = 0;
    for (const cell of this.cells) {
      if (!cell.revealed && photoDistanceToSegment(cell, from, to, this.aspect) <= radius) {
        cell.revealed = true;
        if (cell.eligible) {
          this.cleared++;
          added++;
        }
      }
    }
    return added;
  }
}
