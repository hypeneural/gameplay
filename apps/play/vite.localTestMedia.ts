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

interface RegisteredSessionEntry {
  alias: string;
  sessionId: string;
  publicToken: string;
  displayName: string;
  storageDirectory: string;
  configPath: string;
  readyCount: number;
}

interface MultiClientRegistry {
  version: 2;
  worker: {
    version: string;
    recipeKey: string;
  };
  storageRoot: string;
  sessions: RegisteredSessionEntry[];
}

/**
 * A development-only, loopback-served adapter for real local derivatives.
 * Supports both single-session and multi-session client isolation.
 * Never serves originals and never exposes filesystem paths or source filenames.
 */
export function localTestMediaPlugin(): Plugin {
  const configuredRoot = process.env.LOCAL_TEST_MEDIA_ROOT;
  const configuredRegistry = process.env.LOCAL_TEST_MEDIA_MULTI_REGISTRY;
  const storageRoot = resolve(configuredRoot ?? '.');

  return {
    name: 'local-test-media',
    apply: 'serve',
    configureServer(server): void {
      server.middlewares.use((request, response, next) => {
        void handleRequest(storageRoot, configuredRegistry, request, response, next);
      });
    },
  };
}

async function handleRequest(
  storageRoot: string,
  configuredRegistryPath: string | undefined,
  request: IncomingMessage,
  response: ServerResponse,
  next: (error?: Error) => void,
): Promise<void> {
  const urlObj = new URL(request.url ?? '/', 'http://127.0.0.1');
  const pathname = urlObj.pathname;
  if (!pathname.startsWith('/__local-test/')) {
    next();
    return;
  }

  // 1. Try loading multi-client registry
  const registry = await loadRegistry(storageRoot, configuredRegistryPath);

  // 2. Dashboard of clients: /__local-test/clients
  if (pathname === '/__local-test/clients') {
    if (!registry) {
      sendJson(response, 404, { code: 'multi_client_registry_not_found' });
      return;
    }

    const isJson =
      urlObj.searchParams.get('format') === 'json' ||
      request.headers.accept?.includes('application/json');

    if (isJson) {
      sendJson(response, 200, {
        status: 'ready',
        clients: registry.sessions.map((session) => ({
          alias: session.alias,
          displayName: session.displayName,
          photosCount: session.readyCount,
          token: session.publicToken,
          urls: {
            hub: `/s/${encodeURIComponent(session.publicToken)}?test-media=local`,
            gallery: `/s/${encodeURIComponent(session.publicToken)}/fotos?test-media=local`,
            puzzle: `/s/${encodeURIComponent(session.publicToken)}/game/puzzle-swap?test-media=local`,
          },
        })),
      });
      return;
    }

    sendHtml(response, renderClientsDashboardHtml(registry));
    return;
  }

  // 3. Multi-client session lookup: /__local-test/sessions/:token
  if (pathname.startsWith('/__local-test/sessions/')) {
    const token = decodeURIComponent(pathname.slice('/__local-test/sessions/'.length));
    if (!token || !registry) {
      sendJson(response, 404, { code: 'local_test_session_not_found' });
      return;
    }
    const sessionEntry = registry.sessions.find((entry) => entry.publicToken === token);
    if (!sessionEntry) {
      sendJson(response, 404, { code: 'local_test_session_not_found' });
      return;
    }

    try {
      const config = await readConfigFile(sessionEntry.configPath);
      sendSessionJson(response, config, token);
      return;
    } catch {
      sendJson(response, 404, { code: 'local_test_session_not_prepared' });
      return;
    }
  }

  // 4. Multi-client media lookup: /__local-test/media/:token/:photoId/:variant
  const multiMediaMatch =
    /^\/__local-test\/media\/([a-z0-9._-]+)\/([a-z0-9-]+)\/(thumb|card|game)$/i.exec(pathname);
  if (multiMediaMatch && registry) {
    const [, token, photoId, variant] = multiMediaMatch;
    if (!token || !photoId || !variant || !variants.includes(variant as Variant)) {
      sendJson(response, 404, { code: 'local_test_media_not_found' });
      return;
    }

    const sessionEntry = registry.sessions.find((entry) => entry.publicToken === token);
    if (!sessionEntry) {
      sendJson(response, 404, { code: 'local_test_media_not_found' });
      return;
    }

    let config: LocalTestMediaConfig;
    try {
      config = await readConfigFile(sessionEntry.configPath);
    } catch {
      sendJson(response, 404, { code: 'local_test_media_not_found' });
      return;
    }

    // Strict ownership verification: photoId MUST belong to this session
    const photo = config.photos.find((candidate) => candidate.id === photoId);
    if (!photo) {
      sendJson(response, 404, { code: 'local_test_media_not_found' });
      return;
    }

    await streamDerivative(
      sessionEntry.storageDirectory,
      config,
      photo,
      variant as Variant,
      response,
    );
    return;
  }

  // 5. Legacy Single-session fallback: /__local-test/session
  if (pathname === '/__local-test/session') {
    let config: LocalTestMediaConfig;
    let singleToken: string | undefined;

    if (registry && registry.sessions.length === 1) {
      const single = registry.sessions[0]!;
      singleToken = single.publicToken;
      try {
        config = await readConfigFile(single.configPath);
      } catch {
        sendJson(response, 404, { code: 'local_test_media_not_prepared' });
        return;
      }
    } else {
      try {
        config = await readConfig(storageRoot);
        singleToken = config.session.publicToken;
      } catch {
        sendJson(response, 404, { code: 'local_test_media_not_prepared' });
        return;
      }
    }

    sendSessionJson(response, config, singleToken);
    return;
  }

  // 6. Legacy Single-session media fallback: /__local-test/media/:photoId/:variant
  const singleMediaMatch = /^\/__local-test\/media\/([a-z0-9-]+)\/(thumb|card|game)$/i.exec(
    pathname,
  );
  if (singleMediaMatch) {
    const [, photoId, variant] = singleMediaMatch;
    if (!photoId || !variant || !variants.includes(variant as Variant)) {
      sendJson(response, 404, { code: 'local_test_media_not_found' });
      return;
    }

    let config: LocalTestMediaConfig;
    let targetDir = storageRoot;

    if (registry && registry.sessions.length === 1) {
      const single = registry.sessions[0]!;
      targetDir = single.storageDirectory;
      try {
        config = await readConfigFile(single.configPath);
      } catch {
        sendJson(response, 404, { code: 'local_test_media_not_found' });
        return;
      }
    } else {
      try {
        config = await readConfig(storageRoot);
      } catch {
        sendJson(response, 404, { code: 'local_test_media_not_found' });
        return;
      }
    }

    const photo = config.photos.find((candidate) => candidate.id === photoId);
    if (!photo) {
      sendJson(response, 404, { code: 'local_test_media_not_found' });
      return;
    }

    await streamDerivative(targetDir, config, photo, variant as Variant, response);
    return;
  }

  sendJson(response, 404, { code: 'local_test_not_found' });
}

function toLongPath(p: string): string {
  if (process.platform === 'win32' && !p.startsWith('\\\\?\\')) {
    return `\\\\?\\${resolve(p)}`;
  }
  return p;
}

async function streamDerivative(
  storageDirectory: string,
  config: LocalTestMediaConfig,
  photo: LocalTestPhotoBase,
  variant: Variant,
  response: ServerResponse,
): Promise<void> {
  const derivativeRoot = resolve(storageDirectory, 'derived');
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

  const longPath = toLongPath(path);
  try {
    await access(longPath);
  } catch {
    sendJson(response, 404, { code: 'local_test_media_not_found' });
    return;
  }

  response.statusCode = 200;
  response.setHeader('Content-Type', 'image/webp');
  response.setHeader('Cache-Control', 'no-store');
  createReadStream(longPath)
    .on('error', () => {
      if (!response.headersSent) sendJson(response, 404, { code: 'local_test_media_not_found' });
      else response.destroy();
    })
    .pipe(response);
}

function sendSessionJson(
  response: ServerResponse,
  config: LocalTestMediaConfig,
  token?: string,
): void {
  const mediaPrefix = token
    ? `/__local-test/media/${encodeURIComponent(token)}`
    : '/__local-test/media';

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
        thumb: `${mediaPrefix}/${photo.id}/thumb`,
        card: `${mediaPrefix}/${photo.id}/card`,
        game: `${mediaPrefix}/${photo.id}/game`,
      },
      ...('variantMetrics' in photo ? { variantMetrics: photo.variantMetrics } : {}),
    })),
  });
}

async function loadRegistry(
  storageRoot: string,
  configuredRegistryPath?: string,
): Promise<MultiClientRegistry | undefined> {
  const path = configuredRegistryPath ?? join(storageRoot, 'local-test-registry.json');
  try {
    const raw = await readFile(path, 'utf8');
    const parsed = JSON.parse(raw) as Partial<MultiClientRegistry>;
    if (parsed.version === 2 && Array.isArray(parsed.sessions)) {
      return parsed as MultiClientRegistry;
    }
    return undefined;
  } catch {
    return undefined;
  }
}

async function readConfigFile(path: string): Promise<LocalTestMediaConfig> {
  const value: unknown = JSON.parse(await readFile(path, 'utf8'));
  if (!isLocalTestMediaConfig(value)) throw new Error('Invalid local test media config.');
  return value;
}

async function readConfig(storageRoot: string): Promise<LocalTestMediaConfig> {
  return readConfigFile(join(storageRoot, 'local-test-session.json'));
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
    (photo) =>
      isBasePhoto(photo) && 'variantMetrics' in photo && isVariantMetrics(photo.variantMetrics),
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

function sendHtml(response: ServerResponse, html: string): void {
  response.statusCode = 200;
  response.setHeader('Content-Type', 'text/html; charset=utf-8');
  response.setHeader('Cache-Control', 'no-store');
  response.end(html);
}

function renderClientsDashboardHtml(registry: MultiClientRegistry): string {
  const cards = registry.sessions
    .map((session) => {
      const hubUrl = `/s/${encodeURIComponent(session.publicToken)}?test-media=local`;
      const galleryUrl = `/s/${encodeURIComponent(session.publicToken)}/fotos?test-media=local`;
      const puzzleUrl = `/s/${encodeURIComponent(session.publicToken)}/game/puzzle-swap?test-media=local`;

      return `
      <div class="card">
        <div class="card-header">
          <span class="badge">Sessão Ativa</span>
          <h2>${escapeHtml(session.displayName)}</h2>
          <span class="photo-count">${session.readyCount} fotografias preparadas</span>
        </div>
        <div class="actions">
          <a href="${galleryUrl}" class="btn btn-primary">Abrir Álbum de Natal</a>
          <a href="${hubUrl}" class="btn btn-secondary">Abrir Hub de Jogos</a>
          <a href="${puzzleUrl}" class="btn btn-secondary">Jogar Quebra-Cabeça</a>
        </div>
      </div>
    `;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Laboratório Multi-Cliente | Jogos de Natal</title>
  <style>
    :root {
      --bg: #071410;
      --card-bg: rgba(16, 42, 33, 0.85);
      --card-border: rgba(216, 171, 91, 0.35);
      --gold: #d8ab5b;
      --gold-light: #f3dfa2;
      --crimson: #a82435;
      --text: #f5f2eb;
      --text-muted: #b8c4be;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--bg);
      background-image: radial-gradient(circle at 50% 10%, rgba(216, 171, 91, 0.12) 0%, transparent 60%);
      color: var(--text);
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 2.5rem 1.25rem;
    }
    .container {
      width: 100%;
      max-width: 720px;
      display: flex;
      flex-direction: column;
      gap: 2rem;
    }
    header {
      text-align: center;
    }
    .eyebrow {
      font-size: 0.75rem;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: var(--gold);
      font-weight: 700;
      margin-bottom: 0.5rem;
    }
    h1 {
      font-size: 1.85rem;
      color: var(--gold-light);
      font-weight: 700;
      letter-spacing: -0.02em;
      margin-bottom: 0.5rem;
    }
    .subtitle {
      color: var(--text-muted);
      font-size: 0.95rem;
      max-width: 520px;
      margin: 0 auto;
      line-height: 1.45;
    }
    .grid {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }
    .card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 16px;
      padding: 1.5rem;
      backdrop-filter: blur(8px);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
      transition: transform 0.2s ease, border-color 0.2s ease;
    }
    .card:hover {
      border-color: var(--gold);
      transform: translateY(-2px);
    }
    .card-header {
      margin-bottom: 1.25rem;
    }
    .badge {
      display: inline-block;
      font-size: 0.65rem;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      padding: 0.25rem 0.65rem;
      border-radius: 999px;
      background: rgba(216, 171, 91, 0.15);
      color: var(--gold);
      border: 1px solid rgba(216, 171, 91, 0.3);
      margin-bottom: 0.65rem;
    }
    h2 {
      font-size: 1.4rem;
      color: #ffffff;
      margin-bottom: 0.25rem;
    }
    .photo-count {
      font-size: 0.85rem;
      color: var(--text-muted);
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0.75rem 1.15rem;
      font-size: 0.9rem;
      font-weight: 600;
      border-radius: 10px;
      text-decoration: none;
      transition: background 0.15s ease, filter 0.15s ease;
      cursor: pointer;
    }
    .btn-primary {
      background: linear-gradient(135deg, #a82435 0%, #7d1724 100%);
      color: #ffffff;
      border: 1px solid rgba(255, 255, 255, 0.2);
    }
    .btn-primary:hover {
      filter: brightness(1.15);
    }
    .btn-secondary {
      background: rgba(255, 255, 255, 0.08);
      color: var(--text);
      border: 1px solid rgba(255, 255, 255, 0.15);
    }
    .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.15);
    }
    footer {
      text-align: center;
      font-size: 0.75rem;
      color: var(--text-muted);
      margin-top: 1rem;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="eyebrow">Laboratório Local Restrito</div>
      <h1>Sessões de Fotos de Natal</h1>
      <p class="subtitle">Selecione uma família para validar o Hub, a Galeria mobile-first e os minijogos com fotografias reais otimizadas.</p>
    </header>
    <div class="grid">
      ${cards}
    </div>
    <footer>
      Ambiente 100% isolado localmente em 127.0.0.1. Nenhum dado pessoal é exposto ou transmitido externamente.
    </footer>
  </div>
</body>
</html>`;
}

function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
