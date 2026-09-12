import type { MosaicPhotoSelection } from './MosaicPhotoPlan.js';

export type MosaicPhotoVariant = 'thumb' | 'card' | 'game';

export interface MosaicPhotoLoadRequest {
  readonly photoId: string;
  readonly variant: MosaicPhotoVariant;
}

/** Lists each authorized derivative once; the runtime resolves URLs only after this plan is frozen. */
export function planMosaicPhotoLoads(
  input: MosaicPhotoSelection,
): readonly MosaicPhotoLoadRequest[] {
  if (!input.materialPhotoIds.includes(input.anchorPhotoId)) {
    throw new Error('Mosaic photo plan requires its anchor in board materials.');
  }
  if (input.framePhotoIds[0] !== input.anchorPhotoId) {
    throw new Error('Mosaic photo plan requires its anchor in frame cards.');
  }
  const requests: MosaicPhotoLoadRequest[] = [];
  const append = (photoId: string, variant: MosaicPhotoVariant): void => {
    if (!requests.some((request) => request.photoId === photoId && request.variant === variant)) {
      requests.push({ photoId, variant });
    }
  };

  append(input.anchorPhotoId, 'game');
  input.materialPhotoIds.forEach((photoId) => append(photoId, 'thumb'));
  input.framePhotoIds.forEach((photoId) => append(photoId, 'card'));
  return requests;
}
