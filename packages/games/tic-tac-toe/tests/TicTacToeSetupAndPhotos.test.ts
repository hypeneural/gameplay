import { SeededRandom } from '@christmas-games/platform';
import { describe, expect, it } from 'vitest';
import {
  createLocalTicTacToeSetup,
  createSantaTicTacToeSetup,
  isTicTacToeModeAvailable,
  selectTicTacToePhotoCandidates,
  ticTacToePhotoCandidatePage,
  type TicTacToePhotoDescriptor,
} from '../src/index.js';

const anchor: TicTacToePhotoDescriptor = {
  id: 'anchor',
  orientation: 'portrait',
  aspectRatio: 0.75,
};

describe('Tic-Tac-Toe setup and photo selection', () => {
  it('keeps Santa available with one photo and validates distinct local photos', () => {
    const other: TicTacToePhotoDescriptor = {
      id: 'other',
      orientation: 'landscape',
      aspectRatio: 1.33,
    };

    expect(isTicTacToeModeAvailable('santa', 1)).toBe(true);
    expect(isTicTacToeModeAvailable('local', 1)).toBe(false);
    expect(createSantaTicTacToeSetup(anchor)).toMatchObject({
      initialStarter: 'player-a',
      santaDifficulty: 'smart',
    });
    expect(createLocalTicTacToeSetup(anchor, other, new SeededRandom(2)).photoB.id).toBe('other');
    expect(() => createLocalTicTacToeSetup(anchor, anchor, new SeededRandom(2))).toThrow(
      'two distinct photo ids',
    );
  });

  it('deduplicates, prioritizes opposite orientation, and pages deterministically', () => {
    const candidates: TicTacToePhotoDescriptor[] = Array.from({ length: 172 }, (_, index) => ({
      id: `photo-${index}`,
      orientation: index % 2 === 0 ? 'landscape' : 'portrait',
      aspectRatio: index % 2 === 0 ? 1.33 : 0.75,
    }));
    candidates.push({ ...candidates[0]!, id: 'photo-0' }, anchor);
    const first = selectTicTacToePhotoCandidates({
      anchor,
      candidates,
      random: new SeededRandom(73),
    });
    const second = selectTicTacToePhotoCandidates({
      anchor,
      candidates,
      random: new SeededRandom(73),
    });

    expect(first).toEqual(second);
    expect(first).toHaveLength(172);
    expect(first.every((photo) => photo.id !== anchor.id)).toBe(true);
    expect(new Set(first.map((photo) => photo.id)).size).toBe(first.length);
    expect(first[0]?.orientation).toBe('landscape');
    expect(ticTacToePhotoCandidatePage(first, 0)).toHaveLength(6);
    expect(ticTacToePhotoCandidatePage(first, 28)).toHaveLength(4);
    expect(ticTacToePhotoCandidatePage(first, -1)).toEqual([]);
  });
});
