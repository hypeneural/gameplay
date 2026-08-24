import { describe, expect, it } from 'vitest';
import { resolveGameQuality } from './GameQuality.js';

describe('resolveGameQuality', () => {
  it('uses LOW only for an explicit user data-saving preference', () => {
    expect(resolveGameQuality(undefined)).toBe('NORMAL');
    expect(resolveGameQuality({ saveData: false })).toBe('NORMAL');
    expect(resolveGameQuality({ saveData: true })).toBe('LOW');
  });
});
