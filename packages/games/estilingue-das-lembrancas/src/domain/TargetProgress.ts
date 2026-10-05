export type TargetId = 'wood-square' | 'gingerbread' | 'gold-star' | 'round-bauble';

export type TargetState = 'idle' | 'hit' | 'flying_to_frame' | 'completed';

export interface TargetInfo {
  readonly id: TargetId;
  readonly quadrant: 'top-left' | 'bottom-left' | 'top-right' | 'bottom-right';
  readonly displayName: string;
  readonly material: 'wood' | 'gingerbread' | 'gold-star' | 'brass-bell';
  state: TargetState;
  hitCount: number;
}

export const TARGET_IDS: readonly TargetId[] = [
  'wood-square',
  'gingerbread',
  'gold-star',
  'round-bauble',
] as const;

export class TargetProgress {
  private readonly targets: Map<TargetId, TargetInfo>;

  constructor() {
    this.targets = new Map<TargetId, TargetInfo>([
      [
        'wood-square',
        {
          id: 'wood-square',
          quadrant: 'top-left',
          displayName: 'Estrela de Madeira',
          material: 'wood',
          state: 'idle',
          hitCount: 0,
        },
      ],
      [
        'gingerbread',
        {
          id: 'gingerbread',
          quadrant: 'bottom-left',
          displayName: 'Boneco Gingerbread',
          material: 'gingerbread',
          state: 'idle',
          hitCount: 0,
        },
      ],
      [
        'gold-star',
        {
          id: 'gold-star',
          quadrant: 'top-right',
          displayName: 'Estrela Dourada',
          material: 'gold-star',
          state: 'idle',
          hitCount: 0,
        },
      ],
      [
        'round-bauble',
        {
          id: 'round-bauble',
          quadrant: 'bottom-right',
          displayName: 'Sino e Guirlanda',
          material: 'brass-bell',
          state: 'idle',
          hitCount: 0,
        },
      ],
    ]);
  }

  getTarget(id: TargetId): TargetInfo | undefined {
    return this.targets.get(id);
  }

  getAllTargets(): TargetInfo[] {
    return Array.from(this.targets.values());
  }

  isCompleted(id: TargetId): boolean {
    return this.targets.get(id)?.state === 'completed';
  }

  markHit(id: TargetId): { newlyCompleted: boolean; target: TargetInfo } | undefined {
    const target = this.targets.get(id);
    if (!target) return undefined;

    target.hitCount++;
    const wasAlreadyCompleted = target.state === 'completed';

    if (!wasAlreadyCompleted) {
      target.state = 'hit';
    }

    return {
      newlyCompleted: !wasAlreadyCompleted,
      target,
    };
  }

  markFlying(id: TargetId): void {
    const target = this.targets.get(id);
    if (target && target.state !== 'completed') {
      target.state = 'flying_to_frame';
    }
  }

  markCompleted(id: TargetId): boolean {
    const target = this.targets.get(id);
    if (!target) return false;
    const wasAlreadyCompleted = target.state === 'completed';
    target.state = 'completed';
    return !wasAlreadyCompleted;
  }

  get completedCount(): number {
    let count = 0;
    for (const t of this.targets.values()) {
      if (t.state === 'completed') count++;
    }
    return count;
  }

  get totalCount(): number {
    return this.targets.size;
  }

  get allCompleted(): boolean {
    return this.completedCount >= this.totalCount;
  }

  reset(): void {
    for (const t of this.targets.values()) {
      t.state = 'idle';
      t.hitCount = 0;
    }
  }
}
