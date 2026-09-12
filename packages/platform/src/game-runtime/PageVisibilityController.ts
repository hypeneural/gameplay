import type { GameRun } from '../contracts/index.js';

interface VisibilityDocument {
  visibilityState: string;
  addEventListener(type: 'visibilitychange', listener: () => void): void;
  removeEventListener(type: 'visibilitychange', listener: () => void): void;
}

/** Pauses only product time/state; Phaser 4 handles its render loop itself. */
export class PageVisibilityController {
  constructor(
    private readonly document: VisibilityDocument,
    private readonly run: Pick<GameRun, 'pause' | 'resume'>,
  ) {}

  attach(): () => void {
    const onChange = (): void => {
      if (this.document.visibilityState === 'hidden') {
        this.run.pause('visibility');
      } else if (this.document.visibilityState === 'visible') {
        this.run.resume('visibility');
      }
    };

    this.document.addEventListener('visibilitychange', onChange);
    onChange();
    return () => this.document.removeEventListener('visibilitychange', onChange);
  }
}
