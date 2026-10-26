import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { format, resolveConfig } from 'prettier';
import { describe, expect, it } from 'vitest';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
describe('temporary formatting diagnostic', () => {
  it('prints encoded prettier output for GameplayStatusLookup.ts', async () => {
    const relative = 'apps/catalog-server/src/publication/GameplayStatusLookup.ts';
    const path = resolve(root, relative);
    const source = await readFile(path, 'utf8');
    const options = (await resolveConfig(path)) ?? {};
    const formatted = await format(source, { ...options, filepath: path });
    console.log('FORMAT_DUMP|' + relative + '|' + encodeURIComponent(formatted));
    expect(formatted.length).toBeGreaterThan(100);
  });
});
