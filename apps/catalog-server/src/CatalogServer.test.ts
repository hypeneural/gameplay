import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createCatalogServer } from './CatalogServer.js';
import {
  genericPreviewInternalUri,
  genericPreviewVersion,
  parsePublicOrigin,
} from './socialPreview.js';
import type { Server } from 'node:http';
import type { SocialPreviewRecord } from './socialPreview.js';

const applicationShell = `<!doctype html><html><head><meta name="catalog-social-preview" content="backend-required" /></head><body><div id="root"></div></body></html>`;
const activeGeneric: SocialPreviewRecord = {
  status: 'active' as const,
  preview: { kind: 'generic' as const, version: genericPreviewVersion },
};
const servers: Server[] = [];

afterEach(async () => {
  await Promise.all(
    servers.splice(0).map(async (server) => {
      server.close();
      await once(server, 'close');
    }),
  );
});

describe('CatalogServer', () => {
  it('exposes a token-free health endpoint for VPS supervision', async () => {
    const baseUrl = await startServer(
      activeGeneric,
      vi.fn(async () => undefined),
    );

    const response = await fetch(`${baseUrl}/healthz`);

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('referrer-policy')).toBe('no-referrer');
    expect(await response.json()).toEqual({ status: 'ok', releaseStage: 'test' });
  });

  it('reports unavailable without leaking readiness errors', async () => {
    const baseUrl = await startServer(
      activeGeneric,
      vi.fn(async () => undefined),
      undefined,
      async () => {
        throw new Error('/private/path/config.json is invalid');
      },
    );

    const response = await fetch(`${baseUrl}/healthz`);

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ status: 'unavailable', releaseStage: 'test' });
  });

  it('serves bot-readable Open Graph on the root and demo without a customer token', async () => {
    const baseUrl = await startServer(
      { status: 'revoked' },
      vi.fn(async () => undefined),
      'staging-demo',
    );

    for (const [path, title] of [
      ['/', 'Nosso Natal em Família'],
      ['/demo/fotos', 'Álbum de Natal'],
      ['/demo/game/memory', 'Jogos de Natal'],
    ]) {
      const response = await fetch(`${baseUrl}${path}`);
      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain('text/html');
      const html = await response.text();
      expect(html).toContain(`https://jogos.exemplo.test${path}`);
      expect(html).toContain(title);
      expect(html).toContain(
        '<meta property="og:image" content="https://jogos.exemplo.test/social/evydencia-christmas-v1.webp" />',
      );
      expect(html).toContain('<meta property="og:image:width" content="1200" />');
      expect(html).toContain('<meta property="og:image:height" content="630" />');
      expect(html).toContain('<meta name="twitter:card" content="summary_large_image" />');
      expect(html).not.toContain('backend-required');
    }
    const head = await fetch(`${baseUrl}/`, { method: 'HEAD' });
    expect(head.status).toBe(200);
    expect(await head.text()).toBe('');
    expect((await fetch(`${baseUrl}/unexpected`)).status).toBe(404);
  });

  it('renders complete Open Graph markup before the browser runs React', async () => {
    const audit = vi.fn(async () => undefined);
    const baseUrl = await startServer(activeGeneric, audit);

    const response = await fetch(`${baseUrl}/s/local-demo-token`);

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/html');
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(response.headers.get('referrer-policy')).toBe('no-referrer');
    const html = await response.text();
    expect(html).toContain(
      '<link rel="canonical" href="https://jogos.exemplo.test/s/local-demo-token" />',
    );
    expect(html).toContain('<meta property="og:type" content="website" />');
    expect(html).toContain(
      '<meta property="og:image" content="https://jogos.exemplo.test/s/local-demo-token/social-preview" />',
    );
    expect(html).toContain('og:image:alt');
    expect(html).not.toContain('backend-required');
    expect(audit).toHaveBeenCalledWith({
      route: 'session-html',
      preview: 'generic',
      previewVersion: genericPreviewVersion,
      occurredAt: '2026-08-25T12:00:00.000Z',
    });
  });

  it('serves a direct gallery reload with its own canonical path', async () => {
    const baseUrl = await startServer(
      activeGeneric,
      vi.fn(async () => undefined),
    );

    const response = await fetch(`${baseUrl}/s/local-demo-token/fotos`);

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/html');
    expect(await response.text()).toContain(
      '<link rel="canonical" href="https://jogos.exemplo.test/s/local-demo-token/fotos" />',
    );
  });

  it('authorizes the generic image before asking Nginx for its internal asset', async () => {
    const baseUrl = await startServer(
      activeGeneric,
      vi.fn(async () => undefined),
    );

    const response = await fetch(`${baseUrl}/s/local-demo-token/social-preview`);

    expect(response.status).toBe(200);
    expect(response.headers.get('x-accel-redirect')).toBe(genericPreviewInternalUri);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(await response.text()).toBe('');
  });

  it('keeps a shared game link canonical while the image stays session-authorized', async () => {
    const baseUrl = await startServer(
      activeGeneric,
      vi.fn(async () => undefined),
    );

    const response = await fetch(`${baseUrl}/s/local-demo-token/game/puzzle-swap`);

    expect(response.status).toBe(200);
    expect(await response.text()).toContain(
      '<link rel="canonical" href="https://jogos.exemplo.test/s/local-demo-token/game/puzzle-swap" />',
    );
  });

  it('uses a customer derivative only while explicit consent remains granted', async () => {
    const customerPreview = {
      status: 'active' as const,
      preview: {
        kind: 'customer-photo' as const,
        consent: 'granted' as const,
        derivativeKey: 'social-preview-4Q4bB7GmT2pX',
        version: 'social-v3',
      },
    };
    const baseUrl = await startServer(
      customerPreview,
      vi.fn(async () => undefined),
    );

    const response = await fetch(`${baseUrl}/s/local-demo-token/social-preview`);

    expect(response.headers.get('x-accel-redirect')).toBe(
      '/_customer_social/social-preview-4Q4bB7GmT2pX.webp',
    );
  });

  it('refuses customer-photo previews in staging-demo even when config says granted', async () => {
    const customerPreview = {
      status: 'active' as const,
      preview: {
        kind: 'customer-photo' as const,
        consent: 'granted' as const,
        derivativeKey: 'social-preview-4Q4bB7GmT2pX',
        version: 'social-v3',
      },
    };
    const audit = vi.fn(async () => undefined);
    const baseUrl = await startServer(customerPreview, audit, 'staging-demo');

    const response = await fetch(`${baseUrl}/s/local-demo-token/social-preview`);

    expect(response.status).toBe(404);
    expect(response.headers.get('x-accel-redirect')).toBeNull();
    expect(audit).not.toHaveBeenCalled();
  });

  it('fails closed for an unknown or revoked link', async () => {
    const baseUrl = await startServer(
      { status: 'revoked' },
      vi.fn(async () => undefined),
    );

    const response = await fetch(`${baseUrl}/s/local-demo-token/social-preview`);

    expect(response.status).toBe(404);
    expect(response.headers.get('x-accel-redirect')).toBeNull();
  });
});

function startServer(
  record: SocialPreviewRecord,
  auditRecord: (entry: {
    readonly route: 'session-html' | 'social-image';
    readonly preview: 'generic' | 'customer-photo';
    readonly previewVersion: string;
    readonly occurredAt: string;
  }) => Promise<void>,
  releaseStage?: string,
  readiness?: () => Promise<void>,
): Promise<string> {
  const server = createCatalogServer({
    publicOrigin: parsePublicOrigin('https://jogos.exemplo.test'),
    loadApplicationShell: async () => applicationShell,
    previews: { getByPublicToken: async () => record },
    audit: { record: auditRecord },
    clock: { now: () => new Date('2026-08-25T12:00:00.000Z') },
    ...(releaseStage === undefined ? {} : { runtime: { releaseStage } }),
    ...(readiness === undefined ? {} : { readiness }),
  });
  servers.push(server);
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        reject(new Error('Expected a TCP listener for the catalog server test.'));
        return;
      }
      resolve(`http://127.0.0.1:${(address as AddressInfo).port}`);
    });
  });
}
