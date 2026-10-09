import { readFile } from 'node:fs/promises';
import { format, resolveConfig } from 'prettier';
import { it } from 'vitest';

it('captures Prettier fixed point for four code files', async () => {
  for (const path of [
    'apps/catalog-server/src/publication/publicationLogger.ts',
    'apps/catalog-server/src/publication/PublicationService.ts',
    'apps/catalog-server/src/storage/FileSystemStorageService.ts',
    'tools/deploy/publish-session.mjs',
  ]) {
    let source = await readFile(path, 'utf8');
    const opts = { ...(await resolveConfig(path)), filepath: path };
    for (let i = 0; i < 4; i++) {
      const next = await format(source, opts);
      if (next === source) break;
      source = next;
    }
    console.log('FIX_FORMAT_CANON:' + JSON.stringify({ path, formatted: source }));
  }
});
