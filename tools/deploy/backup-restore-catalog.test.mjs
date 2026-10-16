import { Buffer } from 'node:buffer';
import { mkdtemp, readFile, rm, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it } from 'vitest';
import { backupCatalog, restoreCatalog } from './backup-restore-catalog.mjs';

describe('backup-restore-catalog', () => {
  it('creates crash-consistent backup of SQLite WAL and blobs and restores cleanly', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'backup-test-'));

    try {
      const dbPath = join(tempDir, 'catalog.sqlite');
      const storageDir = join(tempDir, 'storage');
      const backupDir = join(tempDir, 'backup');
      const restoreDbPath = join(tempDir, 'restored.sqlite');
      const restoreStorageDir = join(tempDir, 'restored-storage');

      await mkdir(storageDir, { recursive: true });

      // 1. Initialize SQLite in WAL mode with test data
      const db = new DatabaseSync(dbPath);
      db.exec('PRAGMA journal_mode = WAL;');
      db.exec(`
        CREATE TABLE photo_sessions (
          id TEXT PRIMARY KEY,
          crm_order_uuid TEXT NOT NULL UNIQUE,
          public_token_hash TEXT NOT NULL,
          status TEXT NOT NULL
        );
      `);
      db.exec(`
        INSERT INTO photo_sessions (id, crm_order_uuid, public_token_hash, status)
        VALUES ('session-1', '00000000-0000-4000-8000-000000000001', 'token-hash-1', 'ACTIVE');
      `);
      db.close();

      // 2. Put blobs in storage
      const revBlobsDir = join(storageDir, 'blobs', 'rev-1');
      await mkdir(revBlobsDir, { recursive: true });
      await writeFile(join(revBlobsDir, 'blob-1.webp'), Buffer.from('RIFF....WEBPBLOB1'));
      await writeFile(join(revBlobsDir, 'blob-2.webp'), Buffer.from('RIFF....WEBPBLOB2'));

      // 3. Perform backup
      const backupMeta = await backupCatalog({ dbPath, storageDir, backupDir });

      expect(backupMeta.integrityOk).toBe(true);
      expect(backupMeta.blobsCount).toBe(2);
      expect(backupMeta.dbSha256).toMatch(/^[0-9a-f]{64}$/);

      // Verify metadata file
      const savedMeta = JSON.parse(await readFile(join(backupDir, 'backup-metadata.json'), 'utf8'));
      expect(savedMeta.dbSha256).toBe(backupMeta.dbSha256);

      // 4. Restore to new targets
      const restoreResult = await restoreCatalog({
        backupDir,
        targetDbPath: restoreDbPath,
        targetStorageDir: restoreStorageDir,
      });

      expect(restoreResult.status).toBe('RESTORED');
      expect(restoreResult.blobsCount).toBe(2);

      // 5. Verify restored database has identical records
      const restoredDb = new DatabaseSync(restoreDbPath, { readOnly: true });
      const row = restoredDb.prepare('SELECT * FROM photo_sessions WHERE id = ?').get('session-1');
      expect(row).toEqual({
        id: 'session-1',
        crm_order_uuid: '00000000-0000-4000-8000-000000000001',
        public_token_hash: 'token-hash-1',
        status: 'ACTIVE',
      });
      restoredDb.close();

      // 6. Verify restored blobs exist
      const restoredBlob1 = await readFile(
        join(restoreStorageDir, 'blobs', 'rev-1', 'blob-1.webp'),
      );
      expect(restoredBlob1.toString()).toBe('RIFF....WEBPBLOB1');
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('rejects restore if backup checksum is corrupted', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'backup-corrupt-test-'));

    try {
      const dbPath = join(tempDir, 'catalog.sqlite');
      const backupDir = join(tempDir, 'backup');

      const db = new DatabaseSync(dbPath);
      db.exec('CREATE TABLE test (id INT); INSERT INTO test VALUES (1);');
      db.close();

      await backupCatalog({ dbPath, backupDir });

      // Corrupt the backup database file
      await writeFile(join(backupDir, 'catalog.sqlite'), Buffer.from('CORRUPTED BYTES'));

      await expect(
        restoreCatalog({
          backupDir,
          targetDbPath: join(tempDir, 'restored.sqlite'),
        }),
      ).rejects.toThrow('BACKUP_CHECKSUM_MISMATCH');
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });
});
