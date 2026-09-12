import type { MosaicHintIntent } from '../../domain/MosaicHint.js';

export interface MosaicGestureOwner {
  readonly pointerId: number;
  readonly epoch: number;
}

interface ActiveGesture extends MosaicGestureOwner {
  readonly canTapRotate: boolean;
  readonly startX: number;
  readonly startY: number;
  horizontalSteps: number;
  moved: boolean;
  verticalActionUsed: boolean;
}

/**
 * Converts mural drag distance to bounded cell-relative commands. Ownership
 * and epoch remain external; this class never inspects rules or collision.
 */
export class MosaicGestureInput {
  private active: ActiveGesture | null = null;

  begin(owner: MosaicGestureOwner, x: number, y: number, canTapRotate: boolean): void {
    this.active = {
      ...owner,
      canTapRotate,
      startX: x,
      startY: y,
      horizontalSteps: 0,
      moved: false,
      verticalActionUsed: false,
    };
  }

  move(
    owner: MosaicGestureOwner,
    x: number,
    y: number,
    cellSize: number,
  ): readonly MosaicHintIntent[] {
    const active = this.active;
    if (
      active === null ||
      active.pointerId !== owner.pointerId ||
      active.epoch !== owner.epoch ||
      !Number.isFinite(cellSize) ||
      cellSize <= 0
    ) {
      return [];
    }
    const horizontal = x - active.startX;
    const vertical = y - active.startY;
    const deadZone = Math.max(6, cellSize * 0.22);
    if (Math.max(Math.abs(horizontal), Math.abs(vertical)) < deadZone) return [];
    active.moved = true;
    if (Math.abs(horizontal) >= Math.abs(vertical)) {
      return this.horizontalCommands(active, horizontal, cellSize, deadZone);
    }
    if (active.verticalActionUsed) return [];
    active.verticalActionUsed = true;
    return [vertical < 0 ? 'rotate-cw' : 'down'];
  }

  end(owner: MosaicGestureOwner): boolean {
    const active = this.active;
    if (active === null || active.pointerId !== owner.pointerId || active.epoch !== owner.epoch)
      return false;
    this.active = null;
    return active.canTapRotate && !active.moved;
  }

  cancel(): void {
    this.active = null;
  }

  private horizontalCommands(
    active: ActiveGesture,
    deltaX: number,
    cellSize: number,
    deadZone: number,
  ): readonly MosaicHintIntent[] {
    const direction = deltaX < 0 ? -1 : 1;
    // 0.78 cell creates hysteresis: a finger resting near a boundary cannot
    // alternately queue left/right with every small pointer update.
    const targetSteps =
      direction * (1 + Math.floor((Math.abs(deltaX) - deadZone) / (cellSize * 0.78)));
    const delta = Math.max(-3, Math.min(3, targetSteps - active.horizontalSteps));
    if (delta === 0) return [];
    active.horizontalSteps += delta;
    return Array.from({ length: Math.abs(delta) }, () => (delta < 0 ? 'left' : 'right'));
  }
}
