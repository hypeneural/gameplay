import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { processMediaJobs, writeManifest } from './index.js';
import { mediaRecipeKey, mediaWorkerFingerprint } from './recipe.js';
import { filterSourceDirectory } from './sourceFilter.js';
import type { MediaManifestEntry } from './index.js';
import type { MediaVariant, MediaVariantMetric } from './recipe.js';

const defaultPublicToken = 'local-private-test';
const defaultDisplayName = 'Galeria Natalina - laboratório local';

export interface LocalTestPhotoConfig {
  readonly id: string;
  readonly contentHash: string;
  readonly width: number;
  readonly height: number;
  readonly aspectRatio: number;
  readonly orientation: 'portrait' | 'landscape' | 'square';
  readonly variantMetrics: Record<MediaVariant, MediaVariantMetric>;
}

/**
 * This config deliberately contains no original filename or storage path. The
 * Vite-only local endpoint maps opaque photo ids back to the private cache.
 */
export interface LocalTestMediaConfig {
  readonly version: 2;
  readonly worker: typeof mediaWorkerFingerprint;
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
  readonly displayName?: string;
  readonly concurrency?: number;
}

export interface PrepareLocalMediaResult {
  readonly ready: number;
  readonly failed: number;
  readonly sessionId: string;
  readonly publicToken: string;
  readonly recipeKey: string;
  readonly configPath: string;
}

interface MutablePrepareLocalMediaOptions {
  sourceDirectory?: string;
  storageRoot?: string;
  sessionUuid?: string;
  displayName?: string;
  concurrency?: number;
}

interface SupportedSource {
  readonly sourcePath: string;
  readonly photoId: string;
}

/**
 * Creates an opaque, local-only session from immediate supported files. It
 * never walks child folders, so exports and delivery copies cannot leak into a
 * test game accidentally. The config is published only when every source is
 * ready; a partial batch removes any stale config and fails closed.
 */
export async function prepareLocalMedia(
  options: PrepareLocalMediaOptions,
): Promise<PrepareLocalMediaResult> {
  const concurrency = options.concurrency ?? 2;
  const files = await supportedFiles(options.sourceDirectory);
  if (files.length === 0) {
    throw new Error('No direct JPEG, PNG or WebP files were found for the local test session.');
  }
  const sessionUuid =
    options.sessionUuid ?? (await existingSessionUuid(options.storageRoot)) ?? randomUUID();
  const configPath = join(options.storageRoot, 'local-test-session.json');

  const batch = await processMediaJobs(
    files.map(({ sourcePath, photoId }) => ({
      sourcePath,
      storageRoot: options.storageRoot,
      sessionUuid,
      photoId,
    })),
    concurrency,
  );
  await writeManifest(options.storageRoot, sessionUuid, [...batch.ready, ...batch.failed]);

  if (batch.failed.length > 0 || batch.ready.length !== files.length) {
    await rm(configPath, { force: true });
    throw new Error(
      `Local gallery preparation failed closed: ${batch.ready.length}/${files.length} photos ready and ${batch.failed.length} failed.`,
    );
  }

  const config: LocalTestMediaConfig = {
    version: 2,
    worker: mediaWorkerFingerprint,
    session: {
      id: sessionUuid,
      publicToken: defaultPublicToken,
      displayName: options.displayName ?? defaultDisplayName,
    },
    photos: batch.ready.map(toLocalTestPhoto),
  };
  await writeJsonAtomically(configPath, config);

  return {
    ready: batch.ready.length,
    failed: 0,
    sessionId: sessionUuid,
    publicToken: defaultPublicToken,
    recipeKey: mediaRecipeKey,
    configPath,
  };
}

export function toLocalTestPhoto(entry: MediaManifestEntry): LocalTestPhotoConfig {
  if (
    entry.state !== 'ready' ||
    !entry.contentHash ||
    entry.recipeKey !== mediaRecipeKey ||
    !entry.width ||
    !entry.height ||
    !entry.aspectRatio ||
    !entry.orientation ||
    !entry.derivativeMetrics
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
    variantMetrics: entry.derivativeMetrics,
  };
}

async function supportedFiles(sourceDirectory: string): Promise<readonly SupportedSource[]> {
  const result = await filterSourceDirectory(sourceDirectory);
  return result.eligible.map(({ sourcePath, photoId }) => ({ sourcePath, photoId }));
}

async function existingSessionUuid(storageRoot: string): Promise<string | undefined> {
  try {
    const value = JSON.parse(
      await readFile(join(storageRoot, 'local-test-session.json'), 'utf8'),
    ) as {
      session?: { id?: unknown };
    };
    const id = value.session?.id;
    return typeof id === 'string' ? id : undefined;
  } catch {
    return undefined;
  }
}

async function writeJsonAtomically(path: string, value: LocalTestMediaConfig): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const temporaryPath = `${path}.next-${randomUUID()}`;
  await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  await rename(temporaryPath, path);
}

function parseArguments(argv: readonly string[]): PrepareLocalMediaOptions {
  const [first, second, ...legacyRest] = argv;
  if (first && !first.startsWith('--')) {
    if (!second) {
      throw new Error(
        'Usage: pnpm media:prepare-local <source-directory> <private-storage-root> [--session <uuid>] [--display-name <name>] [--concurrency <1-8>]',
      );
    }
    const parsed = parseFlags(legacyRest, {});
    return {
      sourceDirectory: first,
      storageRoot: second,
      ...(parsed.sessionUuid === undefined ? {} : { sessionUuid: parsed.sessionUuid }),
      ...(parsed.displayName === undefined ? {} : { displayName: parsed.displayName }),
      ...(parsed.concurrency === undefined ? {} : { concurrency: parsed.concurrency }),
    };
  }

  const parsed = parseFlags(argv, {});
  if (!parsed.sourceDirectory || !parsed.storageRoot) {
    throw new Error(
      'Usage: pnpm media:prepare-local --source <directory> --storage <private-storage-root> [--session <uuid>] [--display-name <name>] [--concurrency <1-8>]',
    );
  }
  return {
    sourceDirectory: parsed.sourceDirectory,
    storageRoot: parsed.storageRoot,
    ...(parsed.sessionUuid === undefined ? {} : { sessionUuid: parsed.sessionUuid }),
    ...(parsed.displayName === undefined ? {} : { displayName: parsed.displayName }),
    ...(parsed.concurrency === undefined ? {} : { concurrency: parsed.concurrency }),
  };
}

function parseFlags(
  values: readonly string[],
  initial: MutablePrepareLocalMediaOptions,
): MutablePrepareLocalMediaOptions {
  const options: MutablePrepareLocalMediaOptions = { ...initial };
  for (let index = 0; index < values.length; index += 2) {
    const flag = values[index];
    const value = values[index + 1];
    if (!flag || !value) throw new Error(`Expected a value after ${flag ?? 'option'}.`);
    if (flag === '--source') options.sourceDirectory = value;
    else if (flag === '--storage') options.storageRoot = value;
    else if (flag === '--session') options.sessionUuid = value;
    else if (flag === '--display-name') options.displayName = value;
    else if (flag === '--concurrency') options.concurrency = Number(value);
    else throw new Error(`Unknown media preparation option: ${flag}.`);
  }
  return options;
}

async function main(): Promise<void> {
  const result = await prepareLocalMedia(parseArguments(process.argv.slice(2)));
  process.stdout.write(
    `${JSON.stringify({
      status: 'ready',
      ready: result.ready,
      failed: result.failed,
      sessionId: result.sessionId,
      publicToken: result.publicToken,
      recipeKey: result.recipeKey,
      worker: mediaWorkerFingerprint,
    })}\n`,
  );
}

if (process.argv[1]?.endsWith('prepareLocal.ts')) {
  void main().catch((error: unknown) => {
    process.stderr.write(
      `${JSON.stringify({
        code: 'local_gallery_prepare_failed',
        message:
          error instanceof Error ? error.message : 'Unknown local gallery preparation error.',
      })}\n`,
    );
    process.exitCode = 1;
  });
}
