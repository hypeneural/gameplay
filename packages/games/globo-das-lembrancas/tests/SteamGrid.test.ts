import { describe, expect, it } from 'vitest';
import { SteamGrid } from '../src/domain/SteamGrid.js';

describe('SteamGrid', () => {
  it('initializes grid cells with zero cleared progress', () => {
    const grid = new SteamGrid(1.0);
    expect(grid.progress).toBe(0);
    expect(grid.isCleared).toBe(false);
    expect(grid.cells.length).toBeGreaterThan(100);
    expect(grid.cells.every((c) => !c.revealed)).toBe(true);
  });

  it('wipes cells along a touch segment and increments progress', () => {
    const grid = new SteamGrid(1.0);
    const cleared = grid.wipe({ x: 0.1, y: 0.5 }, { x: 0.9, y: 0.5 }, 0.15);
    expect(cleared).toBeGreaterThan(0);
    expect(grid.progress).toBeGreaterThan(0);
    expect(grid.progress).toBeLessThanOrEqual(1.0);
  });

  it('assigns double weight to cells inside the faceSafeZone', () => {
    const safeZone = { x: 0.3, y: 0.3, width: 0.4, height: 0.4 };
    const gridWithSafeZone = new SteamGrid(1.0, { safeZone });

    const safeCells = gridWithSafeZone.cells.filter((c) => c.weight === 2);
    const regularCells = gridWithSafeZone.cells.filter((c) => c.weight === 1);

    expect(safeCells.length).toBeGreaterThan(0);
    expect(regularCells.length).toBeGreaterThan(0);
  });

  it('reaches isCleared when threshold (default 65%) is met', () => {
    const grid = new SteamGrid(1.0, { threshold: 0.5 });
    expect(grid.isCleared).toBe(false);

    // Wipe across multiple stripes to cover >50% of the surface
    grid.wipe({ x: 0.1, y: 0.2 }, { x: 0.9, y: 0.2 }, 0.18);
    grid.wipe({ x: 0.1, y: 0.5 }, { x: 0.9, y: 0.5 }, 0.18);
    grid.wipe({ x: 0.1, y: 0.8 }, { x: 0.9, y: 0.8 }, 0.18);

    expect(grid.progress).toBeGreaterThanOrEqual(0.5);
    expect(grid.isCleared).toBe(true);
  });

  it('ignores invalid or NaN touch coordinates safely', () => {
    const grid = new SteamGrid(1.0);
    expect(grid.wipe({ x: NaN, y: 0.5 }, { x: 0.9, y: 0.5 }, 0.1)).toBe(0);
    expect(grid.wipe({ x: 0.1, y: 0.5 }, { x: 0.9, y: 0.5 }, -0.1)).toBe(0);
    expect(grid.progress).toBe(0);
  });
});
