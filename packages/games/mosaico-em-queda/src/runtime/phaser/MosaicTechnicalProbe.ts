import { FrameBudgetMonitor, PresentationFrameSampler } from '@christmas-games/platform';
import type {
  FrameBudgetDecision,
  FrameTimingSummary,
  PresentationFrameScheduler,
  QualityTier,
} from '@christmas-games/platform';

export interface MosaicTechnicalResourceSnapshot {
  readonly canvasCount: number;
  /** Conservative width × height × RGBA estimate; never a claim of GPU memory. */
  readonly decodedTextureBytes: number;
  readonly effectCount: number;
  readonly presenterCount: number;
  readonly runTextureCount: number;
  readonly textureCount: number;
}

export interface MosaicTechnicalSnapshot {
  readonly contextLossCount: number;
  readonly frameBudget: FrameBudgetDecision;
  readonly frames: FrameTimingSummary;
  readonly resources: MosaicTechnicalResourceSnapshot;
}

/** Local-only composition of shared metrics; it never emits telemetry or inspects photos. */
export class MosaicTechnicalProbe {
  private readonly sampler: PresentationFrameSampler;
  private readonly budget: FrameBudgetMonitor;
  private latestBudget: FrameBudgetDecision;
  private contextLossCount = 0;

  constructor(scheduler: PresentationFrameScheduler, quality: QualityTier) {
    this.sampler = new PresentationFrameSampler(scheduler, 33);
    this.budget = new FrameBudgetMonitor({ initialTier: quality });
    this.latestBudget = { tier: quality, measuredFrames: 0, locked: false };
  }

  start(): void {
    this.sampler.start();
  }

  pause(): FrameTimingSummary {
    return this.sampler.stop();
  }

  resume(): void {
    this.sampler.start();
  }

  stop(): FrameTimingSummary {
    return this.sampler.stop();
  }

  recordPresentationDelta(deltaMs: number): void {
    this.latestBudget = this.budget.record(deltaMs);
  }

  recordContextLoss(): void {
    this.contextLossCount += 1;
  }

  snapshot(resources: MosaicTechnicalResourceSnapshot): MosaicTechnicalSnapshot {
    return {
      contextLossCount: this.contextLossCount,
      frameBudget: this.latestBudget,
      frames: this.sampler.summary(),
      resources,
    };
  }
}
