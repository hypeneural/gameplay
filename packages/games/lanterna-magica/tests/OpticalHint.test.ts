import { describe, expect, it } from 'vitest';
import {
  getLevelById,
  computeOptimalMirrorAngle,
  findNextMisalignedMirror,
} from '../src/domain/LanternPuzzleLevels.js';

describe('OpticalHint Domain Logic', () => {
  it('returns the optimal expected angle for a valid mirror in level 1', () => {
    const level1 = getLevelById(1);
    const angle = computeOptimalMirrorAngle(level1, 'mirror-1');
    expect(angle).toBe(135);
  });

  it('returns undefined for a non-existent mirror', () => {
    const level1 = getLevelById(1);
    const angle = computeOptimalMirrorAngle(level1, 'mirror-999');
    expect(angle).toBeUndefined();
  });

  it('identifies the first misaligned mirror when mirror is at initial angle', () => {
    const level1 = getLevelById(1);
    const currentAngles = new Map<string, number>([['mirror-1', 0]]);
    const hint = findNextMisalignedMirror(level1, currentAngles);

    expect(hint).toEqual({
      mirrorId: 'mirror-1',
      targetAngle: 135,
    });
  });

  it('recognizes 180-degree reflection symmetry as aligned', () => {
    const level1 = getLevelById(1);
    // 135 + 180 = 315 deg, functionally identical reflection plane
    const currentAngles = new Map<string, number>([['mirror-1', 315]]);
    const hint = findNextMisalignedMirror(level1, currentAngles);

    expect(hint).toBeUndefined();
  });

  it('finds misaligned mirror in multi-mirror levels', () => {
    const level2 = getLevelById(2);
    // Mirror 1 is aligned (45 deg), Mirror 2 is misaligned (at 0 deg instead of 135 deg)
    const currentAngles = new Map<string, number>([
      ['mirror-1', 45],
      ['mirror-2', 0],
    ]);
    const hint = findNextMisalignedMirror(level2, currentAngles);

    expect(hint).toEqual({
      mirrorId: 'mirror-2',
      targetAngle: 135,
    });
  });
});
