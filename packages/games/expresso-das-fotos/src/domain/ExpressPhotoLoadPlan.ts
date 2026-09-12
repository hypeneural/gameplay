export type ExpressPhotoVariant = 'card' | 'game';

export interface ExpressPhotoLoadPlan {
  readonly photoId: string;
  readonly variant: ExpressPhotoVariant;
}

/**
 * Plans the unique, authorized textures needed by a run without examining a
 * URL or image pixel. The anchor keeps the higher-detail game derivative;
 * every additional destination uses its lighter card derivative.
 */
export function planExpressPhotoLoads(input: {
  readonly anchorPhotoId: string;
  readonly destinationPhotoIds: readonly string[];
}): readonly ExpressPhotoLoadPlan[] {
  const seen = new Set<string>();
  const plan: ExpressPhotoLoadPlan[] = [];

  for (const photoId of input.destinationPhotoIds) {
    if (seen.has(photoId)) continue;
    seen.add(photoId);
    plan.push({
      photoId,
      variant: photoId === input.anchorPhotoId ? 'game' : 'card',
    });
  }

  if (!seen.has(input.anchorPhotoId)) {
    throw new Error('Expresso photo load plan requires the selected anchor photo.');
  }

  return plan;
}
