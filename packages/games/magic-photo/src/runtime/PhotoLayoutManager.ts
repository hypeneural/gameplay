import { createPhotoSurface } from '@christmas-games/platform';
import type { Rect } from '@christmas-games/platform';
import type { Point } from '../domain/PhotoGeometry.js';

/** Layout is pure; the same normalized point survives any viewport/orientation change. */
export class PhotoLayoutManager {
  readonly photo: Rect;
  readonly gift: { x: number; y: number; scale: number; pullDistance: number };
  readonly instructionY: number;
  constructor(
    readonly width: number,
    readonly height: number,
    aspectRatio: number,
    freePlay = false,
  ) {
    const top = height < 500 && width >= 600 ? 86 : 148;
    const bottom = freePlay ? 140 : height < 500 ? 78 : 96;
    this.photo = createPhotoSurface(
      { aspectRatio },
      {
        x: 18,
        y: top,
        width: Math.max(1, width - 36),
        height: Math.max(1, height - top - bottom),
      },
    ).photo;
    const giftScale = Math.max(0.2, Math.min((width - 60) / 330, (height - 160) / 380, 1.32));
    const giftY = height * (height < 500 ? 0.56 : 0.51);
    this.gift = {
      x: width / 2,
      y: giftY,
      scale: giftScale,
      pullDistance: Math.min(
        140,
        Math.max(65, height * 0.15),
        Math.max(28, giftY - 146 * giftScale - 76),
      ),
    };
    this.instructionY = Math.min(height - bottom / 2, this.photo.y + this.photo.height + 46);
  }
  toWorld(point: Point): Point {
    return {
      x: this.photo.x + point.x * this.photo.width,
      y: this.photo.y + point.y * this.photo.height,
    };
  }
  toNormalized(point: Point): Point | undefined {
    const x = (point.x - this.photo.x) / this.photo.width;
    const y = (point.y - this.photo.y) / this.photo.height;
    return x >= 0 && x <= 1 && y >= 0 && y <= 1 ? { x, y } : undefined;
  }
}
