import { createHash, randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { access, copyFile, mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import sharp, { type Sharp } from 'sharp';
import { z } from 'zod';

const MAX_INPUT_PIXELS = 40_000_000;
const MAX_INPUT_CHANNELS = 5;
const MAX_INPUT_BYTES = 32 * 1024 * 1024;
const supportedFormats = new Set(['jpeg', 'png', 'webp']);
const derivativeVariants = [
  ['thumb', 480],
  ['card', 800],
  ['game', 1600],
] as const;
const opaquePhotoId = z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/);

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
  width?: number;
  height?: number;
  aspectRatio?: number;
  orientation?: 'portrait' | 'landscape' | 'square';
  derivatives?: Record<'thumb' | 'card' | 'game', string>;
  error?: string;
}

export interface MediaManifest {
  version: 1;
  entries: readonly MediaManifestEntry[];
}

export interface MediaBatchResult {
  ready: readonly MediaManifestEntry[];
  failed: readonly MediaManifestEntry[];
}

const mediaManifestEntrySchema = z.object({
  photoId: opaquePhotoId,
  state: z.enum(['pending', 'processing', 'ready', 'failed']),
  contentHash: z.string().optional(),
  width: z.number().positive().optional(),
  height: z.number().positive().optional(),
  aspectRatio: z.number().positive().optional(),
  orientation: z.enum(['portrait', 'landscape', 'square']).optional(),
  derivatives: z.object({ thumb: z.string(), card: z.string(), game: z.string() }).optional(),
  error: z.string().optional(),
});
const mediaManifestSchema = z.object({
  version: z.literal(1),
  entries: z.array(mediaManifestEntrySchema),
});

function mediaPaths(job: MediaJob, contentHash: string) {
  // Content-addressing originals prevents a reused photoId from silently
  // serving stale pixels after a photographer replaces a source file.
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

  await ensureDerivatives(image, derivedDirectory);

  const width = metadata.autoOrient.width;
  const height = metadata.autoOrient.height;
  return {
    photoId: job.photoId,
    state: 'ready',
    contentHash,
    width,
    height,
    aspectRatio: width / height,
    orientation: classifyOrientation(width, height),
    derivatives: {
      thumb: join(derivedDirectory, 'thumb.webp'),
      card: join(derivedDirectory, 'card.webp'),
      game: join(derivedDirectory, 'game.webp'),
    },
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
 * Upserts entries rather than replacing a session manifest. This fixes the
 * one-photo CLI path while preserving atomic publication per local writer.
 * A distributed worker must still add a DB/queue lease before concurrent use.
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
    version: 1,
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
  if (!(await exists(manifestPath))) return { version: 1, entries: [] };
  const parsed: unknown = JSON.parse(await readFile(manifestPath, 'utf8'));
  const manifest = mediaManifestSchema.parse(parsed);
  return {
    version: manifest.version,
    entries: manifest.entries.map((entry) => ({
      photoId: entry.photoId,
      state: entry.state,
      ...(entry.contentHash === undefined ? {} : { contentHash: entry.contentHash }),
      ...(entry.width === undefined ? {} : { width: entry.width }),
      ...(entry.height === undefined ? {} : { height: entry.height }),
      ...(entry.aspectRatio === undefined ? {} : { aspectRatio: entry.aspectRatio }),
      ...(entry.orientation === undefined ? {} : { orientation: entry.orientation }),
      ...(entry.derivatives === undefined ? {} : { derivatives: entry.derivatives }),
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
    await rename(temporaryPath, originalPath);
  } catch (error) {
    if (!(await exists(originalPath))) throw error;
    if ((await hashFile(originalPath)) !== contentHash) throw error;
  }
}

async function ensureDerivatives(image: Sharp, derivedDirectory: string): Promise<void> {
  if (await allDerivativesAreValid(derivedDirectory)) return;
  if (await exists(derivedDirectory)) {
    throw new Error(
      'Derived directory exists but is incomplete or invalid; do not publish a partial media set.',
    );
  }

  const stagingDirectory = `${derivedDirectory}.staging-${randomUUID()}`;
  await mkdir(stagingDirectory, { recursive: true });
  const oriented = image.clone().autoOrient();
  const generated = await Promise.all(
    derivativeVariants.map(async ([variant, maxSize]) => {
      const output = await oriented
        .clone()
        .resize({ width: maxSize, height: maxSize, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 82 })
        .toFile(join(stagingDirectory, `${variant}.webp`));
      return { maxSize, output };
    }),
  );
  if (
    !generated.every(
      ({ maxSize, output }) =>
        output.format === 'webp' &&
        Boolean(output.width && output.height) &&
        output.width <= maxSize &&
        output.height <= maxSize,
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
}

async function allDerivativesAreValid(directory: string): Promise<boolean> {
  const checks = await Promise.all(
    derivativeVariants.map(async ([variant, maxSize]) => {
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
      derivativeVariants.map(([variant]) => exists(join(directory, `${variant}.webp`))),
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
  console.log(`Processed ${basename(sourcePath)} as ${result.photoId}.`);
}

if (process.argv[1]?.endsWith('index.ts')) {
  void main();
}
