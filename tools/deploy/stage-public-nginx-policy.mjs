import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFile, mkdir, open, lstat, readFile, rename, chown, chmod } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import {
  HOST_CONFIG,
  LEGACY_CACHE,
  SAFE_CACHE,
  validateAssetCachePolicy,
} from './nginx-asset-policy.mjs';

const BACKUPS = '/srv/backups/platform/christmas-games';
const sha = (value) => createHash('sha256').update(value).digest('hex');

export function planNginxPolicyChange(config) {
  const status = validateAssetCachePolicy(config);
  if (status === 'ASSET_CACHE_POLICY_PASS') {
    return { status: 'NGINX_CACHE_POLICY_ALREADY_SAFE', updated: config };
  }
  const assetBlockMatch = config.match(/location \^~ \/assets\/ \{[^}]+\}/);
  if (status !== 'BLOCKED_IMMUTABLE_404' || !assetBlockMatch) {
    throw Error('UNKNOWN_NGINX_CONFIGURATION');
  }
  const assetBlock = assetBlockMatch[0];
  if (!assetBlock.includes(LEGACY_CACHE)) {
    throw Error('UNKNOWN_NGINX_CONFIGURATION');
  }
  const updatedAssetBlock = assetBlock.replace(LEGACY_CACHE, SAFE_CACHE);
  const updated = config.replace(assetBlock, updatedAssetBlock);
  if (validateAssetCachePolicy(updated) !== 'ASSET_CACHE_POLICY_PASS') {
    throw Error('NGINX_POLICY_PATCH_INVALID');
  }
  return { status: 'NGINX_CACHE_POLICY_NEEDS_PATCH', updated };
}

async function applyNginxPolicyChange() {
  if (process.getuid?.() !== 0) throw Error('ROOT_REQUIRED');
  const stat = await lstat(HOST_CONFIG);
  if (!stat.isFile() || stat.isSymbolicLink()) throw Error('NGINX_FILE_NOT_REGULAR');
  const existing = await readFile(HOST_CONFIG, 'utf8');
  const plan = planNginxPolicyChange(existing);
  if (plan.status === 'NGINX_CACHE_POLICY_ALREADY_SAFE') {
    return { status: plan.status };
  }
  await mkdir(BACKUPS, { recursive: true, mode: 0o700 });
  const backup =
    BACKUPS +
    '/nginx-' +
    new Date().toISOString().replace(/[^0-9TZ]/g, '') +
    '-' +
    sha(existing).slice(0, 12) +
    '.conf';
  // Exclusive backup, no replacement of an existing receipt.
  const backupFd = await open(backup, 'wx', 0o600);
  try {
    await backupFd.writeFile(existing, 'utf8');
  } finally {
    await backupFd.close();
  }
  const temp = HOST_CONFIG + '.policy-' + process.pid;
  const file = await open(temp, 'wx', stat.mode & 0o777);
  try {
    await file.writeFile(plan.updated, 'utf8');
  } finally {
    await file.close();
  }
  try {
    await chown(temp, stat.uid, stat.gid);
    await rename(temp, HOST_CONFIG);
    // This is a TEMPORARY Nginx process, not the live gateway. The bind-mounted
    // config in an already-running gateway is not replaced until recreate.
    execFileSync(
      'docker',
      [
        'run',
        '--rm',
        '--pull=never',
        '--network=none',
        '--add-host',
        'catalog:127.0.0.1',
        '--add-host',
        'gallery-ops:127.0.0.1',
        '-v',
        HOST_CONFIG + ':/etc/nginx/conf.d/default.conf:ro',
        'nginx:alpine',
        'nginx',
        '-t',
      ],
      { timeout: 20000, stdio: ['ignore', 'ignore', 'pipe'] },
    );
    return { status: 'NGINX_POLICY_STAGED_RECREATE_GATEWAY_REQUIRED', backup };
  } catch {
    await copyFile(backup, temp);
    await chmod(temp, stat.mode & 0o777);
    await chown(temp, stat.uid, stat.gid);
    await rename(temp, HOST_CONFIG);
    throw Error('NGINX_POLICY_VALIDATION_FAILED_RESTORED');
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  if (process.argv.length !== 3 || process.argv[2] !== '--apply') {
    process.stderr.write('Usage: sudo node stage-public-nginx-policy.mjs --apply\n');
    process.exitCode = 2;
  } else {
    try {
      const result = await applyNginxPolicyChange();
      process.stdout.write(JSON.stringify(result) + '\n');
    } catch {
      process.stderr.write(JSON.stringify({ status: 'NGINX_POLICY_STAGE_BLOCKED' }) + '\n');
      process.exitCode = 2;
    }
  }
}
