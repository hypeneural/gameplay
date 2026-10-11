import { randomUUID } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';
import { SqlitePreviewRepository } from './sqlitePreviewRepository.js';
import { SqliteSessionRepository } from './SessionRepository.js';
import { applyMigrations, openSqliteDatabase } from './sqliteDatabase.js';

const SERVER_SECRET = 'secret-for-tokens-123456789012345678901234';

describe('SqlitePreviewRepository: autoridade unificada SQLite para prévia social', () => {
  let db: ReturnType<typeof openSqliteDatabase>;
  let sessionRepo: SqliteSessionRepository;
  let previewRepo: SqlitePreviewRepository;

  beforeEach(() => {
    db = openSqliteDatabase(':memory:');
    applyMigrations(db);

    sessionRepo = new SqliteSessionRepository({
      db,
      serverSecret: SERVER_SECRET,
      publicBaseUrl: 'http://127.0.0.1',
    });

    previewRepo = new SqlitePreviewRepository({ db });
  });

  it('retorna undefined para token inválido ou sessão inexistente', async () => {
    expect(await previewRepo.getByPublicToken('invalid')).toBeUndefined();
    expect(await previewRepo.getByPublicToken('a'.repeat(43))).toBeUndefined();
  });

  function markSyntheticRevisionActive(sessionId: string): void {
    const revisionId = randomUUID();
    db.prepare(`
      INSERT INTO photo_revisions
        (id, session_id, sequence, request_id, manifest_sha256, manifest_json, state)
      VALUES (?, ?, 1, ?, ?, '{}', 'ACTIVE')
    `).run(revisionId, sessionId, randomUUID(), 'a'.repeat(64));
    db.prepare('UPDATE photo_sessions SET active_revision_id = ? WHERE id = ?').run(
      revisionId, sessionId,
    );
  }

  it('bloqueia prévia antes da ativação CAS e permite fallback após ACTIVE', async () => {
    const crmOrderUuid = randomUUID();
    const session = await sessionRepo.resolveOrCreateSession(crmOrderUuid);
    const token = session.publicToken!;
    expect(await previewRepo.getByPublicToken(token)).toBeUndefined();
    markSyntheticRevisionActive(session.sessionId);

    const preview = await previewRepo.getByPublicToken(token);
    expect(preview).toEqual({
      status: 'active',
      preview: {
        kind: 'generic',
        version: 'evydencia-christmas-v2',
      },
    });
  });

  it('retorna capa de cliente quando consentimento for concedido', async () => {
    const crmOrderUuid = randomUUID();
    const session = await sessionRepo.resolveOrCreateSession(crmOrderUuid);
    const token = session.publicToken!;
    markSyntheticRevisionActive(session.sessionId);

    previewRepo.setSocialPreview(session.sessionId, {
      consent: 'granted',
      derivativeKey: 'customer_cover_key_12345678',
      version: 'v1',
      format: 'jpeg',
    });

    const preview = await previewRepo.getByPublicToken(token);
    expect(preview).toEqual({
      status: 'active',
      preview: {
        kind: 'customer-photo',
        consent: 'granted',
        derivativeKey: 'customer_cover_key_12345678',
        version: 'v1',
        format: 'jpeg',
      },
    });
  });

  it('impede chave de derivada com path traversal', async () => {
    const session = await sessionRepo.resolveOrCreateSession(randomUUID());
    expect(() => previewRepo.setSocialPreview(session.sessionId, {
      consent: 'granted',
      derivativeKey: '../other-customer',
      version: 'social-v1',
    })).toThrow('SOCIAL_PREVIEW_INVALID_DERIVATIVE');
  });

  it('retorna revoked imediatamente quando a sessão for revogada no SQLite', async () => {
    const crmOrderUuid = randomUUID();
    const session = await sessionRepo.resolveOrCreateSession(crmOrderUuid);
    const token = session.publicToken!;
    markSyntheticRevisionActive(session.sessionId);

    previewRepo.setSocialPreview(session.sessionId, {
      consent: 'granted',
      derivativeKey: 'customer_cover_key_12345678',
      version: 'v1',
      format: 'jpeg',
    });

    // Revoga a sessão
    await sessionRepo.revokeSession(session.sessionId);

    // Prévia deve ser bloqueada imediatamente (não resolve mais como ativa)
    const preview = await previewRepo.getByPublicToken(token);
    expect(preview === undefined || preview?.status === 'revoked').toBe(true);
  });
});
