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

  it('retorna fallback genérico V2 para sessão ativa sem capa personalizada', async () => {
    const crmOrderUuid = randomUUID();
    const session = await sessionRepo.resolveOrCreateSession(crmOrderUuid);
    const token = session.publicToken!;

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

  it('retorna revoked imediatamente quando a sessão for revogada no SQLite', async () => {
    const crmOrderUuid = randomUUID();
    const session = await sessionRepo.resolveOrCreateSession(crmOrderUuid);
    const token = session.publicToken!;

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
