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

function validDimensions(width: number, height: number): boolean {
  return Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0;
}
