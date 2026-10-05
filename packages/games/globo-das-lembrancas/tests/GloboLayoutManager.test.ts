import { describe, expect, it } from 'vitest';
import type { Photo } from '@christmas-games/platform';
import { GloboLayoutManager } from '../src/runtime/GloboLayoutManager.js';

const mockPortraitPhoto: Photo = {
  id: 'photo-portrait',
  width: 1000,
  height: 1500,
  aspectRatio: 0.67,
  orientation: 'portrait',
  variants: {
    thumb: 'data:image/webp;base64,mock-thumb',
    card: 'data:image/webp;base64,mock-card',
    game: 'data:image/webp;base64,mock-game',
  },
  faceSafeZone: { x: 0.25, y: 0.2, width: 0.5, height: 0.4 },
};

const mockLandscapePhoto: Photo = {
  id: 'photo-landscape',
  width: 1500,
  height: 1000,
  aspectRatio: 1.5,
  orientation: 'landscape',
  variants: {
    thumb: 'data:image/webp;base64,mock-thumb',
    card: 'data:image/webp;base64,mock-card',
    game: 'data:image/webp;base64,mock-game',
  },
};

describe('GloboLayoutManager & SnowGlobeAssembly', () => {
  const VIEWPORTS = [
    { name: 'small-phone-360', width: 360, height: 800 },
    { name: 'iphone-390', width: 390, height: 844 },
    { name: 'android-412', width: 412, height: 915 },
    { name: 'large-phone-430', width: 430, height: 932 },
    { name: 'tablet-768', width: 768, height: 1024 },
  ];

  for (const vp of VIEWPORTS) {
    describe(`Viewport: ${vp.name} (${vp.width}x${vp.height})`, () => {
      it('constructs a unified SnowGlobeAssembly with valid physical parts', () => {
        const layout = new GloboLayoutManager(vp.width, vp.height, mockPortraitPhoto);
        const { assembly } = layout;

        expect(assembly).toBeDefined();
        expect(assembly.dome.diameter).toBeGreaterThan(150);
        expect(assembly.dome.diameter).toBeLessThanOrEqual(vp.width);
        expect(assembly.base.width).toBeGreaterThan(assembly.dome.diameter);
        expect(assembly.buttonSockets).toHaveLength(4);
        expect(assembly.photoNiche.frameRect.width).toBeGreaterThan(100);
        expect(assembly.snowVolume.radius).toBeGreaterThan(50);
      });

      it('guarantees touch hit areas meet mobile minimums (>= 56px for buttons, >= 64px for key)', () => {
        const layout = new GloboLayoutManager(vp.width, vp.height, mockPortraitPhoto);
        const { assembly } = layout;

        for (const socket of assembly.buttonSockets) {
          expect(socket.hitArea.width).toBeGreaterThanOrEqual(56);
          expect(socket.hitArea.height).toBeGreaterThanOrEqual(56);
        }

        expect(assembly.keySocket.hitArea.width).toBeGreaterThanOrEqual(64);
        expect(assembly.keySocket.hitArea.height).toBeGreaterThanOrEqual(64);
      });

      it('couples the winding key realistically to the right waist of the base', () => {
        const layout = new GloboLayoutManager(vp.width, vp.height, mockPortraitPhoto);
        const { assembly } = layout;

        // Key must be to the right of the center and anchored into the base side
        expect(assembly.keySocket.x).toBeGreaterThan(assembly.base.x + assembly.base.width * 0.4);
        expect(assembly.keySocket.y).toBeGreaterThan(assembly.base.y);
      });

      it('seats all 4 button sockets precisely within base front bounds', () => {
        const layout = new GloboLayoutManager(vp.width, vp.height, mockPortraitPhoto);
        const { assembly } = layout;

        const baseLeft = assembly.base.x - assembly.base.width / 2;
        const baseRight = assembly.base.x + assembly.base.width / 2;

        for (const socket of assembly.buttonSockets) {
          expect(socket.x).toBeGreaterThan(baseLeft);
          expect(socket.x).toBeLessThan(baseRight);
          expect(socket.y).toBeGreaterThan(assembly.base.y);
        }
      });

      it('preserves contain mode for landscape photos without distorting aspect ratio', () => {
        const layout = new GloboLayoutManager(vp.width, vp.height, mockLandscapePhoto);
        expect(layout.isLandscapePhoto).toBe(true);
        const photoBox = layout.assembly.photoNiche.surface.photo;
        const calculatedAspect = photoBox.width / photoBox.height;
        expect(calculatedAspect).toBeCloseTo(mockLandscapePhoto.aspectRatio, 1);
      });
    });
  }
});
