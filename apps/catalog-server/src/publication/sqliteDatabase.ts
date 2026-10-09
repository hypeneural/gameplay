import { existsSync, readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

const MIGRATION_001_SQL = `-- MVP candidate migration: apply only to a NEW, empty, private SQLite DB.
CREATE TABLE IF NOT EXISTS photo_sessions (
  id TEXT PRIMARY KEY NOT NULL,
  crm_order_uuid TEXT NOT NULL UNIQUE,
  active_revision_id TEXT,
  public_token_hash TEXT NOT NULL UNIQUE,
  access_version INTEGER NOT NULL DEFAULT 1 CHECK (access_version >= 1),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'REVOKED')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (id, active_revision_id) REFERENCES photo_revisions(session_id, id)
) STRICT;

CREATE TABLE IF NOT EXISTS photo_revisions (
  id TEXT PRIMARY KEY NOT NULL,
  session_id TEXT NOT NULL,
  sequence INTEGER NOT NULL CHECK (sequence >= 1),
  request_id TEXT NOT NULL,
  manifest_sha256 TEXT NOT NULL,
  manifest_json TEXT NOT NULL CHECK (json_valid(manifest_json)),
  expected_active_revision_id TEXT,
  state TEXT NOT NULL DEFAULT 'STAGED' CHECK (state IN ('STAGED', 'ACTIVE', 'FAILED')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  activated_at TEXT,
  FOREIGN KEY (session_id) REFERENCES photo_sessions(id) ON DELETE RESTRICT,
  FOREIGN KEY (session_id, expected_active_revision_id)
    REFERENCES photo_revisions(session_id, id),
  UNIQUE (session_id, id),
  UNIQUE (session_id, sequence),
  UNIQUE (session_id, request_id)
) STRICT;

CREATE TABLE IF NOT EXISTS revision_blobs (
  blob_id TEXT PRIMARY KEY NOT NULL,
  revision_id TEXT NOT NULL REFERENCES photo_revisions(id) ON DELETE RESTRICT,
  sha256 TEXT NOT NULL CHECK (length(sha256) = 64),
  byte_length INTEGER NOT NULL CHECK (byte_length >= 1 AND byte_length <= 12582912),
  width INTEGER NOT NULL CHECK (width BETWEEN 1 AND 12000),
  height INTEGER NOT NULL CHECK (height BETWEEN 1 AND 12000),
  state TEXT NOT NULL DEFAULT 'EXPECTED' CHECK (state IN ('EXPECTED', 'READY')),
  received_at TEXT,
  CHECK ((state = 'READY' AND received_at IS NOT NULL) OR
         (state = 'EXPECTED' AND received_at IS NULL))
) STRICT;

CREATE INDEX IF NOT EXISTS idx_photo_revisions_session_state
  ON photo_revisions(session_id, state, sequence);
CREATE INDEX IF NOT EXISTS idx_revision_blobs_revision_state
  ON revision_blobs(revision_id, state);
`;

export interface SqliteOptions {
  readonly busyTimeoutMs?: number;
  readonly enableWal?: boolean;
}

/**
 * Opens a SQLite database connection with strict foreign keys, optional WAL,
 * and a configurable busy timeout.
 */
export function openSqliteDatabase(
  location: string = ':memory:',
  options: SqliteOptions = {},
): DatabaseSync {
  const db = new DatabaseSync(location);
  db.exec('PRAGMA foreign_keys = ON;');

  const busyTimeout = options.busyTimeoutMs ?? 5000;
  db.exec(`PRAGMA busy_timeout = ${busyTimeout};`);

  const isMemory = location === ':memory:' || location.startsWith('file::memory:');
  const enableWal = options.enableWal ?? !isMemory;
  if (enableWal && !isMemory) {
    db.exec('PRAGMA journal_mode = WAL;');
  }

  return db;
}

/**
 * Applies versioned migrations idempotently.
 */
export function applyMigrations(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY NOT NULL,
      applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) STRICT;
  `);

  const checkVersion = db.prepare(
    'SELECT version FROM schema_migrations WHERE version = ? LIMIT 1',
  );
  const recordVersion = db.prepare('INSERT INTO schema_migrations (version) VALUES (?)');

  const applied001 = checkVersion.get('001_mvp_photo_sessions') as { version?: string } | undefined;
  if (!applied001) {
    let sql = MIGRATION_001_SQL;
    const migrationFileUrl = new URL(
      '../../migrations/001_mvp_photo_sessions.sql',
      import.meta.url,
    );
    if (existsSync(migrationFileUrl)) {
      sql = readFileSync(migrationFileUrl, 'utf8');
    }

    db.exec(sql);
    recordVersion.run('001_mvp_photo_sessions');
  }
}
