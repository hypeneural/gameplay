const opaqueToken = /^[a-zA-Z0-9_-]{16,128}$/;
const opaqueDerivativeKey = /^[a-zA-Z0-9_-]{16,128}$/;

export const genericPreviewVersion = 'evydencia-christmas-v1';
export const genericPreviewInternalUri = `/_catalog_social/${genericPreviewVersion}.webp`;

export interface SocialPreviewClock {
  now(): Date;
}

export interface SocialPreviewAudit {
  record(entry: {
    readonly route: 'session-html' | 'social-image';
    readonly preview: 'generic' | 'customer-photo';
    readonly previewVersion: string;
    readonly occurredAt: string;
  }): Promise<void>;
}

export type SocialPreviewRecord =
  | {
      readonly status: 'active';
      readonly preview: {
        readonly kind: 'generic';
        readonly version: typeof genericPreviewVersion;
      };
    }
  | {
      readonly status: 'active';
      readonly preview: {
        readonly kind: 'customer-photo';
        /** Consent is evaluated again for every Open Graph image request. */
        readonly consent: 'granted' | 'revoked';
        readonly derivativeKey: string;
        readonly version: string;
      };
    }
  | { readonly status: 'revoked' };

/**
 * Infrastructure owns this lookup. It may be backed by a database, but it
 * deliberately returns no customer name, source path or original-photo data.
 */
export interface SocialPreviewRepository {
  getByPublicToken(token: string): Promise<SocialPreviewRecord | undefined>;
}

export interface ResolvedSocialPreview {
  readonly kind: 'generic' | 'customer-photo';
  readonly version: string;
  /** URI consumed only by Nginx after this backend's authorization decision. */
  readonly internalUri: string;
  readonly alt: string;
}

export interface SocialMetadata {
  readonly canonicalUrl: URL;
  readonly imageUrl: URL;
  readonly imageAlt: string;
}

export function isOpaquePublicToken(value: string): boolean {
  return opaqueToken.test(value);
}

export function parsePublicOrigin(value: string, allowHttpForLocalDevelopment = false): URL {
  let origin: URL;
  try {
    origin = new URL(value);
  } catch {
    throw new Error('CATALOG_PUBLIC_ORIGIN precisa ser uma URL absoluta.');
  }
  if (
    origin.protocol !== 'https:' &&
    !(allowHttpForLocalDevelopment && origin.protocol === 'http:')
  ) {
    throw new Error('CATALOG_PUBLIC_ORIGIN deve usar HTTPS fora do desenvolvimento local.');
  }
  if (
    origin.username ||
    origin.password ||
    origin.pathname !== '/' ||
    origin.search ||
    origin.hash
  ) {
    throw new Error('CATALOG_PUBLIC_ORIGIN deve conter somente a origem pública.');
  }
  return origin;
}

export function resolvePreview(record: SocialPreviewRecord): ResolvedSocialPreview | undefined {
  if (record.status !== 'active') return undefined;
  if (record.preview.kind === 'generic') {
    return {
      kind: 'generic',
      version: record.preview.version,
      internalUri: genericPreviewInternalUri,
      alt: 'Ilustração de uma noite de Natal iluminada.',
    };
  }
  if (
    record.preview.consent !== 'granted' ||
    !opaqueDerivativeKey.test(record.preview.derivativeKey)
  ) {
    return {
      kind: 'generic',
      version: genericPreviewVersion,
      internalUri: genericPreviewInternalUri,
      alt: 'Ilustração de uma noite de Natal iluminada.',
    };
  }
  return {
    kind: 'customer-photo',
    version: record.preview.version,
    internalUri: `/_customer_social/${record.preview.derivativeKey}.webp`,
    alt: 'Uma lembrança natalina em forma de brincadeira.',
  };
}

export function socialMetadata(
  publicOrigin: URL,
  canonicalPath: string,
  token: string,
  preview: ResolvedSocialPreview,
): SocialMetadata {
  const encodedToken = encodeURIComponent(token);
  return {
    canonicalUrl: new URL(canonicalPath, publicOrigin),
    imageUrl: new URL(`/s/${encodedToken}/social-preview`, publicOrigin),
    imageAlt: preview.alt,
  };
}

function renderOpenGraphMetadata(metadata: SocialMetadata): string {
  const title = 'Jogos de Natal — Estúdio Evydência';
  const description = 'Uma lembrança de Natal que vira brincadeira para toda a família.';
  return [
    `<link rel="canonical" href="${escapeHtml(metadata.canonicalUrl.href)}" />`,
    `<meta property="og:title" content="${title}" />`,
    '<meta property="og:type" content="website" />',
    `<meta property="og:description" content="${description}" />`,
    `<meta property="og:url" content="${escapeHtml(metadata.canonicalUrl.href)}" />`,
    '<meta property="og:site_name" content="Estúdio Evydência" />',
    '<meta property="og:locale" content="pt_BR" />',
    `<meta property="og:image" content="${escapeHtml(metadata.imageUrl.href)}" />`,
    '<meta property="og:image:type" content="image/webp" />',
    '<meta property="og:image:width" content="1200" />',
    '<meta property="og:image:height" content="630" />',
    `<meta property="og:image:alt" content="${escapeHtml(metadata.imageAlt)}" />`,
  ].join('\n    ');
}

const socialMetadataMarker =
  /<meta\s+name=["']catalog-social-preview["']\s+content=["']backend-required["']\s*\/?>/;

export function renderSessionHtml(shell: string, metadata: SocialMetadata): string {
  if (!socialMetadataMarker.test(shell)) {
    throw new Error('O shell publicado não contém o marcador de prévia social.');
  }
  return shell.replace(socialMetadataMarker, renderOpenGraphMetadata(metadata));
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    switch (character) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      default:
        return '&#39;';
    }
  });
}
