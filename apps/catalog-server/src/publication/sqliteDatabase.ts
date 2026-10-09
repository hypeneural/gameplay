import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

export interface SqliteOptions {
  readonly busyTimeoutMs?: number;
  readonly enableWal?: boolean;
}

/**
 * Validates that busyTimeoutMs is a safe finite integer in a sane range (100ms to 60000ms).
 */
function validateBusyTimeout(timeout: unknown): number {
  if (timeout === undefined) return 5000;
  if (
    typeof timeout !== 'number' ||
    !Number.isSafeInteger(timeout) ||
    timeout < 100 ||
    timeout > 60000
  ) {
    throw new Error('invalid_busy_timeout');
  }
  return timeout;
}

/**
 * Opens a SQLite database connection with strict foreign keys, validated WAL,
 * and a verified busy timeout.
 */
export function openSqliteDatabase(
  location: string = ':memory:',
  options: SqliteOptions = {},
): DatabaseSync {
  const db = new DatabaseSync(location);

  db.exec('PRAGMA foreign_keys = ON;');
  const fkRow = db.prepare('PRAGMA foreign_keys;').get() as { foreign_keys?: number } | undefined;
  if (!fkRow || fkRow.foreign_keys !== 1) {
    db.close();
    throw new Error('foreign_keys_not_enabled');
  }

  const busyTimeout = validateBusyTimeout(options.busyTimeoutMs);
  db.exec(`PRAGMA busy_timeout = ${busyTimeout};`);

  const isMemory = location === ':memory:' || location.startsWith('file::memory:');
  const enableWal = options.enableWal ?? !isMemory;

  if (enableWal && !isMemory) {
    const walRow = db.prepare('PRAGMA journal_mode = WAL;').get() as
      { journal_mode?: string } | undefined;
    const mode = walRow?.journal_mode?.toLowerCase();
    if (mode !== 'wal') {
      db.close();
      throw new Error(`wal_mode_failed: received ${mode}`);
    }
  }

  return db;
}

/**
 * Resolves the directory containing .sql migration files without silent fallbacks.
 */
function resolveMigrationsDirectory(customDir?: string): string {
  if (customDir) {
    if (!existsSync(customDir)) {
      throw new Error(`migrations_directory_not_found: ${customDir}`);
    }
    return customDir;
  }

  const candidateUrls = [
    new URL('../../migrations', import.meta.url),
    new URL('../migrations', import.meta.url),
    new URL('./migrations', import.meta.url),
  ];

  for (const url of candidateUrls) {
    const candidatePath = fileURLToPath(url);
    if (existsSync(candidatePath)) {
      return candidatePath;
    }
  }

  throw new Error('migrations_directory_not_found');
}

interface AppliedMigration {
  readonly version: string;
  readonly checksum: string;
  readonly applied_at: string;
}

/**
 * Applies versioned migrations atomically and verifies SHA-256 checksums.
 * Each migration runs within its own IMMEDIATE transaction with rollback on failure.
 */
export function applyMigrations(db: DatabaseSync, customMigrationsDir?: string): void {
  const migrationsDir = resolveMigrationsDirectory(customMigrationsDir);

  const fileEntries = readdirSync(migrationsDir, { withFileTypes: true });
  const migrationFiles = fileEntries
    .filter((entry) => entry.isFile() && /^\d+_[a-zA-Z0-9_-]+\.sql$/.test(entry.name))
    .map((entry) => entry.name)
    .sort((a, b) => {
      const numA = parseInt(a.split('_')[0] ?? '0', 10);
      const numB = parseInt(b.split('_')[0] ?? '0', 10);
      return numA - numB;
    });

  if (migrationFiles.length === 0) {
    throw new Error(`no_migration_files_found: ${migrationsDir}`);
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY NOT NULL,
      checksum TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) STRICT;
  `);

  const selectVersion = db.prepare(
    'SELECT version, checksum, applied_at FROM schema_migrations WHERE version = ? LIMIT 1',
  );
  const insertVersion = db.prepare(
    'INSERT INTO schema_migrations (version, checksum) VALUES (?, ?)',
  );

  for (const filename of migrationFiles) {
    const version = filename.replace(/\.sql$/, '');
    const fullPath = join(migrationsDir, filename);
    const content = readFileSync(fullPath, 'utf8');
    const checksum = createHash('sha256').update(content).digest('hex');

    const existing = selectVersion.get(version) as AppliedMigration | undefined;
    if (existing) {
      if (existing.checksum !== checksum) {
        throw new Error(
          `migration_checksum_mismatch: ${version} (expected ${existing.checksum}, got ${checksum})`,
        );
      }
      continue;
    }

    db.exec('PRAGMA foreign_keys = OFF;');
    db.exec('BEGIN IMMEDIATE;');
    try {
      db.exec(content);

      const fkViolations = db.prepare('PRAGMA foreign_key_check;').all();
      if (fkViolations.length > 0) {
        throw new Error(`foreign_key_violation_after_migration: ${version}`);
      }

      insertVersion.run(version, checksum);
      db.exec('COMMIT;');
    } catch (error) {
      try {
        db.exec('ROLLBACK;');
      } catch {
        // preserve original error
      }
      throw error;
    } finally {
      db.exec('PRAGMA foreign_keys = ON;');
    }
  }
}
