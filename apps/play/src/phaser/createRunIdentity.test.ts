import { describe, expect, it } from 'vitest';
import { createRunIdentity } from './createRunIdentity.js';

describe('createRunIdentity', () => {
  it('preserves an injected replay seed while keeping the run identifier fresh', () => {
    const identity = createRunIdentity(42);
    expect(identity.runSeed).toBe(42);
    expect(identity.runId).toMatch(/^[0-9a-f-]{36}$/i);
  });

  it('rejects values outside an unsigned 32-bit seed', () => {
    expect(() => createRunIdentity(-1)).toThrow('unsigned 32-bit');
    expect(() => createRunIdentity(0x1_0000_0000)).toThrow('unsigned 32-bit');
  });
});
