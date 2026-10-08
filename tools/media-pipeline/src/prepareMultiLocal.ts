import { randomBytes, randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { processMediaJobs, writeManifest } from './index.js';
import { mediaWorkerFingerprint } from './recipe.js';
import { filterSourceDirectory } from './sourceFilter.js';
import { toLocalTestPhoto } from './prepareLocal.js';
import type { LocalTestMediaConfig } from './prepareLocal.js';
import type { SourceFilterCounts } from './sourceFilter.js';

interface ClientDefinition {
  readonly alias: string;
  readonly displayName: string;
  readonly sourceDirectory: string;
}

interface MultiClientConfigFile {
  readonly storageRoot?: string;
  readonly clients: readonly ClientDefinition[];
}

interface RegisteredClientSession {
  readonly alias: string;
  readonly sessionId: string;
  readonly publicToken: string;
  readonly displayName: string;
  readonly storageDirectory: string;
  readonly configPath: string;
  readonly readyCount: number;
}

interface MultiClientRegistry {
  readonly version: 2;
  readonly worker: typeof mediaWorkerFingerprint;
  readonly storageRoot: string;
  readonly sessions: readonly RegisteredClientSession[];
}

interface ClientPreparationReport {
  readonly alias: string;
  readonly displayName: string;
  readonly sessionId: string;
  readonly publicToken: string;
  readonly counts: SourceFilterCounts & {
    readonly processed: number;
    readonly failed: number;
  };
  readonly metrics: {
    readonly originalBytes: number;
    readonly derivedBytes: number;
    readonly compressionRatioPercent: number;
    readonly durationMs: number;
    readonly cacheHit: boolean;
  };
}

export interface MultiClientPreparationSummary {
  readonly status: 'ready';
  readonly storageRoot: string;
  readonly clients: readonly ClientPreparationReport[];
  readonly totalEligiblePhotos: number;
  readonly totalProcessedPhotos: number;
  readonly registryPath: string;
}

export interface PrepareMultiLocalMediaOptions {
  readonly configPath: string;
  readonly concurrency?: number;
  readonly overrideStorageRoot?: string;
}

function defaultGalleryLabStorageRoot(): string {
  const localAppData = process.env.LOCALAPPDATA;
  if (localAppData) {
    return join(localAppData, 'ChristmasGames', 'gallery-lab');
  }
  return join(tmpdir(), 'ChristmasGames', 'gallery-lab');
}

export async function prepareMultiLocalMedia(
  options: PrepareMultiLocalMediaOptions,
): Promise<MultiClientPreparationSummary> {
  const rawConfig = await readFile(resolve(options.configPath), 'utf8');
  const parsed = JSON.parse(rawConfig) as MultiClientConfigFile;

  if (!Array.isArray(parsed.clients) || parsed.clients.length === 0) {
    throw new Error('Config file must declare a non-empty "clients" array.');
  }

  // An operator-supplied alias becomes a directory segment. Reject slashes,
  // dot segments and mixed-case surprises before creating any storage path.
  const safeAlias = /^[a-z0-9][a-z0-9-]{0,63}$/;
  const aliases = new Set<string>();
  for (const client of parsed.clients) {
    if (
      !client ||
      typeof client.alias !== 'string' ||
      typeof client.displayName !== 'string' ||
      typeof client.sourceDirectory !== 'string' ||
      !client.displayName.trim() ||
      !client.sourceDirectory.trim()
    ) {
      throw new Error('Each client must declare "alias", "displayName", and "sourceDirectory".');
    }
    if (!safeAlias.test(client.alias)) {
      throw new Error('Client alias must be a safe lowercase slug.');
    }
    if (aliases.has(client.alias)) {
      throw new Error(`Duplicate client alias in configuration: ${client.alias}`);
    }
    aliases.add(client.alias);
  }

  const storageRoot = resolve(
    options.overrideStorageRoot ?? parsed.storageRoot ?? defaultGalleryLabStorageRoot(),
  );
  await mkdir(storageRoot, { recursive: true });

  const registryPath = join(storageRoot, 'local-test-registry.json');
  const existingRegistry = await loadExistingRegistry(registryPath);

  const concurrency = options.concurrency ?? 2;
  const clientReports: ClientPreparationReport[] = [];
  const registeredSessions: RegisteredClientSession[] = [];

  for (const client of parsed.clients) {
    const existing = existingRegistry?.sessions.find((entry) => entry.alias === client.alias);
    const sessionId = existing?.sessionId ?? randomUUID();
    const publicToken = existing?.publicToken ?? randomBytes(16).toString('hex');

    const clientStorageDirectory = join(storageRoot, 'clients', client.alias);
    await mkdir(clientStorageDirectory, { recursive: true });
    const clientConfigPath = join(clientStorageDirectory, 'local-test-session.json');
    const hadExistingSession = Boolean(existing) && (await pathExists(clientConfigPath));

    const filterResult = await filterSourceDirectory(resolve(client.sourceDirectory));
    const eligible = filterResult.eligible;

    if (eligible.length === 0) {
      throw new Error(
        `Client "${client.alias}" has no eligible photos directly in root directory.`,
      );
    }

    // Measure original size
    let originalBytes = 0;
    for (const item of eligible) {
      const s = await stat(item.sourcePath);
      originalBytes += s.size;
    }

    const startTime = Date.now();
    const batch = await processMediaJobs(
      eligible.map(({ sourcePath, photoId }) => ({
        sourcePath,
        storageRoot: clientStorageDirectory,
        sessionUuid: sessionId,
        photoId,
      })),
      concurrency,
    );

    await writeManifest(clientStorageDirectory, sessionId, [...batch.ready, ...batch.failed]);

    if (batch.failed.length > 0 || batch.ready.length !== eligible.length) {
      await rm(clientConfigPath, { force: true });
      throw new Error(
        `Preparation for client "${client.alias}" failed closed: ${batch.ready.length}/${eligible.length} ready, ${batch.failed.length} failed.`,
      );
    }

    const photos = batch.ready.map(toLocalTestPhoto);
    const clientConfig: LocalTestMediaConfig = {
      version: 2,
      worker: mediaWorkerFingerprint,
      session: {
        id: sessionId,
        publicToken,
        displayName: client.displayName,
      },
      photos,
    };
    await writeJsonAtomically(clientConfigPath, clientConfig);

    const durationMs = Date.now() - startTime;
    let derivedBytes = 0;
    for (const photo of photos) {
      derivedBytes +=
        photo.variantMetrics.thumb.byteLength +
        photo.variantMetrics.card.byteLength +
        photo.variantMetrics.game.byteLength;
    }

    const compressionRatioPercent =
      originalBytes > 0
        ? Math.round(((originalBytes - derivedBytes) / originalBytes) * 1000) / 10
        : 0;

    const report: ClientPreparationReport = {
      alias: client.alias,
      displayName: client.displayName,
      sessionId,
      publicToken,
      counts: {
        ...filterResult.counts,
        processed: batch.ready.length,
        failed: batch.failed.length,
      },
      metrics: {
        originalBytes,
        derivedBytes,
        compressionRatioPercent,
        durationMs,
        cacheHit: hadExistingSession && batch.ready.length === eligible.length,
      },
    };

    clientReports.push(report);
    registeredSessions.push({
      alias: client.alias,
      sessionId,
      publicToken,
      displayName: client.displayName,
      storageDirectory: clientStorageDirectory,
      configPath: clientConfigPath,
      readyCount: batch.ready.length,
    });
  }

  const updatedRegistry: MultiClientRegistry = {
    version: 2,
    worker: mediaWorkerFingerprint,
    storageRoot,
    sessions: registeredSessions,
  };
  await writeJsonAtomically(registryPath, updatedRegistry);

  return {
    status: 'ready',
    storageRoot,
    clients: clientReports,
    totalEligiblePhotos: clientReports.reduce((acc, c) => acc + c.counts.eligible, 0),
    totalProcessedPhotos: clientReports.reduce((acc, c) => acc + c.counts.processed, 0),
    registryPath,
  };
}

async function loadExistingRegistry(path: string): Promise<MultiClientRegistry | undefined> {
  try {
    const raw = await readFile(path, 'utf8');
    const parsed = JSON.parse(raw) as Partial<MultiClientRegistry>;
    if (parsed.version === 2 && Array.isArray(parsed.sessions)) {
      return parsed as MultiClientRegistry;
    }
    return undefined;
  } catch {
    return undefined;
  }
}

async function writeJsonAtomically(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const temporaryPath = `${path}.next-${randomUUID()}`;
  await writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  await rename(temporaryPath, path);
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}
