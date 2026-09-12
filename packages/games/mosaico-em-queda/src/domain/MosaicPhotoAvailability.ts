import type { MosaicMemoryFrameSlot } from './MosaicMemoryFrame.js';
import { planMosaicMemoryFrame } from './MosaicMemoryFramePlan.js';
import type { MosaicPhotoLoadRequest, MosaicPhotoVariant } from './MosaicPhotoLoadPlan.js';
import type { MosaicPhotoSelection } from './MosaicPhotoPlan.js';

export interface MosaicResolvedFramePhoto {
  readonly photoId: string;
  readonly variant: Extract<MosaicPhotoVariant, 'card' | 'game'>;
}

export type MosaicPhotoAvailability =
  | {
      readonly reason: 'anchor-game-unavailable' | 'anchor-thumb-unavailable';
      readonly status: 'blocked';
    }
  | {
      readonly framePhotoBySlot: Readonly<Record<MosaicMemoryFrameSlot, MosaicResolvedFramePhoto>>;
      readonly materialPhotoIds: readonly string[];
      readonly status: 'ready';
    };

/**
 * Resolves loader outcomes before READY. A co-star never blocks play: a missing
 * thumb leaves the material cast and a missing card leaves the Frame. The
 * selected anchor remains mandatory for both board safety and the final hero.
 */
export function resolveMosaicPhotoAvailability(input: {
  readonly failedRequests: readonly MosaicPhotoLoadRequest[];
  readonly selection: MosaicPhotoSelection;
}): MosaicPhotoAvailability {
  const failed = new Set(
    input.failedRequests.map((request) => requestIdentity(request.photoId, request.variant)),
  );
  const anchor = input.selection.anchorPhotoId;
  if (failed.has(requestIdentity(anchor, 'game'))) {
    return { status: 'blocked', reason: 'anchor-game-unavailable' };
  }
  if (failed.has(requestIdentity(anchor, 'thumb'))) {
    return { status: 'blocked', reason: 'anchor-thumb-unavailable' };
  }
  const materialPhotoIds = input.selection.materialPhotoIds.filter(
    (photoId) => !failed.has(requestIdentity(photoId, 'thumb')),
  );
  const availableFramePhotoIds = [
    anchor,
    ...input.selection.framePhotoIds.filter(
      (photoId) => photoId !== anchor && !failed.has(requestIdentity(photoId, 'card')),
    ),
  ];
  const frame = planMosaicMemoryFrame({
    anchorPhotoId: anchor,
    framePhotoIds: availableFramePhotoIds,
  });
  const framePhotoBySlot = Object.fromEntries(
    (Object.keys(frame.photoIdBySlot) as MosaicMemoryFrameSlot[]).map((slot) => {
      const photoId = frame.photoIdBySlot[slot];
      const variant =
        photoId === anchor && failed.has(requestIdentity(anchor, 'card')) ? 'game' : 'card';
      return [slot, { photoId, variant }];
    }),
  ) as Readonly<Record<MosaicMemoryFrameSlot, MosaicResolvedFramePhoto>>;
  return { status: 'ready', materialPhotoIds, framePhotoBySlot };
}

function requestIdentity(photoId: string, variant: MosaicPhotoVariant): string {
  return `${photoId}\u0000${variant}`;
}
