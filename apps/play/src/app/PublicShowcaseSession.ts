import type { Photo, PhotoVariant, Session } from '@christmas-games/platform';

export type PublicShowcaseErrorCode =
  | 'PUBLIC_SHOWCASE_NOT_FOUND'
  | 'PUBLIC_SHOWCASE_SERVER_ERROR'
  | 'PUBLIC_SHOWCASE_NETWORK_ERROR'
  | 'PUBLIC_SHOWCASE_INVALID_MANIFEST'
  | 'PUBLIC_SHOWCASE_INVALID_MEDIA_URL'
  | 'PUBLIC_SHOWCASE_ABORTED';

export class PublicShowcaseLoadError extends Error {
  readonly code: PublicShowcaseErrorCode;
  readonly status: number | undefined;

  constructor(
    code: PublicShowcaseErrorCode,
    message: string,
    options?: { cause?: unknown; status?: number },
  ) {
    super(message, { cause: options?.cause });
    this.name = 'PublicShowcaseLoadError';
    this.code = code;
    this.status = options?.status;
  }
}

interface PublicShowcaseManifestPhoto {
  readonly photoId: string;
  readonly orientation: 'portrait' | 'landscape' | 'square';
  readonly width: number;
  readonly height: number;
  readonly variants: Record<PhotoVariant, string>;
  readonly sha256: Record<PhotoVariant, string>;
}

export interface PublicShowcaseManifest {
  readonly schemaVersion: 1;
  readonly collectionId: string;
  readonly generatedAt: string;
  readonly photos: readonly PublicShowcaseManifestPhoto[];
}

const photoVariants: readonly PhotoVariant[] = ['thumb', 'card', 'game'];
const photoIdPattern = /^demo_[0-9]{3}$/;
const sha256Pattern = /^[a-f0-9]{64}$/;
const collectionIdPattern = /^[a-z0-9][a-z0-9_-]{2,63}$/;

export function isApprovedShowcaseVariantUrl(
  url: unknown,
  expectedPhotoId: string,
  expectedVariant: PhotoVariant,
): url is string {
  if (typeof url !== 'string') return false;
  if (url.includes('..') || url.includes('//') || url.includes('\\')) return false;
  const expectedPrefix = `/showcase/v1/${expectedPhotoId}/${expectedVariant}.webp`;
  if (url === expectedPrefix) return true;
  if (!url.startsWith(`${expectedPrefix}?v=`)) return false;
  const version = url.slice(`${expectedPrefix}?v=`.length);
  return /^[a-f0-9]{8,64}$/.test(version);
}

export function parsePublicShowcaseManifest(value: unknown): PublicShowcaseManifest {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new PublicShowcaseLoadError(
      'PUBLIC_SHOWCASE_INVALID_MANIFEST',
      'O manifesto da vitrine pública é inválido.',
    );
  }
  const candidate = value as Partial<PublicShowcaseManifest>;
  if (
    candidate.schemaVersion !== 1 ||
    typeof candidate.collectionId !== 'string' ||
    !collectionIdPattern.test(candidate.collectionId) ||
    typeof candidate.generatedAt !== 'string' ||
    candidate.generatedAt.length === 0 ||
    !Array.isArray(candidate.photos) ||
    candidate.photos.length === 0
  ) {
    throw new PublicShowcaseLoadError(
      'PUBLIC_SHOWCASE_INVALID_MANIFEST',
      'O contrato do manifesto da vitrine pública está incompleto.',
    );
  }

  const seenIds = new Set<string>();
  const validatedPhotos: PublicShowcaseManifestPhoto[] = [];

  for (const rawPhoto of candidate.photos) {
    if (!rawPhoto || typeof rawPhoto !== 'object' || Array.isArray(rawPhoto)) {
      throw new PublicShowcaseLoadError(
        'PUBLIC_SHOWCASE_INVALID_MANIFEST',
        'Item de fotografia inválido no manifesto da vitrine pública.',
      );
    }
    const item = rawPhoto as Partial<PublicShowcaseManifestPhoto>;
    if (
      typeof item.photoId !== 'string' ||
      !photoIdPattern.test(item.photoId) ||
      seenIds.has(item.photoId)
    ) {
      throw new PublicShowcaseLoadError(
        'PUBLIC_SHOWCASE_INVALID_MANIFEST',
        'Identificador de fotografia inválido ou duplicado na vitrine pública.',
      );
    }
    seenIds.add(item.photoId);

    if (
      item.orientation !== 'portrait' &&
      item.orientation !== 'landscape' &&
      item.orientation !== 'square'
    ) {
      throw new PublicShowcaseLoadError(
        'PUBLIC_SHOWCASE_INVALID_MANIFEST',
        'Orientação de fotografia inválida na vitrine pública.',
      );
    }

    if (
      typeof item.width !== 'number' ||
      !Number.isInteger(item.width) ||
      item.width <= 0 ||
      typeof item.height !== 'number' ||
      !Number.isInteger(item.height) ||
      item.height <= 0
    ) {
      throw new PublicShowcaseLoadError(
        'PUBLIC_SHOWCASE_INVALID_MANIFEST',
        'Dimensões de fotografia inválidas na vitrine pública.',
      );
    }

    if (!item.variants || typeof item.variants !== 'object') {
      throw new PublicShowcaseLoadError(
        'PUBLIC_SHOWCASE_INVALID_MANIFEST',
        'Variantes ausentes na vitrine pública.',
      );
    }

    if (!item.sha256 || typeof item.sha256 !== 'object') {
      throw new PublicShowcaseLoadError(
        'PUBLIC_SHOWCASE_INVALID_MANIFEST',
        'Hashes SHA-256 ausentes na vitrine pública.',
      );
    }

    for (const variant of photoVariants) {
      const url = item.variants[variant];
      if (!isApprovedShowcaseVariantUrl(url, item.photoId, variant)) {
        throw new PublicShowcaseLoadError(
          'PUBLIC_SHOWCASE_INVALID_MEDIA_URL',
          'URL de mídia fora do namespace público aprovado (/showcase/v1/).',
        );
      }
      const hash = item.sha256[variant];
      if (typeof hash !== 'string' || !sha256Pattern.test(hash)) {
        throw new PublicShowcaseLoadError(
          'PUBLIC_SHOWCASE_INVALID_MANIFEST',
          'Hash SHA-256 inválido na vitrine pública.',
        );
      }
    }

    validatedPhotos.push({
      photoId: item.photoId,
      orientation: item.orientation,
      width: item.width,
      height: item.height,
      variants: {
        thumb: item.variants.thumb,
        card: item.variants.card,
        game: item.variants.game,
      },
      sha256: {
        thumb: item.sha256.thumb,
        card: item.sha256.card,
        game: item.sha256.game,
      },
    });
  }

  return {
    schemaVersion: 1,
    collectionId: candidate.collectionId,
    generatedAt: candidate.generatedAt,
    photos: validatedPhotos,
  };
}

export function toPublicShowcaseSession(manifest: PublicShowcaseManifest): Session {
  const photos: Photo[] = manifest.photos.map((entry) => ({
    id: entry.photoId,
    width: entry.width,
    height: entry.height,
    aspectRatio: Number((entry.width / entry.height).toFixed(4)),
    orientation: entry.orientation,
    variants: {
      thumb: entry.variants.thumb,
      card: entry.variants.card,
      game: entry.variants.game,
    },
  }));

  return {
    id: `showcase_${manifest.collectionId}`,
    publicToken: 'local-demo-token',
    displayName: 'Galeria de Natal Evydência',
    photos,
  };
}

export async function fetchPublicShowcaseSession(signal?: AbortSignal): Promise<Session> {
  let response: Response;
  try {
    response = await fetch('/showcase/v1/manifest.json', {
      cache: 'no-cache',
      headers: { Accept: 'application/json' },
      ...(signal ? { signal } : {}),
    });
  } catch (error) {
    if (signal?.aborted) {
      throw new PublicShowcaseLoadError('PUBLIC_SHOWCASE_ABORTED', 'Carregamento cancelado.', {
        cause: error,
      });
    }
    throw new PublicShowcaseLoadError(
      'PUBLIC_SHOWCASE_NETWORK_ERROR',
      'Não foi possível carregar a vitrine de demonstração. Verifique sua conexão.',
      { cause: error },
    );
  }

  if (response.status === 404) {
    throw new PublicShowcaseLoadError(
      'PUBLIC_SHOWCASE_NOT_FOUND',
      'A coleção pública de demonstração ainda não foi publicada.',
      { status: 404 },
    );
  }

  if (!response.ok) {
    throw new PublicShowcaseLoadError(
      'PUBLIC_SHOWCASE_SERVER_ERROR',
      `A vitrine pública encontrou uma instabilidade (${response.status}).`,
      { status: response.status },
    );
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch (error) {
    throw new PublicShowcaseLoadError(
      'PUBLIC_SHOWCASE_INVALID_MANIFEST',
      'A resposta da vitrine pública não está em formato JSON válido.',
      { cause: error, status: response.status },
    );
  }

  const manifest = parsePublicShowcaseManifest(payload);
  return toPublicShowcaseSession(manifest);
}
