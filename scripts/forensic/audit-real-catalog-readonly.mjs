#!/usr/bin/env node
// For an explicitly authorized Linux host WITH the actual Gameplay database.
// A read-only SQLite connection, SELECT queries only; no publisher secret,
// CRM customer data, capability links, photos or database changes.
import { DatabaseSync } from 'node:sqlite';
import { realpathSync, statSync } from 'node:fs';
import { relative, isAbsolute } from 'node:path';

function assertAllowedPath(env) {
  if (env.CATALOG_REAL_DB_AUDIT_AUTHORIZED !== '1') {
    throw Error('AUDIT_NOT_AUTHORIZED');
  }
  const path = env.CATALOG_DATABASE_PATH;
  const directory = env.CATALOG_REAL_DB_ALLOWED_DIR;
  if (!path || !directory || !isAbsolute(path) || !isAbsolute(directory)) {
    throw Error('APPROVED_DB_PATH_REQUIRED');
  }
  const dbPath = realpathSync(path);
  const root = realpathSync(directory);
  const offset = relative(root, dbPath);
  if (!offset || offset === '..' || offset.startsWith('../') ||
      offset.startsWith('..\\') || isAbsolute(offset) ||
      !statSync(dbPath).isFile()) {
    throw Error('DB_OUTSIDE_APPROVED_DIRECTORY');
  }
  return dbPath;
}
function manifestPhotoIds(json, sessionId) {
  try {
    const m = JSON.parse(json);
    if (m.sessionId !== sessionId ||
        !Array.isArray(m.photos) || m.photos.length < 1 || m.photos.length > 200) {
      return null;
    }
    const ids = m.photos.flatMap(p => [
      p.variants?.thumb?.blobId,
      p.variants?.card?.blobId,
      p.variants?.game?.blobId,
    ]);
    if (ids.some(v => typeof v !== 'string') ||
        new Set(ids).size !== ids.length) return null;
    return { photos: m.photos.length, ids };
  } catch {
    return null;
  }
}
/** Returns only aggregate counts; session IDs never leave this function. */
export function auditRealCatalogDatabase(db, { maxSessions = 5000 } = {}) {
  if (!Number.isSafeInteger(maxSessions) || maxSessions < 1 || maxSessions > 5000) {
    throw Error('INVALID_POPULATION_LIMIT');
  }
  const sessions = db.prepare(
    'SELECT id, status, active_revision_id FROM photo_sessions ORDER BY id',
  ).all();
  if (sessions.length > maxSessions) throw Error('CATALOG_POPULATION_LIMIT');
  const getActive = db.prepare(
    'SELECT id, state, manifest_json FROM photo_revisions WHERE id = ? AND session_id = ?',
  );
  const getStaged = db.prepare(
    "SELECT id, manifest_json FROM photo_revisions WHERE session_id = ? AND state = 'STAGED' ORDER BY sequence DESC LIMIT 1",
  );
  const getBlobs = db.prepare(
    'SELECT blob_id, state FROM revision_blobs WHERE revision_id = ?',
  );
  const counts = {
    sessions_total: sessions.length,
    sessions_revoked: 0,
    sessions_no_active_revision: 0,
    active_album_metadata_ready_without_token_check: 0,
    active_album_incomplete: 0,
    active_album_declared_photos: 0,
    ready_active_album_photos: 0,
    staged_revisions_latest: 0,
    staged_manifest_photos: 0,
    staged_manifest_invalid: 0,
  };
  for (const session of sessions) {
    if (session.status === 'REVOKED') {
      counts.sessions_revoked++;
      continue;
    }
    const staged = getStaged.get(session.id);
    if (staged) {
      counts.staged_revisions_latest++;
      const m = manifestPhotoIds(staged.manifest_json, session.id);
      if (m) counts.staged_manifest_photos += m.photos;
      else counts.staged_manifest_invalid++;
    }
    if (!session.active_revision_id) {
      counts.sessions_no_active_revision++;
      continue;
    }
    const revision = getActive.get(session.active_revision_id, session.id);
    const m = revision ? manifestPhotoIds(revision.manifest_json, session.id) : null;
    if (m) counts.active_album_declared_photos += m.photos;
    const blobs = revision ? getBlobs.all(revision.id) : [];
    const actual = new Map(blobs.map(x => [x.blob_id, x.state]));
    if (revision?.state === 'ACTIVE' && m &&
        blobs.length === m.ids.length &&
        actual.size === m.ids.length &&
        m.ids.every(id => actual.get(id) === 'READY')) {
      counts.active_album_metadata_ready_without_token_check++;
      counts.ready_active_album_photos += m.photos;
    } else {
      counts.active_album_incomplete++;
    }
  }
  return {
    audit_schema_version: 1,
    scope: 'catalog_database_only_not_crm_join',
    db_opened_read_only: true,
    customer_identity_exported: false,
    media_bytes_verified: false,
    token_hash_verified: false,
    browser_games_verified: false,
    production_dataset_binding_verified: false,
    ...counts,
  };
}
export function runAuditRealCatalog({ env = process.env } = {}) {
  const path = assertAllowedPath(env);
  const db = new DatabaseSync(path, { readOnly: true, timeout: 1000 });
  try {
    db.exec('PRAGMA query_only = ON');
    return auditRealCatalogDatabase(db);
  } finally {
    db.close();
  }
}
if (process.argv[1] && process.argv[1].endsWith('audit-real-catalog-readonly.mjs')) {
  try {
    if (process.argv.length !== 2) throw Error('NO_CLI_ARGUMENTS_ALLOWED');
    console.log(JSON.stringify(runAuditRealCatalog(), null, 2));
  } catch {
    console.error('CATALOG_READONLY_AUDIT_UNAVAILABLE');
    process.exitCode = 1;
  }
}
