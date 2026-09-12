import { describe, expect, it } from 'vitest';
import { MagicPhotoStateMachine, magicStates } from '../src/domain/MagicPhotoStateMachine.js';
import { IceGrid } from '../src/domain/IceGrid.js';
import { createHotspots } from '../src/domain/Hotspots.js';
import { PhotoLayoutManager } from '../src/runtime/PhotoLayoutManager.js';

function openGift(game: MagicPhotoStateMachine): void {
  game.ready();
  game.tapGift();
  game.tapGift();
  game.tapGift();
  game.startRibbon();
  game.pullRibbon(0.5);
  game.releaseRibbon();
  game.update(4450);
}
function clearIce(game: MagicPhotoStateMachine): void {
  for (let row = 0; row <= 12; row++) game.scratch({ x: 0, y: row / 12 }, { x: 1, y: row / 12 });
}

describe('Magic photo progression', () => {
  it('visits the entire story once and ignores duplicate/transition inputs', () => {
    const game = new MagicPhotoStateMachine(15 / 21);
    game.ready();
    game.ready();
    game.update(1200);
    openGift(game);
    expect(game.state).toBe('MAGIC_HUNT');
    for (const hotspot of game.hotspots) {
      game.hunt(hotspot, hotspot);
      game.hunt(hotspot, hotspot);
    }
    expect(game.found).toBe(5);
    game.update(2000);
    clearIce(game);
    expect(game.state).toBe('ICE_BREAK');
    const progress = game.ice.progress;
    clearIce(game);
    expect(game.ice.progress).toBe(progress);
    game.update(5650);
    expect(game.state).toBe('FREE_PLAY');
    game.finish();
    game.finish();
    game.tapGift();
    game.update(99999);
    const entries = game.drainEvents().filter((event) => event.type === 'STATE_ENTERED');
    expect(entries.map((event) => event.state)).toEqual(magicStates.slice(1));
    expect(game.drainEvents()).toEqual([]);
  });
  it('returns a short/cancelled pull, completes a half pull, and magnetizes a long pull', () => {
    for (const [progress, cancel, expected] of [
      [0.2, false, 'GIFT_READY'],
      [0.5, true, 'GIFT_READY'],
      [0.5, false, 'GIFT_OPENING'],
      [0.71, false, 'GIFT_OPENING'],
    ] as const) {
      const game = new MagicPhotoStateMachine(1.4);
      game.ready();
      game.tapGift();
      game.tapGift();
      game.tapGift();
      expect(game.tapGift()).toBe(false);
      game.startRibbon();
      game.pullRibbon(progress);
      game.releaseRibbon(cancel);
      expect(game.state).toBe(expected);
    }
  });
  it('fires ribbon milestones only once even with oscillating input', () => {
    const game = new MagicPhotoStateMachine(1);
    game.ready();
    game.tapGift();
    game.tapGift();
    game.tapGift();
    game.startRibbon();
    for (const p of [0.36, 0.1, 0.4, 0.75, 1]) game.pullRibbon(p);
    expect(game.drainEvents().filter((e) => e.type === 'RIBBON_PROGRESS')).toHaveLength(2);
  });
  it('finds a hotspot along a fast swipe without repeating or completing from a hint', () => {
    const game = new MagicPhotoStateMachine(1.4);
    openGift(game);
    game.update(12000);
    expect(game.found).toBe(0);
    const point = game.hotspots[0]!;
    game.hunt({ x: 0, y: point.y }, { x: 1, y: point.y });
    const count = game.found;
    expect(count).toBeGreaterThan(0);
    game.hunt({ x: 0, y: point.y }, { x: 1, y: point.y });
    expect(game.found).toBe(count);
  });
  it('keeps five dispersed, seeded hotspots away from supplied subject bounds where possible', () => {
    const safe = { x: 0.2, y: 0.2, width: 0.6, height: 0.5 };
    const points = createHotspots(15, safe);
    expect(points).toEqual(createHotspots(15, safe));
    expect(new Set(points.map((p) => p.id)).size).toBe(5);
    expect(points.every((p) => p.x < 0.2 || p.x > 0.8 || p.y < 0.2 || p.y > 0.7)).toBe(true);
  });
});

describe('Ice coverage and photo layout', () => {
  it.each([15 / 21, 21 / 15, 1])('counts a swept circular brush once at aspect %s', (aspect) => {
    const grid = new IceGrid(aspect);
    const added = grid.scratch({ x: 0, y: 0.5 }, { x: 1, y: 0.5 });
    expect(added).toBeGreaterThan(20);
    expect(grid.scratch({ x: 0, y: 0.5 }, { x: 1, y: 0.5 })).toBe(0);
    expect(
      grid.cells
        .filter((p) => p.revealed)
        .every((p) => Math.abs(p.y - 0.5) * Math.max(1, 1 / aspect) <= 0.105),
    ).toBe(true);
    expect(grid.scratch({ x: NaN, y: 0 }, { x: 1, y: 1 })).toBe(0);
  });
  it('has a finite playable fallback for invalid full-photo safe metadata', () => {
    const grid = new IceGrid(1, { x: 0, y: 0, width: 1, height: 1 });
    expect(grid.eligibleCount).toBe(400);
    expect(grid.progress).toBe(0);
  });
  it.each([320, 360, 375, 390, 393, 412, 414, 430, 768])(
    'contains both photo orientations at %s CSS px',
    (width) => {
      for (const height of [568, 844, 932, 390])
        for (const aspect of [15 / 21, 21 / 15]) {
          const layout = new PhotoLayoutManager(width, height, aspect);
          const photo = layout.photo;
          expect(photo.width / photo.height).toBeCloseTo(aspect);
          expect(photo.x).toBeGreaterThanOrEqual(18);
          expect(photo.y).toBeGreaterThanOrEqual(62);
          expect(photo.x + photo.width).toBeLessThanOrEqual(width - 17.99);
          expect(photo.y + photo.height).toBeLessThan(height - 40);
          const point = { x: 0.3, y: 0.7 };
          const normalized = layout.toNormalized(layout.toWorld(point))!;
          expect(normalized.x).toBeCloseTo(point.x);
          expect(normalized.y).toBeCloseTo(point.y);
        }
    },
  );
});
