import { describe, expect, it } from 'vitest';
import { createViewportLayout, SeededRandom } from '../src/index.js';

describe('SeededRandom', () => {
  it('is repeatable and stays inside an integer range', () => {
    const first = new SeededRandom(42);
    const second = new SeededRandom(42);

    expect([first.next(), first.next(), first.next()]).toEqual([
      second.next(),
      second.next(),
      second.next(),
    ]);
    expect(first.int(3, 3)).toBe(3);
  });
});

describe('createViewportLayout', () => {
  it.each([
    [360, 800],
    [390, 844],
    [412, 915],
    [430, 932],
    [768, 1024],
  ])('creates a usable layout for %ix%i', (width, height) => {
    const viewport = createViewportLayout(width, height);
    expect(viewport.contentWidth).toBe(width);
    expect(viewport.contentHeight).toBeGreaterThan(0);
  });
});
