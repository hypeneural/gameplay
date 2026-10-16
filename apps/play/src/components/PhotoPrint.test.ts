import { describe, expect, it } from 'vitest';
import { isCurrentPhotoGeneration, resolveSessionDisplayedPhoto } from './PhotoPrint.js';

describe('PhotoPrint retained-photo isolation', () => {
  it('keeps a decoded photo only within the same authorized session identity', () => {
    const displayed = { sessionKey: 'session-a', src: '/private/session-a/photo.webp' };
    expect(resolveSessionDisplayedPhoto(displayed, 'session-a')).toBe(displayed);
    expect(resolveSessionDisplayedPhoto(displayed, 'session-b')).toBeUndefined();
    expect(resolveSessionDisplayedPhoto(displayed, undefined)).toBeUndefined();
    expect(resolveSessionDisplayedPhoto(undefined, 'session-a')).toBeUndefined();
  });

  it('ignores stale decoded images from a cancelled or replaced photo request', () => {
    expect(isCurrentPhotoGeneration(3, 3, false)).toBe(true);
    expect(isCurrentPhotoGeneration(4, 3, false)).toBe(false);
    expect(isCurrentPhotoGeneration(3, 3, true)).toBe(false);
  });
});
