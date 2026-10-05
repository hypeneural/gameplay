import { createPhotoSurface, createTouchHitArea } from '@christmas-games/platform';
import type { Photo, PhotoSurface, Rect } from '@christmas-games/platform';

export interface DomeLayout {
  x: number;
  y: number;
  radius: number;
  diameter: number;
}

export interface BaseLayout {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface GemLayout {
  index: number;
  x: number;
  y: number;
  radius: number;
  hitArea: Rect;
}

export interface KeyLayout {
  x: number;
  y: number;
  width: number;
  height: number;
  hitArea: Rect;
}

export interface HudLayout {
  sound: { x: number; y: number };
  pause: { x: number; y: number };
  coach: { x: number; y: number; width: number };
}

interface PhotoNicheLayout {
  readonly surface: PhotoSurface;
  readonly frameRect: Rect;
  readonly pedestalStand: Rect;
}

interface SnowVolumeLayout {
  readonly centerX: number;
  readonly centerY: number;
  readonly radius: number;
  readonly settlingY: number;
}

export interface SnowGlobeAssembly {
  readonly globeCenter: { x: number; y: number };
  readonly dome: DomeLayout;
  readonly base: BaseLayout;
  readonly buttonSockets: readonly GemLayout[];
  readonly keySocket: KeyLayout;
  readonly photoNiche: PhotoNicheLayout;
  readonly snowVolume: SnowVolumeLayout;
}

export class GloboLayoutManager {
  readonly assembly: SnowGlobeAssembly;
  readonly dome: DomeLayout;
  readonly base: BaseLayout;
  readonly photoSurface: PhotoSurface;
  readonly gems: readonly GemLayout[];
  readonly key: KeyLayout;
  readonly hud: HudLayout;
  readonly isLandscapePhoto: boolean;

  constructor(
    readonly width: number,
    readonly height: number,
    readonly photo: Photo,
  ) {
    const diameter = Math.round(Math.min(width * 0.78, height * 0.38));
    const radius = diameter / 2;
    const domeX = Math.round(width / 2);

    // Carved wood base is wider than glass dome (baseWidth > dome.diameter)
    const baseWidth = Math.round(diameter * 1.06);
    const baseHeight = Math.round(baseWidth * (420 / 504));

    // Assembly total height calculation:
    // The globe is recessed into the top collar of the wood base by ~26% of radius
    const totalAssemblyHeight = radius * 1.74 + baseHeight;
    const topPadding = Math.round(Math.max(68, (height - totalAssemblyHeight) * 0.36));
    const domeY = topPadding + radius;

    this.dome = {
      x: domeX,
      y: domeY,
      radius,
      diameter,
    };

    // Base positioned directly below, with its top rim holding the bottom curve of the dome
    const baseTop = Math.round(domeY + radius * 0.74);
    const baseX = domeX;
    const baseY = Math.round(baseTop + baseHeight / 2);

    this.base = {
      x: baseX,
      y: baseY,
      width: baseWidth,
      height: baseHeight,
    };

    // Inner photo frame target (58% of dome diameter: perfectly framed inside spherical crystal volume)
    const frameSize = Math.round(diameter * 0.58);
    const frameRect: Rect = {
      x: Math.round(domeX - frameSize / 2),
      y: Math.round(domeY - frameSize / 2 - 8),
      width: frameSize,
      height: frameSize,
    };

    this.photoSurface = createPhotoSurface(photo, frameRect, 'contain');
    this.isLandscapePhoto = photo.aspectRatio > 1.15;

    // Pedestal stand inside dome supporting the photo frame
    const pedestalStand: Rect = {
      x: Math.round(domeX - frameSize * 0.4),
      y: Math.round(frameRect.y + frameRect.height - 4),
      width: Math.round(frameSize * 0.8),
      height: Math.round(diameter * 0.08),
    };

    // 4 Christmas push buttons positioned precisely into the 4 carved brass sockets of the wooden base
    const SOCKET_OFFSETS = [
      { dx: -0.283, dy: 0.139 },
      { dx: -0.093, dy: 0.155 },
      { dx: 0.118, dy: 0.159 },
      { dx: 0.314, dy: 0.163 },
    ] as const;
    const gemRadius = Math.round(baseWidth * 0.056);

    this.gems = [0, 1, 2, 3].map((index) => {
      const offset = SOCKET_OFFSETS[index] ?? { dx: 0, dy: 0 };
      const gemX = Math.round(baseX + offset.dx * baseWidth);
      const gemY = Math.round(baseY + offset.dy * baseHeight);
      const bounds: Rect = {
        x: gemX - gemRadius,
        y: gemY - gemRadius,
        width: gemRadius * 2,
        height: gemRadius * 2,
      };
      return {
        index,
        x: gemX,
        y: gemY,
        radius: gemRadius,
        hitArea: createTouchHitArea(bounds, { minSize: 56 }),
      };
    });

    // Wind-up key realistically coupled to right side escutcheon plate on base
    const keyWidth = Math.round(baseWidth * 0.18);
    const keyHeight = Math.round(keyWidth * 0.85);
    const keyX = Math.round(baseX + baseWidth * 0.465);
    const keyY = Math.round(baseY + baseHeight * 0.165);
    const keyBounds: Rect = {
      x: keyX - keyWidth / 2,
      y: keyY - keyHeight / 2,
      width: keyWidth,
      height: keyHeight,
    };

    this.key = {
      x: keyX,
      y: keyY,
      width: keyWidth,
      height: keyHeight,
      hitArea: createTouchHitArea(keyBounds, { minSize: 64 }),
    };

    // Unified Physical Assembly
    this.assembly = {
      globeCenter: { x: domeX, y: domeY },
      dome: this.dome,
      base: this.base,
      buttonSockets: this.gems,
      keySocket: this.key,
      photoNiche: {
        surface: this.photoSurface,
        frameRect,
        pedestalStand,
      },
      snowVolume: {
        centerX: domeX,
        centerY: domeY,
        radius: Math.round(radius * 0.94),
        settlingY: Math.round(domeY + radius * 0.72),
      },
    };

    // HUD controls and Coach Text
    this.hud = {
      sound: { x: width - 106, y: 34 },
      pause: { x: width - 38, y: 34 },
      coach: {
        x: Math.round(width / 2),
        y: Math.round(Math.max(76, domeY - radius - 16)),
        width: Math.round(Math.min(340, width * 0.88)),
      },
    };
  }
}
