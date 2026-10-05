export interface PouchPhysicsConfig {
  snapAcceleration: number;
  snapDeceleration: number;
  stiffness: number;
  settleDamping: number;
  overshootMultiplier: number;
  distanceThreshold: number;
  speedThreshold: number;
}

const DEFAULT_POUCH_CONFIG: PouchPhysicsConfig = {
  snapAcceleration: 0.42,
  snapDeceleration: 0.82,
  stiffness: 0.18,
  settleDamping: 0.85,
  overshootMultiplier: 1.25,
  distanceThreshold: 1.5,
  speedThreshold: 0.8,
};

export type PouchSnapPhase = 'idle' | 'snap' | 'overshoot' | 'settle';

export class PouchPhysics {
  x: number;
  y: number;
  vx = 0;
  vy = 0;
  private phase: PouchSnapPhase = 'idle';
  private intensity = 0;
  private timer = 0;
  private readonly config: PouchPhysicsConfig;

  constructor(
    public restX: number,
    public restY: number,
    config: Partial<PouchPhysicsConfig> = {},
  ) {
    this.x = restX;
    this.y = restY;
    this.config = { ...DEFAULT_POUCH_CONFIG, ...config };
  }

  get snapPhase(): PouchSnapPhase {
    return this.phase;
  }

  isIdle(): boolean {
    return this.phase === 'idle';
  }

  setPosition(x: number, y: number): void {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.phase = 'idle';
  }

  startWhip(startX: number, startY: number, intensity: number): void {
    this.x = startX;
    this.y = startY;
    this.intensity = Math.max(0.1, Math.min(1.0, intensity));

    const dx = this.restX - startX;
    const dy = this.restY - startY;
    const initialSpeed = 0.28 + this.intensity * 0.45;

    this.vx = dx * initialSpeed;
    this.vy = dy * initialSpeed;
    this.phase = 'snap';
    this.timer = 0;
  }

  update(dt = 1): boolean {
    if (this.phase === 'idle') return true;

    this.timer += dt;
    const dx = this.restX - this.x;
    const dy = this.restY - this.y;
    const dist = Math.hypot(dx, dy);
    const speed = Math.hypot(this.vx, this.vy);

    switch (this.phase) {
      case 'snap': {
        const force = this.config.snapAcceleration * (0.8 + this.intensity * 0.6);
        this.vx += dx * force;
        this.vy += dy * force;

        if (dist < 12 || this.timer > 8) {
          this.phase = 'overshoot';
          this.timer = 0;
        }
        break;
      }

      case 'overshoot': {
        this.vx = (this.vx + dx * 0.12) * this.config.snapDeceleration;
        this.vy = (this.vy + dy * 0.12) * this.config.snapDeceleration;

        if (speed < 4.0 || this.timer > 6) {
          this.phase = 'settle';
          this.timer = 0;
        }
        break;
      }

      case 'settle': {
        const springX = dx * this.config.stiffness * this.config.overshootMultiplier;
        const springY = dy * this.config.stiffness * this.config.overshootMultiplier;
        this.vx = (this.vx + springX) * this.config.settleDamping;
        this.vy = (this.vy + springY) * this.config.settleDamping;

        if (dist < this.config.distanceThreshold && speed < this.config.speedThreshold) {
          this.x = this.restX;
          this.y = this.restY;
          this.vx = 0;
          this.vy = 0;
          this.phase = 'idle';
          return true;
        }
        break;
      }
    }

    this.x += this.vx;
    this.y += this.vy;
    return false;
  }

  reset(): void {
    this.x = this.restX;
    this.y = this.restY;
    this.vx = 0;
    this.vy = 0;
    this.phase = 'idle';
    this.timer = 0;
    this.intensity = 0;
  }
}
