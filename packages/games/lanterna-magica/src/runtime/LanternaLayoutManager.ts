import type { Photo } from '@christmas-games/platform';
import { createPhotoSurface, type PhotoSurface, type Rect } from '@christmas-games/platform';
import type { PuzzleLevel } from '../domain/LanternPuzzleLevels.js';
import type { Vector2 } from '../domain/OpticalModel.js';

export interface OpticalMirrorLayout {
  id: string;
  name: string;
  center: Vector2;
  radius: number;
  touchRadius: number;
  initialAngleDeg: number;
  expectedAngleDeg?: number | undefined;
}

export interface StarLayout {
  id: string;
  center: Vector2;
  radius: number;
}

export interface EmitterLayout {
  center: Vector2;
  directionDeg: number;
  radius: number;
}

export interface TargetLensLayout {
  center: Vector2;
  radius: number;
  normalDeg: number;
}

export interface LanternaLayout {
  viewport: { width: number; height: number };
  tableBounds: Rect;
  projectionScreenBounds: Rect;
  photoSurface?: PhotoSurface | undefined;
  emitter: EmitterLayout;
  targetLens: TargetLensLayout;
  mirrors: OpticalMirrorLayout[];
  stars: StarLayout[];
  hud: {
    instructionY: number;
    starsY: number;
  };
}

export class LanternaLayoutManager {
  static calculateLayout(
    viewportWidth: number,
    viewportHeight: number,
    level: PuzzleLevel,
    photo?: Pick<Photo, 'aspectRatio' | 'width' | 'height'>,
  ): LanternaLayout {
    const width = Math.max(320, viewportWidth);
    const height = Math.max(480, viewportHeight);

    // Safe paddings
    const horizontalMargin = Math.max(16, Math.round(width * 0.04));
    const safeTop = Math.max(20, Math.round(height * 0.04));
    const safeBottom = Math.max(20, Math.round(height * 0.03));

    // Projection Screen / Lantern housing at the top
    const screenTop = safeTop + 40;
    const screenHeight = Math.min(220, Math.round(height * 0.26));
    const screenWidth = width - horizontalMargin * 2;
    const projectionScreenBounds: Rect = {
      x: horizontalMargin,
      y: screenTop,
      width: screenWidth,
      height: screenHeight,
    };

    // Calculate proportional photo surface if photo is provided
    let photoSurface: PhotoSurface | undefined;
    if (photo && photo.aspectRatio > 0) {
      // Frame inner area leaves a rich baroque gold rim
      const innerPadding = 12;
      const photoFrame: Rect = {
        x: projectionScreenBounds.x + innerPadding,
        y: projectionScreenBounds.y + innerPadding,
        width: Math.max(20, projectionScreenBounds.width - innerPadding * 2),
        height: Math.max(20, projectionScreenBounds.height - innerPadding * 2),
      };
      photoSurface = createPhotoSurface(photo, photoFrame, 'contain');
    }

    // Optical Table (Mahogany workshop surface) occupying the middle & lower screen
    const tableTop = projectionScreenBounds.y + projectionScreenBounds.height + 14;
    const tableBottom = height - safeBottom - 48; // room for bottom hint
    const tableWidth = width - horizontalMargin * 2;
    const tableHeight = Math.max(200, tableBottom - tableTop);

    const tableBounds: Rect = {
      x: horizontalMargin,
      y: tableTop,
      width: tableWidth,
      height: tableHeight,
    };

    // Transform normalized level coordinates into table pixel coordinates
    const toPixels = (rel: Vector2): Vector2 => ({
      x: tableBounds.x + rel.x * tableBounds.width,
      y: tableBounds.y + rel.y * tableBounds.height,
    });

    const emitter: EmitterLayout = {
      center: toPixels(level.emitter.relPosition),
      directionDeg: level.emitter.directionDeg,
      radius: 28,
    };

    const targetLens: TargetLensLayout = {
      center: toPixels(level.targetLens.relPosition),
      radius: level.targetLens.radius,
      normalDeg: level.targetLens.normalDeg,
    };

    const mirrors: OpticalMirrorLayout[] = level.mirrors.map((m) => {
      const center = toPixels(m.relPosition);
      // Ensure primary touch target is at least 64px diameter (radius 32px)
      const touchRadius = Math.max(32, m.radius + 6);
      return {
        id: m.id,
        name: m.name,
        center,
        radius: m.radius,
        touchRadius,
        initialAngleDeg: m.initialAngleDeg,
        expectedAngleDeg: m.expectedAngleDeg,
      };
    });

    const stars: StarLayout[] = level.stars.map((s) => ({
      id: s.id,
      center: toPixels(s.relPosition),
      radius: s.radius,
    }));

    const hud = {
      instructionY: height - safeBottom - 16,
      starsY: tableTop - 12,
    };

    return {
      viewport: { width, height },
      tableBounds,
      projectionScreenBounds,
      photoSurface,
      emitter,
      targetLens,
      mirrors,
      stars,
      hud,
    };
  }
}
