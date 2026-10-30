import { describe, expect, it } from 'vitest';
import { comparePublicWebSnapshots, referencedEntryAssets } from './check-public-web-alignment.mjs';

const newHtml =
  '<!doctype html><html><head><link rel="stylesheet" href="/assets/index-DuAjMG-t.css"></head>' +
  '<body><script type="module" crossorigin src="/assets/index-DoBqPLdB.js"></script>' +
  '<script type="module" crossorigin src="/assets/react-vendor-BXPLoH-.js"></script></body></html>';
const oldHtml = newHtml
  .replace('index-DoBqPLdB.js', 'index-PreviousA.js')
  .replace('index-DuAjMG-t.css', 'index-PreviousB.css');
const assets = {
  '/assets/index-DoBqPLdB.js': 'a'.repeat(64),
  '/assets/index-DuAjMG-t.css': 'b'.repeat(64),
  '/assets/react-vendor-BXPLoH-.js': 'c'.repeat(64),
};

describe('catalog public HTML asset alignment', () => {
  it('finds Vite JS and CSS entry assets without reading capability paths', () => {
    expect(referencedEntryAssets(newHtml)).toEqual(Object.keys(assets).sort());
  });

  it('passes only when both containers serve the same release and files', () => {
    const result = comparePublicWebSnapshots(
      { html: newHtml, indexSha: 'a', assetSha: assets },
      { html: newHtml, indexSha: 'a', assetSha: { ...assets } },
    );
    expect(result).toMatchObject({ status: 'WEB_ASSETS_ALIGNED', findings: [] });
  });

  it('detects exact white-screen regression: catalog new, gateway old', () => {
    const result = comparePublicWebSnapshots(
      { html: newHtml, indexSha: 'new', assetSha: assets },
      {
        html: oldHtml,
        indexSha: 'old',
        assetSha: { '/assets/react-vendor-BXPLoH-.js': 'c'.repeat(64) },
      },
    );
    expect(result.status).toBe('BLOCKED_WEB_RELEASE_DRIFT');
    expect(result.findings).toContain('HTML_RELEASE_DRIFT');
    expect(result.findings).toContain('GATEWAY_ASSET_MISSING:/assets/index-DoBqPLdB.js');
    expect(result.findings).toContain('GATEWAY_ASSET_MISSING:/assets/index-DuAjMG-t.css');
  });

  it('detects same-name asset content drift and omitted assets', () => {
    const result = comparePublicWebSnapshots(
      { html: newHtml, indexSha: 'same', assetSha: assets },
      {
        html: newHtml,
        indexSha: 'same',
        assetSha: { ...assets, '/assets/index-DoBqPLdB.js': 'd'.repeat(64) },
      },
    );
    expect(result.findings).toContain('ASSET_CONTENT_DRIFT:/assets/index-DoBqPLdB.js');
    const missing = comparePublicWebSnapshots(
      { html: newHtml, indexSha: 'same', assetSha: assets },
      { html: newHtml, indexSha: 'same', assetSha: {} },
    );
    expect(missing.status).toBe('BLOCKED_WEB_RELEASE_DRIFT');
  });

  it('detects stale HTML cached by the running catalog Node process', () => {
    const result = comparePublicWebSnapshots(
      { html: newHtml, servedHtml: oldHtml, indexSha: 'same', assetSha: assets },
      { html: newHtml, indexSha: 'same', assetSha: assets },
    );
    expect(result.status).toBe('BLOCKED_WEB_RELEASE_DRIFT');
    expect(result.findings).toContain('RUNNING_HTML_RELEASE_DRIFT');
  });

  it('fails closed if a release lacks hashed entry references', () => {
    const html = '<html><body>missing app</body></html>';
    const result = comparePublicWebSnapshots(
      { html, indexSha: 'same', assetSha: {} },
      { html, indexSha: 'same', assetSha: {} },
    );
    expect(result.findings).toContain('NO_VITE_ENTRY_ASSETS');
  });
});
