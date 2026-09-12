import type {
  MosaicInteractionCancelReason,
  MosaicPointerOwnership,
} from './MosaicPointerOwnership.js';
import type { MosaicGestureInput } from './MosaicGestureInput.js';
import type { MosaicInputLatch } from './MosaicInputLatch.js';

export interface MosaicPointerLike {
  readonly pointerId: number;
  readonly wasCanceled: boolean;
  readonly x: number;
  readonly y: number;
}

export interface MosaicPointerEnd {
  readonly owned: boolean;
  readonly tapRotates: boolean;
}

/**
 * Owns only the mural gesture transaction. Dock commands continue through
 * MosaicDockInput, sharing the same pointer arbiter without a second rule path.
 */
export class MosaicInputController {
  constructor(
    private readonly ownership: MosaicPointerOwnership,
    private readonly gesture: MosaicGestureInput,
    private readonly input: MosaicInputLatch,
  ) {}

  beginMural(pointer: MosaicPointerLike, canTapRotate: boolean): boolean {
    if (pointer.wasCanceled) {
      this.cancel('pointer-canceled');
      return false;
    }
    const owner = this.ownership.owner;
    if (owner !== null && !this.ownership.owns(pointer.pointerId)) {
      this.cancel('second-pointer');
      return false;
    }
    if (owner !== null || !this.ownership.tryAcquire(pointer.pointerId, 'gesture')) return false;
    const gestureOwner = this.ownership.owner;
    if (gestureOwner === null) return false;
    this.gesture.begin(gestureOwner, pointer.x, pointer.y, canTapRotate);
    return true;
  }

  moveMural(pointer: MosaicPointerLike, cellSize: number): void {
    const owner = this.ownership.owner;
    if (owner === null || owner.zone !== 'gesture' || !this.ownership.owns(pointer.pointerId))
      return;
    if (pointer.wasCanceled) {
      this.cancel('pointer-canceled');
      return;
    }
    for (const action of this.gesture.move(owner, pointer.x, pointer.y, cellSize)) {
      if (action === 'left' || action === 'right') this.input.queueHorizontal(action);
      else if (action === 'rotate-cw') this.input.pressRotateCW();
      else this.input.pressSoftDrop();
    }
  }

  end(pointer: MosaicPointerLike): MosaicPointerEnd {
    if (!this.ownership.owns(pointer.pointerId)) return { owned: false, tapRotates: false };
    if (pointer.wasCanceled) {
      this.cancel('pointer-canceled');
      return { owned: true, tapRotates: false };
    }
    const owner = this.ownership.owner;
    const tapRotates = owner?.zone === 'gesture' && this.gesture.end(owner);
    this.ownership.release(pointer.pointerId);
    this.input.releaseHorizontal();
    if (tapRotates) this.input.pressRotateCW();
    return { owned: true, tapRotates };
  }

  cancel(reason: MosaicInteractionCancelReason): void {
    this.ownership.cancel(reason);
    this.gesture.cancel();
    this.input.clear();
  }
}
