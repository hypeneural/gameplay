import { describe, expect, it } from 'vitest';
import { resolveMosaicPhotoAvailability } from '../src/index.js';

const selection = {
  anchorPhotoId: 'anchor',
  materialPhotoIds: ['anchor', 'co-star-a', 'co-star-b'],
  framePhotoIds: ['anchor', 'co-star-a', 'co-star-b'],
} as const;

describe('Mosaico photo availability', () => {
  it('blocks only when a required anchor derivative is unavailable', () => {
    expect(
      resolveMosaicPhotoAvailability({
        selection,
        failedRequests: [{ photoId: 'anchor', variant: 'game' }],
      }),
    ).toEqual({ status: 'blocked', reason: 'anchor-game-unavailable' });
  });

  it('remaps co-stars and uses the authorized game derivative when the anchor card fails', () => {
    expect(
      resolveMosaicPhotoAvailability({
        selection,
        failedRequests: [
          { photoId: 'co-star-a', variant: 'thumb' },
          { photoId: 'co-star-b', variant: 'card' },
          { photoId: 'anchor', variant: 'card' },
        ],
      }),
    ).toEqual({
      status: 'ready',
      materialPhotoIds: ['anchor', 'co-star-b'],
      framePhotoBySlot: {
        anchor: { photoId: 'anchor', variant: 'game' },
        'memory-1': { photoId: 'co-star-a', variant: 'card' },
        'memory-2': { photoId: 'co-star-a', variant: 'card' },
        'memory-3': { photoId: 'co-star-a', variant: 'card' },
      },
    });
  });
});
