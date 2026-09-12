import type { GameContext, Photo } from '@christmas-games/platform';
import {
  planMosaicMemoryFrame,
  type MosaicMemoryFramePlan,
} from '../domain/MosaicMemoryFramePlan.js';
import {
  planMosaicPhotoLoads,
  type MosaicPhotoLoadRequest,
  type MosaicPhotoVariant,
} from '../domain/MosaicPhotoLoadPlan.js';
import { planMosaicPhotoSelection, type MosaicPhotoSelection } from '../domain/MosaicPhotoPlan.js';

export interface MosaicRuntimePhotoPlan {
  readonly frame: MosaicMemoryFramePlan;
  readonly loadRequests: readonly MosaicPhotoLoadRequest[];
  readonly photosById: ReadonlyMap<string, Photo>;
  readonly requestByTextureKey: ReadonlyMap<string, MosaicPhotoLoadRequest>;
  readonly selection: MosaicPhotoSelection;
  readonly textureKeys: ReadonlyMap<string, string>;
}

export interface MosaicRuntimePhotoContext {
  readonly run: Pick<GameContext['run'], 'runId'>;
  readonly selectedPhoto: Photo;
  readonly session: Pick<GameContext['session'], 'photos'>;
}

/**
 * Resolves the already-authorized session catalog only after pure plans are
 * frozen. Texture keys are private to the run and never contain a photo id.
 */
export function createMosaicRuntimePhotoPlan(
  context: MosaicRuntimePhotoContext,
): MosaicRuntimePhotoPlan {
  const anchorCatalogPosition = Math.max(
    0,
    context.session.photos.findIndex((photo) => photo.id === context.selectedPhoto.id),
  );
  const selection = planMosaicPhotoSelection({
    anchor: {
      id: context.selectedPhoto.id,
      orientation: context.selectedPhoto.orientation,
      catalogPosition: anchorCatalogPosition,
    },
    candidates: context.session.photos.map((photo, catalogPosition) => ({
      id: photo.id,
      orientation: photo.orientation,
      catalogPosition,
    })),
  });
  const frame = planMosaicMemoryFrame(selection);
  const loadRequests = planMosaicPhotoLoads(selection);
  const photosById = new Map(context.session.photos.map((photo) => [photo.id, photo]));
  photosById.set(context.selectedPhoto.id, context.selectedPhoto);
  for (const request of loadRequests) {
    if (!photosById.has(request.photoId)) {
      throw new Error('Mosaic photo plan must resolve only to session photos.');
    }
  }
  const textureKeys = new Map<string, string>();
  const requestByTextureKey = new Map<string, MosaicPhotoLoadRequest>();
  loadRequests.forEach((request, index) => {
    const textureKey = `mosaico-${context.run.runId}-${index}`;
    textureKeys.set(requestIdentity(request.photoId, request.variant), textureKey);
    requestByTextureKey.set(textureKey, request);
  });
  return { selection, frame, loadRequests, photosById, requestByTextureKey, textureKeys };
}

export function mosaicPhotoTextureKey(
  plan: MosaicRuntimePhotoPlan,
  photoId: string,
  variant: MosaicPhotoVariant,
): string {
  const textureKey = plan.textureKeys.get(requestIdentity(photoId, variant));
  if (textureKey === undefined) throw new Error('Mosaic texture key was not planned.');
  return textureKey;
}

function requestIdentity(photoId: string, variant: MosaicPhotoVariant): string {
  return `${photoId}\u0000${variant}`;
}
