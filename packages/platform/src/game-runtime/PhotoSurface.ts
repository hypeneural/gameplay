import type { Photo } from '../contracts/index.js';

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type PhotoFit = 'contain' | 'cover';

export interface PhotoSurface {
  frame: Rect;
  photo: Rect;
  fit: PhotoFit;
  isCropped: boolean;
}

/** Calculates a proportional photo rectangle; the default never crops people. */
export function createPhotoSurface(
  photo: Pick<Photo, 'aspectRatio'>,
  frame: Rect,
  fit: PhotoFit = 'contain',
): PhotoSurface {
  if (!Number.isFinite(photo.aspectRatio) || photo.aspectRatio <= 0) {
    throw new Error('Photo aspect ratio must be a positive finite value.');
  }
  if (frame.width <= 0 || frame.height <= 0) {
    throw new Error('Photo frame dimensions must be positive.');
  }

  const frameRatio = frame.width / frame.height;
  const widthControls =
    fit === 'contain' ? photo.aspectRatio > frameRatio : photo.aspectRatio < frameRatio;
  const width = widthControls ? frame.width : frame.height * photo.aspectRatio;
  const height = widthControls ? frame.width / photo.aspectRatio : frame.height;

  return {
    frame,
    photo: {
      x: frame.x + (frame.width - width) / 2,
      y: frame.y + (frame.height - height) / 2,
      width,
      height,
    },
    fit,
    isCropped: fit === 'cover',
  };
}
