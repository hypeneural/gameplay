import { test } from 'node:test';
import { request as httpRequest } from 'node:http';
import { URL } from 'node:url';
import { Buffer } from 'node:buffer';
import assert from 'node:assert/strict';
import {
  createAccessVerifier,
  createGalleryOpsAdminServer,
  configFromEnv,
  resolveOperations,
  loadCanonicalOrders,
} from './adminServer.mjs';
import { generateKeyPairSync, createSign } from 'node:crypto';
const secret = 'server-only-dashboard-test-token-1234567890';
const readSecret = 'gameplay-read-token-server-only-1234567';
const u = (n) => '00000000-0000-4000-8000-' + String(n).padStart(12, '0');
const sample = Array.from({ length: 104 }, (_, i) => ({
  order_id: i + 1,
  order_uuid: u(i + 1),
  customer_name: 'Família Sintética ' + i,
  customer_whatsapp: '554899900' + String(1000 + i),
  customer_phone: null,
  customer_email: 'familia' + i + '@example.invalid',
  package_name: 'Pacote Exemplo',
  status_key: 'session_schedule',
  created_at: '2026-10-01T10:00:00-03:00',
  session_at: null,
}));
const asOf = '2026-10-28T10:00:00-03:00';
const config = {
  key: secret,
  readSecret,
  crmUrl: 'http://127.0.0.1:4196/internal/v1/gallery-ops/valid-orders',
  gameplayUrl: 'http://127.0.0.1:4181/internal/v1/sessions',
  hostname: 'jogos.fotosdenatal.com',
  linksEnabled: false,
  dist: '/invalid',
  team: 'test.cloudflareaccess.com',
  audience: 'demo',
  emails: new Set(['admin@example.invalid']),
};
function response(data, status = 200) {
  return new globalThis.Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
function mockedFetch({ readerFail = false, invalidCount = false } = {}) {
  return async (url, init) => {
    const req = JSON.parse(init.body);
    if (String(url).includes('valid-orders')) {
      const rows = sample.filter((o) => o.order_id > req.after_id).slice(0, req.limit);
      const hasMore = rows.length > 0 && rows.at(-1).order_id < sample.length;
      return response({
        schema_version: 1,
        source: 'crm_canonical_valid_natal_orders',
        year: 2026,
        as_of: asOf,
        total_valid: invalidCount ? 103 : sample.length,
        items: rows,
        has_more: hasMore,
        next_cursor: hasMore ? rows.at(-1).order_id : null,
      });
    }
    if (readerFail) return response({ error: 'reader_down' }, 503);
    if (String(url).endsWith('/lookup-batch'))
      return response({
        schema_version: 1,
        source: 'gameplay_catalog',
        verified_at: asOf,
        results: req.crm_order_uuids.map((id) => ({
          crm_order_uuid: id,
          state: 'not_found',
          photo_count: 0,
          preparation: { state: 'none', photo_count: null },
          hub_url: null,
          gallery_url: null,
        })),
      });
    throw Error('unexpected_route');
  };
}
test('slices canonical 104 without truncation or status-10/12 restriction', async () => {
  const raw = await loadCanonicalOrders(config, mockedFetch());
  assert.equal(raw.orders.length, 104);
  assert.equal(raw.total, 104);
  assert.equal(raw.orders[103].order_id, 104);
  const data = await resolveOperations(config, mockedFetch());
  assert.equal(data.items.length, 104);
  assert.equal(
    data.items.every((i) => i.state === 'no_session'),
    true,
  );
  assert.equal(data.items[0].crmStatus, 'session_schedule');
  assert.equal(data.items[0].clientWhatsapp, sample[0].customer_whatsapp);
  assert.equal(data.items[0].clientEmail, sample[0].customer_email);
  assert.equal(data.items[0].clientPhone, null);
  assert.ok(!JSON.stringify(data).includes('order_uuid'));
});
test('read failures do not erase CRM-valid orders or misclassify missing session', async () => {
  const data = await resolveOperations(config, mockedFetch({ readerFail: true }));
  assert.equal(data.total_valid, 104);
  assert.equal(data.failed_batches, 3);
  assert.equal(
    data.items.every((i) => i.state === 'unavailable' && i.publishedPhotos === null),
    true,
  );
  await assert.rejects(
    () => loadCanonicalOrders(config, mockedFetch({ invalidCount: true })),
    /TOTAL_MISMATCH/,
  );
});
test('rejects insecure missing env at process bootstrap', () => {
  assert.throws(() => configFromEnv({}), /SECURITY_CONFIG_REQUIRED/);
});
async function withServer(verify, fn) {
  const app = createGalleryOpsAdminServer({
    config: { ...config, hostname: '127.0.0.1' },
    verifyOperator: verify,
    readAsset: async () => '<html>preview</html>',
    operations: async () => ({
      schema_version: 1,
      total_valid: 104,
      items: sample.map((x) => ({
        orderId: x.order_id,
        clientName: x.customer_name,
        clientWhatsapp: x.customer_whatsapp,
        clientPhone: x.customer_phone,
        clientEmail: x.customer_email,
        state: 'no_session',
      })),
    }),
  });
  await new Promise((r) => app.listen(0, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + app.address().port;
  try {
    await fn(base, { headers: { host: config.hostname } });
  } finally {
    await new Promise((r) => app.close(r));
  }
}
test('origin rejects unknown/non-operator requests, authorizes HTML and list only with identity', async () => {
  await withServer(
    async () => null,
    async (base, init) => {
      assert.equal((await fetch(base + '/gestao/galerias/', init)).status, 401);
      assert.equal((await fetch(base + '/gestao/galerias/api/orders', init)).status, 401);
    },
  );
  await withServer(
    async () => ({ id: 'op-1', email: 'admin@example.invalid' }),
    async (base, init) => {
      const r = await fetch(base + '/gestao/galerias/api/orders', init);
      assert.equal(r.status, 200);
      assert.equal((await r.json()).total_valid, 104);
      assert.match(r.headers.get('cache-control'), /no-store/);
      const csvResponse = await fetch(base + '/gestao/galerias/api/export', init);
      assert.equal(csvResponse.status, 200);
      assert.match(csvResponse.headers.get('cache-control'), /no-store/);
      const csv = await csvResponse.text();
      assert.ok(csv.includes('WhatsApp'));
      assert.ok(csv.includes(sample[0].customer_whatsapp));
      assert.ok(csv.includes(sample[0].customer_email));
      const invalidHost = await new Promise((resolve, reject) => {
        const dest = new URL(base + '/gestao/galerias/api/orders');
        const req = httpRequest(
          {
            hostname: dest.hostname,
            port: dest.port,
            path: dest.pathname,
            headers: { Host: 'evil.example' },
          },
          (res) => {
            res.resume();
            res.on('end', () => resolve(res.statusCode));
          },
        );
        req.on('error', reject);
        req.end();
      });
      assert.equal(invalidHost, 403);
      assert.equal(
        (await fetch(base + '/gestao/galerias/api/orders', { ...init, method: 'POST' })).status,
        405,
      );
      assert.equal(
        (await fetch(base + '/gestao/galerias/api/orders/1/open/gallery', init)).status,
        409,
      );
    },
  );
});
test('admin reader gate returns a specific 409; approved single-order links redirect privately', async () => {
  const actor = async () => ({ id: 'synthetic-operator' });
  const token = 'a'.repeat(32);
  const gatewayFetch = async (url, init) => {
    if (String(url).endsWith('/lookup')) {
      const payload = JSON.parse(init.body);
      assert.equal(payload.include_links, true);
      return response({
        schema_version: 1,
        results: [
          {
            crm_order_uuid: sample[0].order_uuid,
            state: 'published_unverified',
            gallery_url: 'https://jogos.fotosdenatal.com/s/' + token + '/fotos',
            hub_url: 'https://jogos.fotosdenatal.com/s/' + token,
          },
        ],
      });
    }
    return mockedFetch()(url, init);
  };
  const approvedConfig = { ...config, hostname: '127.0.0.1', linksEnabled: true };
  const app = createGalleryOpsAdminServer({
    config: approvedConfig,
    verifyOperator: actor,
    fetchFn: gatewayFetch,
  });
  await new Promise((done) => app.listen(0, '127.0.0.1', done));
  const base = 'http://127.0.0.1:' + app.address().port + '/gestao/galerias/api/orders/1/open/';
  try {
    const gallery = await fetch(base + 'gallery', { redirect: 'manual' });
    assert.equal(gallery.status, 303);
    assert.equal(
      gallery.headers.get('location'),
      'https://jogos.fotosdenatal.com/s/' + token + '/fotos',
    );
    assert.equal(gallery.headers.get('cache-control').includes('no-store'), true);
    const hub = await fetch(base + 'hub', { redirect: 'manual' });
    assert.equal(hub.status, 303);
    assert.equal(hub.headers.get('location'), 'https://jogos.fotosdenatal.com/s/' + token);
    const unknown = await fetch(base.replace('/1/open/', '/999999/open/') + 'hub', {
      redirect: 'manual',
    });
    assert.equal(unknown.status, 404);
  } finally {
    await new Promise((done) => app.close(done));
  }
  const denied = createGalleryOpsAdminServer({
    config: approvedConfig,
    verifyOperator: actor,
    fetchFn: async (url, init) =>
      String(url).endsWith('/lookup')
        ? response({ error: 'CUSTOMER_LINKS_NOT_ENABLED' }, 409)
        : mockedFetch()(url, init),
  });
  await new Promise((done) => denied.listen(0, '127.0.0.1', done));
  try {
    const res = await fetch(
      'http://127.0.0.1:' + denied.address().port + '/gestao/galerias/api/orders/1/open/gallery',
      { redirect: 'manual' },
    );
    assert.equal(res.status, 409);
    assert.equal((await res.json()).error, 'READER_LINKS_NOT_APPROVED');
  } finally {
    await new Promise((done) => denied.close(done));
  }
});
test('missing Cloudflare credentials cannot enable implicit operator session', () => {
  assert.throws(
    () =>
      configFromEnv({
        GALLERY_OPS_MCP_READER_SECRET: secret,
        GALLERY_OPS_GAMEPLAY_READ_SECRET: readSecret,
      }),
    /GALLERY_OPS_SECURITY_CONFIG_REQUIRED/,
  );
});
test('verifies Cloudflare RS256 signed JWT, rejects spoofed email and expired claims', async () => {
  const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const jwk = publicKey.export({ format: 'jwk' });
  jwk.kid = 'test-1';
  jwk.alg = 'RS256';
  jwk.use = 'sig';
  const clock = Date.now();
  const signed = (claims) => {
    const h = Buffer.from(JSON.stringify({ alg: 'RS256', kid: 'test-1' })).toString('base64url');
    const p = Buffer.from(JSON.stringify(claims)).toString('base64url');
    const sig = createSign('RSA-SHA256')
      .update(h + '.' + p)
      .end()
      .sign(privateKey)
      .toString('base64url');
    return h + '.' + p + '.' + sig;
  };
  const claims = {
    iss: 'https://test.cloudflareaccess.com',
    aud: ['demo'],
    email: 'admin@example.invalid',
    sub: 'operator-a',
    iat: Math.floor(clock / 1000) - 60,
    exp: Math.floor(clock / 1000) + 600,
  };
  const verifier = createAccessVerifier({
    config,
    now: () => clock,
    fetchFn: async () => response({ keys: [jwk] }),
  });
  assert.equal(
    (await verifier({ headers: { 'cf-access-jwt-assertion': signed(claims) } }))?.id,
    'operator-a',
  );
  assert.equal(
    await verifier({
      headers: {
        'cf-access-jwt-assertion': signed({ ...claims, email: 'intruder@example.invalid' }),
      },
    }),
    null,
  );
  assert.equal(
    await verifier({
      headers: {
        'cf-access-jwt-assertion': signed({ ...claims, exp: Math.floor(clock / 1000) - 1 }),
      },
    }),
    null,
  );
});

test('explicit allowInsecureOperator enables local operator fallback without Cloudflare', async () => {
  const insecure = configFromEnv({
    GALLERY_OPS_MCP_READER_SECRET: secret,
    GALLERY_OPS_GAMEPLAY_READ_SECRET: readSecret,
    GALLERY_OPS_ALLOW_INSECURE_OPERATOR: '1',
  });
  assert.equal(insecure.team, '');
  const verifier = createAccessVerifier({ config: insecure });
  const actor = await verifier({});
  assert.equal(actor?.id, 'gestor-operacao');
});
