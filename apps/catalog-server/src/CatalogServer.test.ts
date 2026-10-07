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
  it('renders complete Open Graph markup before the browser runs React', async () => {
    const audit = vi.fn(async () => undefined);
    const baseUrl = await startServer(activeGeneric, audit);

    const response = await fetch(`${baseUrl}/s/local-demo-token`);

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/html');
    expect(response.headers.get('cache-control')).toBe('private, no-store');
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
): Promise<string> {
  const server = createCatalogServer({
    publicOrigin: parsePublicOrigin('https://jogos.exemplo.test'),
    loadApplicationShell: async () => applicationShell,
    previews: { getByPublicToken: async () => record },
    audit: { record: auditRecord },
    clock: { now: () => new Date('2026-08-25T12:00:00.000Z') },
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
