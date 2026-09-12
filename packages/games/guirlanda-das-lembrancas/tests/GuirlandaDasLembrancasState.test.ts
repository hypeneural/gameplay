import { describe, expect, it } from 'vitest';
import {
  GUIRLANDA_SLOT_COUNT,
  createGuirlandaDasLembrancasState,
  getCurrentGuirlandaPhotoId,
  placeCurrentGuirlandaPhoto,
  selectCurrentGuirlandaPhoto,
} from '../src/domain/GuirlandaDasLembrancasState.js';

describe('Guirlanda das Lembranças state', () => {
  it('mounts memories in any empty hook without inventing a wrong answer', () => {
    const ready = createGuirlandaDasLembrancasState(['anchor', 'snow', 'gift']);
    const selected = selectCurrentGuirlandaPhoto(ready);
    const placed = placeCurrentGuirlandaPhoto(selected.state, 4);

    expect(placed.accepted).toBe(true);
    expect(placed.state.mountedBySlot[4]).toBe('anchor');
    expect(placed.state.phase).toBe('awaiting-photo');
    expect(getCurrentGuirlandaPhotoId(placed.state)).toBe('snow');
  });

  it('does not advance when a hook is tapped before the centre memory is selected', () => {
    const ready = createGuirlandaDasLembrancasState(['anchor']);
    const result = placeCurrentGuirlandaPhoto(ready, 0);

    expect(result).toEqual({ accepted: false, reason: 'not-awaiting-slot', state: ready });
  });

  it('does not replace a mounted memory and leaves the current choice intact', () => {
    const ready = createGuirlandaDasLembrancasState(['anchor', 'snow']);
    const firstPlacement = placeCurrentGuirlandaPhoto(selectCurrentGuirlandaPhoto(ready).state, 2);
    const retry = placeCurrentGuirlandaPhoto(
      selectCurrentGuirlandaPhoto(firstPlacement.state).state,
      2,
    );

    expect(retry.accepted).toBe(false);
    expect(retry.reason).toBe('slot-unavailable');
    expect(getCurrentGuirlandaPhotoId(retry.state)).toBe('snow');
  });

  it('completes after the last photo while retaining the whole mounted wreath', () => {
    const ready = createGuirlandaDasLembrancasState(['anchor', 'snow']);
    const first = placeCurrentGuirlandaPhoto(selectCurrentGuirlandaPhoto(ready).state, 0).state;
    const last = placeCurrentGuirlandaPhoto(selectCurrentGuirlandaPhoto(first).state, 5).state;

    expect(last.phase).toBe('completed');
    expect(last.mountedBySlot).toEqual([
      'anchor',
      undefined,
      undefined,
      undefined,
      undefined,
      'snow',
    ]);
  });

  it('rejects an invalid photo collection before play begins', () => {
    expect(() => createGuirlandaDasLembrancasState([])).toThrow('between 1');
    expect(() => createGuirlandaDasLembrancasState(['same', 'same'])).toThrow('unique');
    expect(() =>
      createGuirlandaDasLembrancasState(
        Array.from({ length: GUIRLANDA_SLOT_COUNT + 1 }, (_, index) => `photo-${index}`),
      ),
    ).toThrow('between 1');
  });
});
