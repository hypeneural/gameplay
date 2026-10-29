import { describe, expect, it } from 'vitest';
import { assertViteEntryIntegrity } from './vite-entry-integrity.mjs';

const html = '<link href="/assets/index-BFvuR7tZ.css" rel="stylesheet">' +
  '<script type="module" src="/assets/index-CXZUH_4f.js"></script>';
const files = new Set([
  'web/assets/index-CXZUH_4f.js',
  'web/assets/index-BFvuR7tZ.css',
]);

describe('immutable release HTML entrypoint manifest', () => {
  it('accepts JS/CSS pair only when both hashed files exist', () => {
    expect(assertViteEntryIntegrity(html, files).status).toBe('VITE_ENTRY_MANIFEST_PASS');
  });
  it('rejects JS missing from an otherwise complete release manifest', () => {
    expect(() => assertViteEntryIntegrity(html, new Set([
      'web/assets/index-BFvuR7tZ.css',
    ]))).toThrow('VITE_REFERENCED_ENTRY_MISSING');
  });
  it('rejects CSS missing from an otherwise complete release manifest', () => {
    expect(() => assertViteEntryIntegrity(html, new Set([
      'web/assets/index-CXZUH_4f.js',
    ]))).toThrow('VITE_REFERENCED_ENTRY_MISSING');
  });
  it('rejects a shell with zero or only JS references', () => {
    expect(() => assertViteEntryIntegrity('<body></body>', files))
      .toThrow('VITE_ENTRYPOINT_PAIR_MISSING');
    expect(() => assertViteEntryIntegrity(
      '<script src="/assets/index-CXZUH_4f.js"></script>', files,
    )).toThrow('VITE_ENTRYPOINT_PAIR_MISSING');
  });
});
