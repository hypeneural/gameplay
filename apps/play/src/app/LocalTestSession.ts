import type { Photo, PhotoVariant, Session } from '@christmas-games/platform';

const localMediaQueryKey = 'test-media';
const photoVariants: readonly PhotoVariant[] = ['thumb', 'card', 'game'];

/** Local-only flag; it is ignored unless the dev server exposes the safe endpoint. */
export function shouldUseLocalTestMedia(search: string): boolean {
  return new URLSearchParams(search).get(localMediaQueryKey) === 'local';
}

/**
 * Fetches opaque ids and local derivative URLs only. The response is validated
 * before it reaches the game; original names and file system paths are not part
 * of this browser contract.
 */
export async function fetchLocalTestSession(): Promise<Session> {
  const response = await fetch('/__local-test/session', { cache: 'no-store' });
  if (!response.ok) throw new Error('A sessão local de teste ainda não está preparada.');
  const value: unknown = await response.json();
  if (!isSession(value)) throw new Error('A sessão local de teste retornou um contrato inválido.');
  return value;
}

function isSession(value: unknown): value is Session {
  if (!value || typeof value !== 'object') return false;
  const session = value as Partial<Session>;
  return (
    typeof session.id === 'string' &&
    typeof session.publicToken === 'string' &&
    typeof session.displayName === 'string' &&
    Array.isArray(session.photos) &&
    session.photos.length > 0 &&
    session.photos.every(isPhoto)
  );
}

function isPhoto(value: unknown): value is Photo {
  if (!value || typeof value !== 'object') return false;
  const photo = value as Partial<Photo>;
  return (
    typeof photo.id === 'string' &&
    typeof photo.width === 'number' &&
    Number.isFinite(photo.width) &&
    photo.width > 0 &&
    typeof photo.height === 'number' &&
    Number.isFinite(photo.height) &&
    photo.height > 0 &&
    typeof photo.aspectRatio === 'number' &&
    Number.isFinite(photo.aspectRatio) &&
    photo.aspectRatio > 0 &&
    (photo.orientation === 'portrait' ||
      photo.orientation === 'landscape' ||
      photo.orientation === 'square') &&
    !!photo.variants &&
    photoVariants.every((variant) => typeof photo.variants?.[variant] === 'string') &&
    (photo.variantMetrics === undefined ||
      photoVariants.every((variant) => isVariantMetric(photo.variantMetrics?.[variant])))
  );
}

function isVariantMetric(
  value: Photo['variantMetrics'] extends infer Metrics
    ? Metrics extends Partial<Record<PhotoVariant, infer Metric>>
      ? Metric | undefined
      : never
    : never,
): boolean {
  if (!value) return false;
  return (
    Number.isInteger(value.width) &&
    value.width > 0 &&
    Number.isInteger(value.height) &&
    value.height > 0 &&
    (value.byteLength === undefined || (Number.isInteger(value.byteLength) && value.byteLength > 0))
  );
}
