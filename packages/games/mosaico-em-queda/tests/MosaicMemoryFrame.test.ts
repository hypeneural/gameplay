import { describe, expect, it } from 'vitest';
import {
  createMosaicMemoryFrame,
  createMosaicProgress,
  resolveMosaicMemoryFrame,
  resolveMosaicProgress,
} from '../src/index.js';

describe('MosaicMemoryFrame', () => {
  it('uses the last milestone once for a multi-line lock and restores the anchor on victory', () => {
    const initialProgress = createMosaicProgress('normal');
    const frameAfterLock = resolveMosaicMemoryFrame(createMosaicMemoryFrame(), initialProgress, [
      { type: 'piece-locked', serial: 7 },
    ]);
    const twoLines = resolveMosaicProgress(initialProgress, [
      { type: 'lines-cleared', rows: [12, 13] },
    ]);
    const frameAfterClear = resolveMosaicMemoryFrame(frameAfterLock.state, twoLines.state, [
      { type: 'lines-cleared', rows: [12, 13] },
    ]);
    const victory = resolveMosaicProgress(twoLines.state, [
      { type: 'lines-cleared', rows: [10, 11] },
    ]);
    const frameAfterVictory = resolveMosaicMemoryFrame(
      { ...frameAfterClear.state, pendingLockSerial: 8 },
      victory.state,
      [{ type: 'lines-cleared', rows: [10, 11] }],
    );
    const duplicateClear = resolveMosaicMemoryFrame(frameAfterClear.state, twoLines.state, [
      { type: 'lines-cleared', rows: [12, 13] },
    ]);

    expect(frameAfterClear.effects).toEqual([
      { type: 'memory-frame-changed', pieceSerial: 7, slot: 'memory-2' },
    ]);
    expect(frameAfterVictory.effects).toEqual([
      { type: 'memory-frame-changed', pieceSerial: 8, slot: 'anchor' },
    ]);
    expect(duplicateClear.effects).toEqual([]);
  });
});
