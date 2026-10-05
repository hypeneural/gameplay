export interface ChargeSnapshot {
  readonly chargeProgress: number;
  readonly remainingSeconds: number;
  readonly displayDigit: number;
  readonly isCharging: boolean;
  readonly isOvercharged: boolean;
}

export interface PhotonChargeOptions {
  totalDurationSec?: number;
  decayRatePerSec?: number;
}

export class PhotonChargeModel {
  private currentChargeSec = 0;
  private readonly totalDurationSec: number;
  private readonly decayRatePerSec: number;

  constructor(options?: PhotonChargeOptions) {
    this.totalDurationSec = Math.max(1, options?.totalDurationSec ?? 5.0);
    this.decayRatePerSec = Math.max(0, options?.decayRatePerSec ?? 0.2);
  }

  get chargeProgress(): number {
    return Math.min(1, this.currentChargeSec / this.totalDurationSec);
  }

  get remainingSeconds(): number {
    return Math.max(0, this.totalDurationSec - this.currentChargeSec);
  }

  get displayDigit(): number {
    if (this.currentChargeSec >= this.totalDurationSec) return 0;
    return Math.max(1, Math.ceil(this.remainingSeconds));
  }

  get isOvercharged(): boolean {
    return this.currentChargeSec >= this.totalDurationSec;
  }

  get jitterIntensity(): number {
    return Math.pow(this.chargeProgress, 1.8);
  }

  update(dt: number, isBeamHittingTarget: boolean): ChargeSnapshot {
    if (this.isOvercharged) {
      return this.getSnapshot(false);
    }

    if (isBeamHittingTarget) {
      this.currentChargeSec = Math.min(
        this.totalDurationSec,
        this.currentChargeSec + Math.max(0, dt),
      );
    } else if (this.currentChargeSec > 0) {
      // Gentle decay when unlit so child can realign without losing all progress immediately
      this.currentChargeSec = Math.max(
        0,
        this.currentChargeSec - Math.max(0, dt) * this.decayRatePerSec * this.totalDurationSec,
      );
    }

    return this.getSnapshot(isBeamHittingTarget && !this.isOvercharged);
  }

  reset(): void {
    this.currentChargeSec = 0;
  }

  getSnapshot(isCharging = false): ChargeSnapshot {
    return {
      chargeProgress: this.chargeProgress,
      remainingSeconds: this.remainingSeconds,
      displayDigit: this.displayDigit,
      isCharging,
      isOvercharged: this.isOvercharged,
    };
  }
}
