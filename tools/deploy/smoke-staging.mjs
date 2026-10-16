import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { URL } from 'node:url';
import { REQUIRED_NATAL_VELVET_ASSETS } from './release-utils.mjs';

const originValue = process.env.CG_STAGING_ORIGIN;
const token = process.env.CG_STAGING_TOKEN;
if (!originValue || !token) {
  throw new Error('CG_STAGING_ORIGIN and CG_STAGING_TOKEN are required.');
}
if (!/^[A-Za-z0-9_-]{16,128}$/.test(token)) {
  throw new Error('CG_STAGING_TOKEN must be an opaque 16-128 character token.');
}

const origin = new URL(originValue);
if (origin.protocol !== 'https:') {
  throw new Error('CG_STAGING_ORIGIN must use HTTPS.');
}
if (origin.pathname !== '/' || origin.search || origin.hash) {
  throw new Error('CG_STAGING_ORIGIN must be an origin without path, query or hash.');
}

const checks = [];
const health = await request('/healthz');
if (health.response.status !== 200) throw new Error('Staging health endpoint is not 200.');
const healthBody = JSON.parse(health.body);
if (healthBody.status !== 'ok' || healthBody.releaseStage !== 'staging-demo') {
  throw new Error('Staging health endpoint does not report staging-demo.');
}
checks.push({ name: 'healthz', status: health.response.status });

for (const [name, suffix] of [
  ['hub', ''],
  ['gallery', '/fotos'],
  ['puzzle', '/game/puzzle-swap'],
]) {
  const result = await request(`/s/${encodeURIComponent(token)}${suffix}`);
  if (result.response.status !== 200) throw new Error(`${name} route is not 200.`);
  if (!result.response.headers.get('content-type')?.includes('text/html')) {
    throw new Error(`${name} route did not return HTML.`);
  }
  if (result.response.headers.get('referrer-policy') !== 'no-referrer') {
    throw new Error(`${name} route is missing Referrer-Policy: no-referrer.`);
  }
  if (!result.response.headers.get('x-robots-tag')?.includes('noindex')) {
    throw new Error(`${name} route is missing private noindex policy.`);
  }
  if (result.response.headers.get('x-frame-options') !== 'DENY') {
    throw new Error(`${name} route is missing X-Frame-Options: DENY.`);
  }
  if (!result.response.headers.get('content-security-policy')?.includes("frame-ancestors 'none'")) {
    throw new Error(`${name} route is missing frame-ancestors protection.`);
  }
  checks.push({ name, status: result.response.status });
}

const invalid = await request('/s/invalid-demo-token-000000000000');
if (invalid.response.status !== 404) {
  throw new Error('An unknown staging token did not fail closed with 404.');
}
checks.push({ name: 'invalid-token', status: invalid.response.status });

const fixture = await request('/fixtures/portrait.svg');
if (fixture.response.status !== 200) {
  throw new Error('Synthetic staging fixture is not reachable through the static edge.');
}
checks.push({ name: 'fixture-static', status: fixture.response.status });

// Verify that the public edge actually serves the new artwork, not only an
// old healthy catalog container. Optionally compare bytes to the approved
// immutable RELEASE.json built by the operator's workstation.
let inventory;
if (process.env.CG_STAGING_RELEASE_MANIFEST) {
  const release = JSON.parse(await readFile(process.env.CG_STAGING_RELEASE_MANIFEST, 'utf8'));
  if (
    release?.stage !== 'staging-demo' ||
    release?.customerDataAllowed !== false ||
    !Array.isArray(release.files)
  ) {
    throw new Error('Local expected staging RELEASE.json is invalid.');
  }
  inventory = new Map(release.files.map((file) => [file.path, file]));
}
for (const assetPath of REQUIRED_NATAL_VELVET_ASSETS) {
  let response;
  try {
    response = await globalThis.fetch(new URL(`/${assetPath.slice('web/'.length)}`, origin), {
      redirect: 'error',
      headers: { accept: 'image/webp' },
      signal: globalThis.AbortSignal.timeout(10_000),
    });
  } catch {
    throw new Error('Failed to fetch an expected Natal Velvet asset from the public edge.');
  }
  if (
    response.status !== 200 ||
    !response.headers.get('content-type')?.includes('image/webp')
  ) {
    throw new Error('Natal Velvet artwork is not being served as a WebP at the public edge.');
  }
  const encoded = Buffer.from(await response.arrayBuffer());
  if (
    encoded.length < 12 ||
    encoded.toString('ascii', 0, 4) !== 'RIFF' ||
    encoded.toString('ascii', 8, 12) !== 'WEBP'
  ) {
    throw new Error('A public gallery asset is not a valid WebP container.');
  }
  if (inventory) {
    const wanted = inventory.get(assetPath);
    const digest = createHash('sha256').update(encoded).digest('hex');
    if (!wanted || wanted.bytes !== encoded.length || wanted.sha256 !== digest) {
      throw new Error('Public Natal Velvet asset differs from the approved release manifest.');
    }
  }
  checks.push({ name: assetPath.split('/').at(-1), status: response.status });
}

process.stdout.write(`${JSON.stringify({ status: 'ok', origin: origin.origin, checks })}\n`);

async function request(pathname) {
  try {
    const response = await globalThis.fetch(new URL(pathname, origin), {
      redirect: 'error',
      headers: { accept: 'text/html,application/json' },
      signal: globalThis.AbortSignal.timeout(10_000),
    });
    return { response, body: await response.text() };
  } catch {
    throw new Error('Staging smoke request failed before receiving a valid HTTP response.');
  }
}
