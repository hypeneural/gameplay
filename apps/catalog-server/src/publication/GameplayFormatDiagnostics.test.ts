// Temporary CI-only code formatting evidence. Remove after applying output.
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { format, resolveConfig } from 'prettier';
import { describe, expect, it } from 'vitest';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const targets = [
  'apps/catalog-server/src/main.ts',
  'apps/catalog-server/src/publication/GameplayStatusLookup.integration.test.ts',
  'apps/catalog-server/src/publication/GameplayStatusLookup.test.ts',
  'apps/catalog-server/src/publication/GameplayStatusLookup.ts',
  'docs/integrations/GAMEPLAY_STATUS_READ_V1_20261026.md',
];

describe('temporary Prettier evidence', () => {
  it('prints exact Prettier output for maintainer to apply', async () => {
    for (const relative of targets) {
      const absolute = resolve(root, relative);
      const input = await readFile(absolute, 'utf8');
      const config = (await resolveConfig(absolute)) ?? {};
      const formatted = await format(input, { ...config, filepath: absolute });
      process.stdout.write('FORMAT_DUMP|' + relative + '|' + encodeURIComponent(formatted) + '\n');
    }
    expect(targets).toHaveLength(5);
  });
});
