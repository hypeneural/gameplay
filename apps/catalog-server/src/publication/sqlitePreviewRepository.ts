import type { DatabaseSync } from 'node:sqlite';
import { genericPreviewVersion } from '../socialPreview.js';
import type { SocialPreviewRecord, SocialPreviewRepository } from '../socialPreview.js';
import { computeTokenHash, isValidTokenFormat } from './tokenSecurity.js';

export interface SqlitePreviewRepositoryOptions {
  readonly db: DatabaseSync;
}

export class SqlitePreviewRepository implements SocialPreviewRepository {
  private readonly db: DatabaseSync;

  constructor(options: SqlitePreviewRepositoryOptions) {
    this.db = options.db;
  }

  async getByPublicToken(token: string): Promise<SocialPreviewRecord | undefined> {
    if (!isValidTokenFormat(token)) {
      return undefined;
    }

    const tokenHash = computeTokenHash(token);
    const selectQuery = this.db.prepare(`
      SELECT 
        s.id,
        s.status,
        sp.consent,
        sp.derivative_key,
        sp.version,
        sp.format
      FROM photo_sessions s
      LEFT JOIN session_social_previews sp ON sp.session_id = s.id
      WHERE s.public_token_hash = ?
      LIMIT 1
    `);

    const row = selectQuery.get(tokenHash) as
      | {
          id: string;
          status: 'ACTIVE' | 'REVOKED';
          consent: 'granted' | 'revoked' | null;
          derivative_key: string | null;
          version: string | null;
          format: 'jpeg' | 'webp' | null;
        }
      | undefined;

    if (!row) {
      return undefined;
    }

    if (row.status === 'REVOKED') {
      return { status: 'revoked' };
    }

    if (row.consent === 'granted' && row.derivative_key && row.version) {
      return {
        status: 'active',
        preview: {
          kind: 'customer-photo',
          consent: 'granted',
          derivativeKey: row.derivative_key,
          version: row.version,
          format: row.format ?? 'jpeg',
        },
      };
    }

    // Generic V2 default fallback for active session without custom private cover
    return {
      status: 'active',
      preview: {
        kind: 'generic',
        version: genericPreviewVersion,
      },
    };
  }

  setSocialPreview(
    sessionId: string,
    preview: {
      readonly consent: 'granted' | 'revoked';
      readonly derivativeKey: string;
      readonly version: string;
      readonly format?: 'jpeg' | 'webp';
    },
  ): void {
    const upsertQuery = this.db.prepare(`
      INSERT INTO session_social_previews (session_id, consent, derivative_key, version, format, updated_at)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(session_id) DO UPDATE SET
        consent = excluded.consent,
        derivative_key = excluded.derivative_key,
        version = excluded.version,
        format = excluded.format,
        updated_at = CURRENT_TIMESTAMP
    `);

    upsertQuery.run(
      sessionId,
      preview.consent,
      preview.derivativeKey,
      preview.version,
      preview.format ?? 'jpeg',
    );
  }
}
