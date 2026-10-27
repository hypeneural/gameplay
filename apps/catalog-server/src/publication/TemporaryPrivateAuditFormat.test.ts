import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { format, resolveConfig } from 'prettier';
import { describe, expect, it } from 'vitest';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
describe('temporary one-run prettier reconciliation', () => {
  it('prints exact project-prettier formatting for private-audit files', async () => {
    const files = [
      'apps/catalog-server/src/main.ts',
      'apps/catalog-server/src/runtimeConfig.test.ts',
      'deploy/vps/docker/compose.private-audit.yaml',
      'docs/integrations/GAMEPLAY_STATUS_READ_V1_20261026.md',
    ];
    for (const relative of files) {
      const path = resolve(root, relative);
      const source = await readFile(path, 'utf8');
      const options = (await resolveConfig(path)) ?? {};
      const formatted = await format(source, { ...options, filepath: path });
      console.log('FORMAT_DUMP|' + relative + '|' + encodeURIComponent(formatted));
      expect(formatted.length).toBeGreaterThan(100);
    }
  });
});
