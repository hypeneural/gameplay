import { describe, expect, it } from 'vitest';
import { LanternaLayoutManager } from '../src/runtime/LanternaLayoutManager.js';
import { getLevelById } from '../src/domain/LanternPuzzleLevels.js';

describe('LanternaLayoutManager', () => {
  const level1 = getLevelById(1);

  it('calculates valid layout on mobile portrait (390x844)', () => {
    const layout = LanternaLayoutManager.calculateLayout(390, 844, level1);

    expect(layout.viewport.width).toBe(390);
    expect(layout.viewport.height).toBe(844);
    expect(layout.tableBounds.width).toBeGreaterThan(200);
    expect(layout.tableBounds.height).toBeGreaterThan(200);
    expect(layout.mirrors.length).toBe(level1.mirrors.length);
    expect(layout.mirrors[0]!.touchRadius).toBeGreaterThanOrEqual(32); // minimum 64px diameter touch
  });

  it('calculates photo surface without cropping for portrait photo', () => {
    const portraitPhoto = { aspectRatio: 3 / 4, width: 600, height: 800 };
    const layout = LanternaLayoutManager.calculateLayout(390, 844, level1, portraitPhoto);

    expect(layout.photoSurface).toBeDefined();
    expect(layout.photoSurface?.isCropped).toBe(false);
    expect(layout.photoSurface?.photo.width).toBeLessThanOrEqual(
      layout.projectionScreenBounds.width,
    );
    expect(layout.photoSurface?.photo.height).toBeLessThanOrEqual(
      layout.projectionScreenBounds.height,
    );
  });

  it('calculates photo surface without cropping for landscape photo', () => {
    const landscapePhoto = { aspectRatio: 4 / 3, width: 800, height: 600 };
    const layout = LanternaLayoutManager.calculateLayout(390, 844, level1, landscapePhoto);

    expect(layout.photoSurface).toBeDefined();
    expect(layout.photoSurface?.isCropped).toBe(false);
    expect(layout.photoSurface?.photo.width).toBeLessThanOrEqual(
      layout.projectionScreenBounds.width,
    );
    expect(layout.photoSurface?.photo.height).toBeLessThanOrEqual(
      layout.projectionScreenBounds.height,
    );
  });

  it('places optical components within the table bounds', () => {
    const layout = LanternaLayoutManager.calculateLayout(412, 915, level1);
    const tb = layout.tableBounds;

    expect(layout.emitter.center.x).toBeGreaterThanOrEqual(tb.x);
    expect(layout.emitter.center.x).toBeLessThanOrEqual(tb.x + tb.width);
    expect(layout.emitter.center.y).toBeGreaterThanOrEqual(tb.y);
    expect(layout.emitter.center.y).toBeLessThanOrEqual(tb.y + tb.height);

    for (const mirror of layout.mirrors) {
      expect(mirror.center.x).toBeGreaterThanOrEqual(tb.x);
      expect(mirror.center.x).toBeLessThanOrEqual(tb.x + tb.width);
      expect(mirror.center.y).toBeGreaterThanOrEqual(tb.y);
      expect(mirror.center.y).toBeLessThanOrEqual(tb.y + tb.height);
    }
  });
});
