import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const configPath = fileURLToPath(
  new URL('../../deploy/vps/docker/nginx.conf', import.meta.url),
);

export function validateAssetCachePolicy(config) {
  const block = config.match(/location \^~ \/assets\/ \{([^}]+)\}/)?.[1];
  if (!block) return 'BLOCKED_NO_EXPLICIT_ASSET_LOCATION';
  if (!/try_files\s+\$uri\s+=404\s*;/.test(block)) return 'BLOCKED_ASSET_SPA_FALLBACK';
  const cache = block.match(/add_header\s+Cache-Control\s+"([^"]+)"\s*(always)?\s*;/);
  if (!cache || !cache[1].includes('immutable')) return 'BLOCKED_NO_SUCCESS_CACHE_POLICY';
  if (cache[2] === 'always') return 'BLOCKED_IMMUTABLE_404';
  return 'ASSET_CACHE_POLICY_PASS';
}

describe('nginx Vite asset cache policy', () => {
  it('never sends immutable caching on a 404 response', async () => {
    const source = await readFile(configPath, 'utf8');
    expect(validateAssetCachePolicy(source)).toBe('ASSET_CACHE_POLICY_PASS');
  });

  it('rejects the previous one-year cache of missing assets', () => {
    expect(validateAssetCachePolicy(
      'location ^~ /assets/ { try_files $uri =404; ' +
        'add_header Cache-Control "public, max-age=31536000, immutable" always; }',
    )).toBe('BLOCKED_IMMUTABLE_404');
  });

  it('rejects serving the SPA fallback for missing JS/CSS', () => {
    expect(validateAssetCachePolicy(
      'location ^~ /assets/ { try_files $uri /index.html; ' +
        'add_header Cache-Control "public, max-age=31536000, immutable"; }',
    )).toBe('BLOCKED_ASSET_SPA_FALLBACK');
  });
});
