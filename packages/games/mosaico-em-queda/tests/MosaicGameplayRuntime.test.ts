import { describe, expect, it } from 'vitest';
import { emptyMosaicInput, MOSAIC_FIXED_STEP_MS, MosaicGameplayRuntime } from '../src/index.js';

describe('MosaicGameplayRuntime', () => {
  it('advances a fixed step and forwards its ordered domain effect without Phaser', () => {
    const runtime = new MosaicGameplayRuntime('normal', 20260903, 4);
    const initialRow = runtime.state.engine.active?.row;
    if (initialRow === undefined) throw new Error('New runtime must have an active tetromino.');
    const updates = [] as ReturnType<MosaicGameplayRuntime['advance']>[];

    expect(
      runtime.advancePresentation(
        MOSAIC_FIXED_STEP_MS,
        () => ({ ...emptyMosaicInput(), softDropPressed: true }),
        (update) => updates.push(update),
      ),
    ).toBe(1);

    expect(runtime.state.engine.active?.row).toBe(initialRow + 1);
    expect(updates).toEqual([
      expect.objectContaining({
        interactionSettled: true,
        effects: [{ type: 'piece-moved', serial: runtime.state.engine.active?.serial }],
      }),
    ]);
  });
});
