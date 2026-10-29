import { fileURLToPath } from 'node:url';
import { referencedEntryAssets } from './check-public-web-alignment.mjs';

// Token-free edge probe. Never put a private session token into this command.
const HOST = 'https://jogos.fotosdenatal.com';
const ACCEPTED_ASSET = /^\/assets\/[A-Za-z0-9_.-]+\.(?:css|js)$/;

export function classifyEdgeAsset(path, status, mime) {
  if (!ACCEPTED_ASSET.test(path)) return 'INVALID_PUBLIC_ASSET_PATH';
  if (status !== 200) return 'EDGE_ASSET_HTTP_' + status;
  const type = String(mime ?? '')
    .split(';')[0]
    .trim()
    .toLowerCase();
  const expected = path.endsWith('.css')
    ? ['text/css']
    : ['text/javascript', 'application/javascript', 'application/ecmascript', 'text/ecmascript'];
  return expected.includes(type) ? 'EDGE_ASSET_OK' : 'EDGE_ASSET_WRONG_MIME';
}

export async function auditEdgeAsset(path, fetchFn = fetch) {
  if (!ACCEPTED_ASSET.test(path)) throw new Error('INVALID_PUBLIC_ASSET_PATH');
  const reply = await fetchFn(HOST + path, {
    method: 'GET',
    redirect: 'manual',
    headers: { accept: path.endsWith('.css') ? 'text/css' : 'text/javascript' },
    signal: AbortSignal.timeout(10000),
  });
  const result = {
    asset: path,
    status: reply.status,
    mime: reply.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase() ?? null,
    check: classifyEdgeAsset(path, reply.status, reply.headers.get('content-type')),
  };
  await reply.body?.cancel();
  return result;
}

// Probe one synthetic, token-free chunk that must not exist. A 404 with
// Cache-Control: immutable can poison browser caches long after a fixed cut.
export async function auditMissingAssetCache(fetchFn = fetch) {
  const path = '/assets/__evydencia_forensic_missing_20261029__.js';
  const response = await fetchFn(HOST + path, {
    method: 'GET',
    redirect: 'manual',
    signal: AbortSignal.timeout(10000),
  });
  const cache = String(response.headers.get('cache-control') ?? '').toLowerCase();
  const status = response.status;
  await response.body?.cancel();
  return {
    status: status === 404 && !/immutable|max-age\s*=\s*[1-9]/.test(cache)
      ? 'MISSING_ASSET_NOT_CACHED'
      : 'BLOCKED_MISSING_ASSET_CACHE',
    httpStatus: status,
    immutable: /immutable/.test(cache),
  };
}

export async function auditPublicEdge(assets = [], fetchFn = fetch) {
  if (!Array.isArray(assets)) throw new Error('INVALID_PUBLIC_ASSET_ARGUMENTS');
  let wanted = assets;
  if (wanted.length === 0) {
    const page = await fetchFn(HOST + '/', {
      method: 'GET',
      redirect: 'manual',
      signal: AbortSignal.timeout(10000),
    });
    if (
      page.status !== 200 ||
      !String(page.headers.get('content-type')).toLowerCase().includes('text/html')
    ) {
      await page.body?.cancel();
      return { status: 'BLOCKED_EDGE_DOCUMENT', documentHttpStatus: page.status, assets: [] };
    }
    const html = await page.text();
    wanted = referencedEntryAssets(html);
  }
  if (
    wanted.length === 0 ||
    wanted.length > 100 ||
    wanted.some((path) => !ACCEPTED_ASSET.test(path))
  ) {
    throw new Error('EDGE_ASSET_LIST_INVALID');
  }
  const results = [];
  for (const path of wanted) results.push(await auditEdgeAsset(path, fetchFn));
  return {
    status: results.every((result) => result.check === 'EDGE_ASSET_OK')
      ? 'PUBLIC_EDGE_ASSETS_PASS'
      : 'BLOCKED_PUBLIC_EDGE_ASSETS',
    assets: results,
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const args = process.argv.slice(2);
  const paths = args.map((x) => '/assets/' + x);
  if (args.some((x) => !/^[A-Za-z0-9_.-]+\.(?:js|css)$/.test(x))) {
    process.stderr.write('Only names of public Vite .js/.css assets are accepted.\n');
    process.exitCode = 2;
  } else {
    try {
      const result = await auditPublicEdge(paths);
      process.stdout.write(JSON.stringify(result) + '\n');
      if (result.status !== 'PUBLIC_EDGE_ASSETS_PASS') process.exitCode = 2;
    } catch (error) {
      process.stderr.write(
        JSON.stringify({
          status: 'EDGE_PROBE_UNAVAILABLE',
          reason: error?.name === 'TimeoutError' ? 'TIMEOUT' : 'NETWORK_OR_FETCH_FAILED',
        }) + '\n',
      );
      process.exitCode = 2;
    }
  }
}
