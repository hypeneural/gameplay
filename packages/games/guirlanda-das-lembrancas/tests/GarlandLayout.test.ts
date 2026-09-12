import { describe, expect, it } from 'vitest';
import {
  createGarlandLayout,
  garlandFrameDimensions,
  garlandFrameGeometry,
} from '../src/runtime/phaser/GarlandLayout.js';

describe('Guirlanda mobile geometry', () => {
  it('keeps six independent 72px touch areas in every supported screen and below the controls', () => {
    for (const [width, height] of [
      [320, 568],
      [390, 844],
      [412, 915],
      [430, 932],
      [768, 1024],
    ]) {
      for (const completed of [false, true])
        for (const ratio of [0.714, 1, 1.4]) {
          const photo = {
            width: ratio * 1000,
            height: 1000,
            aspectRatio: ratio,
            orientation: ratio < 1 ? ('portrait' as const) : ('landscape' as const),
          };
          const layout = createGarlandLayout(width!, height!, photo, completed);
          const geometry = garlandFrameGeometry(photo, layout.hero.width, layout.hero.height);
          const photoRect = {
            x: layout.centreX + geometry.photo.x,
            y: layout.centreY + geometry.photo.y,
            width: geometry.photo.width,
            height: geometry.photo.height,
          };
          expect(geometry.photo.width / geometry.photo.height).toBeCloseTo(ratio, 5);
          for (const [index, slot] of layout.slots.entries()) {
            const frame = garlandFrameDimensions(photo, layout.slotMaxWidth, layout.slotMaxHeight);
            expect(slot.x - frame.width / 2).toBeGreaterThanOrEqual(0);
            expect(slot.x + frame.width / 2).toBeLessThanOrEqual(width!);
            expect(slot.y - frame.height / 2).toBeGreaterThanOrEqual(64);
            expect(slot.y + frame.height / 2).toBeLessThanOrEqual(height! - (completed ? 176 : 0));
            expect(slot.x - 36).toBeGreaterThanOrEqual(0);
            expect(slot.x + 36).toBeLessThanOrEqual(width!);
            expect(slot.y - 36).toBeGreaterThanOrEqual(64);
            expect(slot.y + 36).toBeLessThanOrEqual(height! - (completed ? 176 : 0));
            for (const other of layout.slots.slice(index + 1)) {
              expect(Math.abs(slot.x - other.x) >= 72 || Math.abs(slot.y - other.y) >= 72).toBe(
                true,
              );
            }
            expect(
              slot.x + 36 <= photoRect.x ||
                slot.x - 36 >= photoRect.x + photoRect.width ||
                slot.y + 36 <= photoRect.y ||
                slot.y - 36 >= photoRect.y + photoRect.height,
            ).toBe(true);
          }
        }
    }
  });

  it('never expands the matte or crops extreme source proportions beyond the calibrated opening', () => {
    for (const ratio of [0.3, 0.714, 1, 1.4, 3]) {
      const photo = {
        width: ratio * 1000,
        height: 1000,
        aspectRatio: ratio,
        orientation: ratio < 1 ? ('portrait' as const) : ('landscape' as const),
      };
      const geometry = garlandFrameGeometry(photo, 240, 350);
      expect(geometry.photo.x).toBeGreaterThan(geometry.aperture.x);
      expect(geometry.photo.y).toBeGreaterThan(geometry.aperture.y);
      expect(geometry.photo.x + geometry.photo.width).toBeLessThan(
        geometry.aperture.x + geometry.aperture.width,
      );
      expect(geometry.photo.y + geometry.photo.height).toBeLessThan(
        geometry.aperture.y + geometry.aperture.height,
      );
      expect(geometry.photo.width / geometry.photo.height).toBeCloseTo(ratio, 5);
    }
  });
});
