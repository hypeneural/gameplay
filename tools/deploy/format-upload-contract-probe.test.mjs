import { readFile } from 'node:fs/promises';
import { format, resolveConfig } from 'prettier';
import { it } from 'vitest';

it('captures canonical formatting of publication contract files', async () => {
  const paths = [
    'apps/catalog-server/src/publication/publicationManifest.ts',
    'apps/catalog-server/src/publication/publicationManifest.test.ts',
    'docs/contracts/photo-publication-manifest-v1.schema.json',
    'docs/integrations/photo-sessions/PUBLISHER_EVYDFLOW_HANDOFF_V1.md',
  ];
  for (const path of paths) {
    const original = await readFile(path, 'utf8');
    const formatted = await format(original, {
      ...(await resolveConfig(path)),
      filepath: path,
    });
    console.log('UPLOAD_FORMAT_PROBE:' + JSON.stringify({ path, formatted }));
  }
});
