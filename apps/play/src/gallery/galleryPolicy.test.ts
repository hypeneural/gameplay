import { describe, expect, it } from 'vitest';
import { createFixtureSession, type Photo } from '@christmas-games/platform';
import {
  GALLERY_BATCH_SIZE,
  GALLERY_INITIAL_PHOTO_COUNT,
  GALLERY_LIGHTBOX_VARIANTS,
  getLightboxPrefetchUrl,
  nextGalleryVisibleCount,
} from './galleryPolicy.js';
import {
  buildSrcSet,
  isCurrentPhotoGeneration,
  resolveSessionDisplayedPhoto,
} from '../components/PhotoPrint.js';

describe('galleryPolicy', () => {
  it('starts from the bounded mobile batch and never exceeds the session size', () => {
    expect(GALLERY_INITIAL_PHOTO_COUNT).toBe(8);
    expect(GALLERY_BATCH_SIZE).toBe(8);
    expect(nextGalleryVisibleCount(0, 92)).toBe(8);
    expect(nextGalleryVisibleCount(8, 12)).toBe(12);
    expect(nextGalleryVisibleCount(88, 92)).toBe(92);
    expect(nextGalleryVisibleCount(8, 0)).toBe(0);
  });

  it('prefetches at most 1 neighbor card variant in the lightbox and disables prefetch on LOW quality', () => {
    const photos = createFixtureSession(4).photos;
    expect(getLightboxPrefetchUrl(photos, 0, false)).toBe(photos[1]!.variants.card);
    expect(getLightboxPrefetchUrl(photos, 3, false)).toBe(photos[0]!.variants.card);
    expect(getLightboxPrefetchUrl(photos, 0, true)).toBeUndefined();
    expect(getLightboxPrefetchUrl(photos.slice(0, 1), 0, false)).toBeUndefined();
  });

  it('builds sorted responsive srcSet from variantMetrics', () => {
    const base = createFixtureSession(4).photos[0]!;
    const photoWithMetrics: Photo = {
      ...base,
      variants: {
        thumb: '/media/ph_001/thumb.webp',
        card: '/media/ph_001/card.webp',
        game: '/media/ph_001/game.webp',
      },
      variantMetrics: {
        thumb: { width: 320, height: 448 },
        card: { width: 640, height: 896 },
        game: { width: 1280, height: 1792 },
      },
    };
    expect(buildSrcSet(photoWithMetrics, GALLERY_LIGHTBOX_VARIANTS)).toBe(
      '/media/ph_001/card.webp 640w, /media/ph_001/game.webp 1280w',
    );
  });

  it('prevents stale photo decode generations from overwriting newer selections and isolates sessions', () => {
    expect(isCurrentPhotoGeneration(3, 2, false)).toBe(false);
    expect(isCurrentPhotoGeneration(3, 3, true)).toBe(false);
    expect(isCurrentPhotoGeneration(3, 3, false)).toBe(true);

    const displayedSessionA = { src: '/a/card.webp', sessionKey: 'session-a' };
    expect(resolveSessionDisplayedPhoto(displayedSessionA, 'session-a')).toBe(displayedSessionA);
    expect(resolveSessionDisplayedPhoto(displayedSessionA, 'session-b')).toBeUndefined();
  });
});
