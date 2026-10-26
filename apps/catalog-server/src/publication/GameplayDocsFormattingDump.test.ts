import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { format, resolveConfig } from 'prettier';
import { describe, expect, it } from 'vitest';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
describe('temporary markdown formatter', () => {
  it('shows CI Prettier output for the Gameplay status documentation', async () => {
    const relative = 'docs/integrations/GAMEPLAY_STATUS_READ_V1_20261026.md';
    const path = resolve(root, relative);
    const source = await readFile(path, 'utf8');
    const cfg = (await resolveConfig(path)) ?? {};
    const formatted = await format(source, { ...cfg, filepath: path });
    console.log('FORMAT_DUMP|' + relative + '|' + encodeURIComponent(formatted));
    expect(formatted.length).toBeGreaterThan(100);
  });
});
