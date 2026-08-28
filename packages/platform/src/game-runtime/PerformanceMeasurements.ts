/**
 * Measurement primitives have no browser dependency. Development tooling injects
 * requestAnimationFrame so game domain code never receives a real clock.
 */

export interface TextureDimensions {
  readonly height: number;
  readonly width: number;
}

export interface FrameTimingSummary {
  readonly framesAboveThreshold: number;
  readonly p50Ms: number | undefined;
  readonly p95Ms: number | undefined;
  readonly p99Ms: number | undefined;
  readonly sampleCount: number;
  readonly thresholdMs: number;
}

export interface PresentationFrameScheduler {
  cancelFrame(requestId: number): void;
  requestFrame(callback: (timestampMs: number) => void): number;
}

/**
 * One-shot browser presentation callbacks provide the timestamps. The sampler
 * intentionally owns no real clock and records only positive deltas while the
 * caller explicitly keeps it running.
 */
export class PresentationFrameSampler {
  private active = false;
  private readonly deltasMs: number[] = [];
  private lastTimestampMs: number | undefined;
  private requestId: number | undefined;

  constructor(
    private readonly scheduler: PresentationFrameScheduler,
    private readonly thresholdMs: number,
  ) {
    assertPositiveFinite(thresholdMs, 'frame threshold');
  }

  start(): void {
    if (this.active) return;
    this.active = true;
    this.lastTimestampMs = undefined;
    this.requestNextFrame();
  }

  stop(): FrameTimingSummary {
    this.active = false;
    if (this.requestId !== undefined) this.scheduler.cancelFrame(this.requestId);
    this.requestId = undefined;
    this.lastTimestampMs = undefined;
    return this.summary();
  }

  reset(): void {
    if (this.active) throw new Error('Stop the presentation frame sampler before resetting it.');
    this.deltasMs.length = 0;
  }

  summary(): FrameTimingSummary {
    return summarizeFrameDeltas(this.deltasMs, this.thresholdMs);
  }

  private requestNextFrame(): void {
    this.requestId = this.scheduler.requestFrame((timestampMs) => {
      this.requestId = undefined;
      if (!this.active) return;
      this.recordTimestamp(timestampMs);
      this.requestNextFrame();
    });
  }

  private recordTimestamp(timestampMs: number): void {
    if (!Number.isFinite(timestampMs)) return;
    const previousTimestampMs = this.lastTimestampMs;
    this.lastTimestampMs = timestampMs;
    if (previousTimestampMs === undefined) return;
    const deltaMs = timestampMs - previousTimestampMs;
    if (deltaMs > 0) this.deltasMs.push(deltaMs);
  }
}

/** Conservative decoded RGBA texture estimate; it is not total GPU memory. */
export function estimateDecodedRgbaTextureBytes(dimensions: TextureDimensions): number {
  assertPositiveSafeInteger(dimensions.width, 'texture width');
  assertPositiveSafeInteger(dimensions.height, 'texture height');
  const bytes = dimensions.width * dimensions.height * 4;
  if (!Number.isSafeInteger(bytes)) throw new Error('Decoded texture byte estimate is unsafe.');
  return bytes;
}

export function summarizeFrameDeltas(
  deltasMs: readonly number[],
  thresholdMs: number,
): FrameTimingSummary {
  assertPositiveFinite(thresholdMs, 'frame threshold');
  const samples = deltasMs.filter((deltaMs) => Number.isFinite(deltaMs) && deltaMs > 0);
  const sorted = [...samples].sort((left, right) => left - right);
  return {
    framesAboveThreshold: samples.filter((deltaMs) => deltaMs > thresholdMs).length,
    p50Ms: percentile(sorted, 0.5),
    p95Ms: percentile(sorted, 0.95),
    p99Ms: percentile(sorted, 0.99),
    sampleCount: samples.length,
    thresholdMs,
  };
}

function percentile(sortedValues: readonly number[], ratio: number): number | undefined {
  if (sortedValues.length === 0) return undefined;
  return sortedValues[Math.ceil(sortedValues.length * ratio) - 1];
}

function assertPositiveFinite(value: number, label: string): void {
  if (!Number.isFinite(value) || value <= 0)
    throw new Error(`${label} must be positive and finite.`);
}

function assertPositiveSafeInteger(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${label} must be a positive safe integer.`);
  }
}
