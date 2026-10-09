import { readFile } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it } from 'vitest';

const migrationUrl = new URL('../../migrations/001_mvp_photo_sessions.sql', import.meta.url);
const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';
const A1 = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const A2 = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const B1 = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

async function makeDatabase() {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys=ON;');
  db.exec(await readFile(migrationUrl, 'utf8'));
  return db;
}

describe('MVP candidate SQLite migration (not deployed)', () => {
  it('creates exactly the 3 required tables and foreign-key constraints', async () => {
    const db = await makeDatabase();
    try {
      const rows = db
        .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
        .all();
      expect(rows.map((row) => row.name)).toEqual([
        'photo_revisions',
        'photo_sessions',
        'revision_blobs',
      ]);
      expect(db.prepare('PRAGMA foreign_keys').get()).toEqual({ foreign_keys: 1 });
      expect(db.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
    } finally {
      db.close();
    }
  });

  it('enforces one session per CRM order and unique replay per session', async () => {
    const db = await makeDatabase();
    try {
      addSession(db, A, '33333333-3333-4333-8333-333333333333');
      expect(() => addSession(db, B, '33333333-3333-4333-8333-333333333333')).toThrow();
      addRevision(db, A1, A, 1);
      expect(() => addRevision(db, A2, A, 2)).toThrow();
    } finally {
      db.close();
    }
  });

  it('forbids cross-session active revision pointers and invalid blob states', async () => {
    const db = await makeDatabase();
    try {
      addSession(db, A, '33333333-3333-4333-8333-333333333333');
      addSession(db, B, '44444444-4444-4444-8444-444444444444');
      addRevision(db, A1, A, 1);
      addRevision(db, B1, B, 1);
      expect(() =>
        db.prepare('UPDATE photo_sessions SET active_revision_id=? WHERE id=?').run(B1, A),
      ).toThrow();
      db.prepare(
        'INSERT INTO revision_blobs(blob_id,revision_id,sha256,byte_length,width,height) VALUES(?,?,?,?,?,?)',
      ).run('55555555-5555-4555-8555-555555555555', A1, 'a'.repeat(64), 1234, 800, 600);
      expect(() =>
        db.prepare("UPDATE revision_blobs SET state='READY' WHERE revision_id=?").run(A1),
      ).toThrow();
      db.prepare(
        "UPDATE revision_blobs SET state='READY',received_at=CURRENT_TIMESTAMP WHERE revision_id=?",
      ).run(A1);
      expect(db.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
    } finally {
      db.close();
    }
  });

  it('preserves A1 on failed/incomplete A2 and checks CAS before A2 activation', async () => {
    const db = await makeDatabase();
    try {
      addSession(db, A, '33333333-3333-4333-8333-333333333333');
      addRevision(db, A1, A, 1);
      db.prepare(
        "UPDATE photo_revisions SET state='ACTIVE', activated_at=CURRENT_TIMESTAMP WHERE id=?",
      ).run(A1);
      db.prepare('UPDATE photo_sessions SET active_revision_id=? WHERE id=?').run(A1, A);
      db.prepare(
        'INSERT INTO photo_revisions(id,session_id,sequence,request_id,manifest_sha256,manifest_json,expected_active_revision_id) VALUES(?,?,?,?,?,?,?)',
      ).run(A2, A, 2, '66666666-6666-4666-8666-666666666666', 'b'.repeat(64), '{}', A1);
      expect(
        db.prepare('SELECT active_revision_id AS id FROM photo_sessions WHERE id=?').get(A),
      ).toEqual({ id: A1 });
      const stale = db
        .prepare(
          'UPDATE photo_sessions SET active_revision_id=? WHERE id=? AND active_revision_id IS NULL',
        )
        .run(A2, A);
      expect(stale.changes).toBe(0);
      const cas = db
        .prepare(
          'UPDATE photo_sessions SET active_revision_id=? WHERE id=? AND active_revision_id=?',
        )
        .run(A2, A, A1);
      expect(cas.changes).toBe(1);
      expect(db.prepare('PRAGMA foreign_key_check').all()).toEqual([]);
    } finally {
      db.close();
    }
  });
});

function addSession(db: DatabaseSync, id: string, crmOrderUuid: string) {
  db.prepare('INSERT INTO photo_sessions(id,crm_order_uuid,public_token_hash) VALUES(?,?,?)').run(
    id,
    crmOrderUuid,
    id,
  );
}

function addRevision(db: DatabaseSync, id: string, sessionId: string, sequence: number) {
  db.prepare(
    'INSERT INTO photo_revisions(id,session_id,sequence,request_id,manifest_sha256,manifest_json) VALUES(?,?,?,?,?,?)',
  ).run(id, sessionId, sequence, '77777777-7777-4777-8777-777777777777', 'a'.repeat(64), '{}');
}
