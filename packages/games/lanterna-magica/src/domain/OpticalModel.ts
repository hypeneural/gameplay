export interface Point2D {
  readonly x: number;
  readonly y: number;
}

export interface Vector2D {
  readonly x: number;
  readonly y: number;
}

export type Vector2 = Vector2D;
export type Point2 = Point2D;

export function degreesToRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function radiansToDegrees(radians: number): number {
  return (radians * 180) / Math.PI;
}

export interface RaySegment {
  readonly start: Point2D;
  readonly end: Point2D;
  readonly color: string;
}

export interface MirrorConfig {
  readonly id: string;
  readonly center: Point2D;
  readonly length: number;
  readonly angleRad: number; // Angle of the reflective line
  readonly isRotatable: boolean;
}

export interface TargetLensConfig {
  readonly center: Point2D;
  readonly radius: number;
  readonly normalAngleRad: number; // Expected direction pointing outward from lens
  readonly acceptanceConeRad: number; // Angular tolerance (e.g. 1.2 rad)
}

export interface BonusStarConfig {
  readonly id: string;
  readonly center: Point2D;
  readonly radius: number;
}

export interface LightSourceConfig {
  readonly origin: Point2D;
  readonly direction: Vector2D;
  readonly color: string;
}

export interface OpticalSimulationResult {
  readonly segments: readonly RaySegment[];
  readonly targetHit: boolean;
  readonly collectedStarIds: readonly string[];
  readonly hitElementId: string | null;
}

/**
 * Normalizes a vector to unit length.
 */
export function normalizeVector(v: Vector2D): Vector2D {
  const len = Math.hypot(v.x, v.y);
  if (len === 0) return { x: 1, y: 0 };
  return { x: v.x / len, y: v.y / len };
}

/**
 * Computes dot product between two vectors.
 */
export function dotProduct(a: Vector2D, b: Vector2D): number {
  return a.x * b.x + a.y * b.y;
}

/**
 * Normalizes an angle to [0, 2 * PI).
 */
export function normalizeAngle(rad: number): number {
  const twoPi = 2 * Math.PI;
  let a = rad % twoPi;
  if (a < 0) a += twoPi;
  return a;
}

/**
 * Snaps an angle to discrete step increments with magnet tolerance.
 */
export function snapAngle(
  angleRad: number,
  stepRad = Math.PI / 12, // 15 degrees
  magnetToleranceRad = Math.PI / 36, // 5 degrees
): number {
  const normalized = normalizeAngle(angleRad);
  const nearestIndex = Math.round(normalized / stepRad);
  const nearestAngle = nearestIndex * stepRad;
  const diff = Math.abs(normalized - nearestAngle);

  if (diff <= magnetToleranceRad) {
    return normalizeAngle(nearestAngle);
  }
  return normalized;
}

/**
 * Computes specular reflection vector: r = d - 2 * (d . n) * n
 */
export function reflectVector(incident: Vector2D, normal: Vector2D): Vector2D {
  const d = normalizeVector(incident);
  const n = normalizeVector(normal);
  const dot = dotProduct(d, n);
  return {
    x: d.x - 2 * dot * n.x,
    y: d.y - 2 * dot * n.y,
  };
}

/**
 * Line-segment intersection test with a ray from origin in direction.
 * Ray: P = origin + t * dir (t >= epsilon)
 * Segment: Q = A + u * (B - A) (0 <= u <= 1)
 */
export function intersectRayWithSegment(
  rayOrigin: Point2D,
  rayDir: Vector2D,
  segA: Point2D,
  segB: Point2D,
  epsilon = 0.001,
): { distance: number; hitPoint: Point2D; normal: Vector2D } | null {
  const dx = segB.x - segA.x;
  const dy = segB.y - segA.y;

  const cross = rayDir.x * dy - rayDir.y * dx;
  if (Math.abs(cross) < 1e-8) {
    // Parallel
    return null;
  }

  const qx = segA.x - rayOrigin.x;
  const qy = segA.y - rayOrigin.y;

  const t = (qx * dy - qy * dx) / cross;
  const u = (qx * rayDir.y - qy * rayDir.x) / cross;

  if (t > epsilon && u >= 0 && u <= 1) {
    const hitPoint: Point2D = {
      x: rayOrigin.x + t * rayDir.x,
      y: rayOrigin.y + t * rayDir.y,
    };

    // Normal perpendicular to segment (-dy, dx)
    let nx = -dy;
    let ny = dx;
    const nlen = Math.hypot(nx, ny);
    if (nlen > 0) {
      nx /= nlen;
      ny /= nlen;
    }

    // Ensure normal points against incoming ray
    if (dotProduct({ x: nx, y: ny }, rayDir) > 0) {
      nx = -nx;
      ny = -ny;
    }

    return {
      distance: t,
      hitPoint,
      normal: { x: nx, y: ny },
    };
  }

  return null;
}

/**
 * Checks if a ray segment intersects a bonus star circle.
 */
export function isPointNearSegment(p: Point2D, a: Point2D, b: Point2D, threshold: number): boolean {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const lenSq = abx * abx + aby * aby;
  if (lenSq === 0) return Math.hypot(p.x - a.x, p.y - a.y) <= threshold;

  const apx = p.x - a.x;
  const apy = p.y - a.y;
  const t = Math.max(0, Math.min(1, (apx * abx + apy * aby) / lenSq));

  const projX = a.x + t * abx;
  const projY = a.y + t * aby;
  return Math.hypot(p.x - projX, p.y - projY) <= threshold;
}

/**
 * Pure deterministic raycasting simulation for the optical board.
 */
export function simulateOptics(
  source: LightSourceConfig,
  mirrors: readonly MirrorConfig[],
  targetLens: TargetLensConfig,
  stars: readonly BonusStarConfig[] = [],
  maxBounces = 8,
  maxDistance = 1200,
): OpticalSimulationResult {
  const segments: RaySegment[] = [];
  const collectedStarIds = new Set<string>();
  let curOrigin = { ...source.origin };
  let curDir = normalizeVector(source.direction);
  let targetHit = false;
  let finalHitElementId: string | null = null;

  for (let bounce = 0; bounce < maxBounces; bounce++) {
    let closestDist = maxDistance;
    let closestHitPoint: Point2D = {
      x: curOrigin.x + curDir.x * maxDistance,
      y: curOrigin.y + curDir.y * maxDistance,
    };
    let nextDir: Vector2D | null = null;
    let hitId: string | null = null;

    // 1. Test intersection with Target Lens
    const toLensX = targetLens.center.x - curOrigin.x;
    const toLensY = targetLens.center.y - curOrigin.y;
    const projDist = dotProduct({ x: toLensX, y: toLensY }, curDir);

    if (projDist > 0 && projDist < closestDist) {
      const closestPointX = curOrigin.x + curDir.x * projDist;
      const closestPointY = curOrigin.y + curDir.y * projDist;
      const distToLensCenter = Math.hypot(
        targetLens.center.x - closestPointX,
        targetLens.center.y - closestPointY,
      );

      if (distToLensCenter <= targetLens.radius) {
        // Ray penetrates lens! Check entrance angle
        const lensNormal: Vector2D = {
          x: Math.cos(targetLens.normalAngleRad),
          y: Math.sin(targetLens.normalAngleRad),
        };
        const rayAngleDiff = Math.abs(
          Math.acos(Math.max(-1, Math.min(1, dotProduct(curDir, lensNormal)))),
        );

        // Entering lens if incoming ray faces into lens (dot product < 0 or angle ~ PI)
        if (rayAngleDiff >= Math.PI - targetLens.acceptanceConeRad) {
          closestDist = projDist;
          closestHitPoint = { x: closestPointX, y: closestPointY };
          targetHit = true;
          hitId = 'target-lens';
        }
      }
    }

    // 2. Test intersection with all mirrors
    for (const mirror of mirrors) {
      const halfL = mirror.length / 2;
      const cosA = Math.cos(mirror.angleRad);
      const sinA = Math.sin(mirror.angleRad);

      const segA: Point2D = {
        x: mirror.center.x - cosA * halfL,
        y: mirror.center.y - sinA * halfL,
      };
      const segB: Point2D = {
        x: mirror.center.x + cosA * halfL,
        y: mirror.center.y + sinA * halfL,
      };

      const hit = intersectRayWithSegment(curOrigin, curDir, segA, segB);
      if (hit && hit.distance < closestDist) {
        closestDist = hit.distance;
        closestHitPoint = hit.hitPoint;
        nextDir = reflectVector(curDir, hit.normal);
        hitId = mirror.id;
        targetHit = false; // Overwritten by closer mirror
      }
    }

    // Add ray segment
    const segment: RaySegment = {
      start: curOrigin,
      end: closestHitPoint,
      color: source.color,
    };
    segments.push(segment);

    // Check which stars were touched by this segment
    for (const star of stars) {
      if (isPointNearSegment(star.center, segment.start, segment.end, star.radius)) {
        collectedStarIds.add(star.id);
      }
    }

    if (targetHit) {
      finalHitElementId = 'target-lens';
      break;
    }

    if (!nextDir || !hitId) {
      finalHitElementId = null;
      break; // Reached boundary without hitting anything
    }

    finalHitElementId = hitId;
    curOrigin = closestHitPoint;
    curDir = nextDir;
  }

  return {
    segments,
    targetHit,
    collectedStarIds: Array.from(collectedStarIds),
    hitElementId: finalHitElementId,
  };
}
