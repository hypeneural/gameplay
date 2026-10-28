// Dedicated Gallery Ops BFF. Never expose CRM/MCP/Gameplay service secrets to Vite or a browser.
// Cloudflare Access is verified AGAIN at this origin with the provider's signed JWK.
import { createServer } from 'node:http';
import { URL } from 'node:url';
import { Buffer } from 'node:buffer';
import { createPublicKey, verify as verifySignature } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';

const ROOT = '/gestao/galerias';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const safeName = /^[a-zA-Z0-9_.-]+$/;
const ADMIN_URL = /^https:\/\/evydencia\.com\/gestao\/pedidos\/[0-9a-f-]{36}\/detalhes$/i;
const MEDIA_ORIGIN = 'https://jogos.fotosdenatal.com';
const LOGIN_ERROR = { error: 'ADMIN_AUTH_REQUIRED' };
export function configFromEnv(env) {
  const team = String(env.GALLERY_OPS_CF_TEAM_DOMAIN || '').trim().toLowerCase();
  const audience = String(env.GALLERY_OPS_CF_AUD || '').trim();
  const emails = String(env.GALLERY_OPS_ADMIN_EMAILS || '').split(',').map(v => v.trim().toLowerCase()).filter(Boolean);
  const key = String(env.GALLERY_OPS_MCP_READER_SECRET || '');
  const readSecret = String(env.GALLERY_OPS_GAMEPLAY_READ_SECRET || '');
  const crmUrl = String(env.GALLERY_OPS_MCP_READER_URL || 'http://127.0.0.1:4196/internal/v1/gallery-ops/valid-orders');
  const gameplayUrl = String(env.GALLERY_OPS_GAMEPLAY_READER_URL || 'http://127.0.0.1:4181/internal/v1/sessions');
  const hostname = String(env.GALLERY_OPS_PUBLIC_HOST || 'jogos.fotosdenatal.com').toLowerCase();
  if (!/^[a-z0-9-]+\.cloudflareaccess\.com$/.test(team) || !audience || !emails.length
      || !emails.every(e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))
      || key.length < 32 || readSecret.length < 32 || /[\r\n]/.test(key+readSecret)) throw Error('GALLERY_OPS_SECURITY_CONFIG_REQUIRED');
  for (const url of [crmUrl, gameplayUrl]) {
    const parsed = new URL(url);
    if (parsed.username || parsed.password || parsed.hash || parsed.search
        || !['http:', 'https:'].includes(parsed.protocol)
        || (parsed.protocol === 'http:' && !['127.0.0.1', '::1', 'localhost', 'catalog-reader', 'gallery-ops-reader'].includes(parsed.hostname))) throw Error('GALLERY_OPS_PRIVATE_ENDPOINT_INVALID');
  }
  if (!/^[a-z0-9.-]+$/.test(hostname)) throw Error('GALLERY_OPS_PUBLIC_HOST_INVALID');
  return {
    team, audience, emails: new Set(emails), key, readSecret, crmUrl, gameplayUrl,
    hostname, linksEnabled: env.GALLERY_OPS_CUSTOMER_LINKS_ENABLED === '1',
    dist: env.GALLERY_OPS_DIST || resolve(import.meta.dirname, '../dist'),
  };
}
function parseBase64Json(value) {
  if (!/^[A-Za-z0-9_-]+$/.test(value) || value.length > 8192) throw Error('JWT_ENCODING');
  return JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
}
export function createAccessVerifier({ config, fetchFn = fetch, now = () => Date.now() }) {
  let keys = new Map(), validUntil = 0;
  return async function verifyOperator(request) {
    const token = request.headers['cf-access-jwt-assertion'];
    if (typeof token !== 'string' || token.length > 10000) return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    try {
      const header = parseBase64Json(parts[0]);
      const claims = parseBase64Json(parts[1]);
      if (header.alg !== 'RS256' || typeof header.kid !== 'string'
          || typeof claims.sub !== 'string' || !claims.sub
          || claims.iss !== 'https://' + config.team
          || !(Array.isArray(claims.aud) ? claims.aud.includes(config.audience) : claims.aud === config.audience)
          || !Number.isSafeInteger(claims.exp) || claims.exp * 1000 <= now()
          || !Number.isSafeInteger(claims.iat) || claims.iat * 1000 > now() + 30000
          || (claims.nbf !== undefined && (!Number.isSafeInteger(claims.nbf) || claims.nbf * 1000 > now()))
          || typeof claims.email !== 'string' || !config.emails.has(claims.email.toLowerCase())) return null;
      if (now() >= validUntil || !keys.has(header.kid)) {
        const response = await fetchFn('https://' + config.team + '/cdn-cgi/access/certs', {
          signal: AbortSignal.timeout(4000), redirect: 'error',
        });
        if (!response.ok) return null;
        const jwks = await response.json();
        if (!Array.isArray(jwks.keys) || jwks.keys.length > 12) return null;
        keys = new Map(jwks.keys.filter(k => k.kty === 'RSA' && k.alg === 'RS256' && typeof k.kid === 'string').map(k => [k.kid, k]));
        validUntil = now() + 5 * 60 * 1000;
      }
      const jwk = keys.get(header.kid);
      if (!jwk || !/^[A-Za-z0-9_-]+$/.test(parts[2])) return null;
      const success = verifySignature('RSA-SHA256', Buffer.from(parts[0]+'.'+parts[1]),
        createPublicKey({ key: jwk, format: 'jwk' }), Buffer.from(parts[2], 'base64url'));
      return success ? { id: claims.sub, email: claims.email.toLowerCase() } : null;
    } catch { return null; }
  };
}
async function postJson(fetchFn, url, token, body, timeout = 18000) {
  const response = await fetchFn(url, {
    method: 'POST', redirect: 'error', signal: AbortSignal.timeout(timeout),
    headers: { Authorization: 'Bearer ' + token, Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw Error('UPSTREAM_HTTP_' + response.status);
  const len = Number(response.headers.get('content-length') || '0');
  if (len > 256000) throw Error('UPSTREAM_OVERSIZED');
  const raw = await response.text();
  if (raw.length > 256000) throw Error('UPSTREAM_OVERSIZED');
  return JSON.parse(raw);
}
export async function loadCanonicalOrders(config, fetchFn = fetch) {
  let cursor = 0, asOf = null, total = null;
  const orders = [], ids = new Set(), uuids = new Set();
  for (let page = 0; page < 50; page++) {
    const data = await postJson(fetchFn, config.crmUrl, config.key,
      {after_id: cursor, limit: 200, ...(asOf ? {as_of: asOf} : {})});
    if (data.schema_version !== 1 || data.source !== 'crm_canonical_valid_natal_orders'
        || data.year !== 2026 || !Number.isSafeInteger(data.total_valid)
        || data.total_valid < 0 || data.total_valid > 10000 || !Array.isArray(data.items)
        || data.items.length > 200 || !/2026-\d\d-\d\dT\d\d:\d\d:\d\d[+-]\d\d:\d\d/.test(data.as_of)) throw Error('CANONICAL_CONTRACT_INVALID');
    if (asOf && data.as_of !== asOf) throw Error('CANONICAL_SNAPSHOT_CHANGED');
    asOf = data.as_of;
    if (total !== null && data.total_valid !== total) throw Error('CANONICAL_TOTAL_CHANGED');
    total = data.total_valid;
    for (const item of data.items) {
      if (!Number.isSafeInteger(item.order_id) || item.order_id <= cursor || ids.has(item.order_id)
          || !UUID.test(item.order_uuid) || uuids.has(item.order_uuid.toLowerCase())
          || typeof item.customer_name !== 'string'
          || typeof item.status_key !== 'string') throw Error('CANONICAL_RECORD_INVALID');
      ids.add(item.order_id); uuids.add(item.order_uuid.toLowerCase()); orders.push(item);
    }
    if (!data.has_more) {
      if (data.next_cursor !== null || orders.length !== total) throw Error('CANONICAL_TOTAL_MISMATCH');
      return { asOf, total, orders };
    }
    if (!Number.isSafeInteger(data.next_cursor) || !data.items.length
        || data.next_cursor !== data.items.at(-1).order_id || data.next_cursor <= cursor) throw Error('CANONICAL_CURSOR_INVALID');
    cursor = data.next_cursor;
  }
  throw Error('CANONICAL_PAGE_LIMIT');
}
function projectState(result) {
  if (!result) return 'unavailable';
  if (result.state === 'not_found') return 'no_session';
  if (result.state === 'revoked') return 'revoked';
  if (result.preparation?.state === 'invalid' || result.state === 'partial') return 'incomplete';
  if (result.state === 'not_published' && result.preparation?.state === 'staged') return 'preparing';
  if (result.state === 'not_published') return 'no_upload';
  if (result.state === 'published_unverified') return 'published_unverified';
  return 'unavailable';
}
export async function resolveOperations(config, fetchFn = fetch) {
  const canonical = await loadCanonicalOrders(config, fetchFn);
  const states = new Map();
  let readerVerifiedAt = null, readerErrors = 0;
  for (let offset = 0; offset < canonical.orders.length; offset += 50) {
    const batch = canonical.orders.slice(offset, offset + 50);
    try {
      const data = await postJson(fetchFn, config.gameplayUrl + '/lookup-batch', config.readSecret,
        {crm_order_uuids: batch.map(o => o.order_uuid)}, 8000);
      if (data.schema_version !== 1 || data.source !== 'gameplay_catalog'
          || !Array.isArray(data.results) || data.results.length !== batch.length
          || typeof data.verified_at !== 'string') throw Error('GAMEPLAY_CONTRACT_INVALID');
      const expected = new Set(batch.map(o => o.order_uuid.toLowerCase()));
      const seen = new Set();
      for (const entry of data.results) {
        const uuid = entry.crm_order_uuid?.toLowerCase();
        if (!expected.has(uuid) || seen.has(uuid) || entry.hub_url || entry.gallery_url) throw Error('GAMEPLAY_RESPONSE_INVALID');
        seen.add(uuid);
      }
      for (const result of data.results) states.set(result.crm_order_uuid.toLowerCase(), result);
      readerVerifiedAt = data.verified_at;
    } catch {
      readerErrors++;
      // Reader outage is NOT a missing gallery. Preserve all canonical CRM records.
      for (const o of batch) states.set(o.order_uuid.toLowerCase(), null);
    }
  }
  const items = canonical.orders.map(o => {
    const g = states.get(o.order_uuid.toLowerCase()) || null;
    return {
      orderId: o.order_id,
      clientName: o.customer_name,
      packageName: o.package_name ?? 'Pacote não informado',
      crmStatus: o.status_key,
      createdAt: o.created_at ?? null,
      sessionAt: o.session_at ?? null,
      firstUploadAt: typeof g?.first_upload_at === 'string' ? g.first_upload_at : null,
      publishedAt: typeof g?.published_at === 'string' ? g.published_at : null,
      publishedPhotos: g ? g.photo_count : null,
      preparingPhotos: g ? g.preparation?.photo_count ?? null : null,
      state: projectState(g),
      crmOrderUrl: ADMIN_URL.test('https://evydencia.com/gestao/pedidos/'+o.order_uuid+'/detalhes')
        ? 'https://evydencia.com/gestao/pedidos/'+o.order_uuid+'/detalhes' : null,
    };
  });
  return {
    schema_version: 1, source: 'gallery_ops_authenticated_join',
    as_of: canonical.asOf, gameplay_verified_at: readerVerifiedAt,
    total_valid: canonical.total, degraded: readerErrors > 0,
    failed_batches: readerErrors, links_enabled: config.linksEnabled,
    items,
  };
}
function headers(mime='application/json; charset=utf-8') {
  return {
    'Content-Type': mime, 'Cache-Control': 'private, no-store, max-age=0, must-revalidate',
    'X-Content-Type-Options': 'nosniff', 'X-Robots-Tag': 'noindex, nofollow, noarchive',
    'Referrer-Policy': 'no-referrer', 'X-Frame-Options': 'DENY',
    'Content-Security-Policy': "default-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self'; font-src 'self'",
  };
}
function json(response, status, data, extra={}) {
  response.writeHead(status, {...headers(), ...extra}); response.end(JSON.stringify(data));
}
function safeCsvCell(v) {
  const str = String(v ?? ''), value = /^[\s]*[=+@-]/.test(str) ? "'"+str : str;
  return '"'+value.replaceAll('"','""')+'"';
}
function csv(items) {
  const header = ['Pedido','Cliente','Pacote','Status CRM','Status Gameplay','Sessão','Fotos publicadas','Em preparação'];
  const rows = items.map(x => [x.orderId,x.clientName,x.packageName,x.crmStatus,x.state,x.sessionAt,x.publishedPhotos,x.preparingPhotos]);
  return '\uFEFF'+[header,...rows].map(row=>row.map(safeCsvCell).join(';')).join('\r\n');
}
export function createGalleryOpsAdminServer({
  config, fetchFn = fetch, verifyOperator, readAsset = readFile, operations = resolveOperations,
}) {
  const authorization = verifyOperator || createAccessVerifier({config,fetchFn});
  return createServer(async (request,response)=>{
    const host = String(request.headers.host || '').split(':')[0].toLowerCase();
    if (host !== config.hostname) return json(response,403,{error:'INVALID_HOST'});
    const pathname = (request.url || '').split('?')[0];
    if (pathname === '/healthz') return json(response,200,{status:'ok',customer_data:false});
    if (!(pathname === ROOT || pathname === ROOT+'/' || pathname.startsWith(ROOT+'/'))) return json(response,404,{error:'NOT_FOUND'});
    if (request.method !== 'GET' && request.method !== 'HEAD') return json(response,405,{error:'METHOD_NOT_ALLOWED'},{Allow:'GET, HEAD'});
    const actor = await authorization(request);
    if (!actor || !actor.id) return json(response,401,LOGIN_ERROR);
    try {
      if (pathname === ROOT || pathname === ROOT+'/') {
        const html = await readAsset(join(config.dist,'index.html'));
        response.writeHead(200,headers('text/html; charset=utf-8'));
        return response.end(request.method==='HEAD'?'':html);
      }
      if (pathname.startsWith(ROOT+'/assets/')) {
        const name = pathname.slice((ROOT+'/assets/').length);
        if (!safeName.test(name)) return json(response,404,{error:'NOT_FOUND'});
        const file = await readAsset(join(config.dist,'assets',name));
        const mime = name.endsWith('.js') ? 'text/javascript' : name.endsWith('.css') ? 'text/css' : null;
        if (!mime) return json(response,404,{error:'NOT_FOUND'});
        response.writeHead(200,headers(mime+'; charset=utf-8'));
        return response.end(request.method==='HEAD'?'':file);
      }
      if (pathname === ROOT+'/api/orders') {
        const data = await operations(config,fetchFn);
        if (!data || data.items?.length !== data.total_valid) throw Error('INCONSISTENT_DATA');
        return json(response,200,data);
      }
      if (pathname === ROOT+'/api/export') {
        const data = await operations(config,fetchFn);
        if (data.items?.length !== data.total_valid) throw Error('INCONSISTENT_EXPORT');
        response.writeHead(200, {...headers('text/csv; charset=utf-8'),
          'Content-Disposition': 'attachment; filename="galerias-natal26.csv"'});
        return response.end(csv(data.items));
      }
      const m = new RegExp('^'+ROOT+'/api/orders/([0-9]{1,12})/open/(gallery|hub)$').exec(pathname);
      if (m) {
        if (!config.linksEnabled) return json(response,409,{error:'CUSTOMER_LINKS_DISABLED'});
        const all = await loadCanonicalOrders(config,fetchFn);
        const order = all.orders.find(x => x.order_id === Number(m[1]));
        if (!order) return json(response,404,{error:'ORDER_NOT_ELIGIBLE'});
        const result = await postJson(fetchFn,config.gameplayUrl+'/lookup',config.readSecret,
          {crm_order_uuid:order.order_uuid,include_links:true},8000);
        const g = result?.results?.[0];
        if (result.schema_version !== 1 || result.results.length !== 1
            || g.crm_order_uuid?.toLowerCase() !== order.order_uuid.toLowerCase()
            || g.state !== 'published_unverified') return json(response,409,{error:'GALLERY_NOT_READY'});
        const link = m[2] === 'gallery' ? g.gallery_url : g.hub_url;
        const uri = typeof link === 'string' ? new URL(link) : null;
        if (!uri || uri.origin !== MEDIA_ORIGIN || uri.search || uri.hash
            || !new RegExp('^/s/[A-Za-z0-9_-]{16,128}'+(m[2]==='gallery'?'/fotos':'')+'$').test(uri.pathname)) {
          return json(response,409,{error:'CUSTOMER_LINK_INVALID'});
        }
        response.writeHead(303,{...headers(),Location:uri.toString()});
        return response.end();
      }
      return json(response,404,{error:'NOT_FOUND'});
    } catch {
      // Deliberately omit tokens, PII and backend paths from logs or errors.
      return json(response,503,{error:'GALLERY_OPS_UPSTREAM_UNAVAILABLE'});
    }
  });
}
