import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, readdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { z } from 'zod';
import { toLongPath } from './index.js';
import { mediaRecipeQuality, mediaVariants } from './recipe.js';
import type { MediaVariant } from './recipe.js';

const supportedExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const ignoredPrefixPattern = /^\s*(calend[aá]rio|globo|chaveiro)/i;
const MAX_INPUT_PIXELS = 40_000_000;
const MAX_INPUT_CHANNELS = 5;
const MAX_INPUT_BYTES = 32 * 1024 * 1024;

export interface PublicShowcasePhotoEntry {
  readonly photoId: string;
  readonly orientation: 'portrait' | 'landscape' | 'square';
  readonly width: number;
  readonly height: number;
  readonly variants: Record<MediaVariant, string>;
  readonly sha256: Record<MediaVariant, string>;
}

export interface PublicShowcaseManifest {
  readonly schemaVersion: 1;
  readonly collectionId: string;
  readonly generatedAt: string;
  readonly photos: readonly PublicShowcasePhotoEntry[];
}

export interface PrepareShowcaseOptions {
  readonly sourceDirectory: string;
  readonly outputDirectory: string;
  readonly collectionId?: string;
  readonly urlPrefix?: string;
  readonly consentApproved: boolean;
  readonly dryRun?: boolean;
}

export interface PrepareShowcaseResult {
  readonly dryRun: boolean;
  readonly collectionId: string;
  readonly eligibleCount: number;
  readonly ignoredProductCount: number;
  readonly ignoredSubdirectoryCount: number;
  readonly incompatibleCount: number;
  readonly duplicateCount: number;
  readonly orientations: {
    readonly landscape: number;
    readonly portrait: number;
    readonly square: number;
  };
  readonly manifest: PublicShowcaseManifest;
}

const sha256HexSchema = z.string().regex(/^[a-f0-9]{64}$/);
const showcaseUrlSchema = z
  .string()
  .regex(/^\/showcase\/v1\/demo_[0-9]{3}\/(thumb|card|game)\.webp(?:\?v=[a-f0-9]{8,64})?$/);

export const publicShowcasePhotoEntrySchema = z.object({
  photoId: z.string().regex(/^demo_[0-9]{3}$/),
  orientation: z.enum(['portrait', 'landscape', 'square']),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  variants: z.object({
    thumb: showcaseUrlSchema,
    card: showcaseUrlSchema,
    game: showcaseUrlSchema,
  }),
  sha256: z.object({
    thumb: sha256HexSchema,
    card: sha256HexSchema,
    game: sha256HexSchema,
  }),
});

export const publicShowcaseManifestSchema = z.object({
  schemaVersion: z.literal(1),
  collectionId: z.string().regex(/^[a-z0-9][a-z0-9_-]{2,63}$/),
  generatedAt: z.string().min(1),
  photos: z.array(publicShowcasePhotoEntrySchema).min(1),
});

function classifyOrientation(width: number, height: number): 'portrait' | 'landscape' | 'square' {
  if (width === height) return 'square';
  return width > height ? 'landscape' : 'portrait';
}

function sha256Hex(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}

export async function preparePublicShowcase(
  options: PrepareShowcaseOptions,
): Promise<PrepareShowcaseResult> {
  const dryRun = options.dryRun === true;
  if (!options.consentApproved) {
    throw new Error(
      'Public showcase preparation requires explicit authorization (--consent-approved).',
    );
  }

  const collectionId = options.collectionId ?? 'christmas-2026-public-showcase-v1';
  const urlPrefix = (options.urlPrefix ?? '/showcase/v1').replace(/\/+$/, '');
  if (urlPrefix !== '/showcase/v1') {
    throw new Error('Public showcase URL prefix must be /showcase/v1.');
  }

  const entries = await readdir(toLongPath(options.sourceDirectory), { withFileTypes: true });
  let ignoredProductCount = 0;
  let ignoredSubdirectoryCount = 0;
  let incompatibleCount = 0;
  const candidateNames: string[] = [];

  for (const entry of entries) {
    if (entry.isDirectory()) {
      ignoredSubdirectoryCount += 1;
      continue;
    }
    if (!entry.isFile()) continue;

    const normalizedName = entry.name.normalize('NFC');
    if (ignoredPrefixPattern.test(normalizedName)) {
      ignoredProductCount += 1;
      continue;
    }

    const extension = extname(entry.name).toLowerCase();
    if (!supportedExtensions.has(extension)) {
      incompatibleCount += 1;
      continue;
    }

    candidateNames.push(entry.name);
  }

  candidateNames.sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }),
  );
  if (candidateNames.length === 0) {
    throw new Error('No eligible JPEG, PNG, or WebP files found in showcase source directory.');
  }

  const seenSourceHashes = new Set<string>();
  let duplicateCount = 0;
  const orientations = { landscape: 0, portrait: 0, square: 0 };
  const photos: PublicShowcasePhotoEntry[] = [];

  const stagingDir = `${options.outputDirectory}.staging-${randomUUID()}`;
  if (!dryRun) {
    await rm(stagingDir, { recursive: true, force: true });
    await mkdir(stagingDir, { recursive: true });
  }

  try {
    for (let index = 0; index < candidateNames.length; index += 1) {
      const fileName = candidateNames[index]!;
      const sourcePath = join(options.sourceDirectory, fileName);
      const sourceStats = await stat(toLongPath(sourcePath));
      if (!sourceStats.isFile()) {
        throw new Error(`Showcase source entry at index ${index + 1} is not a regular file.`);
      }
      if (sourceStats.size <= 0 || sourceStats.size > MAX_INPUT_BYTES) {
        throw new Error(`Showcase source entry at index ${index + 1} violates byte size policy.`);
      }

      const sourceBuffer = await readFile(toLongPath(sourcePath));
      const sourceHash = sha256Hex(sourceBuffer);
      if (seenSourceHashes.has(sourceHash)) {
        duplicateCount += 1;
        throw new Error(`Duplicate source image SHA-256 detected at index ${index + 1}.`);
      }
      seenSourceHashes.add(sourceHash);

      const probe = sharp(sourceBuffer, {
        failOn: 'error',
        limitInputPixels: MAX_INPUT_PIXELS,
        limitInputChannels: MAX_INPUT_CHANNELS,
      });
      const rawMeta = await probe.metadata();
      if (!rawMeta.format || !['jpeg', 'png', 'webp'].includes(rawMeta.format)) {
        throw new Error(`Unsupported image format at index ${index + 1}.`);
      }

      const photoId = `demo_${String(index + 1).padStart(3, '0')}`;
      const photoStagingDir = join(stagingDir, photoId);
      if (!dryRun) {
        await mkdir(photoStagingDir, { recursive: true });
      }

      const variantUrls = {} as Record<MediaVariant, string>;
      const variantHashes = {} as Record<MediaVariant, string>;
      let gameWidth = 0;
      let gameHeight = 0;

      for (const [variant, maxEdge] of mediaVariants) {
        const rendered = await sharp(sourceBuffer, {
          failOn: 'error',
          limitInputPixels: MAX_INPUT_PIXELS,
          limitInputChannels: MAX_INPUT_CHANNELS,
        })
          .rotate()
          .resize({
            width: maxEdge,
            height: maxEdge,
            fit: 'inside',
            withoutEnlargement: true,
          })
          .toColorspace('srgb')
          .webp({ quality: mediaRecipeQuality, effort: 4 })
          .toBuffer({ resolveWithObject: true });

        if (rendered.info.width <= 0 || rendered.info.height <= 0) {
          throw new Error(`Invalid rendered dimensions for ${photoId}/${variant}.`);
        }

        const digest = sha256Hex(rendered.data);
        const versionTag = digest.slice(0, 12);
        variantUrls[variant] = `${urlPrefix}/${photoId}/${variant}.webp?v=${versionTag}`;
        variantHashes[variant] = digest;

        if (variant === 'game') {
          gameWidth = rendered.info.width;
          gameHeight = rendered.info.height;
        }

        if (!dryRun) {
          const targetPath = join(photoStagingDir, `${variant}.webp`);
          await writeFile(targetPath, rendered.data);
          const diskBytes = await readFile(targetPath);
          if (sha256Hex(diskBytes) !== digest) {
            throw new Error(`Disk SHA-256 verification failed for ${photoId}/${variant}.webp.`);
          }
        }
      }

      const orientation = classifyOrientation(gameWidth, gameHeight);
      orientations[orientation] += 1;

      photos.push({
        photoId,
        orientation,
        width: gameWidth,
        height: gameHeight,
        variants: variantUrls,
        sha256: variantHashes,
      });
    }

    const manifest: PublicShowcaseManifest = publicShowcaseManifestSchema.parse({
      schemaVersion: 1,
      collectionId,
      generatedAt: new Date().toISOString(),
      photos,
    });

    if (!dryRun) {
      const tempManifestPath = join(stagingDir, `manifest.json.tmp-${randomUUID()}`);
      const finalStagingManifestPath = join(stagingDir, 'manifest.json');
      await writeFile(tempManifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
      await rename(tempManifestPath, finalStagingManifestPath);

      await mkdir(dirname(options.outputDirectory), { recursive: true });
      const backupDir = `${options.outputDirectory}.prev-${randomUUID()}`;
      let hadExisting = false;
      try {
        await stat(options.outputDirectory);
        hadExisting = true;
      } catch {
        hadExisting = false;
      }

      if (hadExisting) {
        await rename(options.outputDirectory, backupDir);
      }
      await rename(stagingDir, options.outputDirectory);
      if (hadExisting) {
        await rm(backupDir, { recursive: true, force: true });
      }
    }

    return {
      dryRun,
      collectionId,
      eligibleCount: photos.length,
      ignoredProductCount,
      ignoredSubdirectoryCount,
      incompatibleCount,
      duplicateCount,
      orientations,
      manifest,
    };
  } catch (error) {
    if (!dryRun) {
      await rm(stagingDir, { recursive: true, force: true });
    }
    throw error;
  }
}

function parseCliArgs(argv: readonly string[]): PrepareShowcaseOptions {
  const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
  let sourceDirectory = process.env.SHOWCASE_SOURCE_DIR ?? 'C:\\Users\\Anderson\\Desktop\\Site';
  let outputDirectory = join(repositoryRoot, '.local-showcase', 'v1');
  let collectionId = 'christmas-2026-public-showcase-v1';
  let urlPrefix = '/showcase/v1';
  let consentApproved = false;
  let dryRun = false;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg || arg === '--') continue;
    if (arg === '--dry-run') {
      dryRun = true;
      continue;
    }
    if (arg === '--consent-approved') {
      consentApproved = true;
      continue;
    }
    const next = argv[index + 1];
    if (!next) {
      throw new Error(`Missing value for option ${arg}.`);
    }
    index += 1;
    if (arg === '--source') sourceDirectory = resolve(next);
    else if (arg === '--output') outputDirectory = resolve(next);
    else if (arg === '--collection-id') collectionId = next;
    else if (arg === '--url-prefix') urlPrefix = next;
    else throw new Error(`Unknown option: ${arg}`);
  }

  return {
    sourceDirectory,
    outputDirectory,
    collectionId,
    urlPrefix,
    consentApproved,
    dryRun,
  };
}

const currentFilePath = fileURLToPath(import.meta.url);
const invokedPath = process.argv[1] ? resolve(process.argv[1]) : '';
if (
  invokedPath &&
  (invokedPath === currentFilePath || invokedPath.endsWith('prepareShowcase.ts'))
) {
  const cliOptions = parseCliArgs(process.argv.slice(2));
  preparePublicShowcase(cliOptions)
    .then((result) => {
      process.stdout.write(
        `${JSON.stringify({
          status: result.dryRun ? 'dry-run-ok' : 'published',
          collectionId: result.collectionId,
          eligibleCount: result.eligibleCount,
          ignoredProductCount: result.ignoredProductCount,
          ignoredSubdirectoryCount: result.ignoredSubdirectoryCount,
          incompatibleCount: result.incompatibleCount,
          duplicateCount: result.duplicateCount,
          orientations: result.orientations,
        })}\n`,
      );
    })
    .catch((error: unknown) => {
      process.stderr.write(
        `${JSON.stringify({
          status: 'error',
          message: error instanceof Error ? error.message : String(error),
        })}\n`,
      );
      process.exit(1);
    });
}
