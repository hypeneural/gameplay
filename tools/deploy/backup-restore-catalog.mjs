import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { cp, mkdir, readdir, readFile, rm, stat, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

/**
 * Creates an atomic, crash-consistent backup of the catalog SQLite database
 * (including active WAL pages via VACUUM INTO) and associated physical blobs.
 */
export async function backupCatalog({ dbPath, storageDir, backupDir }) {
  if (!existsSync(dbPath)) {
    throw new Error(`DATABASE_NOT_FOUND: ${dbPath}`);
  }

  await mkdir(backupDir, { recursive: true });
  const backupDbPath = join(backupDir, 'catalog.sqlite');

  // Remove previous backup db if present
  if (existsSync(backupDbPath)) {
    await unlink(backupDbPath);
  }

  // 1. Consistent SQLite snapshot via VACUUM INTO
  const sourceDb = new DatabaseSync(dbPath);
  try {
    const escaped = backupDbPath.replace(/'/g, "''");
    sourceDb.exec(`VACUUM INTO '${escaped}';`);
  } finally {
    sourceDb.close();
  }

  // 2. Compute SHA256 of the backup database
  const dbBytes = await readFile(backupDbPath);
  const dbSha256 = createHash('sha256').update(dbBytes).digest('hex');

  // 3. Backup physical storage/blobs directory if exists
  const backupStorageDir = join(backupDir, 'storage');
  let blobsCount = 0;
  let storageBytes = 0;

  if (storageDir && existsSync(storageDir)) {
    await cp(storageDir, backupStorageDir, { recursive: true });

    const countStats = async (dir) => {
      const entries = await readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
          await countStats(full);
        } else if (entry.isFile() && entry.name.endsWith('.webp')) {
          blobsCount++;
          const s = await stat(full);
          storageBytes += s.size;
        }
      }
    };
    await countStats(backupStorageDir);
  }

  // 4. Verify integrity of the backup database
  const verifyDb = new DatabaseSync(backupDbPath, { readOnly: true });
  let integrity;
  try {
    integrity = verifyDb.prepare('PRAGMA integrity_check;').all();
  } finally {
    verifyDb.close();
  }
  const isOk = integrity.length === 1 && integrity[0]?.integrity_check === 'ok';
  if (!isOk) {
    throw new Error('BACKUP_INTEGRITY_CHECK_FAILED');
  }

  const metadata = {
    version: 1,
    createdAt: new Date().toISOString(),
    dbSha256,
    dbSizeBytes: dbBytes.byteLength,
    blobsCount,
    storageSizeBytes: storageBytes,
    integrityOk: true,
  };

  await writeFile(
    join(backupDir, 'backup-metadata.json'),
    JSON.stringify(metadata, null, 2),
    'utf8',
  );

  return metadata;
}

/**
 * Restores a catalog SQLite database and physical blobs from an existing backup snapshot,
 * cleaning any uncommitted WAL/SHM artifacts and verifying cryptographic and DB integrity.
 */
export async function restoreCatalog({ backupDir, targetDbPath, targetStorageDir }) {
  const metadataPath = join(backupDir, 'backup-metadata.json');
  if (!existsSync(metadataPath)) {
    throw new Error(`BACKUP_METADATA_MISSING: ${metadataPath}`);
  }

  const metadata = JSON.parse(await readFile(metadataPath, 'utf8'));
  const backupDbPath = join(backupDir, 'catalog.sqlite');
  if (!existsSync(backupDbPath)) {
    throw new Error(`BACKUP_DATABASE_MISSING: ${backupDbPath}`);
  }

  // Verify backup db checksum
  const dbBytes = await readFile(backupDbPath);
  const calculatedSha = createHash('sha256').update(dbBytes).digest('hex');
  if (calculatedSha !== metadata.dbSha256) {
    throw new Error('BACKUP_CHECKSUM_MISMATCH');
  }

  // 1. Clean existing WAL, SHM and target DB before restore
  await unlink(targetDbPath).catch(() => undefined);
  await unlink(`${targetDbPath}-wal`).catch(() => undefined);
  await unlink(`${targetDbPath}-shm`).catch(() => undefined);

  // 2. Copy clean database
  await cp(backupDbPath, targetDbPath);

  // 3. Restore storage directory if present
  const backupStorageDir = join(backupDir, 'storage');
  if (targetStorageDir && existsSync(backupStorageDir)) {
    await rm(targetStorageDir, { recursive: true, force: true });
    await cp(backupStorageDir, targetStorageDir, { recursive: true });
  }

  // 4. Run PRAGMA integrity_check on restored database
  const restoredDb = new DatabaseSync(targetDbPath);
  let integrity;
  try {
    integrity = restoredDb.prepare('PRAGMA integrity_check;').all();
  } finally {
    restoredDb.close();
  }
  const isOk = integrity.length === 1 && integrity[0]?.integrity_check === 'ok';
  if (!isOk) {
    throw new Error('RESTORE_INTEGRITY_CHECK_FAILED');
  }

  return {
    status: 'RESTORED',
    restoredAt: new Date().toISOString(),
    dbSha256: calculatedSha,
    blobsCount: metadata.blobsCount,
  };
}
