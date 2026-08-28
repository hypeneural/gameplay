import { describe, expect, it } from 'vitest';
import { selectPuzzleTopology } from '../src/index.js';

describe('PuzzleTopology', () => {
  it('chooses a stable 12-piece topology from photo orientation', () => {
    expect(selectPuzzleTopology(5 / 7)).toEqual({ columns: 3, rows: 4 });
    expect(selectPuzzleTopology(7 / 5)).toEqual({ columns: 4, rows: 3 });
  });

  it('uses the voluntary 4x4 challenge without distorting either photo shape', () => {
    expect(selectPuzzleTopology(5 / 7, 'desafio')).toEqual({ columns: 4, rows: 4 });
    expect(selectPuzzleTopology(7 / 5, 'desafio')).toEqual({ columns: 4, rows: 4 });
  });

  it('rejects invalid source orientation before a run can be created', () => {
    expect(() => selectPuzzleTopology(0)).toThrow('positive finite photo aspect ratio');
  });
});
