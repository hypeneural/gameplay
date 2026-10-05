import type { TargetId } from './TargetProgress.js';

export interface FrameSegment {
  readonly index: number;
  readonly targetId: TargetId;
  readonly quadrant: 'top-left' | 'bottom-left' | 'top-right' | 'bottom-right';
  active: boolean;
  intensity: number; // 0.0 to 1.0
}

export class FrameProgress {
  private readonly segments: FrameSegment[];

  constructor() {
    this.segments = [
      { index: 0, targetId: 'wood-square', quadrant: 'top-left', active: false, intensity: 0 },
      { index: 1, targetId: 'gingerbread', quadrant: 'bottom-left', active: false, intensity: 0 },
      { index: 2, targetId: 'gold-star', quadrant: 'top-right', active: false, intensity: 0 },
      { index: 3, targetId: 'round-bauble', quadrant: 'bottom-right', active: false, intensity: 0 },
    ];
  }

  getSegment(index: number): FrameSegment | undefined {
    return this.segments[index];
  }

  getSegmentByTargetId(targetId: TargetId): FrameSegment | undefined {
    return this.segments.find((s) => s.targetId === targetId);
  }

  getAllSegments(): readonly FrameSegment[] {
    return this.segments;
  }

  activateByTargetId(targetId: TargetId): boolean {
    const segment = this.getSegmentByTargetId(targetId);
    if (!segment || segment.active) return false;
    segment.active = true;
    segment.intensity = 1.0;
    return true;
  }

  activateIndex(index: number): boolean {
    const segment = this.segments[index];
    if (!segment || segment.active) return false;
    segment.active = true;
    segment.intensity = 1.0;
    return true;
  }

  get activeCount(): number {
    return this.segments.filter((s) => s.active).length;
  }

  get isFullyLit(): boolean {
    return this.activeCount >= this.segments.length;
  }

  /**
   * Warm glow scale around the photo: 0/4 = 0%, 1/4 = +3%, 2/4 = +7%, 3/4 = +12%, 4/4 = +25% (hero)
   */
  get frameGlowBonus(): number {
    const count = this.activeCount;
    switch (count) {
      case 1:
        return 0.03;
      case 2:
        return 0.07;
      case 3:
        return 0.12;
      case 4:
        return 0.25;
      default:
        return 0;
    }
  }

  reset(): void {
    for (const s of this.segments) {
      s.active = false;
      s.intensity = 0;
    }
  }
}
