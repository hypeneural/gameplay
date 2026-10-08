import { describe, expect, it } from 'vitest';
import { resolveBrowserReleaseMode } from './ReleaseMode.js';

describe('resolveBrowserReleaseMode', () => {
  it('allows fixtures during normal local development', () => {
    expect(resolveBrowserReleaseMode({ DEV: true, PROD: false, MODE: 'development' })).toBe(
      'development',
    );
  });

  it('allows the explicit synthetic VPS staging build', () => {
    expect(resolveBrowserReleaseMode({ DEV: false, PROD: true, MODE: 'staging-demo' })).toBe(
      'staging-demo',
    );
  });

  it('fails closed for the normal production build until real sessions exist', () => {
    expect(resolveBrowserReleaseMode({ DEV: false, PROD: true, MODE: 'production' })).toBe(
      'production-disabled',
    );
  });
});
