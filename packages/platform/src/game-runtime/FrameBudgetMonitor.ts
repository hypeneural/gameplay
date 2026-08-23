import type { QualityTier } from '../contracts/index.js';

export interface FrameBudgetDecision {
  tier: QualityTier;
  measuredFrames: number;
  locked: boolean;
}

export interface FrameBudgetOptions {
  initialTier?: QualityTier;
  sampleSize?: number;
  p95BudgetMs?: number;
}

/**
 * Samples only the opening window and lowers quality at most once. This avoids
 * a noisy per-frame quality switch while protecting weak mobile devices.
 */
export class FrameBudgetMonitor {
  private readonly samples: number[] = [];
  private readonly sampleSize: number;
  private readonly p95BudgetMs: number;
  private tier: QualityTier;
  private locked = false;

  constructor(options: FrameBudgetOptions = {}) {
    this.tier = options.initialTier ?? 'NORMAL';
    this.sampleSize = options.sampleSize ?? 90;
    this.p95BudgetMs = options.p95BudgetMs ?? 28;
    if (!Number.isInteger(this.sampleSize) || this.sampleSize < 10 || this.p95BudgetMs <= 0) {
      throw new Error('Frame budget settings are invalid.');
    }
  }

  record(deltaMs: number): FrameBudgetDecision {
    if (this.locked || !Number.isFinite(deltaMs) || deltaMs <= 0) return this.decision();
    this.samples.push(deltaMs);
    if (this.samples.length >= this.sampleSize) {
      const sorted = [...this.samples].sort((left, right) => left - right);
      const p95 = sorted[Math.ceil(sorted.length * 0.95) - 1]!;
      if (p95 > this.p95BudgetMs) this.tier = lowerTier(this.tier);
      this.locked = true;
    }
    return this.decision();
  }

  private decision(): FrameBudgetDecision {
    return { tier: this.tier, measuredFrames: this.samples.length, locked: this.locked };
  }
}

function lowerTier(tier: QualityTier): QualityTier {
  if (tier === 'HIGH') return 'NORMAL';
  return 'LOW';
}
