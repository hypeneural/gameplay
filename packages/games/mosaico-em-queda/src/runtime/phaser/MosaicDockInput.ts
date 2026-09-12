import type { MosaicInputLatch } from './MosaicInputLatch.js';
import type { MosaicPointerOwnership } from './MosaicPointerOwnership.js';

export type MosaicDockAction = 'left' | 'rotate-cw' | 'right' | 'down';

export interface MosaicDockPointer {
  readonly pointerId: number;
  readonly wasCanceled: boolean;
}

/** Converts a confirmed dock press into deterministic engine input without Phaser state. */
export class MosaicDockInput {
  constructor(
    private readonly ownership: MosaicPointerOwnership,
    private readonly input: MosaicInputLatch,
  ) {}

  press(action: MosaicDockAction, pointer: MosaicDockPointer): boolean {
    if (pointer.wasCanceled) {
      this.ownership.cancel('pointer-canceled');
      this.input.clear();
      return false;
    }
    if (!this.ownership.tryAcquire(pointer.pointerId, 'dock')) {
      this.input.clear();
      return false;
    }
    if (action === 'left') this.input.pressLeft();
    else if (action === 'right') this.input.pressRight();
    else if (action === 'rotate-cw') this.input.pressRotateCW();
    else this.input.pressSoftDrop();
    return true;
  }
}
