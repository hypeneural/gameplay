import { createHash, randomUUID } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';
import { parsePublicationManifestV1 } from './publicationManifest.js';
import type { PublicationManifestV1 } from './publicationManifest.js';
import { computeTokenHash, derivePublicToken, isValidTokenFormat } from './tokenSecurity.js';

export type PublicationErrorCode =
  | 'INVALID_MANIFEST'
  | 'INVALID_MEDIA'
  | 'PUBLISHER_UNAUTHORIZED'
  | 'SESSION_NOT_FOUND'
  | 'REVISION_NOT_FOUND'
  | 'STALE_REVISION'
  | 'IDEMPOTENCY_CONFLICT'
  | 'UPLOAD_INCOMPLETE'
  | 'QUOTA_EXCEEDED'
  | 'RATE_LIMITED'
  | 'INTERNAL_ERROR';

export class PublicationDomainError extends Error {
  constructor(
    public readonly code: PublicationErrorCode,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'PublicationDomainError';
  }
}

export interface ResolvedSession {
  readonly sessionId: string;
  readonly activeRevisionId: string | null;
  readonly status: 'ACTIVE' | 'REVOKED';
  readonly publicToken?: string | undefined;
}

export interface PublicationState {
  readonly revisionId: string;
  readonly sessionId: string;
  readonly state: 'STAGED' | 'ACTIVE' | 'FAILED';
  readonly expectedBlobs: number;
  readonly readyBlobs: number;
  readonly pendingBlobIds: readonly string[];
}

export interface VerifiedBlobInput {
  readonly sha256: string;
  readonly byteLength: number;
  readonly width: number;
  readonly height: number;
}

export interface RecordBlobResult {
  readonly blobId: string;
  readonly revisionId: string;
  readonly state: 'READY';
}

export interface ActivationReceipt {
  readonly sessionId: string;
  readonly revisionId: string;
  readonly state: 'ACTIVE';
  readonly photoCount: number;
  readonly accessUrl: string;
}

interface GalleryPhotoVariantLinks {
  readonly thumb: string;
  readonly card: string;
  readonly game: string;
}

interface GalleryPhoto {
  readonly id: string;
  readonly width: number;
  readonly height: number;
  readonly aspectRatio: number;
  readonly orientation: 'portrait' | 'landscape' | 'square';
  readonly variants: GalleryPhotoVariantLinks;
}

export interface GallerySession {
  readonly id: string;
  readonly publicToken: string;
  readonly displayName: string;
  readonly photos: readonly GalleryPhoto[];
}

export interface SessionRepositoryDependencies {
  readonly db: DatabaseSync;
  readonly serverSecret: string;
  readonly publicBaseUrl?: string;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface SessionRepository {
  resolveOrCreateSession(crmOrderUuid: string): Promise<ResolvedSession>;
  beginPublication(
    manifest: PublicationManifestV1,
    manifestRawJson: string,
  ): Promise<PublicationState>;
  recordVerifiedBlob(
    revisionId: string,
    blobId: string,
    verified: VerifiedBlobInput,
  ): Promise<RecordBlobResult>;
  getPublicationStatus(revisionId: string): Promise<PublicationState>;
  activatePublication(
    revisionId: string,
    expectedActiveRevisionId: string | null,
    publicBaseUrl?: string,
  ): Promise<ActivationReceipt>;
  getActiveSession(token: string): Promise<GallerySession | null>;
  revokeSession(sessionId: string): Promise<void>;
}

export class SqliteSessionRepository implements SessionRepository {
  private readonly db: DatabaseSync;
  private readonly serverSecret: string;
  private readonly defaultPublicBaseUrl: string;

  constructor(dependencies: SessionRepositoryDependencies) {
    this.db = dependencies.db;
    this.serverSecret = dependencies.serverSecret;
    this.defaultPublicBaseUrl = (
      dependencies.publicBaseUrl ?? 'https://jogos.fotosdenatal.com'
    ).replace(/\/+$/, '');
  }

  async resolveOrCreateSession(crmOrderUuid: string): Promise<ResolvedSession> {
    if (!UUID_PATTERN.test(crmOrderUuid)) {
      throw new PublicationDomainError('INVALID_MANIFEST', 'crmOrderUuid must be a valid UUID');
    }

    const selectSession = this.db.prepare(
      'SELECT id, crm_order_uuid, active_revision_id, access_version, status FROM photo_sessions WHERE crm_order_uuid = ? LIMIT 1',
    );

    const existing = selectSession.get(crmOrderUuid) as
      | {
          id: string;
          crm_order_uuid: string;
          active_revision_id: string | null;
          access_version: number;
          status: 'ACTIVE' | 'REVOKED';
        }
      | undefined;

    if (existing) {
      const publicToken =
        existing.status === 'ACTIVE'
          ? derivePublicToken(this.serverSecret, existing.id, existing.access_version)
          : undefined;

      return {
        sessionId: existing.id,
        activeRevisionId: existing.active_revision_id,
        status: existing.status,
        publicToken,
      };
    }

    const sessionId = randomUUID();
    const accessVersion = 1;
    const publicToken = derivePublicToken(this.serverSecret, sessionId, accessVersion);
    const tokenHash = computeTokenHash(publicToken);

    const insertSession = this.db.prepare(
      `INSERT INTO photo_sessions (
        id, crm_order_uuid, active_revision_id, public_token_hash, access_version, status
      ) VALUES (?, ?, NULL, ?, ?, 'ACTIVE')`,
    );

    try {
      insertSession.run(sessionId, crmOrderUuid, tokenHash, accessVersion);
    } catch {
      // Re-query if concurrent insertion succeeded
      const raced = selectSession.get(crmOrderUuid) as
        | {
            id: string;
            active_revision_id: string | null;
            access_version: number;
            status: 'ACTIVE' | 'REVOKED';
          }
        | undefined;
      if (raced) {
        return {
          sessionId: raced.id,
          activeRevisionId: raced.active_revision_id,
          status: raced.status,
          publicToken: derivePublicToken(this.serverSecret, raced.id, raced.access_version),
        };
      }
      throw new PublicationDomainError('INTERNAL_ERROR', 'Failed to resolve or create session');
    }

    return {
      sessionId,
      activeRevisionId: null,
      status: 'ACTIVE',
      publicToken,
    };
  }

  async beginPublication(
    manifest: PublicationManifestV1,
    manifestRawJson: string,
  ): Promise<PublicationState> {
    const parsed = parsePublicationManifestV1(manifest);
    const manifestSha256 = createHash('sha256').update(manifestRawJson).digest('hex');

    const selectSession = this.db.prepare(
      'SELECT id, active_revision_id, status FROM photo_sessions WHERE id = ? LIMIT 1',
    );
    const session = selectSession.get(parsed.sessionId) as
      { id: string; active_revision_id: string | null; status: 'ACTIVE' | 'REVOKED' } | undefined;

    if (!session || session.status === 'REVOKED') {
      throw new PublicationDomainError('SESSION_NOT_FOUND', 'Target session not found or revoked');
    }

    // Check for idempotent replay by (sessionId, requestId)
    const selectRevisionByRequest = this.db.prepare(
      'SELECT id, manifest_sha256, state FROM photo_revisions WHERE session_id = ? AND request_id = ? LIMIT 1',
    );
    const existingRev = selectRevisionByRequest.get(parsed.sessionId, parsed.requestId) as
      { id: string; manifest_sha256: string; state: 'STAGED' | 'ACTIVE' | 'FAILED' } | undefined;

    if (existingRev) {
      if (existingRev.manifest_sha256 !== manifestSha256) {
        throw new PublicationDomainError(
          'IDEMPOTENCY_CONFLICT',
          'requestId reused with conflicting manifest content',
        );
      }
      return this.getPublicationStatus(existingRev.id);
    }

    // Validate expectedActiveRevisionId
    if (session.active_revision_id !== parsed.expectedActiveRevisionId) {
      throw new PublicationDomainError(
        'STALE_REVISION',
        `expectedActiveRevisionId does not match current session activeRevisionId (${session.active_revision_id})`,
      );
    }

    const revisionId = randomUUID();
    const selectMaxSeq = this.db.prepare(
      'SELECT COALESCE(MAX(sequence), 0) + 1 AS next_seq FROM photo_revisions WHERE session_id = ?',
    );

    const insertRevision = this.db.prepare(
      `INSERT INTO photo_revisions (
        id, session_id, sequence, request_id, manifest_sha256, manifest_json,
        expected_active_revision_id, state
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'STAGED')`,
    );

    const insertBlob = this.db.prepare(
      `INSERT INTO revision_blobs (
        blob_id, revision_id, sha256, byte_length, width, height, state, received_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'EXPECTED', NULL)`,
    );

    const pendingBlobIds: string[] = [];

    this.db.exec('BEGIN IMMEDIATE;');
    try {
      const seqRow = selectMaxSeq.get(parsed.sessionId) as { next_seq: number };
      const nextSequence = seqRow.next_seq;

      insertRevision.run(
        revisionId,
        parsed.sessionId,
        nextSequence,
        parsed.requestId,
        manifestSha256,
        manifestRawJson,
        parsed.expectedActiveRevisionId,
      );

      for (const photo of parsed.photos) {
        for (const variant of [photo.variants.thumb, photo.variants.card, photo.variants.game]) {
          insertBlob.run(
            variant.blobId,
            revisionId,
            variant.sha256,
            variant.byteLength,
            variant.width,
            variant.height,
          );
          pendingBlobIds.push(variant.blobId);
        }
      }

      this.db.exec('COMMIT;');
    } catch (error) {
      this.db.exec('ROLLBACK;');
      throw error;
    }

    return {
      revisionId,
      sessionId: parsed.sessionId,
      state: 'STAGED',
      expectedBlobs: pendingBlobIds.length,
      readyBlobs: 0,
      pendingBlobIds,
    };
  }

  async recordVerifiedBlob(
    revisionId: string,
    blobId: string,
    verified: VerifiedBlobInput,
  ): Promise<RecordBlobResult> {
    const selectBlob = this.db.prepare(
      `SELECT b.blob_id, b.revision_id, b.sha256, b.byte_length, b.width, b.height, b.state, r.state AS rev_state
       FROM revision_blobs b
       JOIN photo_revisions r ON r.id = b.revision_id
       WHERE b.blob_id = ? AND b.revision_id = ? LIMIT 1`,
    );

    const blob = selectBlob.get(blobId, revisionId) as
      | {
          blob_id: string;
          revision_id: string;
          sha256: string;
          byte_length: number;
          width: number;
          height: number;
          state: 'EXPECTED' | 'READY';
          rev_state: 'STAGED' | 'ACTIVE' | 'FAILED';
        }
      | undefined;

    if (!blob) {
      throw new PublicationDomainError('REVISION_NOT_FOUND', 'Blob or revision not found');
    }

    if (blob.rev_state === 'FAILED') {
      throw new PublicationDomainError('REVISION_NOT_FOUND', 'Revision marked as failed');
    }

    const matches =
      blob.sha256.toLowerCase() === verified.sha256.toLowerCase() &&
      blob.byte_length === verified.byteLength &&
      blob.width === verified.width &&
      blob.height === verified.height;

    if (!matches) {
      throw new PublicationDomainError(
        'INVALID_MEDIA',
        'Verified blob attributes do not match manifest expectations',
      );
    }

    if (blob.state === 'READY') {
      return { blobId, revisionId, state: 'READY' };
    }

    const updateBlob = this.db.prepare(
      `UPDATE revision_blobs SET state = 'READY', received_at = CURRENT_TIMESTAMP WHERE blob_id = ? AND revision_id = ?`,
    );
    updateBlob.run(blobId, revisionId);

    return { blobId, revisionId, state: 'READY' };
  }

  async getPublicationStatus(revisionId: string): Promise<PublicationState> {
    const selectRev = this.db.prepare(
      'SELECT id, session_id, state FROM photo_revisions WHERE id = ? LIMIT 1',
    );
    const rev = selectRev.get(revisionId) as
      { id: string; session_id: string; state: 'STAGED' | 'ACTIVE' | 'FAILED' } | undefined;

    if (!rev) {
      throw new PublicationDomainError('REVISION_NOT_FOUND', `Revision ${revisionId} not found`);
    }

    const selectBlobs = this.db.prepare(
      'SELECT blob_id, state FROM revision_blobs WHERE revision_id = ?',
    );
    const blobs = selectBlobs.all(revisionId) as Array<{
      blob_id: string;
      state: 'EXPECTED' | 'READY';
    }>;

    const pendingBlobIds: string[] = [];
    let readyBlobs = 0;

    for (const b of blobs) {
      if (b.state === 'READY') readyBlobs++;
      else pendingBlobIds.push(b.blob_id);
    }

    return {
      revisionId: rev.id,
      sessionId: rev.session_id,
      state: rev.state,
      expectedBlobs: blobs.length,
      readyBlobs,
      pendingBlobIds,
    };
  }

  async activatePublication(
    revisionId: string,
    expectedActiveRevisionId: string | null,
    publicBaseUrl?: string,
  ): Promise<ActivationReceipt> {
    const baseUrl = (publicBaseUrl ?? this.defaultPublicBaseUrl).replace(/\/+$/, '');

    this.db.exec('BEGIN IMMEDIATE;');
    try {
      const selectRev = this.db.prepare(
        'SELECT id, session_id, expected_active_revision_id, manifest_json, state FROM photo_revisions WHERE id = ? LIMIT 1',
      );
      const rev = selectRev.get(revisionId) as
        | {
            id: string;
            session_id: string;
            expected_active_revision_id: string | null;
            manifest_json: string;
            state: 'STAGED' | 'ACTIVE' | 'FAILED';
          }
        | undefined;

      if (!rev) {
        throw new PublicationDomainError('REVISION_NOT_FOUND', `Revision ${revisionId} not found`);
      }

      const selectSession = this.db.prepare(
        'SELECT id, active_revision_id, access_version, status FROM photo_sessions WHERE id = ? LIMIT 1',
      );
      const session = selectSession.get(rev.session_id) as
        | {
            id: string;
            active_revision_id: string | null;
            access_version: number;
            status: 'ACTIVE' | 'REVOKED';
          }
        | undefined;

      if (!session || session.status === 'REVOKED') {
        throw new PublicationDomainError('SESSION_NOT_FOUND', 'Session not found or revoked');
      }

      // If already active with this revision, return idempotent receipt
      if (rev.state === 'ACTIVE' && session.active_revision_id === rev.id) {
        const token = derivePublicToken(this.serverSecret, session.id, session.access_version);
        const manifest = JSON.parse(rev.manifest_json) as PublicationManifestV1;
        this.db.exec('COMMIT;');
        return {
          sessionId: session.id,
          revisionId: rev.id,
          state: 'ACTIVE',
          photoCount: manifest.photos.length,
          accessUrl: `${baseUrl}/s/${token}`,
        };
      }

      // Ensure all blobs are READY
      const selectPending = this.db.prepare(
        "SELECT blob_id FROM revision_blobs WHERE revision_id = ? AND state != 'READY'",
      );
      const pendingBlobs = selectPending.all(revisionId) as Array<{ blob_id: string }>;
      if (pendingBlobs.length > 0) {
        throw new PublicationDomainError(
          'UPLOAD_INCOMPLETE',
          'Not all blobs are ready for activation',
          { pendingBlobIds: pendingBlobs.map((p) => p.blob_id) },
        );
      }

      // CAS update on photo_sessions
      const updateSessionCas = this.db.prepare(
        `UPDATE photo_sessions
         SET active_revision_id = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ? AND (
           (active_revision_id = ? AND ? IS NOT NULL) OR
           (active_revision_id IS NULL AND ? IS NULL)
         )`,
      );

      const casResult = updateSessionCas.run(
        rev.id,
        session.id,
        expectedActiveRevisionId,
        expectedActiveRevisionId,
        expectedActiveRevisionId,
      );

      if (casResult.changes === 0) {
        throw new PublicationDomainError(
          'STALE_REVISION',
          'Compare-and-swap failed; session active revision changed concurrently',
        );
      }

      const updateRev = this.db.prepare(
        "UPDATE photo_revisions SET state = 'ACTIVE', activated_at = CURRENT_TIMESTAMP WHERE id = ?",
      );
      updateRev.run(rev.id);

      const token = derivePublicToken(this.serverSecret, session.id, session.access_version);
      const manifest = JSON.parse(rev.manifest_json) as PublicationManifestV1;

      this.db.exec('COMMIT;');
      return {
        sessionId: session.id,
        revisionId: rev.id,
        state: 'ACTIVE',
        photoCount: manifest.photos.length,
        accessUrl: `${baseUrl}/s/${token}`,
      };
    } catch (error) {
      this.db.exec('ROLLBACK;');
      throw error;
    }
  }

  async getActiveSession(token: string): Promise<GallerySession | null> {
    if (!isValidTokenFormat(token)) {
      return null;
    }

    const tokenHash = computeTokenHash(token);
    const selectSession = this.db.prepare(
      `SELECT s.id, s.active_revision_id, s.status, r.manifest_json
       FROM photo_sessions s
       LEFT JOIN photo_revisions r ON r.id = s.active_revision_id AND r.session_id = s.id
       WHERE s.public_token_hash = ? AND s.status = 'ACTIVE' LIMIT 1`,
    );

    const row = selectSession.get(tokenHash) as
      | {
          id: string;
          active_revision_id: string | null;
          status: 'ACTIVE' | 'REVOKED';
          manifest_json: string | null;
        }
      | undefined;

    if (!row || !row.active_revision_id || !row.manifest_json) {
      return null;
    }

    let manifest: PublicationManifestV1;
    try {
      manifest = JSON.parse(row.manifest_json) as PublicationManifestV1;
    } catch {
      return null;
    }

    const activeRevisionId = row.active_revision_id;
    const photos: GalleryPhoto[] = manifest.photos.map((p) => {
      const orientation =
        p.width > p.height ? 'landscape' : p.width < p.height ? 'portrait' : 'square';
      const aspectRatio = Number((p.width / p.height).toFixed(6));

      return {
        id: p.photoId,
        width: p.width,
        height: p.height,
        aspectRatio,
        orientation,
        variants: {
          thumb: `/s/${token}/media/${activeRevisionId}/${p.photoId}/thumb`,
          card: `/s/${token}/media/${activeRevisionId}/${p.photoId}/card`,
          game: `/s/${token}/media/${activeRevisionId}/${p.photoId}/game`,
        },
      };
    });

    return {
      id: row.id,
      publicToken: token,
      displayName: 'Seu Álbum de Natal',
      photos,
    };
  }

  async revokeSession(sessionId: string): Promise<void> {
    const selectSession = this.db.prepare(
      'SELECT id, access_version FROM photo_sessions WHERE id = ? LIMIT 1',
    );
    const session = selectSession.get(sessionId) as
      { id: string; access_version: number } | undefined;
    if (!session) return;

    const nextAccessVersion = session.access_version + 1;
    // Overwrite token hash with unreachable garbage hash to invalidate lookups immediately
    const invalidTokenHash = computeTokenHash(`revoked:${randomUUID()}`);

    const updateRevoked = this.db.prepare(
      `UPDATE photo_sessions
       SET access_version = ?, public_token_hash = ?, status = 'REVOKED', updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
    );
    updateRevoked.run(nextAccessVersion, invalidTokenHash, sessionId);
  }
}
