import { describe, expect, it } from 'vitest';
import { galleryFrameAspectRatio } from './galleryFrameGeometry.js';

describe('galleryFrameAspectRatio', () => {
  it('uses the physical card derivative instead of a rounded paper preset', () => {
    expect(
      galleryFrameAspectRatio(
        {
          width: 3000,
          height: 4200,
          aspectRatio: 15 / 21,
          variantMetrics: { card: { width: 571, height: 800, byteLength: 30000 } },
        } as Parameters<typeof galleryFrameAspectRatio>[0],
        'card',
      ),
    ).toBeCloseTo(571 / 800, 6);
  });

  it('supports full-width landscapes without crop or a square placeholder', () => {
    expect(
      galleryFrameAspectRatio(
        { width: 2100, height: 1500, aspectRatio: 1.4 },
        'card',
      ),
    ).toBeCloseTo(21 / 15);
  });

  it('rejects missing or invalid image dimensions', () => {
    expect(() =>
      galleryFrameAspectRatio({ width: 0, height: 0, aspectRatio: 0 }, 'card'),
    ).toThrow('missing usable dimensions');
  });
});
