-- Migration 002: Add 'SUPERSEDED' state to photo_revisions table CHECK constraint.
-- Safe table recreation in SQLite to update CHECK constraint without data loss.

CREATE TABLE IF NOT EXISTS photo_revisions_new (
  id TEXT PRIMARY KEY NOT NULL,
  session_id TEXT NOT NULL,
  sequence INTEGER NOT NULL CHECK (sequence >= 1),
  request_id TEXT NOT NULL,
  manifest_sha256 TEXT NOT NULL,
  manifest_json TEXT NOT NULL CHECK (json_valid(manifest_json)),
  expected_active_revision_id TEXT,
  state TEXT NOT NULL DEFAULT 'STAGED' CHECK (state IN ('STAGED', 'ACTIVE', 'SUPERSEDED', 'FAILED')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  activated_at TEXT,
  FOREIGN KEY (session_id) REFERENCES photo_sessions(id) ON DELETE RESTRICT,
  FOREIGN KEY (session_id, expected_active_revision_id)
    REFERENCES photo_revisions(session_id, id),
  UNIQUE (session_id, id),
  UNIQUE (session_id, sequence),
  UNIQUE (session_id, request_id)
) STRICT;

INSERT INTO photo_revisions_new SELECT * FROM photo_revisions;

DROP TABLE photo_revisions;

ALTER TABLE photo_revisions_new RENAME TO photo_revisions;

CREATE INDEX IF NOT EXISTS idx_photo_revisions_session_state
  ON photo_revisions(session_id, state, sequence);
