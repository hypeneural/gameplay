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

export interface CatalogServerDependencies {
  readonly publicOrigin: URL;
  readonly loadApplicationShell: () => Promise<string>;
  readonly previews: SocialPreviewRepository;
  readonly audit: SocialPreviewAudit;
  readonly clock: SocialPreviewClock;
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
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.setHeader('Allow', 'GET, HEAD');
    send(response, 405, 'Método não permitido.');
    return;
  }
  const requestUrl = new URL(request.url ?? '/', 'http://catalog.invalid');
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
  response.setHeader('Referrer-Policy', 'same-origin');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  send(response, 200, html, request.method === 'HEAD');
}

type SocialRoute = {
  readonly kind: 'session' | 'social-preview';
  readonly token: string;
  readonly canonicalPath: string;
};

function parseSocialRoute(pathname: string): SocialRoute | undefined {
  const match =
    /^\/s\/([a-zA-Z0-9_-]{16,128})(?:\/game\/([a-z0-9-]{1,64}))?(?:\/(social-preview))?$/.exec(
      pathname,
    );
  if (!match) return undefined;
  const token = match[1]!;
  if (!isOpaquePublicToken(token)) return undefined;
  const gameId = match[2];
  return {
    kind: match[3] === 'social-preview' ? 'social-preview' : 'session',
    token,
    canonicalPath: gameId
      ? `/s/${encodeURIComponent(token)}/game/${encodeURIComponent(gameId)}`
      : `/s/${encodeURIComponent(token)}`,
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
