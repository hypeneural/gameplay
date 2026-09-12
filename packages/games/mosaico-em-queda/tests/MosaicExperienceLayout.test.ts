import { describe, expect, it } from 'vitest';
import { createViewportLayout } from '@christmas-games/platform';
import { planMosaicExperienceLayout } from '../src/index.js';

describe('MosaicExperienceLayout', () => {
  it.each([
    [390, 844],
    [430, 932],
    [844, 390],
  ])('reserves a board and four 52 px actions at %ix%i', (width, height) => {
    const layout = planMosaicExperienceLayout(createViewportLayout(width, height));

    expect(layout.board.width).toBeGreaterThan(0);
    expect(layout.board.height).toBeGreaterThan(0);
    expect(layout.board.width / layout.board.height).toBeCloseTo(8 / 14);
    expect(Object.values(layout.controls)).toHaveLength(4);
    for (const control of Object.values(layout.controls)) {
      expect(control.width).toBeGreaterThanOrEqual(52);
      expect(control.height).toBeGreaterThanOrEqual(52);
      expect(control.x).toBeGreaterThanOrEqual(0);
      expect(control.y).toBeGreaterThanOrEqual(0);
      expect(control.x + control.width).toBeLessThanOrEqual(width);
      expect(control.y + control.height).toBeLessThanOrEqual(height);
    }
  });
});
