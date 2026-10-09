import { Buffer } from 'node:buffer';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  checkPublicHealth,
  runPreflight,
  safeLogEvent,
  scanPhotoSessionDirectory,
} from './photo-session-preflight.mjs';

async function fixture(callback) {
  const root = await mkdtemp(join(tmpdir(), 'photo-preflight-test-'));
  try { return await callback(root); }
  finally { await rm(root, { recursive: true, force: true }); }
}
const jpg = Buffer.from([255, 216, 255, 42, 1, 2, 3, 4, 5, 6, 7, 8]);
const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 1, 2, 3, 4]);

describe('read-only photo source preflight and privacy-safe events', () => {
  it('counts root JPEG/PNG and ignores subfolders, Calendário and Globo', async () =>
    fixture(async (root) => {
      await writeFile(join(root, 'photo-01.jpg'), jpg);
      await writeFile(join(root, 'photo-02.png'), png);
      await writeFile(join(root, 'Calendário produto.jpg'), jpg);
      await writeFile(join(root, 'Globo produto.png'), png);
      await mkdir(join(root, 'Baixa'));
      await writeFile(join(root, 'note.txt'), 'private data');
      const events = [];
      const result = await scanPhotoSessionDirectory(root, (event) => events.push(event));
      expect(result).toMatchObject({
        eligible: 2, invalid: 0, ignoredByPrefix: 2, ignoredSubdirectories: 1, unsupported: 1,
      });
      expect(events.find((event) => event.event === 'source.summary')?.result).toBe('pass');
    }));

  it('fails closed on disguised or damaged image headers', async () =>
    fixture(async (root) => {
      await writeFile(join(root, 'photo-01.jpg'), jpg);
      await writeFile(join(root, 'damaged.jpg'), 'not an image');
      await expect(scanPhotoSessionDirectory(root)).rejects.toMatchObject({
        code: 'INVALID_IMAGES_PRESENT',
      });
    }));

  it('never logs file names, customer names, phone or root paths', async () =>
    fixture(async (root) => {
      const sensitive = 'Sensitive Person - 48999999999';
      await writeFile(join(root, `${sensitive}.jpg`), jpg);
      const output = [];
      expect(await runPreflight(['--source', root], (line) => output.push(line))).toBe(0);
      const logged = output.join('');
      expect(logged).not.toContain(sensitive);
      expect(logged).not.toContain(root);
      expect(logged).not.toContain('48999999999');
      expect(logged).toContain('READ_ONLY_PREFLIGHT_ONLY');
      const sanitized = safeLogEvent({ event: 'request', result: 'pass', token: 'secret', path: root });
      expect(sanitized).toEqual({ event: 'request', result: 'pass' });
    }));

  it('refuses writing logs in the photo source directory', async () =>
    fixture(async (root) => {
      const output = [];
      expect(await runPreflight(['--source', root, '--log-file', join(root, 'audit.jsonl')],
        (line) => output.push(line))).toBe(2);
      expect(output.join('')).toContain('LOG_PATH_UNSAFE');
    }));

  it('only checks the fixed public health endpoint with GET, never customer routes', async () => {
    const requests = [];
    const ok = await checkPublicHealth(async (url, options) => {
      requests.push({ url, method: options.method });
      return { status: 200, json: async () => ({ status: 'ok', releaseStage: 'staging-demo' }) };
    });
    expect(ok).toEqual({ result: 'pass', statusCode: 200, releaseStage: 'staging-demo' });
    expect(requests).toEqual([{
      url: 'https://jogos.fotosdenatal.com/healthz', method: 'GET',
    }]);
  });

  it('treats production stage or unreachable health as blocked, not upload permission', async () => {
    expect((await checkPublicHealth(async () => ({
      status: 200, json: async () => ({ status: 'ok', releaseStage: 'pilot' }),
    }))).result).toBe('blocked');
    expect((await checkPublicHealth(async () => { throw new Error('offline'); })).result)
      .toBe('blocked');
  });
});
