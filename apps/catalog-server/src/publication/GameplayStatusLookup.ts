// Private, read-only status projection for MCP and EvydFlow consumers.
// This class never creates a photo session, changes a revision or publishes files.
import { timingSafeEqual } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { DatabaseSync } from 'node:sqlite';
import { parsePublicationManifestV1 } from './publicationManifest.js';
import { computeTokenHash, derivePublicToken } from './tokenSecurity.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const LIMIT = 50;
type State = 'not_found' | 'revoked' | 'not_published' | 'partial' | 'published_unverified';

export interface GameplayLookupRecord {
  readonly crm_order_uuid: string;
  readonly state: State;
  readonly session_id: string | null;
  readonly active_revision_id: string | null;
  readonly photo_count: number;
  readonly expected_blobs: number;
  readonly ready_blobs: number;
  readonly hub_url: string | null;
  readonly gallery_url: string | null;
  // Publishing an album is not proof that Phaser successfully ran in a mobile browser.
  readonly games_runtime_verified: false;
}

export interface GameplayLookupDependencies {
  readonly db: DatabaseSync;
  readonly publicOrigin: URL;
  readonly sessionSecret: string;
  readonly readSecret: string;
}

export class GameplayStatusLookup {
  private readonly db: DatabaseSync;
  private readonly origin: string;
  private readonly sessionSecret: string;
  private readonly readSecret: Buffer;

  constructor(options: GameplayLookupDependencies) {
    if (options.readSecret.length < 32) throw new Error('GAMEPLAY_READ_SECRET_TOO_SHORT');
    if (
      options.publicOrigin.protocol !== 'https:' &&
      !['localhost', '127.0.0.1'].includes(options.publicOrigin.hostname)
    ) {
      throw new Error('GAMEPLAY_PUBLIC_ORIGIN_INVALID');
    }
    this.db = options.db;
    this.origin = options.publicOrigin.origin;
    this.sessionSecret = options.sessionSecret;
    this.readSecret = Buffer.from(options.readSecret);
  }

  lookup(crmOrderUuid: string, includeLinks = false): GameplayLookupRecord {
    if (!UUID.test(crmOrderUuid)) throw new Error('INVALID_ORDER_UUID');
    const id = crmOrderUuid.toLowerCase();
    const base = (
      state: State,
      sessionId: string | null = null,
      revisionId: string | null = null,
      photoCount = 0,
      expected = 0,
      ready = 0,
      hub: string | null = null,
    ): GameplayLookupRecord => ({
      crm_order_uuid: id,
      state,
      session_id: sessionId,
      active_revision_id: revisionId,
      photo_count: photoCount,
      expected_blobs: expected,
      ready_blobs: ready,
      hub_url: hub,
      gallery_url: hub ? hub + '/fotos' : null,
      games_runtime_verified: false,
    });
    const session = this.db
      .prepare(
        `
      SELECT id, active_revision_id, access_version, public_token_hash, status
      FROM photo_sessions WHERE crm_order_uuid = ? LIMIT 1`,
      )
      .get(id) as
      | {
          id: string;
          active_revision_id: string | null;
          access_version: number;
          public_token_hash: string;
          status: 'ACTIVE' | 'REVOKED';
        }
      | undefined;
    if (!session) return base('not_found');
    if (session.status !== 'ACTIVE') return base('revoked', session.id);
    if (!session.active_revision_id) return base('not_published', session.id);
    const revision = this.db
      .prepare(
        `
      SELECT id, state, manifest_json FROM photo_revisions
      WHERE id = ? AND session_id = ? LIMIT 1`,
      )
      .get(session.active_revision_id, session.id) as
      { id: string; state: string; manifest_json: string } | undefined;
    if (!revision || revision.state !== 'ACTIVE') {
      return base('partial', session.id, session.active_revision_id);
    }
    let photoCount: number;
    let expectedBlobIds: string[];
    try {
      const parsed = parsePublicationManifestV1(JSON.parse(revision.manifest_json));
      if (parsed.sessionId !== session.id) throw new Error('SESSION_MISMATCH');
      photoCount = parsed.photos.length;
      expectedBlobIds = parsed.photos.flatMap((p) => [
        p.variants.thumb.blobId,
        p.variants.card.blobId,
        p.variants.game.blobId,
      ]);
    } catch {
      return base('partial', session.id, revision.id);
    }
    const blobs = this.db
      .prepare('SELECT blob_id, state FROM revision_blobs WHERE revision_id = ?')
      .all(revision.id) as Array<{ blob_id: string; state: string }>;
    const expected = expectedBlobIds.length;
    const ready = blobs.filter((b) => b.state === 'READY').length;
    const seen = new Set(blobs.map((b) => b.blob_id));
    if (
      seen.size !== expected ||
      blobs.length !== expected ||
      ready !== expected ||
      expectedBlobIds.some((id) => !seen.has(id))
    ) {
      return base('partial', session.id, revision.id, photoCount, expected, ready);
    }
    // Verify the stored capability even when the caller requested only
    // metadata. Otherwise batch would incorrectly claim publication valid after
    // accidental session-secret rotation while single lookup returned partial.
    const token = derivePublicToken(this.sessionSecret, session.id, session.access_version);
    if (computeTokenHash(token) !== session.public_token_hash) {
      return base('partial', session.id, revision.id, photoCount, expected, ready);
    }
    // Batch audits never materialize customer capability URLs in responses.
    if (!includeLinks) {
      return base('published_unverified', session.id, revision.id, photoCount, expected, ready);
    }
    return base(
      'published_unverified',
      session.id,
      revision.id,
      photoCount,
      expected,
      ready,
      this.origin + '/s/' + encodeURIComponent(token),
    );
  }

  async handleHttpRequest(request: IncomingMessage, response: ServerResponse): Promise<boolean> {
    const path = (request.url ?? '').split('?')[0];
    if (path !== '/internal/v1/sessions/lookup' && path !== '/internal/v1/sessions/lookup-batch')
      return false;
    const reply = (code: number, payload: object) => {
      response.statusCode = code;
      response.setHeader('Content-Type', 'application/json; charset=utf-8');
      response.setHeader('Cache-Control', 'private, no-store');
      response.setHeader('Referrer-Policy', 'no-referrer');
      response.setHeader('X-Content-Type-Options', 'nosniff');
      response.end(JSON.stringify(payload));
    };
    if (request.method !== 'POST') {
      response.setHeader('Allow', 'POST');
      reply(405, { error: 'METHOD_NOT_ALLOWED' });
      return true;
    }
    const header = request.headers.authorization ?? '';
    const offered = header.startsWith('Bearer ') ? Buffer.from(header.slice(7)) : Buffer.alloc(0);
    if (offered.length !== this.readSecret.length || !timingSafeEqual(offered, this.readSecret)) {
      reply(401, { error: 'UNAUTHORIZED' });
      return true;
    }
    try {
      const chunks: Buffer[] = [];
      let bytes = 0;
      for await (const chunk of request) {
        const b = Buffer.from(chunk as Uint8Array);
        bytes += b.length;
        if (bytes > 8192) {
          reply(413, { error: 'BODY_TOO_LARGE' });
          return true;
        }
        chunks.push(b);
      }
      let input: Record<string, unknown>;
      try {
        const parsed: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw Error();
        input = parsed as Record<string, unknown>;
      } catch {
        reply(422, { error: 'INVALID_JSON' });
        return true;
      }
      const batch = path.endsWith('lookup-batch');
      const uuids = batch ? input.crm_order_uuids : [input.crm_order_uuid];
      if (
        !Array.isArray(uuids) ||
        uuids.length === 0 ||
        uuids.length > LIMIT ||
        !uuids.every((v) => typeof v === 'string' && UUID.test(v))
      ) {
        reply(422, { error: 'INVALID_ORDER_UUIDS' });
        return true;
      }
      const unique = [...new Set((uuids as string[]).map((v) => v.toLowerCase()))];
      // Only the single-order route may return URLs. The batch route always
      // returns status/counts (even if the caller attempts include_links=true).
      const results = unique.map((v) => this.lookup(v, !batch && input.include_links === true));
      reply(200, {
        schema_version: 1,
        source: 'gameplay_catalog',
        verified_at: new Date().toISOString(),
        results,
      });
    } catch {
      reply(503, { error: 'LOOKUP_UNAVAILABLE' });
    }
    return true;
  }
}
