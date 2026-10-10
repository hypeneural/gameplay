import { readFile } from 'node:fs/promises';
import { URL } from 'node:url';
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
      expect(nginx).toMatch(/location ~ "?\^\/demo\/game\//);
      expect(nginx).toMatch(/location \/ \{\s*return 404;/);
      if (template.includes('/docker/')) expect(nginx).toContain('/internal-media/');
    });
  }

  it('validates public demo photo catalog and derivative files integrity', async () => {
    const raw = await readFile(
      new URL('../../apps/play/src/app/publicDemoPhotos.ts', import.meta.url),
      'utf8',
    );
    expect(raw).toContain('publicDemoPhotos');
    const ids = Array.from(raw.matchAll(/id:\s*'(demo_\d{3})'/g), (m) => m[1]);
    expect(ids.length).toBe(27);
    for (let i = 1; i <= 27; i++) {
      const expectedId = `demo_${String(i).padStart(3, '0')}`;
      expect(ids).toContain(expectedId);
    }
  });
});
