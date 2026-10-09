import { readFile } from 'node:fs/promises';
import { format, resolveConfig } from 'prettier';
import { it } from 'vitest';

it('prints stable Prettier fixed-point for the MVP document', async () => {
  const path = 'docs/integrations/photo-sessions/MVP_POINT_GRAPH_APIS_DB_2026-10-08.md';
  const options = { ...(await resolveConfig(path)), filepath: path };
  let current = await readFile(path, 'utf8');
  const sizes = [current.length];
  for (let iteration = 0; iteration < 6; iteration += 1) {
    const next = await format(current, options);
    sizes.push(next.length);
    if (next === current) break;
    current = next;
  }
  const final = await format(current, options);
  console.log('MVP_STABLE_FORMAT:' + JSON.stringify({ path, formatted: current, stable: final === current, sizes }));
});
