import { randomUUID } from 'node:crypto';
import { readdir, stat, writeFile, rename, mkdir } from 'node:fs/promises';
import { dirname, extname, join } from 'node:path';
import { processMediaJobs, writeManifest } from './index.js';
import type { MediaManifestEntry } from './index.js';

const supportedExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const defaultSessionUuid = '4d9d4b45-8ec3-45f1-91db-e46f3fec0c48';

export interface LocalTestPhotoConfig {
  readonly id: string;
  readonly contentHash: string;
  readonly width: number;
  readonly height: number;
  readonly aspectRatio: number;
  readonly orientation: 'portrait' | 'landscape' | 'square';
}

/**
 * This config deliberately contains no original filename or storage path. The
 * Vite-only local endpoint maps its opaque photo ids back to the private cache.
 */
export interface LocalTestMediaConfig {
  readonly version: 1;
  readonly session: {
    readonly id: string;
    readonly publicToken: string;
    readonly displayName: string;
  };
  readonly photos: readonly LocalTestPhotoConfig[];
}

export interface PrepareLocalMediaOptions {
  readonly sourceDirectory: string;
  readonly storageRoot: string;
  readonly sessionUuid?: string;
  readonly concurrency?: number;
}

export interface PrepareLocalMediaResult {
  readonly ready: number;
  readonly failed: number;
  readonly configPath: string;
}

/**
 * Creates an opaque, local-only session from immediate supported files. It
 * never walks child folders, so exports and delivery copies cannot leak into a
 * test game accidentally.
 */
export async function prepareLocalMedia(
  options: PrepareLocalMediaOptions,
): Promise<PrepareLocalMediaResult> {
  const sessionUuid = options.sessionUuid ?? defaultSessionUuid;
  const concurrency = options.concurrency ?? 2;
  const files = await supportedFiles(options.sourceDirectory);
  if (files.length === 0) {
    throw new Error('No direct JPEG, PNG or WebP files were found for the local test session.');
  }

  const batch = await processMediaJobs(
    files.map((sourcePath, index) => ({
      sourcePath,
      storageRoot: options.storageRoot,
      sessionUuid,
      photoId: `photo-${String(index + 1).padStart(3, '0')}`,
    })),
    concurrency,
  );
  await writeManifest(options.storageRoot, sessionUuid, [...batch.ready, ...batch.failed]);

  const config: LocalTestMediaConfig = {
    version: 1,
    session: {
      id: sessionUuid,
      publicToken: 'local-private-test',
      displayName: 'Teste local privado',
    },
    photos: batch.ready.map(toLocalTestPhoto),
  };
  const configPath = join(options.storageRoot, 'local-test-session.json');
  await writeJsonAtomically(configPath, config);

  return { ready: batch.ready.length, failed: batch.failed.length, configPath };
}

function toLocalTestPhoto(entry: MediaManifestEntry): LocalTestPhotoConfig {
  if (
    entry.state !== 'ready' ||
    !entry.contentHash ||
    !entry.width ||
    !entry.height ||
    !entry.aspectRatio ||
    !entry.orientation
  ) {
    throw new Error('A ready media entry is missing data required for a local test session.');
  }
  return {
    id: entry.photoId,
    contentHash: entry.contentHash,
    width: entry.width,
    height: entry.height,
    aspectRatio: entry.aspectRatio,
    orientation: entry.orientation,
  };
}

async function supportedFiles(sourceDirectory: string): Promise<readonly string[]> {
  const entries = await readdir(sourceDirectory, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && supportedExtensions.has(extname(entry.name).toLowerCase()))
    .sort((left, right) => left.name.localeCompare(right.name))
    .map((entry) => join(sourceDirectory, entry.name));

  await Promise.all(
    files.map(async (path) => {
      if (!(await stat(path)).isFile())
        throw new Error('Local test media source must be a regular file.');
    }),
  );
  return files;
}

async function writeJsonAtomically(path: string, value: LocalTestMediaConfig): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const temporaryPath = `${path}.next-${randomUUID()}`;
  await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  await rename(temporaryPath, path);
}

function parseArguments(argv: readonly string[]): PrepareLocalMediaOptions {
  const [sourceDirectory, storageRoot, ...rest] = argv;
  if (!sourceDirectory || !storageRoot) {
    throw new Error(
      'Usage: pnpm media:prepare-local <source-directory> <private-storage-root> [--session <uuid>] [--concurrency <1-8>]',
    );
  }

  let sessionUuid: string | undefined;
  let concurrency: number | undefined;
  for (let index = 0; index < rest.length; index += 2) {
    const flag = rest[index];
    const value = rest[index + 1];
    if (!value || (flag !== '--session' && flag !== '--concurrency')) {
      throw new Error('Expected --session <uuid> and/or --concurrency <1-8>.');
    }
    if (flag === '--session') sessionUuid = value;
    else concurrency = Number(value);
  }
  return {
    sourceDirectory,
    storageRoot,
    ...(sessionUuid === undefined ? {} : { sessionUuid }),
    ...(concurrency === undefined ? {} : { concurrency }),
  };
}

async function main(): Promise<void> {
  const result = await prepareLocalMedia(parseArguments(process.argv.slice(2)));
  console.log(`Prepared ${result.ready} local test photos; ${result.failed} failed.`);
}

if (process.argv[1]?.endsWith('prepareLocal.ts')) {
  void main();
}
