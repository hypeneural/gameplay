import { readFile } from 'node:fs/promises';
import { format, resolveConfig } from 'prettier';
import { it } from 'vitest';

it('prints the canonical Markdown formatting for the handoff documents', async () => {
  const paths = [
    'docs/ops/CONTABO_JOGOS_STAGING_2026-10-08.md',
    'docs/integrations/photo-sessions/SESSION_MEDIA_PUBLICATION_CONTRACT_V1.md',
  ];
  for (const path of paths) {
    const original = await readFile(path, 'utf8');
    const formatted = await format(original, {
      ...(await resolveConfig(path)),
      filepath: path,
    });
    console.log('FORMAT_PROBE_JSON:' + JSON.stringify({ path, formatted }));
  }
});
