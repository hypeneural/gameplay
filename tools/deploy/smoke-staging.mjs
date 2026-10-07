import { URL } from 'node:url';

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
  checks.push({ name, status: result.response.status });
}

const invalid = await request('/s/invalid-demo-token-000000000000');
if (invalid.response.status !== 404) {
  throw new Error('An unknown staging token did not fail closed with 404.');
}
checks.push({ name: 'invalid-token', status: invalid.response.status });

process.stdout.write(
  `${JSON.stringify({ status: 'ok', origin: origin.origin, checks })}\n`,
);

async function request(pathname) {
  const response = await globalThis.fetch(new URL(pathname, origin), {
    redirect: 'error',
    headers: { accept: 'text/html,application/json' },
  });
  return { response, body: await response.text() };
}
