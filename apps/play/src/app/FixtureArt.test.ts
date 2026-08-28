import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const fixtureDirectory = resolve(process.cwd(), 'apps/play/public/fixtures');

describe('safe fixture art', () => {
  it.each(['portrait.svg', 'landscape.svg'])(
    'does not expose orientation terminology in %s',
    (fixtureName) => {
      const svg = readFileSync(resolve(fixtureDirectory, fixtureName), 'utf8');

      expect(svg).toContain('MEMÓRIA DE NATAL');
      expect(svg).not.toMatch(/(?:vertical|horizontal)/i);
    },
  );
});
