export type MosaicInteractionZone = 'dock' | 'gesture';

export type MosaicInteractionCancelReason =
  | 'second-pointer'
  | 'pointer-canceled'
  | 'pointer-up-outside'
  | 'pause'
  | 'recovery'
  | 'blur'
  | 'hidden'
  | 'context-lost'
  | 'resize'
  | 'orientation'
  | 'shutdown'
  | 'exit';

export interface MosaicPointerOwner {
  readonly pointerId: number;
  readonly epoch: number;
  readonly zone: MosaicInteractionZone;
}

/** Grants exactly one pointer authority and invalidates pending interaction on every boundary. */
export class MosaicPointerOwnership {
  private active: MosaicPointerOwner | null = null;
  private currentEpoch = 0;

  tryAcquire(pointerId: number, zone: MosaicInteractionZone): boolean {
    if (this.active?.pointerId === pointerId) return true;
    if (this.active !== null) {
      this.cancel('second-pointer');
      return false;
    }
    this.currentEpoch += 1;
    this.active = { pointerId, epoch: this.currentEpoch, zone };
    return true;
  }

  owns(pointerId: number): boolean {
    return this.active?.pointerId === pointerId;
  }

  release(pointerId: number): boolean {
    if (!this.owns(pointerId)) return false;
    this.active = null;
    return true;
  }

  cancel(_reason: MosaicInteractionCancelReason): void {
    if (this.active === null) return;
    this.currentEpoch += 1;
    this.active = null;
  }

  get owner(): MosaicPointerOwner | null {
    return this.active;
  }

  get epoch(): number {
    return this.currentEpoch;
  }
}
