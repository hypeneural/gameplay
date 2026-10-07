import sharp from 'sharp';

export const mediaVariants = [
  ['thumb', 480],
  ['card', 800],
  ['game', 1600],
] as const;

export type MediaVariant = (typeof mediaVariants)[number][0];

export interface MediaVariantMetric {
  readonly width: number;
  readonly height: number;
  readonly byteLength: number;
}

export const mediaWorkerVersion = '0.2.0';
export const mediaRecipeVersion = 1;
export const mediaRecipeQuality = 82;

const sharpVersion = sharp.versions.sharp ?? 'unknown';
const libvipsVersion = sharp.versions.vips ?? 'unknown';

/**
 * Semantic namespace for browser-deliverable derivatives. Any change that can
 * alter output pixels or bytes must change this key so stale media is never
 * reused merely because the source photo is identical.
 */
export const mediaRecipeKey = [
  `recipe-${mediaRecipeVersion}`,
  'webp82',
  'srgb',
  'inside',
  'no-upscale',
  't480-c800-g1600',
  `sharp-${sharpVersion}`,
  `vips-${libvipsVersion}`,
].join('-');

export const mediaWorkerFingerprint = {
  version: mediaWorkerVersion,
  recipeKey: mediaRecipeKey,
  sharpVersion,
  libvipsVersion,
} as const;
