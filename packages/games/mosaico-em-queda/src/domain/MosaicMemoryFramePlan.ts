import type { MosaicMemoryFrameSlot } from './MosaicMemoryFrame.js';

export interface MosaicMemoryFramePlan {
  readonly photoIdBySlot: Readonly<Record<MosaicMemoryFrameSlot, string>>;
}

/** Maps symbolic Frame milestones to at most four prepared card photos. */
export function planMosaicMemoryFrame(input: {
  readonly anchorPhotoId: string;
  readonly framePhotoIds: readonly string[];
}): MosaicMemoryFramePlan {
  if (input.anchorPhotoId.trim().length === 0)
    throw new Error('Mosaic frame requires an anchor photo.');
  const uniquePhotoIds = [...new Set(input.framePhotoIds)];
  if (uniquePhotoIds.length === 0 || uniquePhotoIds[0] !== input.anchorPhotoId) {
    throw new Error('Mosaic frame cards must begin with the anchor photo.');
  }
  if (uniquePhotoIds.length > 4) throw new Error('Mosaic frame supports at most four card photos.');
  const photoAt = (index: number): string =>
    uniquePhotoIds[Math.min(index, uniquePhotoIds.length - 1)] ?? input.anchorPhotoId;
  return {
    photoIdBySlot: {
      anchor: input.anchorPhotoId,
      'memory-1': photoAt(1),
      'memory-2': photoAt(2),
      'memory-3': photoAt(3),
    },
  };
}
