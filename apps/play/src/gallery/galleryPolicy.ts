import type { PhotoVariant } from '@christmas-games/platform';

export const GALLERY_INITIAL_PHOTO_COUNT = 8;
export const GALLERY_BATCH_SIZE = 8;
export const GALLERY_AUTOLOAD_ROOT_MARGIN = '160px 0px';

export const GALLERY_FEED_VARIANTS = ['thumb', 'card'] as const satisfies readonly PhotoVariant[];
export const GALLERY_LIGHTBOX_VARIANTS = [
  'card',
  'game',
] as const satisfies readonly PhotoVariant[];

export const GALLERY_FEED_SIZES =
  '(max-width: 599px) calc(100vw - 24px), (max-width: 899px) calc((100vw - 44px) / 2), min(31vw, 320px)';
export const GALLERY_LIGHTBOX_SIZES = '100vw';

export function nextGalleryVisibleCount(current: number, total: number): number {
  if (total <= 0) return 0;
  if (current <= 0) return Math.min(GALLERY_INITIAL_PHOTO_COUNT, total);
  return Math.min(current + GALLERY_BATCH_SIZE, total);
}
