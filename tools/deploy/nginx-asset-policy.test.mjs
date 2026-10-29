import { readFile } from 'node:fs/promises';
import { fileURLToPath, URL } from 'node:url';
import { describe, expect, it } from 'vitest';
import { validateAssetCachePolicy } from './nginx-asset-policy.mjs';
import { planNginxPolicyChange } from './stage-public-nginx-policy.mjs';

const configPath = fileURLToPath(
  new URL('../../deploy/vps/docker/nginx.conf', import.meta.url),
);

describe('nginx Vite asset cache policy', () => {
  it('stages only the known immutable-404 directive and preserves other rules', () => {
    const legacy = 'location ^~ /assets/ { try_files $uri =404; ' +
      'add_header Cache-Control "public, max-age=31536000, immutable" always; }';
    const fixed = planNginxPolicyChange(legacy);
    expect(fixed.status).toBe('NGINX_CACHE_POLICY_NEEDS_PATCH');
    expect(validateAssetCachePolicy(fixed.updated)).toBe('ASSET_CACHE_POLICY_PASS');
    expect(planNginxPolicyChange(fixed.updated).status)
      .toBe('NGINX_CACHE_POLICY_ALREADY_SAFE');
    expect(() => planNginxPolicyChange('unknown config'))
      .toThrow('UNKNOWN_NGINX_CONFIGURATION');
  });

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
