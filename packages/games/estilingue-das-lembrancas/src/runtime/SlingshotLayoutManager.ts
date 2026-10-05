import { createPhotoSurface, createTouchHitArea } from '@christmas-games/platform';
import type { Photo, PhotoSurface, Rect } from '@christmas-games/platform';
import type { TargetId } from '../domain/TargetProgress.js';
export type { TargetId };

export interface TargetLayout {
  readonly id: TargetId;
  readonly anchor: { readonly x: number; readonly y: number };
  readonly center: { readonly x: number; readonly y: number };
  readonly radius: number;
  readonly hitArea: Rect;
}

export interface SlingshotAssembly {
  readonly forkCenter: { readonly x: number; readonly y: number };
  readonly forkWidth: number;
  readonly forkHeight: number;
  readonly anchorLeft: { readonly x: number; readonly y: number };
  readonly anchorRight: { readonly x: number; readonly y: number };
  readonly restPosition: { readonly x: number; readonly y: number };
  readonly snowballRadius: number;
  readonly touchGrabArea: Rect;
}

export interface FrameSocketLayout {
  readonly targetId: TargetId;
  readonly x: number;
  readonly y: number;
}

export interface PhotoFrameAssembly {
  readonly frameRect: Rect;
  readonly apertureRect: Rect;
  readonly photoSurface: PhotoSurface;
  readonly sockets: readonly FrameSocketLayout[];
  readonly bannerRect: Rect;
}

export interface TactileButtonLayout {
  readonly index: number;
  readonly id: 'note' | 'tree' | 'snowflake' | 'bell';
  readonly x: number;
  readonly y: number;
  readonly radius: number;
  readonly hitArea: Rect;
}

export interface BottomShelfAssembly {
  readonly shelfRect: Rect;
  readonly buttons: readonly TactileButtonLayout[];
}

export interface HeaderHudLayout {
  readonly banner: {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  };
  readonly coach: { readonly x: number; readonly y: number };
  readonly backButton: { readonly x: number; readonly y: number };
  readonly soundButton: { readonly x: number; readonly y: number };
  readonly pauseButton: { readonly x: number; readonly y: number };
}

export class SlingshotLayoutManager {
  readonly isLandscapePhoto: boolean;
  readonly frame: PhotoFrameAssembly;
  readonly targets: readonly TargetLayout[];
  readonly slingshot: SlingshotAssembly;
  readonly shelf: BottomShelfAssembly;
  readonly hud: HeaderHudLayout;

  constructor(
    readonly width: number,
    readonly height: number,
    readonly photo: Photo,
  ) {
    this.isLandscapePhoto = photo.aspectRatio > 1.15;

    // 1. Top HUD and Header
    const topSafe = Math.round(Math.max(48, height * 0.05));
    const bannerWidth = Math.round(Math.min(width * 0.72, 340));
    const bannerHeight = Math.round(bannerWidth * (180 / 600));

    this.hud = {
      banner: {
        x: Math.round(width / 2),
        y: topSafe + Math.round(bannerHeight / 2),
        width: bannerWidth,
        height: bannerHeight,
      },
      coach: {
        x: Math.round(width / 2),
        y: topSafe + bannerHeight + 22,
      },
      backButton: {
        x: 42,
        y: topSafe + 24,
      },
      soundButton: {
        x: width - 86,
        y: topSafe + 24,
      },
      pauseButton: {
        x: width - 38,
        y: topSafe + 24,
      },
    };

    // 2. Central Photo Frame
    // In moldura-ouro-v1.webp, the inner transparent window ratios:
    // left: 21.8%, top: 22.7%, width: 56.0%, height: 55.2%
    const frameCenterY = Math.round(height * (this.isLandscapePhoto ? 0.33 : 0.34));

    // Design width available for central frame without colliding with lateral targets
    const maxSafeFrameW = Math.min(Math.round(width * 0.62), 270);

    // Frame dimensions: tailored to orientation while preserving beautiful baroque proportions
    const frameWidth = this.isLandscapePhoto ? maxSafeFrameW : Math.round(maxSafeFrameW * 0.9);
    const frameHeight = this.isLandscapePhoto
      ? Math.round(maxSafeFrameW * 0.86)
      : Math.round(maxSafeFrameW * 1.16);

    const frameRect: Rect = {
      x: Math.round(width / 2 - frameWidth / 2),
      y: Math.round(frameCenterY - frameHeight / 2),
      width: frameWidth,
      height: frameHeight,
    };

    const apertureRect: Rect = {
      x: Math.round(frameRect.x + frameRect.width * 0.218),
      y: Math.round(frameRect.y + frameRect.height * 0.227),
      width: Math.round(frameRect.width * 0.56),
      height: Math.round(frameHeight * 0.552),
    };

    // Inset photo 2px within aperture so it is cleanly inside without touching frame edges
    const innerPhotoArea: Rect = {
      x: apertureRect.x + 2,
      y: apertureRect.y + 2,
      width: apertureRect.width - 4,
      height: apertureRect.height - 4,
    };

    const photoSurface = createPhotoSurface(photo, innerPhotoArea, 'contain');

    const bannerRect: Rect = {
      x: Math.round(width / 2 - frameWidth * 0.42),
      y: Math.round(frameRect.y + frameRect.height - 18),
      width: Math.round(frameWidth * 0.84),
      height: Math.round(frameHeight * 0.14),
    };

    // Sockets sit precisely at the 4 inner corners of the golden garland aperture
    const sockets: FrameSocketLayout[] = [
      {
        targetId: 'wood-square',
        x: apertureRect.x + 6,
        y: apertureRect.y + 6,
      },
      {
        targetId: 'gingerbread',
        x: apertureRect.x + 6,
        y: apertureRect.y + apertureRect.height - 6,
      },
      {
        targetId: 'gold-star',
        x: apertureRect.x + apertureRect.width - 6,
        y: apertureRect.y + 6,
      },
      {
        targetId: 'round-bauble',
        x: apertureRect.x + apertureRect.width - 6,
        y: apertureRect.y + apertureRect.height - 6,
      },
    ];

    this.frame = {
      frameRect,
      apertureRect,
      photoSurface,
      sockets,
      bannerRect,
    };

    // 3. The 4 Hanging Targets
    // Positioned safely to the left and right of the frame
    const leftColX = Math.round(Math.max(width * 0.11, frameRect.x * 0.48));
    const rightColX = Math.round(
      Math.min(
        width * 0.89,
        frameRect.x + frameRect.width + (width - (frameRect.x + frameRect.width)) * 0.52,
      ),
    );
    const targetTopY = Math.round(frameCenterY - frameHeight * 0.32);
    const targetBottomY = Math.round(frameCenterY + frameHeight * 0.3);
    const targetRadius = Math.round(Math.min(width * 0.09, 36));

    const createTarget = (id: TargetId, cx: number, cy: number): TargetLayout => {
      const anchorY = Math.max(topSafe + 10, cy - 70);
      const bounds: Rect = {
        x: cx - targetRadius,
        y: cy - targetRadius,
        width: targetRadius * 2,
        height: targetRadius * 2,
      };
      return {
        id,
        anchor: { x: cx, y: anchorY },
        center: { x: cx, y: cy },
        radius: targetRadius,
        hitArea: createTouchHitArea(bounds, { minSize: 56 }),
      };
    };

    this.targets = [
      createTarget('wood-square', leftColX, targetTopY),
      createTarget('gingerbread', leftColX, targetBottomY),
      createTarget('gold-star', rightColX, targetTopY),
      createTarget('round-bauble', rightColX, targetBottomY),
    ];

    // 4. Slingshot Assembly
    const slingshotForkWidth = Math.round(Math.min(width * 0.42, 180));
    const slingshotForkHeight = Math.round(slingshotForkWidth * (520 / 380));
    const slingshotCenterX = Math.round(width / 2);
    const slingshotBaseY = Math.round(height * 0.74);
    const forkTipY = Math.round(slingshotBaseY - slingshotForkHeight * 0.36);

    const prongSpacing = Math.round(slingshotForkWidth * 0.38);
    const anchorLeft = { x: slingshotCenterX - prongSpacing, y: forkTipY };
    const anchorRight = { x: slingshotCenterX + prongSpacing, y: forkTipY };
    const restPosition = { x: slingshotCenterX, y: forkTipY + 28 };
    const snowballRadius = Math.round(Math.min(width * 0.065, 24));

    const grabRadius = Math.round(Math.min(width * 0.18, 68));
    const grabBounds: Rect = {
      x: restPosition.x - grabRadius,
      y: restPosition.y - Math.round(grabRadius * 0.9),
      width: grabRadius * 2,
      height: Math.round(grabRadius * 2.1),
    };

    this.slingshot = {
      forkCenter: { x: slingshotCenterX, y: slingshotBaseY },
      forkWidth: slingshotForkWidth,
      forkHeight: slingshotForkHeight,
      anchorLeft,
      anchorRight,
      restPosition,
      snowballRadius,
      touchGrabArea: createTouchHitArea(grabBounds, { minSize: 130 }),
    };

    // 5. Bottom Shelf & Tactile Buttons
    const shelfHeight = Math.round(Math.max(68, height * 0.11));
    const shelfRect: Rect = {
      x: 0,
      y: Math.round(height - shelfHeight),
      width,
      height: shelfHeight,
    };

    const buttonIds: Array<'note' | 'tree' | 'snowflake' | 'bell'> = [
      'note',
      'tree',
      'snowflake',
      'bell',
    ];
    const buttonSpacing = width / 5;
    const buttonRadius = Math.round(Math.min(width * 0.075, 30));
    const buttonY = Math.round(shelfRect.y + shelfHeight * 0.52);

    const buttons: TactileButtonLayout[] = buttonIds.map((id, index) => {
      const bx = Math.round(buttonSpacing * (index + 1));
      const bBounds: Rect = {
        x: bx - buttonRadius,
        y: buttonY - buttonRadius,
        width: buttonRadius * 2,
        height: buttonRadius * 2,
      };
      return {
        index,
        id,
        x: bx,
        y: buttonY,
        radius: buttonRadius,
        hitArea: createTouchHitArea(bBounds, { minSize: 52 }),
      };
    });

    this.shelf = {
      shelfRect,
      buttons,
    };
  }
}
