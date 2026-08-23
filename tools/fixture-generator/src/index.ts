import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

interface FixtureDefinition {
  name: 'session-4' | 'session-12-mixed' | 'session-120-mixed';
  count: number;
}

const definitions: readonly FixtureDefinition[] = [
  { name: 'session-4', count: 4 },
  { name: 'session-12-mixed', count: 12 },
  { name: 'session-120-mixed', count: 120 },
];

const workspaceRoot = fileURLToPath(new URL('../../../', import.meta.url));

function svgLabel(label: string, width: number, height: number, color: string): Buffer {
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="${color}"/><text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" font-family="Arial" font-size="48" font-weight="700" fill="#f8dfa0">${label}</text></svg>`,
  );
}

export async function generateFixtures(
  root = join(workspaceRoot, 'tests', 'fixtures'),
): Promise<void> {
  for (const definition of definitions) {
    const directory = join(root, definition.name);
    await mkdir(directory, { recursive: true });
    const photos = Array.from({ length: definition.count }, (_, index) => {
      const portrait = index % 2 === 0;
      const width = portrait ? 500 : 700;
      const height = portrait ? 700 : 500;
      const label = `${portrait ? 'PORTRAIT' : 'LANDSCAPE'} ${String(index + 1).padStart(2, '0')}`;
      return {
        id: `ph_${String(index + 1).padStart(3, '0')}`,
        width,
        height,
        aspectRatio: width / height,
        label,
      };
    });
    await writeFile(join(directory, 'manifest.json'), `${JSON.stringify({ photos }, null, 2)}\n`);
    for (const photo of photos.slice(0, 12)) {
      const color = photo.width < photo.height ? '#8f1d35' : '#103e35';
      await sharp(svgLabel(photo.label, photo.width, photo.height, color))
        .jpeg({ quality: 86 })
        .toFile(join(directory, `${photo.id}.jpg`));
    }
  }
}

if (process.argv[1]?.endsWith('index.ts')) {
  await generateFixtures();
}
