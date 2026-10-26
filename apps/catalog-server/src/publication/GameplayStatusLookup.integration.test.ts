import { describe, expect, it } from 'vitest';
import { openSqliteDatabase, applyMigrations } from './sqliteDatabase.js';
import { SqliteSessionRepository } from './SessionRepository.js';
import { GameplayStatusLookup } from './GameplayStatusLookup.js';
import type { PublicationManifestV1 } from './publicationManifest.js';

const ORDER_A='11111111-1111-4111-8111-111111111111';
const ORDER_B='22222222-2222-4222-8222-222222222222';
const SERVER_SECRET='super-secret-key-for-test-publisher-32chars!';
const READ_SECRET='r'.repeat(40);
function manifest(sessionId:string):PublicationManifestV1 {
 return {schemaVersion:1,requestId:'44444444-4444-4444-8444-444444444444',
 sessionId,expectedActiveRevisionId:null,recipeKey:'recipe-test',photos:[{
  photoId:'photo-01',contentHash:'a'.repeat(64),sortIndex:0,width:1600,height:1200,
  variants:{
   thumb:{blobId:'33333333-3333-4333-8333-333333333331',sha256:'b'.repeat(64),byteLength:45000,width:480,height:360},
   card:{blobId:'33333333-3333-4333-8333-333333333332',sha256:'c'.repeat(64),byteLength:120000,width:800,height:600},
   game:{blobId:'33333333-3333-4333-8333-333333333333',sha256:'d'.repeat(64),byteLength:350000,width:1600,height:1200}
  }
 }]};
}
describe('read-only Gameplay contract against real SQLite repository',()=>{
 it('preserves A/B identity, hides URLs in audit and returns individual links only on demand',async()=>{
  const db=openSqliteDatabase(':memory:');
  try{
   applyMigrations(db);
   const repository=new SqliteSessionRepository({db,serverSecret:SERVER_SECRET});
   const reader=new GameplayStatusLookup({db,publicOrigin:new URL('https://jogos.fotosdenatal.com'),
    sessionSecret:SERVER_SECRET,readSecret:READ_SECRET});
   expect(reader.lookup(ORDER_A).state).toBe('not_found');
   const a=await repository.resolveOrCreateSession(ORDER_A);
   expect(reader.lookup(ORDER_A).state).toBe('not_published');
   expect(reader.lookup(ORDER_B).state).toBe('not_found');
   const m=manifest(a.sessionId);
   const staged=await repository.beginPublication(m);
   expect(reader.lookup(ORDER_A).state).toBe('not_published');
   for(const v of Object.values(m.photos[0]!.variants)){
    await repository.recordVerifiedBlob({
     revisionId:staged.revisionId,blobId:v.blobId,sha256:v.sha256,
     byteLength:v.byteLength,width:v.width,height:v.height,storageConfirmed:true
    });
   }
   await repository.activatePublication(staged.revisionId,null);
   const audited=reader.lookup(ORDER_A);
   expect(audited.state).toBe('published_unverified');
   expect(audited.ready_blobs).toBe(3);
   expect(audited.hub_url).toBeNull();
   const individual=reader.lookup(ORDER_A,true);
   expect(individual.hub_url).toContain('/s/');
   expect(individual.gallery_url).toBe(individual.hub_url+'/fotos');
   expect(individual.games_runtime_verified).toBe(false);
   // No lookup creates a second session for an unrelated CRM order.
   expect(reader.lookup(ORDER_B).state).toBe('not_found');
   expect((db.prepare('SELECT COUNT(*) n FROM photo_sessions').get() as {n:number}).n).toBe(1);
   await repository.revokeSession(a.sessionId);
   expect(reader.lookup(ORDER_A,true).state).toBe('revoked');
   expect(reader.lookup(ORDER_A,true).hub_url).toBeNull();
  }finally{db.close()}
 });
});
