import { describe, expect, it } from 'vitest';
import { RequiredAssetLedger } from '../src/runtime/RequiredAssetLedger.js';

describe('RequiredAssetLedger', () => {
  it('requires individual completion for every photo key', () => {
    const ledger = new RequiredAssetLedger(new Set(['photo-1', 'photo-2']));

    ledger.markComplete('photo-1');
    expect(ledger.isReady).toBe(false);
    ledger.markComplete('unrelated-decoration');
    expect(ledger.isReady).toBe(false);
    ledger.markComplete('photo-2');
    expect(ledger.isReady).toBe(true);
  });

  it('never treats a run with a failed required key as ready', () => {
    const ledger = new RequiredAssetLedger(new Set(['photo-1']));

    ledger.markFailed('photo-1');
    ledger.markComplete('photo-1');

    expect(ledger.isReady).toBe(false);
  });

  it('rejects a ledger that cannot prove anything was loaded', () => {
    expect(() => new RequiredAssetLedger(new Set())).toThrow('at least one');
  });
});
