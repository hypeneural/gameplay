import { randomUUID } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeEach, describe, expect, it } from 'vitest';
import { createCatalogServer } from '../CatalogServer.js';
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
    db.prepare(
      `
      INSERT INTO photo_revisions
        (id, session_id, sequence, request_id, manifest_sha256, manifest_json, state)
      VALUES (?, ?, 1, ?, ?, '{}', 'ACTIVE')
    `,
    ).run(revisionId, sessionId, randomUUID(), 'a'.repeat(64));
    db.prepare('UPDATE photo_sessions SET active_revision_id = ? WHERE id = ?').run(
      revisionId,
      sessionId,
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
    expect(() =>
      previewRepo.setSocialPreview(session.sessionId, {
        consent: 'granted',
        derivativeKey: '../other-customer',
        version: 'social-v1',
      }),
    ).toThrow('SOCIAL_PREVIEW_INVALID_DERIVATIVE');
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

  it('valida migrações 002_* determinísticas sobre cópia com revisões ativas, foreign_key_check, backup e restore', async () => {
    const tempDir = mkdtempSync(join(tmpdir(), 'sqlite-mig-backup-'));
    const liveDbPath = join(tempDir, 'live.sqlite');
    const backupDbPath = join(tempDir, 'backup.sqlite');
    try {
      const liveDb = openSqliteDatabase(liveDbPath);
      try {
        // 1. Simular estado pós-001 com sessão e revisão sintética ativa + blob READY
        const mig001Path = fileURLToPath(
          new URL('../../migrations/001_mvp_photo_sessions.sql', import.meta.url),
        );
        const mig001Content = readFileSync(mig001Path, 'utf8');
        liveDb.exec(mig001Content);

        const sessionId = randomUUID();
        const revA1 = randomUUID();
        const revA2 = randomUUID();
        const blobId = randomUUID();
        const tokenHash = 'f'.repeat(64);

        liveDb
          .prepare(
            `INSERT INTO photo_sessions (id, crm_order_uuid, public_token_hash, status) VALUES (?, ?, ?, 'ACTIVE')`,
          )
          .run(sessionId, randomUUID(), tokenHash);
        liveDb
          .prepare(
            `INSERT INTO photo_revisions (id, session_id, sequence, request_id, manifest_sha256, manifest_json, state, activated_at)
             VALUES (?, ?, 1, ?, ?, '{"schema":"1"}', 'ACTIVE', CURRENT_TIMESTAMP)`,
          )
          .run(revA1, sessionId, randomUUID(), '1'.repeat(64));
        liveDb
          .prepare(`UPDATE photo_sessions SET active_revision_id = ? WHERE id = ?`)
          .run(revA1, sessionId);
        liveDb
          .prepare(
            `INSERT INTO revision_blobs (blob_id, revision_id, sha256, byte_length, width, height, state, received_at)
             VALUES (?, ?, ?, 2048, 800, 600, 'READY', CURRENT_TIMESTAMP)`,
          )
          .run(blobId, revA1, '2'.repeat(64));

        // 2. Aplicar todas as migrações (incluindo 002_photo_revisions_superseded_state e 002_social_previews)
        applyMigrations(liveDb);
        // Re-execução deve ser 100% idempotente
        applyMigrations(liveDb);

        const applied = liveDb
          .prepare('SELECT version, checksum FROM schema_migrations ORDER BY rowid ASC')
          .all() as Array<{ version: string; checksum: string }>;
        expect(applied.map((r) => r.version)).toEqual([
          '001_mvp_photo_sessions',
          '002_photo_revisions_superseded_state',
          '002_social_previews',
        ]);

        // 3. Testar transição SUPERSEDED (habilitada pela 002_photo_revisions_superseded_state)
        liveDb
          .prepare(
            `INSERT INTO photo_revisions (id, session_id, sequence, request_id, manifest_sha256, manifest_json, expected_active_revision_id, state, activated_at)
             VALUES (?, ?, 2, ?, ?, '{"schema":"2"}', ?, 'ACTIVE', CURRENT_TIMESTAMP)`,
          )
          .run(revA2, sessionId, randomUUID(), '3'.repeat(64), revA1);
        liveDb.prepare(`UPDATE photo_revisions SET state = 'SUPERSEDED' WHERE id = ?`).run(revA1);
        liveDb
          .prepare(`UPDATE photo_sessions SET active_revision_id = ? WHERE id = ?`)
          .run(revA2, sessionId);

        const livePreRepo = new SqlitePreviewRepository({ db: liveDb });
        livePreRepo.setSocialPreview(sessionId, {
          consent: 'granted',
          derivativeKey: 'synthetic_cover_key_0001',
          version: 'v2',
          format: 'jpeg',
        });

        expect(liveDb.prepare('PRAGMA foreign_key_check;').all()).toEqual([]);

        // 4. Backup quente consistente via VACUUM INTO
        const escapedBackup = backupDbPath.replace(/'/g, "''");
        liveDb.exec(`VACUUM INTO '${escapedBackup}';`);
      } finally {
        liveDb.close();
      }

      // 5. Restore / verificação de integridade sobre o arquivo de backup
      const restoredDb = openSqliteDatabase(backupDbPath);
      try {
        expect(restoredDb.prepare('PRAGMA integrity_check;').get()).toEqual({
          integrity_check: 'ok',
        });
        expect(restoredDb.prepare('PRAGMA foreign_key_check;').all()).toEqual([]);
        const states = restoredDb
          .prepare('SELECT sequence, state FROM photo_revisions ORDER BY sequence ASC')
          .all();
        expect(states).toEqual([
          { sequence: 1, state: 'SUPERSEDED' },
          { sequence: 2, state: 'ACTIVE' },
        ]);
      } finally {
        restoredDb.close();
      }
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('canário CATALOG_PREVIEW_AUTHORITY=sqlite impede exposição no hub/crawler antes de ACTIVE e libera após CAS', async () => {
    const session = await sessionRepo.resolveOrCreateSession(randomUUID());
    const token = session.publicToken!;

    const server = createCatalogServer({
      publicOrigin: new URL('https://jogos.fotosdenatal.com'),
      loadApplicationShell: async () =>
        '<!doctype html><html><head><meta name="catalog-social-preview" content="backend-required" /><title>App</title></head><body><div id="root"></div></body></html>',
      previews: previewRepo,
      audit: { async record() {} },
      clock: { now: () => new Date('2026-10-11T15:00:00Z') },
      runtime: { releaseStage: 'staging-demo' },
      readiness: async () => {},
      sessionIsActive: async (candidateToken) => sessionRepo.isSessionActive(candidateToken),
    });

    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    try {
      const address = server.address();
      if (!address || typeof address === 'string') throw new Error('Failed to bind server');
      const baseUrl = `http://127.0.0.1:${address.port}`;

      // 1. Antes da revisão ACTIVE: navegador recebe 404 (não abre hub de sessão não publicada)
      const beforeBrowser = await fetch(`${baseUrl}/s/${token}`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)' },
      });
      expect(beforeBrowser.status).toBe(404);

      // 2. Antes da revisão ACTIVE: crawler WhatsApp recebe card neutro não-ativo (404)
      const beforeCrawler = await fetch(`${baseUrl}/s/${token}`, {
        headers: { 'User-Agent': 'WhatsApp/2.23.20.0 A' },
      });
      expect(beforeCrawler.status).toBe(404);

      // 3. Ativar revisão via CAS
      markSyntheticRevisionActive(session.sessionId);

      // 4. Após ACTIVE: navegador recebe 200 com applicationShell do Hub
      const afterBrowser = await fetch(`${baseUrl}/s/${token}`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)' },
      });
      expect(afterBrowser.status).toBe(200);
      expect(await afterBrowser.text()).toContain('<div id="root"></div>');

      // 5. Após ACTIVE: crawler WhatsApp recebe 200 com Open Graph V2 genérico
      const afterCrawler = await fetch(`${baseUrl}/s/${token}`, {
        headers: { 'User-Agent': 'WhatsApp/2.23.20.0 A' },
      });
      expect(afterCrawler.status).toBe(200);
      const crawlerHtml = await afterCrawler.text();
      expect(crawlerHtml).toContain('og:image');
      expect(crawlerHtml).toContain('evydencia-christmas-v2');
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});
