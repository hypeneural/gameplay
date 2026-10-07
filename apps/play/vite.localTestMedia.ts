import { createReadStream } from 'node:fs';
import { access, readFile } from 'node:fs/promises';
import { join, resolve, sep } from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';

const opaquePhotoId = /^[a-z0-9][a-z0-9-]{0,63}$/i;
const opaqueRecipeKey = /^[a-z0-9][a-z0-9._-]{0,255}$/i;
const sha256 = /^[a-f0-9]{64}$/;
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const variants = ['thumb', 'card', 'game'] as const;
type Variant = (typeof variants)[number];

type VariantMetrics = Record<Variant, { width: number; height: number; byteLength: number }>;

interface LocalTestPhotoBase {
  id: string;
  contentHash: string;
  width: number;
  height: number;
  aspectRatio: number;
  orientation: 'portrait' | 'landscape' | 'square';
}

interface LocalTestMediaConfigV1 {
  version: 1;
  session: { id: string; publicToken: string; displayName: string };
  photos: LocalTestPhotoBase[];
}

interface LocalTestMediaConfigV2 {
  version: 2;
  worker: {
    version: string;
    recipeKey: string;
    sharpVersion: string;
    libvipsVersion: string;
  };
  session: { id: string; publicToken: string; displayName: string };
  photos: Array<LocalTestPhotoBase & { variantMetrics: VariantMetrics }>;
}

type LocalTestMediaConfig = LocalTestMediaConfigV1 | LocalTestMediaConfigV2;

/**
 * A development-only, loopback-served adapter for real local derivatives.
 * It is never part of a production build, never serves originals and never
 * exposes a file system path, source name or content hash in its URLs.
 */
export function localTestMediaPlugin(): Plugin {
  const configuredRoot = process.env.LOCAL_TEST_MEDIA_ROOT;
  if (!configuredRoot) return { name: 'local-test-media', apply: 'serve' };
  const storageRoot = resolve(configuredRoot);

  return {
    name: 'local-test-media',
    apply: 'serve',
    configureServer(server): void {
      server.middlewares.use((request, response, next) => {
        void handleRequest(storageRoot, request, response, next);
      });
    },
  };
}

async function handleRequest(
  storageRoot: string,
  request: IncomingMessage,
  response: ServerResponse,
  next: (error?: Error) => void,
): Promise<void> {
  const pathname = new URL(request.url ?? '/', 'http://127.0.0.1').pathname;
  if (!pathname.startsWith('/__local-test/')) {
    next();
    return;
  }

  let config: LocalTestMediaConfig;
  try {
    config = await readConfig(storageRoot);
  } catch {
    sendJson(response, 404, { code: 'local_test_media_not_prepared' });
    return;
  }

  if (pathname === '/__local-test/session') {
    sendJson(response, 200, {
      id: config.session.id,
      publicToken: config.session.publicToken,
      displayName: config.session.displayName,
      photos: config.photos.map((photo) => ({
        id: photo.id,
        width: photo.width,
        height: photo.height,
        aspectRatio: photo.aspectRatio,
        orientation: photo.orientation,
        variants: {
          thumb: `/__local-test/media/${photo.id}/thumb`,
          card: `/__local-test/media/${photo.id}/card`,
          game: `/__local-test/media/${photo.id}/game`,
        },
        ...('variantMetrics' in photo ? { variantMetrics: photo.variantMetrics } : {}),
      })),
    });
    return;
  }

  const match = /^\/__local-test\/media\/([a-z0-9-]+)\/(thumb|card|game)$/i.exec(pathname);
  if (!match) {
    sendJson(response, 404, { code: 'local_test_media_not_found' });
    return;
  }
  const [, photoId, variant] = match;
  if (!photoId || !variant || !variants.includes(variant as Variant)) {
    sendJson(response, 404, { code: 'local_test_media_not_found' });
    return;
  }
  const photo = config.photos.find((candidate) => candidate.id === photoId);
  if (!photo) {
    sendJson(response, 404, { code: 'local_test_media_not_found' });
    return;
  }

  const derivativeRoot = resolve(storageRoot, 'derived');
  const path = resolve(
    derivativeRoot,
    config.session.id,
    photo.id,
    photo.contentHash,
    ...(config.version === 2 ? [config.worker.recipeKey] : []),
    `${variant}.webp`,
  );
  if (!path.startsWith(`${derivativeRoot}${sep}`)) {
    sendJson(response, 400, { code: 'local_test_media_invalid_request' });
    return;
  }
  try {
    await access(path);
  } catch {
    sendJson(response, 404, { code: 'local_test_media_not_found' });
    return;
  }

  response.statusCode = 200;
  response.setHeader('Content-Type', 'image/webp');
  response.setHeader('Cache-Control', 'no-store');
  createReadStream(path)
    .on('error', () => {
      if (!response.headersSent) sendJson(response, 404, { code: 'local_test_media_not_found' });
      else response.destroy();
    })
    .pipe(response);
}

async function readConfig(storageRoot: string): Promise<LocalTestMediaConfig> {
  const value: unknown = JSON.parse(
    await readFile(join(storageRoot, 'local-test-session.json'), 'utf8'),
  );
  if (!isLocalTestMediaConfig(value)) throw new Error('Invalid local test media config.');
  return value;
}

function isLocalTestMediaConfig(value: unknown): value is LocalTestMediaConfig {
  if (!value || typeof value !== 'object') return false;
  const config = value as Partial<LocalTestMediaConfigV2> & Partial<LocalTestMediaConfigV1>;
  if (!isSession(config.session) || !Array.isArray(config.photos)) return false;
  if (config.version === 1) return config.photos.every(isBasePhoto);
  if (config.version !== 2 || !config.worker || !opaqueRecipeKey.test(config.worker.recipeKey)) {
    return false;
  }
  return config.photos.every(
    (photo) => isBasePhoto(photo) && 'variantMetrics' in photo && isVariantMetrics(photo.variantMetrics),
  );
}

function isSession(value: unknown): value is LocalTestMediaConfigV1['session'] {
  if (!value || typeof value !== 'object') return false;
  const session = value as Partial<LocalTestMediaConfigV1['session']>;
  return (
    typeof session.id === 'string' &&
    uuid.test(session.id) &&
    typeof session.publicToken === 'string' &&
    typeof session.displayName === 'string'
  );
}

function isBasePhoto(value: unknown): value is LocalTestPhotoBase {
  if (!value || typeof value !== 'object') return false;
  const photo = value as Partial<LocalTestPhotoBase>;
  return (
    typeof photo.id === 'string' &&
    opaquePhotoId.test(photo.id) &&
    typeof photo.contentHash === 'string' &&
    sha256.test(photo.contentHash) &&
    Number.isFinite(photo.width) &&
    Number.isFinite(photo.height) &&
    Number.isFinite(photo.aspectRatio) &&
    (photo.orientation === 'portrait' ||
      photo.orientation === 'landscape' ||
      photo.orientation === 'square')
  );
}

function isVariantMetrics(value: unknown): value is VariantMetrics {
  if (!value || typeof value !== 'object') return false;
  const metrics = value as Partial<VariantMetrics>;
  return variants.every((variant) => {
    const metric = metrics[variant];
    return (
      !!metric &&
      Number.isInteger(metric.width) &&
      metric.width > 0 &&
      Number.isInteger(metric.height) &&
      metric.height > 0 &&
      Number.isInteger(metric.byteLength) &&
      metric.byteLength > 0
    );
  });
}

function sendJson(response: ServerResponse, status: number, body: object): void {
  response.statusCode = status;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('Cache-Control', 'no-store');
  response.end(JSON.stringify(body));
}
