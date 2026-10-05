import { TargetProgress, type TargetId } from './TargetProgress.js';
import { FrameProgress } from './FrameProgress.js';

export class GameProgress {
  public readonly targets: TargetProgress;
  public readonly frame: FrameProgress;
  public totalShots = 0;
  public totalHits = 0;
  public isCompleted = false;

  constructor() {
    this.targets = new TargetProgress();
    this.frame = new FrameProgress();
  }

  recordShot(): void {
    this.totalShots++;
  }

  recordHit(targetId: TargetId): {
    newlyCompletedTarget: boolean;
    allCompletedNow: boolean;
  } {
    this.totalHits++;
    const hitResult = this.targets.markHit(targetId);
    const newlyCompletedTarget = hitResult?.newlyCompleted ?? false;

    if (newlyCompletedTarget) {
      this.targets.markCompleted(targetId);
      this.frame.activateByTargetId(targetId);
    }

    const allCompletedNow = this.targets.allCompleted && !this.isCompleted;
    if (allCompletedNow) {
      this.isCompleted = true;
    }

    return {
      newlyCompletedTarget,
      allCompletedNow,
    };
  }

  get progressRatio(): number {
    return this.targets.completedCount / this.targets.totalCount;
  }

  get accuracy(): number {
    return this.totalShots > 0 ? this.totalHits / this.totalShots : 0;
  }

  reset(): void {
    this.totalShots = 0;
    this.totalHits = 0;
    this.isCompleted = false;
    this.targets.reset();
    this.frame.reset();
  }
}
