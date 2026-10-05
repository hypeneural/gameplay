import { describe, expect, it } from 'vitest';
import { MusicalGems } from '../src/domain/MusicalGems.js';

describe('MusicalGems', () => {
  it('initializes 4 unlit chime gems with correct musical notes', () => {
    const gems = new MusicalGems();
    expect(gems.gems.length).toBe(4);
    expect(gems.litCount).toBe(0);
    expect(gems.isComplete).toBe(false);

    expect(gems.gems[0]?.note).toBe('C5');
    expect(gems.gems[1]?.note).toBe('E5');
    expect(gems.gems[2]?.note).toBe('G5');
    expect(gems.gems[3]?.note).toBe('C6');
  });

  it('lights up gems on tap and tracks completion status', () => {
    const gems = new MusicalGems();

    const res0 = gems.tap(0);
    expect(res0).toBeDefined();
    expect(res0?.isNew).toBe(true);
    expect(res0?.color).toBe('ruby');
    expect(res0?.note).toBe('C5');
    expect(res0?.allLit).toBe(false);
    expect(gems.litCount).toBe(1);

    // Tapping the same gem again plays sound but is not new progress
    const resRepeat = gems.tap(0);
    expect(resRepeat?.isNew).toBe(false);
    expect(gems.litCount).toBe(1);

    // Tap remaining gems in any order (e.g. 3, 2, 1)
    gems.tap(3);
    gems.tap(2);
    expect(gems.isComplete).toBe(false);

    const finalRes = gems.tap(1);
    expect(finalRes?.allLit).toBe(true);
    expect(gems.isComplete).toBe(true);
    expect(gems.litCount).toBe(4);
  });

  it('returns undefined on invalid gem index', () => {
    const gems = new MusicalGems();
    expect(gems.tap(-1)).toBeUndefined();
    expect(gems.tap(10)).toBeUndefined();
  });
});
