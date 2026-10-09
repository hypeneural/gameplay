import { createServer } from 'node:http';
import type { IncomingMessage, Server, ServerResponse } from 'node:http';
import {
  isOpaquePublicToken,
  renderSessionHtml,
  resolvePreview,
  socialMetadata,
} from './socialPreview.js';
import type {
  SocialPreviewAudit,
  SocialPreviewClock,
  SocialPreviewRepository,
} from './socialPreview.js';

import type { PublicationService } from './publication/PublicationService.js';

export interface CatalogServerDependencies {
  readonly publicOrigin: URL;
  readonly loadApplicationShell: () => Promise<string>;
  readonly previews: SocialPreviewRepository;
  readonly audit: SocialPreviewAudit;
  readonly clock: SocialPreviewClock;
  readonly runtime?: {
    readonly releaseStage: string;
  };
  readonly readiness?: () => Promise<void>;
  readonly publicationService?: PublicationService;
}

/**
 * Public session HTML and its Open Graph image are server-owned. The React
 * application remains responsible only for the interactive experience after
 * the page has reached a human browser.
 */
export function createCatalogServer(dependencies: CatalogServerDependencies): Server {
  return createServer((request, response) => {
    void handleRequest(request, response, dependencies).catch(() => {
      if (!response.headersSent) sendNotFound(response);
      else response.destroy();
    });
  });
}

async function handleRequest(
  request: IncomingMessage,
  response: ServerResponse,
  dependencies: CatalogServerDependencies,
): Promise<void> {
  const requestUrl = new URL(request.url ?? '/', 'http://catalog.invalid');
  if (requestUrl.pathname === '/healthz') {
    let status = 'ok';
    let statusCode = 200;
    try {
      await dependencies.readiness?.();
    } catch {
      status = 'unavailable';
      statusCode = 503;
    }
    const body = JSON.stringify({
      status,
      releaseStage: dependencies.runtime?.releaseStage ?? 'test',
    });
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Content-Type', 'application/json; charset=utf-8');
    response.setHeader('Referrer-Policy', 'no-referrer');
    send(response, statusCode, body, request.method === 'HEAD');
    return;
  }

  if (dependencies.publicationService) {
    const handled = await dependencies.publicationService.handleHttpRequest(request, response);
    if (handled) return;
  }

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.setHeader('Allow', 'GET, HEAD');
    send(response, 405, 'Método não permitido.');
    return;
  }

  const route = parseSocialRoute(requestUrl.pathname);
  if (!route) {
    sendNotFound(response);
    return;
  }

  const record = await dependencies.previews.getByPublicToken(route.token);
  const preview = record ? resolvePreview(record) : undefined;
  if (!preview) {
    sendNotFound(response);
    return;
  }

  if (dependencies.runtime?.releaseStage === 'staging-demo' && preview.kind === 'customer-photo') {
    sendNotFound(response);
    return;
  }

  await dependencies.audit.record({
    route: route.kind === 'session' ? 'session-html' : 'social-image',
    preview: preview.kind,
    previewVersion: preview.version,
    occurredAt: dependencies.clock.now().toISOString(),
  });

  if (route.kind === 'social-preview') {
    // Nginx consumes this header and performs the internal redirect. The
    // browser never receives a filesystem path or original-photo URL.
    response.setHeader('X-Accel-Redirect', preview.internalUri);
    response.setHeader('Cache-Control', 'private, no-store');
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.statusCode = 200;
    response.end();
    return;
  }

  const shell = await dependencies.loadApplicationShell();
  const html = renderSessionHtml(
    shell,
    socialMetadata(dependencies.publicOrigin, route.canonicalPath, route.token, preview),
  );
  response.setHeader('Cache-Control', 'private, no-store');
  response.setHeader('Content-Type', 'text/html; charset=utf-8');
  response.setHeader('Referrer-Policy', 'no-referrer');
  response.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  send(response, 200, html, request.method === 'HEAD');
}

type SocialRoute = {
  readonly kind: 'session' | 'social-preview';
  readonly token: string;
  readonly canonicalPath: string;
};

function parseSocialRoute(pathname: string): SocialRoute | undefined {
  const segments = pathname.split('/').filter(Boolean);
  if (segments[0] !== 's' || !segments[1] || segments.length < 2 || segments.length > 4) {
    return undefined;
  }

  const token = segments[1];
  if (!isOpaquePublicToken(token)) return undefined;
  const encodedToken = encodeURIComponent(token);

  if (segments.length === 2) {
    return { kind: 'session', token, canonicalPath: `/s/${encodedToken}` };
  }

  if (segments.length === 3 && segments[2] === 'fotos') {
    return { kind: 'session', token, canonicalPath: `/s/${encodedToken}/fotos` };
  }

  if (segments.length === 3 && segments[2] === 'social-preview') {
    return { kind: 'social-preview', token, canonicalPath: `/s/${encodedToken}` };
  }

  const gameId = segments[2] === 'game' ? segments[3] : undefined;
  if (!gameId || !/^[a-z0-9-]{1,64}$/.test(gameId)) return undefined;
  return {
    kind: 'session',
    token,
    canonicalPath: `/s/${encodedToken}/game/${encodeURIComponent(gameId)}`,
  };
}

function sendNotFound(response: ServerResponse): void {
  send(response, 404, 'Não encontrado.');
}

function send(response: ServerResponse, status: number, body: string, suppressBody = false): void {
  response.statusCode = status;
  if (!response.hasHeader('Content-Type'))
    response.setHeader('Content-Type', 'text/plain; charset=utf-8');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.end(suppressBody ? undefined : body);
}
