import { createServer } from 'node:http';
import { once } from 'node:events';
import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import { afterEach, describe, expect, it } from 'vitest';
import { applyMigrations } from './sqliteDatabase.js';
import { GameplayStatusLookup } from './GameplayStatusLookup.js';

const cases: Array<() => void> = [];
afterEach(() => {
  for (const fn of cases.splice(0)) fn();
});

describe('GameplayStatusLookup', () => {
  function fixture() {
    const db = new DatabaseSync(':memory:');
    db.exec('PRAGMA foreign_keys=ON');
    applyMigrations(db);
    cases.push(() => db.close());
    const secret = 'a'.repeat(64);
    const reader = new GameplayStatusLookup({
      db,
      publicOrigin: new URL('https://jogos.fotosdenatal.com'),
      sessionSecret: secret,
      readSecret: 'read-secret-'.padEnd(40, 'x'),
    });
    return { db, reader };
  }

  it('does not create a session when a known order is absent', () => {
    const { db, reader } = fixture();
    const result = reader.lookup(randomUUID());
    expect(result.state).toBe('not_found');
    expect(result.hub_url).toBeNull();
    expect((db.prepare('SELECT COUNT(*) AS n FROM photo_sessions').get() as { n: number }).n).toBe(
      0,
    );
  });

  it('rejects invalid UUID before any lookup', () => {
    const { reader } = fixture();
    expect(() => reader.lookup('123')).toThrow('INVALID_ORDER_UUID');
  });

  it('rejects uncredentialed HTTP calls and method mismatches', async () => {
    const { reader } = fixture();
    const server = createServer((req, res) => {
      void reader.handleHttpRequest(req, res);
    });
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    cases.push(() => server.close());
    const addr = server.address();
    if (!addr || typeof addr === 'string') throw Error('missing port');
    const origin = 'http://127.0.0.1:' + addr.port;
    const unauthorized = await fetch(origin + '/internal/v1/sessions/lookup', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ crm_order_uuid: randomUUID() }),
    });
    expect(unauthorized.status).toBe(401);
    const invalidMethod = await fetch(origin + '/internal/v1/sessions/lookup', { method: 'GET' });
    expect(invalidMethod.status).toBe(405);
  });
});
