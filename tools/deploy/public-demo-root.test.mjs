import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

describe('public demo gateway boundary', () => {
  for (const template of [
    'deploy/vps/docker/nginx.conf',
    'deploy/vps/nginx/christmas-games.conf.example',
  ]) {
    it(`serves exact demo pages without catch-all in ${template}`, async () => {
      const nginx = await readFile(new URL(`../../${template}`, import.meta.url), 'utf8');
      expect(nginx).toMatch(/location = \/ \{/);
      expect(nginx).toContain('location = /demo/fotos');
      expect(nginx).toMatch(/location ~ \^\/demo\/game\//);
      expect(nginx).toMatch(/location \/ \{\s*return 404;/);
      if (template.includes('/docker/')) expect(nginx).toContain('/internal-media/');
    });
  }
});
