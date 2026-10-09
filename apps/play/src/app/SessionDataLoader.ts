import type { Photo, PhotoVariant, Session } from '@christmas-games/platform';

export type SessionLoadErrorCode =
  | 'SESSION_NOT_FOUND'
  | 'SESSION_UNAUTHORIZED'
  | 'SESSION_SERVER_ERROR'
  | 'SESSION_NETWORK_ERROR'
  | 'SESSION_INVALID_PAYLOAD'
  | 'SESSION_ABORTED';

export class SessionLoadError extends Error {
  readonly code: SessionLoadErrorCode;
  readonly status: number | undefined;

  constructor(
    code: SessionLoadErrorCode,
    message: string,
    options?: { cause?: unknown; status?: number },
  ) {
    super(message, { cause: options?.cause });
    this.name = 'SessionLoadError';
    this.code = code;
    this.status = options?.status;
  }
}

const photoVariants: readonly PhotoVariant[] = ['thumb', 'card', 'game'];

export function isSessionPayload(value: unknown): value is Session {
  if (!value || typeof value !== 'object') return false;
  const session = value as Partial<Session>;
  return (
    typeof session.id === 'string' &&
    session.id.length > 0 &&
    typeof session.publicToken === 'string' &&
    session.publicToken.length > 0 &&
    typeof session.displayName === 'string' &&
    Array.isArray(session.photos) &&
    session.photos.length > 0 &&
    session.photos.every((photo) => isPhotoPayload(photo, session.publicToken))
  );
}

function isPhotoPayload(value: unknown, token: string): value is Photo {
  if (!value || typeof value !== 'object') return false;
  const photo = value as Partial<Photo>;
  return (
    typeof photo.id === 'string' &&
    photo.id.length > 0 &&
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
    photoVariants.every((variant) => {
      const url = photo.variants?.[variant];
      return typeof url === 'string' && isSafeVariantUrl(url, token, variant);
    })
  );
}

function isSafeVariantUrl(url: string, token: string, variant: PhotoVariant): boolean {
  // The media endpoint is the only valid customer-media origin. Never accept
  // absolute/protocol-relative URLs, query strings, traversal or another token.
  const prefix = `/s/${encodeURIComponent(token)}/media/`;
  if (!url.startsWith(prefix)) return false;
  const remainder = url.slice(prefix.length);
  const parts = remainder.split('/');
  return (
    parts.length === 3 &&
    /^[0-9a-z-]{1,64}$/i.test(parts[0] ?? '') &&
    /^[0-9a-z-]{1,128}$/i.test(parts[1] ?? '') &&
    parts[2] === variant
  );
}

export async function fetchSessionData(token: string, signal?: AbortSignal): Promise<Session> {
  const endpoint = `/s/${encodeURIComponent(token)}/data`;
  let response: Response;
  try {
    response = await fetch(endpoint, {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
      ...(signal ? { signal } : {}),
    });
  } catch (error) {
    if (signal?.aborted) {
      throw new SessionLoadError('SESSION_ABORTED', 'Requisição cancelada.', { cause: error });
    }
    throw new SessionLoadError(
      'SESSION_NETWORK_ERROR',
      'Não foi possível conectar ao servidor. Verifique sua conexão.',
      { cause: error },
    );
  }

  if (response.status === 404) {
    throw new SessionLoadError(
      'SESSION_NOT_FOUND',
      'Este álbum não foi encontrado ou ainda não foi publicado.',
      { status: 404 },
    );
  }

  if (response.status === 401 || response.status === 403) {
    throw new SessionLoadError('SESSION_UNAUTHORIZED', 'Acesso não autorizado a este álbum.', {
      status: response.status,
    });
  }

  if (!response.ok) {
    throw new SessionLoadError(
      'SESSION_SERVER_ERROR',
      `O serviço de álbuns encontrou uma instabilidade (${response.status}).`,
      { status: response.status },
    );
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch (error) {
    throw new SessionLoadError(
      'SESSION_INVALID_PAYLOAD',
      'Resposta do servidor em formato inválido.',
      { cause: error, status: response.status },
    );
  }

  if (!isSessionPayload(data) || data.publicToken !== token) {
    throw new SessionLoadError(
      'SESSION_INVALID_PAYLOAD',
      'O contrato de fotos e variantes retornado pelo servidor é inválido.',
      { status: response.status },
    );
  }

  return data;
}
