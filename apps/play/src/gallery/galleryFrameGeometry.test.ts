import { describe, expect, it } from 'vitest';
import { galleryFrameAspectRatio, isFrameWindowWithinTolerance } from './galleryFrameGeometry.js';

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
      galleryFrameAspectRatio({ width: 2100, height: 1500, aspectRatio: 1.4 }, 'card'),
    ).toBeCloseTo(21 / 15);
  });

  it('validates 15x21 portrait, 21x15 landscape, panoramic, and Sharp rounding within 1% tolerance', () => {
    expect(isFrameWindowWithinTolerance(337.06, 471.88, 500, 700)).toBe(true);
    expect(isFrameWindowWithinTolerance(337.06, 240.75, 700, 500)).toBe(true);
    expect(isFrameWindowWithinTolerance(340, 191.25, 1600, 900)).toBe(true);
    expect(isFrameWindowWithinTolerance(337, 472.2, 571, 800)).toBe(true);
    expect(isFrameWindowWithinTolerance(337, 337, 500, 700)).toBe(false);
  });

  it('rejects missing or invalid image dimensions', () => {
    expect(() => galleryFrameAspectRatio({ width: 0, height: 0, aspectRatio: 0 }, 'card')).toThrow(
      'missing usable dimensions',
    );
    expect(isFrameWindowWithinTolerance(0, 100, 500, 700)).toBe(false);
  });
});
