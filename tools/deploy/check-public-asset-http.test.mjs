import { describe, expect, it, vi } from 'vitest';
import {
  auditPublicEdge,
  classifyEdgeAsset,
  auditMissingAssetCache,
} from './check-public-asset-http.mjs';

const js = '/assets/index-CXZUH_4f.js';
const css = '/assets/index-BFvuR7tZ.css';

function fake(status, mime, body = '') {
  return new globalThis.Response(body, { status, headers: { 'content-type': mime } });
}

describe('public edge asset transport contract', () => {
  it('accepts JS/CSS only with 200 and matching MIME', () => {
    expect(classifyEdgeAsset(js, 200, 'application/javascript; charset=utf-8')).toBe(
      'EDGE_ASSET_OK',
    );
    expect(classifyEdgeAsset(css, 200, 'text/css')).toBe('EDGE_ASSET_OK');
  });

  it('reproduces real recurring failure: JS 404 and CSS returning HTML', async () => {
    const fetchFn = vi.fn(async (url) =>
      String(url).endsWith('.js')
        ? fake(404, 'text/html', 'not found')
        : fake(200, 'text/html', '<html>fallback</html>'),
    );
    const result = await auditPublicEdge([js, css], fetchFn);
    expect(result.status).toBe('BLOCKED_PUBLIC_EDGE_ASSETS');
    expect(result.assets).toEqual([
      { asset: js, status: 404, mime: 'text/html', check: 'EDGE_ASSET_HTTP_404' },
      { asset: css, status: 200, mime: 'text/html', check: 'EDGE_ASSET_WRONG_MIME' },
    ]);
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('requires both real assets even when the document returns 200', async () => {
    const html =
      '<link rel="stylesheet" href="' + css + '"><script type="module" src="' + js + '"></script>';
    const fetchFn = vi.fn(async (url) => {
      if (String(url).endsWith('/')) return fake(200, 'text/html', html);
      return String(url).endsWith('.js')
        ? fake(200, 'text/javascript', 'export default 1')
        : fake(200, 'text/css', 'body{}');
    });
    const result = await auditPublicEdge([], fetchFn);
    expect(result.status).toBe('PUBLIC_EDGE_ASSETS_PASS');
    expect(result.assets).toHaveLength(2);
  });

  it('does not follow redirects or accept status 302 or HTML for assets', async () => {
    const fetchFn = vi.fn(async () => fake(302, 'text/html', 'redirect'));
    const result = await auditPublicEdge([js], fetchFn);
    expect(result.status).toBe('BLOCKED_PUBLIC_EDGE_ASSETS');
    expect(result.assets[0].check).toBe('EDGE_ASSET_HTTP_302');
    expect(fetchFn.mock.calls[0][1].redirect).toBe('manual');
  });

  it('rejects immutable caching for synthetic missing JavaScript (404)', async () => {
    const safe = await auditMissingAssetCache(
      async () =>
        new globalThis.Response('', {
          status: 404,
          headers: { 'cache-control': 'no-store' },
        }),
    );
    expect(safe.status).toBe('MISSING_ASSET_NOT_CACHED');
    const poisoned = await auditMissingAssetCache(
      async () =>
        new globalThis.Response('', {
          status: 404,
          headers: { 'cache-control': 'public, max-age=31536000, immutable' },
        }),
    );
    expect(poisoned.status).toBe('BLOCKED_MISSING_ASSET_CACHE');
    const cached = await auditMissingAssetCache(
      async () =>
        new globalThis.Response('', {
          status: 404,
          headers: { 'cache-control': 'max-age=120' },
        }),
    );
    expect(cached.status).toBe('BLOCKED_MISSING_ASSET_CACHE');
  });

  it('rejects private session URLs, unsupported and traversal paths', async () => {
    for (const path of [
      '/s/secret-token',
      '/assets/../../private.css',
      'https://example.com/index.css',
      '/assets/index.png',
    ]) {
      await expect(auditPublicEdge([path])).rejects.toThrow('EDGE_ASSET_LIST_INVALID');
    }
  });

  it('fails closed if a public document is unavailable or has no asset references', async () => {
    const unavailable = await auditPublicEdge([], async () => fake(503, 'text/html'));
    expect(unavailable.status).toBe('BLOCKED_EDGE_DOCUMENT');
    await expect(auditPublicEdge([], async () => fake(200, 'text/html', 'empty'))).rejects.toThrow(
      'EDGE_ASSET_LIST_INVALID',
    );
  });
});
