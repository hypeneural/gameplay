export interface TrajectoryPoint {
  x: number;
  y: number;
}

export interface TrajectorySimulationConfig {
  radius: number;
  mass: number;
  frictionAir: number;
  totalSteps: number;
  framesPerDot: number;
  deltaMs: number;
}

/**
 * TrajectoryPredictor simulating ballistic flight matching Matter engine integration:
 * Applies gravity acceleration, velocity damping (frictionAir), and frame accumulation.
 */
export class TrajectoryPredictor {
  constructor(private readonly gravity: { x: number; y: number; scale: number }) {}

  simulate(
    startX: number,
    startY: number,
    velocityX: number,
    velocityY: number,
    config: TrajectorySimulationConfig,
  ): TrajectoryPoint[] {
    const points: TrajectoryPoint[] = [];
    let curX = startX;
    let curY = startY;
    let vx = velocityX;
    let vy = velocityY;

    const deltaTime = config.deltaMs;
    const deltaTimeSquared = deltaTime * deltaTime;
    const baseDelta = 1000 / 60;
    const frictionFactor = 1 - config.frictionAir * (deltaTime / baseDelta);

    const gravForceX = this.gravity.x * this.gravity.scale * deltaTimeSquared;
    const gravForceY = this.gravity.y * this.gravity.scale * deltaTimeSquared;

    const totalFrames = config.totalSteps * config.framesPerDot;

    for (let i = 0; i < totalFrames; i++) {
      vx = vx * frictionFactor + gravForceX;
      vy = vy * frictionFactor + gravForceY;

      curX += vx;
      curY += vy;

      if ((i + 1) % config.framesPerDot === 0) {
        points.push({
          x: curX,
          y: curY,
        });
      }
    }

    return points;
  }

  destroy(): void {
    // No persistent allocated native resources to clear
  }
}
