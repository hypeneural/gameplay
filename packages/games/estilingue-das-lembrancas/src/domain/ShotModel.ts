export interface Vector2D {
  readonly x: number;
  readonly y: number;
}

export interface PullCalculation {
  readonly restPosition: Vector2D;
  readonly pointerPosition: Vector2D;
  readonly pullVector: Vector2D; // rest - pointer (points forward towards launch)
  readonly dragVector: Vector2D; // pointer - rest (points backward where finger pulled)
  readonly rawDistance: number;
  readonly clampedDistance: number;
  readonly powerRatio: number; // 0.0 to 1.0
  readonly isValidPull: boolean; // distance >= minPull && in valid cone
  readonly isWithinCone: boolean;
  readonly clampedPouchPosition: Vector2D;
  readonly launchVelocity: Vector2D;
  readonly launchAngleRad: number;
}

export type ImpactClass = 'none' | 'soft' | 'valid' | 'hard';

/**
 * Checks if a pull vector (drag from rest towards finger) falls within the valid downward cone.
 * In screen space (Y positive downwards), a backward pull moves down and sideways (dy >= 0).
 * Default cone angle is ~108 degrees (1.90 rad) centered on downward vector (0, 1).
 */
export function isPullWithinCone(dragX: number, dragY: number, coneAngleRad = 3.05): boolean {
  if (dragX === 0 && dragY === 0) return false;
  // Dragging upward into the sky towards the targets is invalid
  if (dragY < -20) return false;
  // Angle of drag vector: 0 = right, PI/2 = down, PI = left, -PI/2 = up
  const angle = Math.atan2(dragY, dragX);
  const targetAngle = Math.PI / 2; // Straight down
  let diff = Math.abs(angle - targetAngle);
  if (diff > Math.PI) {
    diff = 2 * Math.PI - diff;
  }
  return diff <= coneAngleRad / 2;
}

/**
 * Pure deterministic pull computation.
 */
export function calculatePull(
  restPosition: Vector2D,
  pointerPosition: Vector2D,
  maxPull: number,
  minPull: number,
  velocityMultiplier = 0.27,
  coneAngleRad = 3.05,
): PullCalculation {
  const dragX = pointerPosition.x - restPosition.x;
  const dragY = pointerPosition.y - restPosition.y;
  const rawDistance = Math.hypot(dragX, dragY);

  const isWithinCone = isPullWithinCone(dragX, dragY, coneAngleRad);
  const clampedDistance = Math.min(rawDistance, maxPull);
  const powerRatio = maxPull > 0 ? clampedDistance / maxPull : 0;

  const nx = rawDistance > 0 ? dragX / rawDistance : 0;
  const ny = rawDistance > 0 ? dragY / rawDistance : 0;

  const clampedPouchPosition: Vector2D = {
    x: restPosition.x + nx * clampedDistance,
    y: restPosition.y + ny * clampedDistance,
  };

  // Launch vector is opposite to drag vector (rest - pointer)
  const pullX = -dragX;
  const pullY = -dragY;
  const pullLen = Math.hypot(pullX, pullY);
  const launchDirX = pullLen > 0 ? pullX / pullLen : 0;
  const launchDirY = pullLen > 0 ? pullY / pullLen : 0;

  const launchSpeed = clampedDistance * velocityMultiplier;
  const launchVelocity: Vector2D = {
    x: launchDirX * launchSpeed,
    y: launchDirY * launchSpeed,
  };

  const launchAngleRad = Math.atan2(launchVelocity.y, launchVelocity.x);
  const isValidPull = isWithinCone && clampedDistance >= minPull;

  return {
    restPosition,
    pointerPosition,
    pullVector: { x: pullX, y: pullY },
    dragVector: { x: dragX, y: dragY },
    rawDistance,
    clampedDistance,
    powerRatio,
    isValidPull,
    isWithinCone,
    clampedPouchPosition,
    launchVelocity,
    launchAngleRad,
  };
}

/**
 * Computes squash & stretch multipliers along the launch direction.
 */
export function calculateSquashStretch(
  launchAngleRad: number,
  stretchFactor = 0.15,
): { scaleX: number; scaleY: number } {
  const cos = Math.abs(Math.cos(launchAngleRad));
  const sin = Math.abs(Math.sin(launchAngleRad));
  return {
    scaleX: 1.0 + cos * stretchFactor,
    scaleY: 1.0 + sin * stretchFactor,
  };
}

/**
 * Computes relative speed between two moving bodies.
 */
export function calculateRelativeSpeed(velA: Vector2D, velB: Vector2D): number {
  const rvx = velA.x - velB.x;
  const rvy = velA.y - velB.y;
  return Math.hypot(rvx, rvy);
}

/**
 * Classifies an impact speed into discrete feedback tiers.
 */
export function classifyImpact(
  relativeSpeed: number,
  softThreshold = 3.5,
  validThreshold = 6.0,
  hardThreshold = 13.0,
): ImpactClass {
  if (relativeSpeed < softThreshold) return 'none';
  if (relativeSpeed < validThreshold) return 'soft';
  if (relativeSpeed < hardThreshold) return 'valid';
  return 'hard';
}
