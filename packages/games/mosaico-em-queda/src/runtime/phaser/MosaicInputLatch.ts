import type { MosaicInputFrame } from '../../domain/EngineTypes.js';
import { emptyMosaicInput } from '../../domain/MosaicSimulation.js';

/** Translates runtime pointer edges and holds into one deterministic engine input frame. */
export class MosaicInputLatch {
  private readonly queuedHorizontal: ('left' | 'right')[] = [];
  private leftHeld = false;
  private rightHeld = false;
  private leftPressed = false;
  private rightPressed = false;
  private rotateCWPressed = false;
  private softDropPressed = false;

  pressLeft(): void {
    this.leftHeld = true;
    this.leftPressed = true;
  }

  pressRight(): void {
    this.rightHeld = true;
    this.rightPressed = true;
  }

  /** Gesture movement may cross more than one cell; drain at most one per fixed step. */
  queueHorizontal(direction: 'left' | 'right'): void {
    if (this.queuedHorizontal.length >= 4) return;
    this.queuedHorizontal.push(direction);
  }

  pressRotateCW(): void {
    this.rotateCWPressed = true;
  }

  pressSoftDrop(): void {
    this.softDropPressed = true;
  }

  releaseHorizontal(): void {
    this.leftHeld = false;
    this.rightHeld = false;
  }

  clear(): void {
    this.leftHeld = false;
    this.rightHeld = false;
    this.leftPressed = false;
    this.rightPressed = false;
    this.rotateCWPressed = false;
    this.softDropPressed = false;
    this.queuedHorizontal.length = 0;
  }

  consumeFrame(): MosaicInputFrame {
    const queuedDirection = this.queuedHorizontal.shift();
    const frame: MosaicInputFrame = {
      ...emptyMosaicInput(),
      leftHeld: this.leftHeld,
      rightHeld: this.rightHeld,
      leftPressed: this.leftPressed || queuedDirection === 'left',
      rightPressed: this.rightPressed || queuedDirection === 'right',
      rotateCWPressed: this.rotateCWPressed,
      softDropPressed: this.softDropPressed,
    };
    this.leftPressed = false;
    this.rightPressed = false;
    this.rotateCWPressed = false;
    this.softDropPressed = false;
    return frame;
  }
}
