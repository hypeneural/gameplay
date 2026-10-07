import { describe, expect, it } from 'vitest';
import {
  GALLERY_BATCH_SIZE,
  GALLERY_INITIAL_PHOTO_COUNT,
  nextGalleryVisibleCount,
} from './galleryPolicy.js';

describe('galleryPolicy', () => {
  it('starts from the bounded mobile batch and never exceeds the session size', () => {
    expect(GALLERY_INITIAL_PHOTO_COUNT).toBe(8);
    expect(GALLERY_BATCH_SIZE).toBe(8);
    expect(nextGalleryVisibleCount(0, 92)).toBe(8);
    expect(nextGalleryVisibleCount(8, 12)).toBe(12);
    expect(nextGalleryVisibleCount(88, 92)).toBe(92);
    expect(nextGalleryVisibleCount(8, 0)).toBe(0);
  });
});
