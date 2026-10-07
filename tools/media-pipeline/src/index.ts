import { createHash, randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { access, copyFile, mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import sharp, { type Sharp } from 'sharp';
import { z } from 'zod';
import {
  mediaRecipeKey,
  mediaRecipeQuality,
  mediaVariants,
  mediaWorkerFingerprint,
} from './recipe.js';
import type { MediaVariant, MediaVariantMetric } from './recipe.js';

const MAX_INPUT_PIXELS = 40_000_000;
const MAX_INPUT_CHANNELS = 5;
const MAX_INPUT_BYTES = 32 * 1024 * 1024;
const supportedFormats = new Set(['jpeg', 'png', 'webp']);
const opaquePhotoId = z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/);
const recipeKeySchema = z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,255}$/);

export const mediaJobSchema = z.object({
  sourcePath: z.string().min(1),
  storageRoot: z.string().min(1),
  sessionUuid: z.string().uuid(),
  photoId: opaquePhotoId,
});

export type MediaJob = z.infer<typeof mediaJobSchema>;
export type MediaState = 'pending' | 'processing' | 'ready' | 'failed';

export interface MediaManifestEntry {
  photoId: string;
  state: MediaState;
  /** SHA-256 of the immutable stored original and its derivative namespace. */
  contentHash?: string;
  /** Semantic media recipe. A source hash alone is not a complete cache key. */
  recipeKey?: string;
  width?: number;
  height?: number;
  aspectRatio?: number;
  orientation?: 'portrait' | 'landscape' | 'square';
  derivatives?: Record<MediaVariant, string>;
  derivativeMetrics?: Record<MediaVariant, MediaVariantMetric>;
  error?: string;
}

export interface MediaManifest {
  version: 2;
  worker: typeof mediaWorkerFingerprint;
  entries: readonly MediaManifestEntry[];
}

export interface MediaBatchResult {
  ready: readonly MediaManifestEntry[];
  failed: readonly MediaManifestEntry[];
}

const mediaVariantMetricSchema = z.object({
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  byteLength: z.number().int().positive(),
});
const derivativeMetricsSchema = z.object({
  thumb: mediaVariantMetricSchema,
  card: mediaVariantMetricSchema,
  game: mediaVariantMetricSchema,
});
const derivativesSchema = z.object({ thumb: z.string(), card: z.string(), game: z.string() });
const mediaManifestEntrySchema = z.object({
  photoId: opaquePhotoId,
  state: z.enum(['pending', 'processing', 'ready', 'failed']),
  contentHash: z.string().optional(),
  recipeKey: recipeKeySchema.optional(),
  width: z.number().positive().optional(),
  height: z.number().positive().optional(),
  aspectRatio: z.number().positive().optional(),
  orientation: z.enum(['portrait', 'landscape', 'square']).optional(),
  derivatives: derivativesSchema.optional(),
  derivativeMetrics: derivativeMetricsSchema.optional(),
  error: z.string().optional(),
});
const legacyMediaManifestSchema = z.object({
  version: z.literal(1),
  entries: z.array(mediaManifestEntrySchema),
});
const mediaManifestSchema = z.object({
  version: z.literal(2),
  worker: z.object({
    version: z.string(),
    recipeKey: recipeKeySchema,
    sharpVersion: z.string(),
    libvipsVersion: z.string(),
  }),
  entries: z.array(mediaManifestEntrySchema),
});

function mediaPaths(job: MediaJob, contentHash: string) {
  // Originals are source-addressed; derivatives additionally include recipeKey
  // so an encoder/resize policy change can never reuse stale browser media.
  const originalDirectory = join(
    job.storageRoot,
    'originals',
    job.sessionUuid,
    job.photoId,
    contentHash,
  );
  const derivedDirectory = join(
    job.storageRoot,
    'derived',
    job.sessionUuid,
    job.photoId,
    contentHash,
    mediaRecipeKey,
  );
  return { originalDirectory, derivedDirectory };
}

function classifyOrientation(width: number, height: number): 'portrait' | 'landscape' | 'square' {
  if (width === height) return 'square';
  return width > height ? 'landscape' : 'portrait';
}

export async function processMediaJob(input: MediaJob): Promise<MediaManifestEntry> {
  const job = mediaJobSchema.parse(input);
  const sourceStats = await stat(job.sourcePath);
  if (!sourceStats.isFile()) throw new Error('Media source must be a regular file.');
  if (sourceStats.size > MAX_INPUT_BYTES) {
    throw new Error(`Media source exceeds the ${MAX_INPUT_BYTES} byte safety limit.`);
  }

  const contentHash = await hashFile(job.sourcePath);
  const { originalDirectory, derivedDirectory } = mediaPaths(job, contentHash);
  await ensureOriginal(job.sourcePath, originalDirectory, contentHash);
  const image = sharp(join(originalDirectory, 'source'), {
    // Warn-level metadata is tolerated; decode and safety failures still fail.
    failOn: 'warning',
    limitInputPixels: MAX_INPUT_PIXELS,
    limitInputChannels: MAX_INPUT_CHANNELS,
  });
  const metadata = await image.metadata();

  if (!metadata.format || !supportedFormats.has(metadata.format)) {
    throw new Error(`Unsupported media format: ${metadata.format ?? 'unknown'}.`);
  }
  if (!metadata.autoOrient?.width || !metadata.autoOrient.height) {
    throw new Error('The media source has no usable dimensions after EXIF orientation.');
  }

  const derivativeMetrics = await ensureDerivatives(image, derivedDirectory);

  const width = metadata.autoOrient.width;
  const height = metadata.autoOrient.height;
  return {
    photoId: job.photoId,
    state: 'ready',
    contentHash,
    recipeKey: mediaRecipeKey,
    width,
    height,
    aspectRatio: width / height,
    orientation: classifyOrientation(width, height),
    derivatives: {
      thumb: join(derivedDirectory, 'thumb.webp'),
      card: join(derivedDirectory, 'card.webp'),
      game: join(derivedDirectory, 'game.webp'),
    },
    derivativeMetrics,
  };
}

/**
 * Bounded batch adapter for a future queue worker. One bad source is recorded
 * as a failed item and never prevents the remaining session photos from being
 * processed. Result order always matches the submitted order.
 */
export async function processMediaJobs(
  inputs: readonly MediaJob[],
  concurrency = 2,
): Promise<MediaBatchResult> {
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 8) {
    throw new Error('Media worker concurrency must be an integer between 1 and 8.');
  }
  const results: MediaManifestEntry[] = new Array(inputs.length);
  let next = 0;

  await Promise.all(
    Array.from({ length: Math.min(concurrency, inputs.length) }, async () => {
      while (true) {
        const index = next++;
        const input = inputs[index];
        if (!input) return;
        try {
          results[index] = await processMediaJob(input);
        } catch {
          results[index] = {
            photoId: input.photoId,
            state: 'failed',
            recipeKey: mediaRecipeKey,
            error: 'media_processing_failed',
          };
        }
      }
    }),
  );

  return {
    ready: results.filter((entry) => entry.state === 'ready'),
    failed: results.filter((entry) => entry.state === 'failed'),
  };
}

/**
 * Upserts entries rather than replacing a session manifest. The local writer
 * is deliberately single-process; a distributed worker must add a DB/queue
 * lease before concurrent use.
 */
export async function writeManifest(
  storageRoot: string,
  sessionUuid: string,
  entries: readonly MediaManifestEntry[],
): Promise<void> {
  const manifestPath = join(storageRoot, 'derived', sessionUuid, 'manifest.json');
  const current = await readManifest(manifestPath);
  const byPhotoId = new Map(current.entries.map((entry) => [entry.photoId, entry]));
  for (const entry of entries) byPhotoId.set(entry.photoId, entry);
  const manifest: MediaManifest = {
    version: 2,
    worker: mediaWorkerFingerprint,
    entries: [...byPhotoId.values()].sort((left, right) =>
      left.photoId.localeCompare(right.photoId),
    ),
  };

  await mkdir(dirname(manifestPath), { recursive: true });
  const temporaryPath = `${manifestPath}.next-${randomUUID()}`;
  await writeFile(temporaryPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  await rename(temporaryPath, manifestPath);
}

async function readManifest(manifestPath: string): Promise<MediaManifest> {
  if (!(await exists(manifestPath))) {
    return { version: 2, worker: mediaWorkerFingerprint, entries: [] };
  }
  const parsed: unknown = JSON.parse(await readFile(manifestPath, 'utf8'));
  const v2 = mediaManifestSchema.safeParse(parsed);
  const manifest = v2.success ? v2.data : legacyMediaManifestSchema.parse(parsed);
  return {
    version: 2,
    worker: mediaWorkerFingerprint,
    entries: manifest.entries.map((entry) => ({
      photoId: entry.photoId,
      state: entry.state,
      ...(entry.contentHash === undefined ? {} : { contentHash: entry.contentHash }),
      ...(entry.recipeKey === undefined ? {} : { recipeKey: entry.recipeKey }),
      ...(entry.width === undefined ? {} : { width: entry.width }),
      ...(entry.height === undefined ? {} : { height: entry.height }),
      ...(entry.aspectRatio === undefined ? {} : { aspectRatio: entry.aspectRatio }),
      ...(entry.orientation === undefined ? {} : { orientation: entry.orientation }),
      ...(entry.derivatives === undefined ? {} : { derivatives: entry.derivatives }),
      ...(entry.derivativeMetrics === undefined
        ? {}
        : { derivativeMetrics: entry.derivativeMetrics }),
      ...(entry.error === undefined ? {} : { error: entry.error }),
    })),
  };
}

async function ensureOriginal(
  sourcePath: string,
  originalDirectory: string,
  contentHash: string,
): Promise<void> {
  const originalPath = join(originalDirectory, 'source');
  if (await exists(originalPath)) {
    if ((await hashFile(originalPath)) !== contentHash) {
      throw new Error('Stored original content does not match its content-addressed directory.');
    }
    return;
  }
  await mkdir(originalDirectory, { recursive: true });
  const temporaryPath = `${originalPath}.next-${randomUUID()}`;
  await copyFile(sourcePath, temporaryPath);
  try {
    // The source can change between the first hash and copy. Re-hashing the
    // private snapshot closes that TOCTOU window before any derivative exists.
    if ((await hashFile(temporaryPath)) !== contentHash) {
      throw new Error('Media source changed while the private snapshot was being created.');
    }
    try {
      await rename(temporaryPath, originalPath);
    } catch (error) {
      if (!(await exists(originalPath))) throw error;
      if ((await hashFile(originalPath)) !== contentHash) throw error;
    }
    if ((await hashFile(originalPath)) !== contentHash) {
      throw new Error('Promoted original does not match the expected content hash.');
    }
  } finally {
    await rm(temporaryPath, { force: true });
  }
}

async function ensureDerivatives(
  image: Sharp,
  derivedDirectory: string,
): Promise<Record<MediaVariant, MediaVariantMetric>> {
  if (await allDerivativesAreValid(derivedDirectory)) {
    return inspectDerivativeMetrics(derivedDirectory);
  }
  if (await exists(derivedDirectory)) {
    throw new Error(
      'Derived directory exists but is incomplete or invalid; do not publish a partial media set.',
    );
  }

  const stagingDirectory = `${derivedDirectory}.staging-${randomUUID()}`;
  await mkdir(stagingDirectory, { recursive: true });
  try {
    const oriented = image.clone().autoOrient().toColourspace('srgb');
    const generated = await Promise.all(
      mediaVariants.map(async ([variant, maxSize]) => {
        const output = await oriented
          .clone()
          .resize({ width: maxSize, height: maxSize, fit: 'inside', withoutEnlargement: true })
          .webp({ quality: mediaRecipeQuality })
          .toFile(join(stagingDirectory, `${variant}.webp`));
        if (!output.width || !output.height || !output.size) {
          throw new Error(`Derivative ${variant} did not report complete output metrics.`);
        }
        return {
          variant,
          maxSize,
          metric: {
            width: output.width,
            height: output.height,
            byteLength: output.size,
          } satisfies MediaVariantMetric,
          format: output.format,
        };
      }),
    );
    if (
      !generated.every(
        ({ maxSize, metric, format }) =>
          format === 'webp' && metric.width <= maxSize && metric.height <= maxSize,
      ) ||
      !(await allDerivativeFilesExist(stagingDirectory))
    ) {
      throw new Error('Derivative staging did not produce every valid WebP variant.');
    }
    try {
      await rename(stagingDirectory, derivedDirectory);
    } catch (error) {
      if (!(await allDerivativesAreValid(derivedDirectory))) throw error;
    }
    return inspectDerivativeMetrics(derivedDirectory);
  } finally {
    await rm(stagingDirectory, { recursive: true, force: true });
  }
}

async function inspectDerivativeMetrics(
  directory: string,
): Promise<Record<MediaVariant, MediaVariantMetric>> {
  const metrics = await Promise.all(
    mediaVariants.map(async ([variant]) => {
      const path = join(directory, `${variant}.webp`);
      const [metadata, file] = await Promise.all([
        sharp(path, { failOn: 'warning' }).metadata(),
        stat(path),
      ]);
      if (!metadata.width || !metadata.height || file.size <= 0) {
        throw new Error(`Derivative ${variant} is missing intrinsic metrics.`);
      }
      return [
        variant,
        { width: metadata.width, height: metadata.height, byteLength: file.size },
      ] as const;
    }),
  );
  return Object.fromEntries(metrics) as Record<MediaVariant, MediaVariantMetric>;
}

async function allDerivativesAreValid(directory: string): Promise<boolean> {
  const checks = await Promise.all(
    mediaVariants.map(async ([variant, maxSize]) => {
      const path = join(directory, `${variant}.webp`);
      if (!(await exists(path))) return false;
      try {
        const metadata = await sharp(path, { failOn: 'warning' }).metadata();
        return (
          metadata.format === 'webp' &&
          Boolean(metadata.width && metadata.height) &&
          metadata.width! <= maxSize &&
          metadata.height! <= maxSize
        );
      } catch {
        return false;
      }
    }),
  );
  return checks.every(Boolean);
}

async function allDerivativeFilesExist(directory: string): Promise<boolean> {
  return (
    await Promise.all(
      mediaVariants.map(([variant]) => exists(join(directory, `${variant}.webp`))),
    )
  ).every(Boolean);
}

async function hashFile(path: string): Promise<string> {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest('hex');
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function main(): Promise<void> {
  const [sourcePath, storageRoot, sessionUuid, photoId] = process.argv.slice(2);
  if (!sourcePath || !storageRoot || !sessionUuid || !photoId) {
    throw new Error('Usage: pnpm media:process <sourcePath> <storageRoot> <sessionUuid> <photoId>');
  }
  const result = await processMediaJob({ sourcePath, storageRoot, sessionUuid, photoId });
  await writeManifest(storageRoot, sessionUuid, [result]);
  process.stdout.write(
    `${JSON.stringify({
      status: result.state,
      photoId: result.photoId,
      contentHash: result.contentHash,
      recipeKey: result.recipeKey,
      width: result.width,
      height: result.height,
      derivativeMetrics: result.derivativeMetrics,
    })}\n`,
  );
}

if (process.argv[1]?.endsWith('index.ts')) {
  void main().catch((error: unknown) => {
    process.stderr.write(
      `${JSON.stringify({
        code: 'media_processing_failed',
        message: error instanceof Error ? error.message : 'Unknown media processing error.',
      })}\n`,
    );
    process.exitCode = 1;
  });
}
