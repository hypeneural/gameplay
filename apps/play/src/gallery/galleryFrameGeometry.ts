import type { Photo, PhotoVariant } from '@christmas-games/platform';

type FramePhoto = Pick<Photo, 'aspectRatio' | 'width' | 'height' | 'variantMetrics'>;

/**
 * The CSS window must match the actual delivered derivative, not a nominal
 * paper ratio such as 15:21. Contain then has no unused side bands.
 */
export function galleryFrameAspectRatio(photo: FramePhoto, variant: PhotoVariant): number {
  const metrics = photo.variantMetrics?.[variant];
  const dimensions =
    metrics && validDimensions(metrics.width, metrics.height)
      ? metrics
      : validDimensions(photo.width, photo.height)
        ? photo
        : undefined;

  if (dimensions) return dimensions.width / dimensions.height;
  if (Number.isFinite(photo.aspectRatio) && photo.aspectRatio > 0) {
    return photo.aspectRatio;
  }
  throw new Error('Gallery photo is missing usable dimensions');
}

/**
 * Verifies that the rendered frame window matches the decoded image's intrinsic
 * aspect ratio within the maximum allowed relative tolerance (default 1% = 0.01).
 */
export function isFrameWindowWithinTolerance(
  windowWidth: number,
  windowHeight: number,
  naturalWidth: number,
  naturalHeight: number,
  maxRelativeDelta = 0.01,
): boolean {
  if (
    !validDimensions(windowWidth, windowHeight) ||
    !validDimensions(naturalWidth, naturalHeight)
  ) {
    return false;
  }
  const windowRatio = windowWidth / windowHeight;
  const intrinsicRatio = naturalWidth / naturalHeight;
  return Math.abs(windowRatio - intrinsicRatio) / intrinsicRatio <= maxRelativeDelta;
}

function validDimensions(width: number, height: number): boolean {
  return Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0;
}
