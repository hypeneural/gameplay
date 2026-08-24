import { describe, expect, it } from 'vitest';
import { shouldUseLocalTestMedia } from './LocalTestSession.js';

describe('shouldUseLocalTestMedia', () => {
  it('requires the explicit local test query value', () => {
    expect(shouldUseLocalTestMedia('?test-media=local')).toBe(true);
    expect(shouldUseLocalTestMedia('?test-media=fixture')).toBe(false);
    expect(shouldUseLocalTestMedia('')).toBe(false);
  });
});
