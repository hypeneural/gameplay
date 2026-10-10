import { mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, expect, it } from 'vitest';

import { filterSourceDirectory } from './sourceFilter.js';

const dirs: string[] = [];
afterEach(async () => {
  for (const folder of dirs.splice(0)) await rm(folder, { recursive: true, force: true });
});

it('excludes calendar, globe and keychain product-prefix files like EvydFlow Python', async () => {
  const folder = await mkdtemp(join(tmpdir(), 'gameplay-products-'));
  dirs.push(folder);
  for (const name of [
    ' Calendário familia.jpg', 'Globo_01.JPG',
    'Chaveiro (1).jpeg', 'chaveiroABC.jpg',
    'Ensaio 001.jpg', 'Lucas Globo alegria.jpg',
  ]) {
    await writeFile(join(folder, name), Buffer.from('fixture'));
  }
  const result = await filterSourceDirectory(folder);
  expect(result.counts.ignoredByPrefix).toBe(4);
  expect(result.counts.eligible).toBe(2);
  expect(result.eligible.map((x) => x.fileName).sort()).toEqual(
    ['Ensaio 001.jpg', 'Lucas Globo alegria.jpg'].sort(),
  );
});
