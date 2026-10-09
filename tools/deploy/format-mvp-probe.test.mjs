import { readFile } from 'node:fs/promises';
import { format, resolveConfig } from 'prettier';
import { it } from 'vitest';

it('captures canonical formatting for the four MVP artifacts', async () => {
  const paths = [
    'apps/catalog-server/src/publication/mvpContract.test.ts',
    'apps/catalog-server/src/publication/mvpSqliteSchema.test.ts',
    'docs/contracts/mvp-photo-publication-v1.openapi.json',
    'docs/integrations/photo-sessions/MVP_POINT_GRAPH_APIS_DB_2026-10-08.md',
  ];
  for (const path of paths) {
    const source = await readFile(path, 'utf8');
    const formatted = await format(source, { ...(await resolveConfig(path)), filepath: path });
    console.log('MVP_FORMAT_PROBE:' + JSON.stringify({ path, formatted }));
  }
});
