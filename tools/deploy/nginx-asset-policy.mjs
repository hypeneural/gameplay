import { readFile, lstat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

export const HOST_CONFIG = '/srv/platform/stacks/christmas-games/nginx.conf';
export const LEGACY_CACHE = 'add_header Cache-Control "public, max-age=31536000, immutable" always;';
export const SAFE_CACHE = 'add_header Cache-Control "public, max-age=31536000, immutable";';

export function validateAssetCachePolicy(config) {
  const block = config.match(/location \^~ \/assets\/ \{([^}]+)\}/)?.[1];
  if (!block) return 'BLOCKED_NO_EXPLICIT_ASSET_LOCATION';
  if (!/try_files\s+\$uri\s+=404\s*;/.test(block)) return 'BLOCKED_ASSET_SPA_FALLBACK';
  if (block.includes(LEGACY_CACHE)) return 'BLOCKED_IMMUTABLE_404';
  if (!block.includes(SAFE_CACHE)) return 'BLOCKED_NO_SUCCESS_CACHE_POLICY';
  return 'ASSET_CACHE_POLICY_PASS';
}

export async function inspectInstalledCachePolicy(path = HOST_CONFIG) {
  const stats = await lstat(path);
  if (!stats.isFile() || stats.isSymbolicLink()) throw Error('CONFIG_NOT_REGULAR_FILE');
  return validateAssetCachePolicy(await readFile(path, 'utf8'));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    if (process.argv.length !== 2) throw Error('ARGUMENTS_NOT_ALLOWED');
    const status = await inspectInstalledCachePolicy();
    process.stdout.write(JSON.stringify({ status }) + '\n');
    if (status !== 'ASSET_CACHE_POLICY_PASS') process.exitCode = 2;
  } catch {
    process.stderr.write(JSON.stringify({ status: 'NGINX_POLICY_UNAVAILABLE' }) + '\n');
    process.exitCode = 2;
  }
}
