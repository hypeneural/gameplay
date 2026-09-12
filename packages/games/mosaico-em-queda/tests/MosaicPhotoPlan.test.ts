import { describe, expect, it } from 'vitest';
import {
  planMosaicMemoryFrame,
  planMosaicPhotoLoads,
  planMosaicPhotoSelection,
} from '../src/index.js';

describe('Mosaico photo plans', () => {
  it('keeps the anchor first and selects a bounded, orientation-aware catalog cast', () => {
    const selection = planMosaicPhotoSelection({
      anchor: { id: 'anchor', orientation: 'portrait', catalogPosition: 4 },
      candidates: [
        { id: 'portrait', orientation: 'portrait', catalogPosition: 0 },
        { id: 'landscape', orientation: 'landscape', catalogPosition: 1 },
        { id: 'square', orientation: 'square', catalogPosition: 2 },
        { id: 'landscape', orientation: 'landscape', catalogPosition: 3 },
        { id: 'fourth', orientation: 'portrait', catalogPosition: 5 },
        { id: 'fifth', orientation: 'landscape', catalogPosition: 6 },
      ],
    });

    expect(selection).toEqual({
      anchorPhotoId: 'anchor',
      materialPhotoIds: ['anchor', 'landscape', 'square', 'portrait', 'fourth', 'fifth'],
      framePhotoIds: ['anchor', 'landscape', 'square', 'portrait'],
    });
    expect(planMosaicMemoryFrame(selection)).toEqual({
      photoIdBySlot: {
        anchor: 'anchor',
        'memory-1': 'landscape',
        'memory-2': 'square',
        'memory-3': 'portrait',
      },
    });
    expect(planMosaicPhotoLoads(selection)).toEqual([
      { photoId: 'anchor', variant: 'game' },
      { photoId: 'anchor', variant: 'thumb' },
      { photoId: 'landscape', variant: 'thumb' },
      { photoId: 'square', variant: 'thumb' },
      { photoId: 'portrait', variant: 'thumb' },
      { photoId: 'fourth', variant: 'thumb' },
      { photoId: 'fifth', variant: 'thumb' },
      { photoId: 'anchor', variant: 'card' },
      { photoId: 'landscape', variant: 'card' },
      { photoId: 'square', variant: 'card' },
      { photoId: 'portrait', variant: 'card' },
    ]);
  });

  it('uses one authorized photo for every symbolic frame slot', () => {
    const selection = planMosaicPhotoSelection({
      anchor: { id: 'only', orientation: 'square', catalogPosition: 0 },
      candidates: [],
    });

    expect(planMosaicMemoryFrame(selection).photoIdBySlot).toEqual({
      anchor: 'only',
      'memory-1': 'only',
      'memory-2': 'only',
      'memory-3': 'only',
    });
    expect(planMosaicPhotoLoads(selection)).toEqual([
      { photoId: 'only', variant: 'game' },
      { photoId: 'only', variant: 'thumb' },
      { photoId: 'only', variant: 'card' },
    ]);
  });
});
