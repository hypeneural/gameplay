import { describe, expect, it } from 'vitest';
import {
  createMosaicRuntimePhotoPlan,
  MosaicAssetLedger,
  mosaicPhotoTextureKey,
} from '../src/index.js';
import type { Photo } from '@christmas-games/platform';

function photo(id: string, orientation: Photo['orientation']): Photo {
  return {
    id,
    orientation,
    width: 100,
    height: 100,
    aspectRatio: 1,
    variants: {
      thumb: `/${id}/thumb`,
      card: `/${id}/card`,
      game: `/${id}/game`,
    },
  };
}

describe('Mosaico runtime photo plan', () => {
  it('freezes authorized derivatives under distinct run-private texture keys', () => {
    const anchor = photo('anchor', 'portrait');
    const context = {
      run: { runId: 'run-9' },
      selectedPhoto: anchor,
      session: {
        photos: [
          anchor,
          photo('landscape', 'landscape'),
          photo('square', 'square'),
          photo('portrait', 'portrait'),
        ],
      },
    };

    const plan = createMosaicRuntimePhotoPlan(context);

    expect(plan.selection.materialPhotoIds).toEqual(['anchor', 'landscape', 'square', 'portrait']);
    expect(plan.frame.photoIdBySlot).toEqual({
      anchor: 'anchor',
      'memory-1': 'landscape',
      'memory-2': 'square',
      'memory-3': 'portrait',
    });
    expect(plan.loadRequests).toHaveLength(9);
    expect(mosaicPhotoTextureKey(plan, 'anchor', 'thumb')).not.toBe(
      mosaicPhotoTextureKey(plan, 'anchor', 'card'),
    );
    expect([...plan.textureKeys.values()]).toEqual([
      'mosaico-run-9-0',
      'mosaico-run-9-1',
      'mosaico-run-9-2',
      'mosaico-run-9-3',
      'mosaico-run-9-4',
      'mosaico-run-9-5',
      'mosaico-run-9-6',
      'mosaico-run-9-7',
      'mosaico-run-9-8',
    ]);
  });

  it('does not mark the run ready when one required derivative fails', () => {
    const ledger = new MosaicAssetLedger(new Set(['photo-0', 'photo-1']));

    ledger.markComplete('photo-0');
    ledger.markFailed('photo-1');
    ledger.markComplete('photo-1');

    expect(ledger.isReady).toBe(false);
  });
});
