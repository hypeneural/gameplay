/**
 * Versioned, SIDE-EFFECT FREE boundary shared by the future manual Node
 * publisher and EvydFlow Python adapter. It does not activate a session or
 * grant access; the server must recheck every byte, hash and authorization.
 *
 * The input is an untrusted JSON manifest, never a filesystem path.
 */
export const publicationLimits = {
  maxPhotos: 200,
  maxVariantBytes: 12 * 1024 * 1024,
  maxRevisionBytes: 600 * 1024 * 1024,
  maxDimension: 12_000,
} as const;

const publicationVariantNames = ['thumb', 'card', 'game'] as const;
type PublicationVariantName = (typeof publicationVariantNames)[number];

interface PublicationVariantV1 {
  readonly blobId: string;
  readonly sha256: string;
  readonly byteLength: number;
  readonly width: number;
  readonly height: number;
}

interface PublicationPhotoV1 {
  readonly photoId: string;
  readonly contentHash: string;
  readonly sortIndex: number;
  readonly width: number;
  readonly height: number;
  readonly variants: Record<PublicationVariantName, PublicationVariantV1>;
}

export interface PublicationManifestV1 {
  readonly schemaVersion: 1;
  readonly requestId: string;
  readonly sessionId: string;
  readonly expectedActiveRevisionId: string | null;
  readonly recipeKey: string;
  readonly photos: readonly PublicationPhotoV1[];
}

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const hash = /^[0-9a-f]{64}$/i;
const photoIdPattern = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/;
const recipePattern = /^[A-Za-z0-9][A-Za-z0-9._-]{0,254}$/;
const variantKeys = ['blobId', 'sha256', 'byteLength', 'width', 'height'] as const;
const photoKeys = ['photoId', 'contentHash', 'sortIndex', 'width', 'height', 'variants'] as const;
const manifestKeys = [
  'schemaVersion',
  'requestId',
  'sessionId',
  'expectedActiveRevisionId',
  'recipeKey',
  'photos',
] as const;

function invalid(): never {
  // Never interpolate untrusted properties or private filenames into errors/logs.
  throw new Error('publication_manifest_invalid');
}

function isRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === 'object' && input !== null && !Array.isArray(input);
}

function exactKeys(input: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(input);
  return actual.length === keys.length && actual.every((key) => keys.includes(key));
}

function positiveInteger(input: unknown, limit: number): input is number {
  return Number.isSafeInteger(input) && typeof input === 'number' && input > 0 && input <= limit;
}

function uuidString(input: unknown): input is string {
  return typeof input === 'string' && uuid.test(input);
}

/**
 * Rejects unknown fields (including paths, URLs, tokens and customer PII),
 * duplicates, gaps in sort indexes, oversized batches, non-WebP variant
 * descriptors and malformed hashes. This is only a preflight; successful
 * parsing is NOT proof a file was uploaded or authorized.
 */
export function parsePublicationManifestV1(input: unknown): PublicationManifestV1 {
  if (!isRecord(input) || !exactKeys(input, manifestKeys)) invalid();
  if (
    input.schemaVersion !== 1 ||
    !uuidString(input.requestId) ||
    !uuidString(input.sessionId) ||
    !(input.expectedActiveRevisionId === null || uuidString(input.expectedActiveRevisionId)) ||
    typeof input.recipeKey !== 'string' ||
    !recipePattern.test(input.recipeKey) ||
    !Array.isArray(input.photos) ||
    input.photos.length < 1 ||
    input.photos.length > publicationLimits.maxPhotos
  )
    invalid();

  const seenPhotos = new Set<string>();
  const seenBlobs = new Set<string>();
  const seenSortIndices = new Set<number>();
  const photos: PublicationPhotoV1[] = [];
  let bytes = 0;

  for (const item of input.photos as unknown[]) {
    if (!isRecord(item) || !exactKeys(item, photoKeys)) invalid();
    if (
      typeof item.photoId !== 'string' ||
      !photoIdPattern.test(item.photoId) ||
      seenPhotos.has(item.photoId) ||
      typeof item.contentHash !== 'string' ||
      !hash.test(item.contentHash) ||
      !Number.isSafeInteger(item.sortIndex) ||
      typeof item.sortIndex !== 'number' ||
      item.sortIndex < 0 ||
      item.sortIndex >= input.photos.length ||
      seenSortIndices.has(item.sortIndex) ||
      !positiveInteger(item.width, publicationLimits.maxDimension) ||
      !positiveInteger(item.height, publicationLimits.maxDimension) ||
      !isRecord(item.variants) ||
      !exactKeys(item.variants, publicationVariantNames)
    )
      invalid();

    seenPhotos.add(item.photoId);
    seenSortIndices.add(item.sortIndex);
    const variants = {} as Record<PublicationVariantName, PublicationVariantV1>;
    for (const name of publicationVariantNames) {
      const variant = item.variants[name];
      if (!isRecord(variant) || !exactKeys(variant, variantKeys)) invalid();
      if (
        !uuidString(variant.blobId) ||
        seenBlobs.has(variant.blobId) ||
        typeof variant.sha256 !== 'string' ||
        !hash.test(variant.sha256) ||
        !positiveInteger(variant.byteLength, publicationLimits.maxVariantBytes) ||
        !positiveInteger(variant.width, publicationLimits.maxDimension) ||
        !positiveInteger(variant.height, publicationLimits.maxDimension) ||
        variant.width > item.width ||
        variant.height > item.height
      )
        invalid();

      seenBlobs.add(variant.blobId);
      bytes += variant.byteLength;
      if (bytes > publicationLimits.maxRevisionBytes) invalid();
      variants[name] = {
        blobId: variant.blobId,
        sha256: variant.sha256.toLowerCase(),
        byteLength: variant.byteLength,
        width: variant.width,
        height: variant.height,
      };
    }
    photos.push({
      photoId: item.photoId,
      contentHash: item.contentHash.toLowerCase(),
      sortIndex: item.sortIndex,
      width: item.width,
      height: item.height,
      variants,
    });
  }

  // Stable deterministic ordering is critical for gallery and game photo IDs.
  return {
    schemaVersion: 1,
    requestId: input.requestId,
    sessionId: input.sessionId,
    expectedActiveRevisionId: input.expectedActiveRevisionId,
    recipeKey: input.recipeKey,
    photos: photos.sort((a, b) => a.sortIndex - b.sortIndex),
  };
}
