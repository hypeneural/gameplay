-- MVP candidate migration: apply only to a NEW, empty, private SQLite DB.
-- Not executed on Contabo by this PR. PRAGMA foreign_keys=ON is REQUIRED per connection.
-- WAL + busy_timeout are connection configuration, not a migration side effect.
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
