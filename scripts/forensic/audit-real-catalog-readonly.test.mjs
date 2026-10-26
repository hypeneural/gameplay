import { describe, expect, it } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import { auditRealCatalogDatabase } from './audit-real-catalog-readonly.mjs';

const A = '11111111-1111-4111-8111-111111111111';
const R = '22222222-2222-4222-8222-222222222222';
const B = '33333333-3333-4333-8333-333333333333';
const blobs = ['44444444-4444-4444-8444-444444444441',
  '44444444-4444-4444-8444-444444444442',
  '44444444-4444-4444-8444-444444444443'];
function dbFixture() {
  const db = new DatabaseSync(':memory:');
  db.exec(`
    CREATE TABLE photo_sessions(id TEXT, status TEXT, active_revision_id TEXT);
    CREATE TABLE photo_revisions(id TEXT,session_id TEXT,state TEXT,sequence INTEGER,manifest_json TEXT);
    CREATE TABLE revision_blobs(blob_id TEXT,revision_id TEXT,state TEXT);
  `);
  const manifest = JSON.stringify({sessionId:A,photos:[{
    variants:{thumb:{blobId:blobs[0]},card:{blobId:blobs[1]},
      game:{blobId:blobs[2]}}
  }]});
  db.prepare('INSERT INTO photo_sessions VALUES(?,?,?)').run(A,'ACTIVE',R);
  db.prepare('INSERT INTO photo_sessions VALUES(?,?,?)').run(B,'ACTIVE',null);
  db.prepare('INSERT INTO photo_revisions VALUES(?,?,?,?,?)')
    .run(R,A,'ACTIVE',1,manifest);
  for(const blob of blobs)db.prepare('INSERT INTO revision_blobs VALUES(?,?,?)')
    .run(blob,R,'READY');
  return db;
}
describe('real Gameplay SQLite metadata diagnostic (read-only contract)',()=>{
  it('only returns aggregates, never UUIDs or token links',()=>{
    const db=dbFixture();
    try{
      const r=auditRealCatalogDatabase(db);
      expect(r.sessions_total).toBe(2);
      expect(r.active_album_metadata_ready_without_token_check).toBe(1);
      expect(r.ready_active_album_photos).toBe(1);
      expect(r.sessions_no_active_revision).toBe(1);
      expect(r.token_hash_verified).toBe(false);
      expect(r.production_dataset_binding_verified).toBe(false);
      expect(JSON.stringify(r)).not.toContain(A);
      expect(JSON.stringify(r)).not.toContain(R);
    }finally{db.close()}
  });
  it('incomplete blob registration must not count as ready photos',()=>{
    const db=dbFixture();
    try{
      db.prepare('DELETE FROM revision_blobs WHERE blob_id = ?').run(blobs[2]);
      const r=auditRealCatalogDatabase(db);
      expect(r.active_album_incomplete).toBe(1);
      expect(r.ready_active_album_photos).toBe(0);
    }finally{db.close()}
  });
});
