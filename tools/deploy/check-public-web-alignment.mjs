import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { referencedEntryAssets } from './vite-entry-integrity.mjs';
export { referencedEntryAssets } from './vite-entry-integrity.mjs';

const DEFAULT_CONTAINERS = Object.freeze({
  catalog: 'christmas-games-catalog',
  gateway: 'christmas-games-gateway',
});
const WEB_ROOT = '/var/www/html/web';
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');

export function comparePublicWebSnapshots(catalog, gateway) {
  const findings = [];
  if (catalog.indexSha !== gateway.indexSha) {
    findings.push('HTML_RELEASE_DRIFT');
  }
  const entries = referencedEntryAssets(catalog.html);
  if (entries.length === 0) findings.push('NO_VITE_ENTRY_ASSETS');
  // CatalogServer loads the HTML shell once at startup. A bind mount can
  // look current even when the running Node process still has an old shell.
  if (catalog.servedHtml !== undefined) {
    const runtimeEntries = referencedEntryAssets(catalog.servedHtml);
    if (runtimeEntries.join('|') !== entries.join('|')) {
      findings.push('RUNNING_HTML_RELEASE_DRIFT');
    }
  }
  for (const asset of entries) {
    const c = catalog.assetSha[asset] ?? null;
    const g = gateway.assetSha[asset] ?? null;
    if (!c) findings.push('CATALOG_ASSET_MISSING:' + asset);
    if (!g) findings.push('GATEWAY_ASSET_MISSING:' + asset);
    if (c && g && c !== g) findings.push('ASSET_CONTENT_DRIFT:' + asset);
  }
  return {
    status: findings.length ? 'BLOCKED_WEB_RELEASE_DRIFT' : 'WEB_ASSETS_ALIGNED',
    referencedAssets: entries.length,
    findings,
  };
}

function dockerExec(container, ...args) {
  return execFileSync('docker', ['exec', container, ...args], {
    timeout: 15000,
    maxBuffer: 2 * 1024 * 1024,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function dockerAssetSha(container, asset) {
  if (!/^\/assets\/[A-Za-z0-9_.-]+\.(?:js|css)$/.test(asset)) {
    throw new Error('INVALID_ASSET_PATH');
  }
  try {
    const result = dockerExec(container, 'sha256sum', WEB_ROOT + asset);
    const digest = result.trim().split(/\s+/)[0];
    if (!/^[0-9a-f]{64}$/.test(digest)) throw new Error('ASSET_HASH_INVALID');
    return digest;
  } catch (error) {
    if (error?.status === 1 || error?.status === 127) return null;
    throw error;
  }
}

function readSnapshot(container) {
  const html = dockerExec(container, 'cat', WEB_ROOT + '/index.html');
  return { html, indexSha: sha(html), assetSha: {} };
}

export function inspectDockerWebAlignment(containers = DEFAULT_CONTAINERS) {
  const catalog = readSnapshot(containers.catalog);
  const gateway = readSnapshot(containers.gateway);
  // Read only the public synthetic demo, never a customer capability URL.
  catalog.servedHtml = dockerExec(
    containers.catalog,
    'node',
    '-e',
    'fetch("http://127.0.0.1:4180/").then(async r => { if (!r.ok) process.exit(2); process.stdout.write(await r.text()); }).catch(() => process.exit(2));',
  );
  const assets = new Set([
    ...referencedEntryAssets(catalog.html),
    ...referencedEntryAssets(gateway.html),
  ]);
  for (const asset of assets) {
    catalog.assetSha[asset] = dockerAssetSha(containers.catalog, asset);
    gateway.assetSha[asset] = dockerAssetSha(containers.gateway, asset);
  }
  return comparePublicWebSnapshots(catalog, gateway);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  if (process.argv.length !== 2) {
    process.stderr.write('Usage: node tools/deploy/check-public-web-alignment.mjs (read-only)\n');
    process.exitCode = 2;
  } else {
    try {
      const result = inspectDockerWebAlignment();
      process.stdout.write(JSON.stringify(result) + '\n');
      if (result.status !== 'WEB_ASSETS_ALIGNED') process.exitCode = 2;
    } catch (error) {
      process.stderr.write(
        JSON.stringify({
          status: 'WEB_ALIGNMENT_UNAVAILABLE',
          reason: error?.code === 'ENOENT' ? 'DOCKER_UNAVAILABLE' : 'DOCKER_INSPECTION_FAILED',
        }) + '\n',
      );
      process.exitCode = 2;
    }
  }
}
