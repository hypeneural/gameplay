import { mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

interface DemoPhotoItem {
  readonly id: string;
  readonly width: number;
  readonly height: number;
  readonly aspectRatio: number;
  readonly orientation: 'portrait' | 'landscape' | 'square';
  readonly variants: {
    readonly thumb: string;
    readonly card: string;
    readonly game: string;
  };
}

export interface PrepareDemoOptions {
  readonly sourceDirectory: string;
  readonly outputPublicDir: string;
  readonly outputTsModule: string;
}

const supportedExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp']);

export async function preparePublicDemoPhotos(options: PrepareDemoOptions): Promise<{
  readonly processedCount: number;
  readonly photos: readonly DemoPhotoItem[];
}> {
  const { sourceDirectory, outputPublicDir, outputTsModule } = options;

  const entries = await readdir(sourceDirectory, { withFileTypes: true });
  const fileNames = entries
    .filter((entry) => entry.isFile() && supportedExtensions.has(extname(entry.name).toLowerCase()))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

  if (fileNames.length === 0) {
    throw new Error(
      `Nenhum arquivo de imagem compatível (.jpg, .png, .webp) encontrado em: ${sourceDirectory}`,
    );
  }

  // Ensure clean target directory
  await rm(outputPublicDir, { recursive: true, force: true });
  await mkdir(outputPublicDir, { recursive: true });

  const photos: DemoPhotoItem[] = [];

  for (let i = 0; i < fileNames.length; i++) {
    const fileName = fileNames[i]!;
    const sourceFilePath = join(sourceDirectory, fileName);
    const photoId = `demo_${String(i + 1).padStart(3, '0')}`;
    const photoDir = join(outputPublicDir, photoId);
    await mkdir(photoDir, { recursive: true });

    // Inspect rotated metadata
    const metadataProbe = await sharp(sourceFilePath).rotate().metadata();
    const width = metadataProbe.width ?? 0;
    const height = metadataProbe.height ?? 0;
    if (width <= 0 || height <= 0) {
      throw new Error(`Imagem inválida com dimensões zeradas: ${fileName}`);
    }

    const orientation: 'portrait' | 'landscape' | 'square' =
      height > width ? 'portrait' : width > height ? 'landscape' : 'square';
    const aspectRatio = Number((width / height).toFixed(4));

    // Generate variants
    const thumbPath = join(photoDir, 'thumb.webp');
    const cardPath = join(photoDir, 'card.webp');
    const gamePath = join(photoDir, 'game.webp');

    await sharp(sourceFilePath)
      .rotate()
      .resize({ width: 480, height: 480, fit: 'inside', withoutEnlargement: true })
      .toColorspace('srgb')
      .webp({ quality: 82 })
      .toFile(thumbPath);

    await sharp(sourceFilePath)
      .rotate()
      .resize({ width: 800, height: 800, fit: 'inside', withoutEnlargement: true })
      .toColorspace('srgb')
      .webp({ quality: 82 })
      .toFile(cardPath);

    await sharp(sourceFilePath)
      .rotate()
      .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
      .toColorspace('srgb')
      .webp({ quality: 82 })
      .toFile(gamePath);

    photos.push({
      id: photoId,
      width,
      height,
      aspectRatio,
      orientation,
      variants: {
        thumb: `/fixtures/demo/${photoId}/thumb.webp`,
        card: `/fixtures/demo/${photoId}/card.webp`,
        game: `/fixtures/demo/${photoId}/game.webp`,
      },
    });
  }

  // Generate typed TypeScript module
  const tsContent = `// Generated automatically by prepareDemo.ts — DO NOT EDIT DIRECTLY
import type { Photo } from '@christmas-games/platform';

export const publicDemoPhotos: readonly Photo[] = ${JSON.stringify(photos, null, 2)} as const;
`;

  await writeFile(outputTsModule, tsContent, 'utf8');
  await writeFile(join(outputPublicDir, 'manifest.json'), JSON.stringify(photos, null, 2), 'utf8');

  return {
    processedCount: photos.length,
    photos,
  };
}

// CLI runner when executed directly
const currentFilePath = fileURLToPath(import.meta.url);
const invokedPath = process.argv[1] ? resolve(process.argv[1]) : '';
if (invokedPath && (invokedPath === currentFilePath || invokedPath.endsWith('prepareDemo.ts'))) {
  const sourceDirectory = process.argv[2] ?? 'C:\\Users\\Anderson\\Desktop\\Site';
  const repositoryRoot = resolve(dirname(currentFilePath), '../../..');
  const outputPublicDir = join(repositoryRoot, 'apps/play/public/fixtures/demo');
  const outputTsModule = join(repositoryRoot, 'apps/play/src/app/publicDemoPhotos.ts');

  process.stdout.write(
    `Iniciando processamento de fotos da demo a partir de: ${sourceDirectory}\n`,
  );
  preparePublicDemoPhotos({
    sourceDirectory,
    outputPublicDir,
    outputTsModule,
  })
    .then(({ processedCount }) => {
      process.stdout.write(
        `\nSucesso! ${processedCount} fotos processadas em WebP sRGB e registradas em ${outputTsModule}\n`,
      );
    })
    .catch((err) => {
      process.stderr.write(`\nErro: ${err instanceof Error ? err.message : String(err)}\n`);
      process.exit(1);
    });
}
