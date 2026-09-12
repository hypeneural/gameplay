import { describe, expect, it } from 'vitest';
import { selectMosaicPrimarySound } from '../src/index.js';

describe('MosaicAudioDirector', () => {
  it('chooses one highest-priority cue from an ordered mechanical batch', () => {
    expect(
      selectMosaicPrimarySound([
        { type: 'piece-locked', serial: 4 },
        { type: 'lines-cleared', rows: [12] },
        { type: 'memory-frame-changed', pieceSerial: 4, slot: 'memory-1' },
      ]),
    ).toBe('memory-reveal');
    expect(selectMosaicPrimarySound([{ type: 'target-reached' }])).toBe('victory');
  });
});
