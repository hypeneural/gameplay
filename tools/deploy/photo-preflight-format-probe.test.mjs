import { readFile } from 'node:fs/promises';
import { format, resolveConfig } from 'prettier';
import { it } from 'vitest';
it('capture official prettier for preflight files', async () => {
  for (const path of [
    'tools/deploy/photo-session-preflight.mjs',
    'tools/deploy/photo-session-preflight.test.mjs',
  ]) {
    const original = await readFile(path, 'utf8');
    const formatted = await format(original, {
      ...(await resolveConfig(path)), filepath: path,
    });
    console.log('PHOTO_FORMAT_CANON:' + JSON.stringify({path, formatted}));
  }
});