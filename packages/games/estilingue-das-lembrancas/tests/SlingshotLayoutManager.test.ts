import { describe, expect, it } from 'vitest';
import type { Photo } from '@christmas-games/platform';
import { SlingshotLayoutManager } from '../src/runtime/SlingshotLayoutManager.js';

const mockPortraitPhoto: Photo = {
  id: 'test-portrait',
  width: 1200,
  height: 1600,
  orientation: 'portrait',
  aspectRatio: 0.75,
  variants: {
    thumb: '/thumb.webp',
    card: '/card.webp',
    game: '/game.webp',
  },
  faceSafeZone: { x: 0.25, y: 0.2, width: 0.5, height: 0.4 },
};

const mockLandscapePhoto: Photo = {
  id: 'test-landscape',
  width: 1800,
  height: 1200,
  orientation: 'landscape',
  aspectRatio: 1.5,
  variants: {
    thumb: '/thumb.webp',
    card: '/card.webp',
    game: '/game.webp',
  },
  faceSafeZone: { x: 0.3, y: 0.2, width: 0.4, height: 0.5 },
};

describe('SlingshotLayoutManager (Layout Responsivo Mobile)', () => {
  const viewports = [
    { name: '360x800 (Android compacto)', width: 360, height: 800 },
    { name: '390x844 (iPhone 13/14)', width: 390, height: 844 },
    { name: '412x915 (Android flagship)', width: 412, height: 915 },
    { name: '430x932 (iPhone Pro Max)', width: 430, height: 932 },
    { name: '768x1024 (Tablet / iPad)', width: 768, height: 1024 },
  ];

  for (const vp of viewports) {
    it(`calcula layout estável para ${vp.name} com foto em retrato`, () => {
      const layout = new SlingshotLayoutManager(vp.width, vp.height, mockPortraitPhoto);

      expect(layout.isLandscapePhoto).toBe(false);
      expect(layout.frame.frameRect.width).toBeGreaterThan(150);
      expect(layout.frame.frameRect.height).toBeGreaterThan(200);

      // Moldura dentro dos limites horizontais
      expect(layout.frame.frameRect.x).toBeGreaterThan(0);
      expect(layout.frame.frameRect.x + layout.frame.frameRect.width).toBeLessThan(vp.width);

      // Alvos nas laterais
      expect(layout.targets).toHaveLength(4);
      for (const t of layout.targets) {
        // Hit area >= 56px
        expect(t.hitArea.width).toBeGreaterThanOrEqual(56);
        expect(t.hitArea.height).toBeGreaterThanOrEqual(56);
      }

      // Alvos esquerdos à esquerda da moldura, alvos direitos à direita da moldura
      expect(layout.targets[0]!.center.x).toBeLessThan(layout.frame.frameRect.x);
      expect(layout.targets[1]!.center.x).toBeLessThan(layout.frame.frameRect.x);
      expect(layout.targets[2]!.center.x).toBeGreaterThan(
        layout.frame.frameRect.x + layout.frame.frameRect.width,
      );
      expect(layout.targets[3]!.center.x).toBeGreaterThan(
        layout.frame.frameRect.x + layout.frame.frameRect.width,
      );

      // Estilingue abaixo da moldura
      expect(layout.slingshot.restPosition.y).toBeGreaterThan(
        layout.frame.frameRect.y + layout.frame.frameRect.height,
      );
      expect(layout.slingshot.touchGrabArea.width).toBeGreaterThanOrEqual(64);

      // Prateleira inferior com 4 botões táteis
      expect(layout.shelf.buttons).toHaveLength(4);
      for (const b of layout.shelf.buttons) {
        expect(b.hitArea.width).toBeGreaterThanOrEqual(52);
        expect(b.hitArea.height).toBeGreaterThanOrEqual(52);
        expect(b.y).toBeGreaterThan(layout.slingshot.restPosition.y);
      }
    });

    it(`calcula layout para ${vp.name} com foto em paisagem`, () => {
      const layout = new SlingshotLayoutManager(vp.width, vp.height, mockLandscapePhoto);

      expect(layout.isLandscapePhoto).toBe(true);
      expect(layout.frame.frameRect.width).toBeGreaterThan(layout.frame.frameRect.height);
      expect(layout.frame.photoSurface.frame.width).toBeGreaterThan(0);
      expect(layout.frame.photoSurface.fit).toBe('contain');
    });
  }
});
