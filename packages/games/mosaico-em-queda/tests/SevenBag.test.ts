import { describe, expect, it } from 'vitest';
import {
  createMosaicRandom,
  deriveMosaicSeed,
  drawSevenBag,
  TETROMINO_KINDS,
} from '../src/index.js';

describe('SevenBag', () => {
  it('draws every kind exactly once before refilling', () => {
    let random = createMosaicRandom(deriveMosaicSeed(1234, 'pieces'));
    const drawn = drawSevenBag([], random);
    random = drawn.random;

    expect([...drawn.bag].sort()).toEqual([...TETROMINO_KINDS].sort());
    expect(drawn.bag).toHaveLength(7);
    expect(random.state).not.toBe(createMosaicRandom(deriveMosaicSeed(1234, 'pieces')).state);
  });

  it('isolates material draws from the piece stream', () => {
    const pieceSeed = deriveMosaicSeed(88, 'pieces');
    const materialSeed = deriveMosaicSeed(88, 'materials');

    expect(pieceSeed).not.toBe(materialSeed);
    expect(drawSevenBag([], createMosaicRandom(pieceSeed)).bag).toEqual(
      drawSevenBag([], createMosaicRandom(pieceSeed)).bag,
    );
  });
});
