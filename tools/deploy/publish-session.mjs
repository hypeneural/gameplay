import { createHash, randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import {
  appendFile,
  link,
  lstat,
  open,
  readFile,
  rename,
  unlink,
  writeFile,
} from 'node:fs/promises';
import { isAbsolute, join } from 'node:path';
import { URL } from 'node:url';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function fingerprintPreparedManifest(manifest) {
  const stablePhotos = manifest.photos.map((photo) => ({
    photoId: photo.photoId,
    contentHash: photo.contentHash,
    sortIndex: photo.sortIndex,
    variants: ['thumb', 'card', 'game'].map((name) => {
      const variant = photo.variants[name];
      return [name, variant.sha256, variant.byteLength, variant.width, variant.height];
    }),
  }));
  return createHash('sha256')
    .update(JSON.stringify([manifest.sessionId, manifest.recipeKey, stablePhotos]))
    .digest('hex');
}

async function checkpointPublication(options, built) {
  const storage = options.storageRoot ?? options.blobsDir;
  if (!storage) throw new Error('PUBLISHER_PRIVATE_STORAGE_REQUIRED');
  const file = join(storage, '.publication-checkpoint.json');
  const sourceHash = fingerprintPreparedManifest(built.manifest);
  let state;
  try {
    state = JSON.parse(await readFile(file, 'utf8'));
  } catch (error) {
    if (error?.code !== 'ENOENT') {
      throw new Error('PUBLISHER_CHECKPOINT_INVALID', { cause: error });
    }
  }
  if (!state) {
    const tempFile = `${file}.tmp-${randomUUID()}`;
    try {
      const checkpoint = {
        version: 1,
        orderUuid: options.crmOrderUuid,
        sourceHash,
        manifest: built.manifest,
      };
      await writeFile(tempFile, JSON.stringify(checkpoint), { mode: 0o600, flag: 'wx' });
      await rename(tempFile, file);
    } finally {
      await unlink(tempFile).catch(() => undefined);
    }
    return built;
  }
  const saved = state.manifest;
  if (
    state.version !== 1 ||
    state.orderUuid !== options.crmOrderUuid ||
    state.sourceHash !== sourceHash ||
    !saved ||
    !UUID_PATTERN.test(saved.requestId ?? '') ||
    fingerprintPreparedManifest(saved) !== sourceHash
  ) {
    throw new Error('PUBLISHER_CHECKPOINT_CONFLICT');
  }
  const blobFileMap = new Map();
  for (let i = 0; i < built.manifest.photos.length; i++) {
    const current = built.manifest.photos[i];
    const previous = saved.photos[i];
    if (!previous || previous.photoId !== current.photoId) {
      throw new Error('PUBLISHER_CHECKPOINT_CONFLICT');
    }
    for (const name of ['thumb', 'card', 'game']) {
      const from = current.variants[name].blobId;
      const to = previous.variants?.[name]?.blobId;
      const localFile = built.blobFileMap.get(from);
      if (!to || !UUID_PATTERN.test(to) || !localFile) {
        throw new Error('PUBLISHER_CHECKPOINT_CONFLICT');
      }
      blobFileMap.set(to, localFile);
    }
  }
  return { manifest: saved, blobFileMap };
}

function findVariantFile(storageRoot, parsed, photo, variantName) {
  const directPath = join(storageRoot, 'derived', photo.id, `${variantName}.webp`);
  if (existsSync(directPath)) return directPath;

  const recipeKey = parsed.worker?.recipeKey ?? '';
  const sessionId = parsed.session?.id ?? '';
  const fullPipelinePath = join(
    storageRoot,
    'derived',
    sessionId,
    photo.id,
    photo.contentHash,
    recipeKey,
    `${variantName}.webp`,
  );
  if (existsSync(fullPipelinePath)) return fullPipelinePath;

  throw new Error(
    `Cannot find variant file for photo ${photo.id} (${variantName}). Checked ${directPath} and ${fullPipelinePath}`,
  );
}

export async function appendStructuredLog(logFile, event) {
  if (!logFile) return;
  const entry = JSON.stringify({
    timestamp: new Date().toISOString(),
    ...event,
  });
  await appendFile(logFile, `${entry}\n`, 'utf-8');
}

/**
 * Builds a PublicationManifestV1 from a local-test-session.json configuration file.
 */
export async function buildManifestFromLocalConfig(
  configPath,
  storageRoot,
  sessionId,
  expectedActiveRevisionId,
) {
  const content = await readFile(configPath, 'utf-8');
  const parsed = JSON.parse(content);
  if (!Array.isArray(parsed.photos) || parsed.photos.length === 0) {
    throw new Error('Local media config does not contain any photos.');
  }

  const blobFileMap = new Map();
  const photos = [];

  for (let sortIndex = 0; sortIndex < parsed.photos.length; sortIndex++) {
    const photo = parsed.photos[sortIndex];
    const photoId = photo.id;
    const variants = {};

    for (const variantName of ['thumb', 'card', 'game']) {
      const metric = photo.variantMetrics?.[variantName];
      if (!metric) {
        throw new Error(`Photo ${photoId} is missing variant metric for ${variantName}.`);
      }
      const blobId = randomUUID();
      const variantFilePath = findVariantFile(storageRoot, parsed, photo, variantName);
      const fileBytes = await readFile(variantFilePath);
      const sha256 = createHash('sha256').update(fileBytes).digest('hex');
      const byteLength = fileBytes.byteLength;
      if (
        (metric.sha256 && metric.sha256.toLowerCase() !== sha256) ||
        (metric.byteLength !== undefined && metric.byteLength !== byteLength)
      ) {
        throw new Error('DERIVATIVE_INTEGRITY_MISMATCH');
      }

      blobFileMap.set(blobId, variantFilePath);
      variants[variantName] = {
        blobId,
        sha256,
        byteLength,
        width: metric.width,
        height: metric.height,
      };
    }

    photos.push({
      photoId,
      contentHash: photo.contentHash,
      sortIndex,
      width: photo.width,
      height: photo.height,
      variants,
    });
  }

  const recipeKey =
    typeof parsed.worker?.recipeKey === 'string' ? parsed.worker.recipeKey : 'christmas-2026-v1';

  const manifest = {
    schemaVersion: 1,
    requestId: randomUUID(),
    sessionId,
    expectedActiveRevisionId: expectedActiveRevisionId ?? null,
    recipeKey,
    photos,
  };

  return { manifest, blobFileMap };
}

export function isPidAlive(pid) {
  if (typeof pid !== 'number' || !Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    return err?.code === 'EPERM';
  }
}

async function acquirePublicationLock(privateRoot, options) {
  const lockPath = join(privateRoot, '.publication-running.lock');
  let lock;
  try {
    lock = await open(lockPath, 'wx', 0o600);
  } catch (error) {
    if (error?.code === 'EEXIST') {
      let lockInfo;
      try {
        const content = await readFile(lockPath, 'utf8');
        lockInfo = JSON.parse(content);
      } catch {
        // Lock file is unreadable or malformed
      }

      const activePid = typeof lockInfo?.pid === 'number' ? lockInfo.pid : undefined;
      const processAlive = activePid !== undefined && isPidAlive(activePid);

      if (processAlive) {
        throw new Error('PUBLISHER_ALREADY_RUNNING', { cause: error });
      }

      // Process is NOT alive -> Stale lock detected
      if (!options.recoverStaleLock) {
        throw new Error('PUBLISHER_STALE_LOCK_DETECTED', { cause: error });
      }

      // Supervised recovery requested: unlink dead lock and retry open
      await unlink(lockPath).catch(() => undefined);
      try {
        lock = await open(lockPath, 'wx', 0o600);
      } catch (retryError) {
        if (retryError?.code === 'EEXIST') {
          throw new Error('PUBLISHER_ALREADY_RUNNING', { cause: retryError });
        }
        throw new Error('PUBLISHER_LOCK_UNAVAILABLE', { cause: retryError });
      }
    } else {
      throw new Error('PUBLISHER_LOCK_UNAVAILABLE', { cause: error });
    }
  }

  await lock.writeFile(JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }));
  return {
    release: async () => {
      try {
        await lock.close();
      } catch {
        // Ignore close errors
      }
      await unlink(lockPath).catch(() => undefined);
    },
  };
}

/**
 * Executes full publication flow against the catalog-server internal API.
 */
export async function publishSession(options) {
  // Lock the whole transaction, not only checkpoint creation.
  if (!UUID_PATTERN.test(options.crmOrderUuid ?? '')) {
    throw new Error('PUBLISHER_ORDER_UUID_INVALID');
  }
  const privateRoot = options.storageRoot ?? options.blobsDir;
  if (!privateRoot) throw new Error('PUBLISHER_PRIVATE_STORAGE_REQUIRED');
  const lockHandle = await acquirePublicationLock(privateRoot, options);
  try {
    return await publishSessionUnlocked(options);
  } finally {
    await lockHandle.release();
  }
}

/** Restrict Bearer-secret transport to local/private publishers or an explicit TLS allowlist. */
export function validatePrivatePublisherOrigin(value) {
  let origin;
  try {
    origin = new URL(value);
  } catch {
    throw new Error('PUBLISHER_ORIGIN_INVALID');
  }
  const host = origin.hostname.toLowerCase();
  const loopback = host === 'localhost' || host === '127.0.0.1' || host === '[::1]';
  const octets = host.split('.').map(Number);
  const tailscale =
    octets.length === 4 &&
    octets.every((part) => Number.isInteger(part) && part >= 0 && part <= 255) &&
    octets[0] === 100 &&
    octets[1] >= 64 &&
    octets[1] <= 127;
  const explicit = process.env.PUBLISHER_ALLOWED_PRIVATE_ORIGIN?.replace(/\/+$/, '');
  const allowedPrivateOrigin = Boolean(explicit) && origin.origin === explicit;
  const allowedTlsOrigin = origin.protocol === 'https:' && allowedPrivateOrigin;
  const allowedPeerOrigin = tailscale && allowedPrivateOrigin;
  if (
    !['http:', 'https:'].includes(origin.protocol) ||
    origin.username ||
    origin.password ||
    origin.pathname !== '/' ||
    origin.search ||
    origin.hash ||
    !(loopback || allowedPeerOrigin || allowedTlsOrigin) ||
    (origin.protocol === 'http:' && !(loopback || allowedPeerOrigin))
  ) {
    throw new Error('PUBLISHER_ORIGIN_NOT_PRIVATE');
  }
  return origin.origin;
}

/** Concurrency is opt-in for measured canaries; default remains sequential. */
export function validateUploadConcurrency(input) {
  const value = input ?? 1;
  if (typeof value !== 'number' && typeof value !== 'string') {
    throw new Error('PUBLISHER_UPLOAD_CONCURRENCY_INVALID');
  }
  if (typeof value === 'string' && !/^[1-3]$/.test(value)) {
    throw new Error('PUBLISHER_UPLOAD_CONCURRENCY_INVALID');
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 3) {
    throw new Error('PUBLISHER_UPLOAD_CONCURRENCY_INVALID');
  }
  return parsed;
}

async function publishSessionUnlocked(options) {
  const startTime = Date.now();
  const { apiOrigin, apiSecret, crmOrderUuid, logFile } = options;

  if (!UUID_PATTERN.test(crmOrderUuid)) {
    throw new Error('PUBLISHER_ORDER_UUID_INVALID');
  }

  const normalizedOrigin = validatePrivatePublisherOrigin(apiOrigin);
  const headers = {
    Authorization: 'Bearer ' + apiSecret,
    'Content-Type': 'application/json',
  };

  await appendStructuredLog(logFile, {
    action: 'publish_session_start',
    // CRM order UUID is deliberately excluded from logs.
  });

  // Step 1: Resolve or create session
  const resolveRes = await fetch(`${normalizedOrigin}/internal/v1/sessions/resolve`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ crmOrderUuid }),
  });

  if (!resolveRes.ok) {
    throw new Error(`PUBLISHER_RESOLVE_HTTP_${resolveRes.status}`);
  }

  const sessionData = await resolveRes.json();
  const sessionId = sessionData.sessionId;
  const activeRevisionId = sessionData.activeRevisionId;

  await appendStructuredLog(logFile, {
    action: 'session_resolved',
    sessionId,
    hasActiveRevision: Boolean(activeRevisionId),
  });

  // Step 2: Build manifest and map blob files
  let manifest;
  let blobFileMap = new Map();

  if (options.storageRoot) {
    const configPath = join(options.storageRoot, 'local-test-session.json');
    const built = await buildManifestFromLocalConfig(
      configPath,
      options.storageRoot,
      sessionId,
      activeRevisionId,
    );
    manifest = built.manifest;
    blobFileMap = built.blobFileMap;
  } else if (options.manifestPath && options.blobsDir) {
    const content = await readFile(options.manifestPath, 'utf-8');
    manifest = {
      ...JSON.parse(content),
      sessionId,
      expectedActiveRevisionId: activeRevisionId ?? null,
      requestId: randomUUID(),
    };
    for (const photo of manifest.photos) {
      for (const variant of Object.values(photo.variants)) {
        blobFileMap.set(variant.blobId, join(options.blobsDir, `${variant.blobId}.webp`));
      }
    }
  } else {
    throw new Error('Either storageRoot or (manifestPath and blobsDir) must be provided.');
  }

  // Freeze requestId/blobIds before staging, so retries keep the same revision.
  const stable = await checkpointPublication(options, { manifest, blobFileMap });
  manifest = stable.manifest;
  blobFileMap = stable.blobFileMap;

  // Step 3: Begin publication
  const publishRes = await fetch(`${normalizedOrigin}/internal/v1/publications`, {
    method: 'POST',
    headers,
    body: JSON.stringify(manifest),
  });

  if (!publishRes.ok && publishRes.status !== 201) {
    throw new Error(`PUBLISHER_STAGE_HTTP_${publishRes.status}`);
  }

  const pubData = await publishRes.json();
  const revisionId = pubData.revisionId;
  const pendingBlobIds = pubData.pendingBlobIds;

  await appendStructuredLog(logFile, {
    action: 'publication_staged',
    revisionId,
    pendingBlobsCount: pendingBlobIds.length,
    readyBlobsCount: pubData.readyBlobs,
  });

  // Step 4: Upload pending blobs. Default one request; only increase
  // PUBLISHER_UPLOAD_CONCURRENCY after a measured synthetic canary. All
  // in-flight workers finish before a failure is returned, leaving the
  // private .inflight receipt reservation intact for reconciliation.
  const uploadConcurrency = validateUploadConcurrency(
    options.uploadConcurrency ?? process.env.PUBLISHER_UPLOAD_CONCURRENCY,
  );
  let totalBytesUploaded = 0;
  let nextBlobIndex = 0;
  let uploadFailure;

  const uploadWorker = async () => {
    while (nextBlobIndex < pendingBlobIds.length && !uploadFailure) {
      const blobId = pendingBlobIds[nextBlobIndex++];
      try {
        const filePath = blobFileMap.get(blobId);
        if (!filePath) {
          throw new Error('PUBLISHER_BLOB_FILE_MAPPING_MISSING');
        }
        const fileBytes = await readFile(filePath);
        const sha256 = createHash('sha256').update(fileBytes).digest('hex');
        const uploadRes = await fetch(
          `${normalizedOrigin}/internal/v1/publications/${revisionId}/blobs/${blobId}`,
          {
            method: 'PUT',
            headers: {
              Authorization: 'Bearer ' + apiSecret,
              'Content-Type': 'image/webp',
              'X-Content-SHA256': sha256,
            },
            body: new Uint8Array(fileBytes),
          },
        );
        if (!uploadRes.ok) {
          throw new Error(`PUBLISHER_UPLOAD_HTTP_${uploadRes.status}`);
        }
        totalBytesUploaded += fileBytes.byteLength;
      } catch (error) {
        // Finish already running requests; do not start more after an error.
        uploadFailure ??= error;
      }
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(uploadConcurrency, pendingBlobIds.length) }, () =>
      uploadWorker(),
    ),
  );
  if (uploadFailure) {
    throw uploadFailure;
  }

  // Step 5: Check publication status to ensure 100% readiness
  const statusRes = await fetch(`${normalizedOrigin}/internal/v1/publications/${revisionId}`, {
    method: 'GET',
    headers,
  });

  if (!statusRes.ok) {
    throw new Error(`PUBLISHER_STATUS_HTTP_${statusRes.status}`);
  }

  const finalStatus = await statusRes.json();
  if (finalStatus.pendingBlobIds.length > 0) {
    throw new Error(
      `Publication is not complete: ${finalStatus.pendingBlobIds.length} blobs still pending.`,
    );
  }

  // Step 6: Activate revision atomically
  const activateRes = await fetch(
    `${normalizedOrigin}/internal/v1/publications/${revisionId}/activate`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({ expectedActiveRevisionId: activeRevisionId }),
    },
  );

  if (!activateRes.ok) {
    throw new Error(`PUBLISHER_ACTIVATE_HTTP_${activateRes.status}`);
  }

  const receiptData = await activateRes.json();
  if (
    (receiptData.state ?? receiptData.status) !== 'ACTIVE' ||
    receiptData.revisionId !== revisionId ||
    (receiptData.sessionId && receiptData.sessionId !== sessionId)
  ) {
    throw new Error('PUBLICATION_ACTIVATION_RECEIPT_INVALID');
  }
  const { accessUrl, publicToken } = validateActivationAccessUrl(receiptData);
  const durationMs = Date.now() - startTime;

  const receipt = {
    status: 'ACTIVE',
    crmOrderUuid,
    sessionId,
    revisionId,
    publicToken,
    accessUrl: accessUrl.href,
    hubUrl: accessUrl.href,
    galleryUrl: `${accessUrl.href}/fotos`,
    photosCount: manifest.photos.length,
    blobsCount: finalStatus.readyBlobs,
    totalBytes: totalBytesUploaded,
    durationMs,
  };

  await appendStructuredLog(logFile, {
    action: 'publication_activated',
    sessionId,
    revisionId,
    photosCount: receipt.photosCount,
    blobsCount: receipt.blobsCount,
    totalBytes: totalBytesUploaded,
    durationMs,
  });

  return receipt;
}

function parseCliArgs(argv) {
  let storageRoot;
  let manifestPath;
  let blobsDir;
  let apiOrigin = process.env.PUBLISHER_API_ORIGIN ?? 'http://127.0.0.1:4180';
  let apiSecret = process.env.PUBLISHER_API_SECRET ?? '';
  let crmOrderUuid = process.env.CRM_ORDER_UUID ?? '';
  let logFile;
  let recoverStaleLock = false;
  let receiptFile;
  let showUrls = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === '--storage' && next) {
      storageRoot = next;
      i++;
    } else if (arg === '--manifest' && next) {
      manifestPath = next;
      i++;
    } else if (arg === '--blobs-dir' && next) {
      blobsDir = next;
      i++;
    } else if (arg === '--api-origin' && next) {
      apiOrigin = next;
      i++;
    } else if (arg === '--api-secret') {
      // Process listings and diagnostic collectors can expose CLI arguments.
      throw new Error('PUBLISHER_SECRET_CLI_FORBIDDEN_USE_ENV');
    } else if (arg === '--crm-order-uuid' && next) {
      crmOrderUuid = next;
      i++;
    } else if (arg === '--log-file' && next) {
      logFile = next;
      i++;
    } else if (arg === '--recover-stale-lock') {
      recoverStaleLock = true;
    } else if (arg === '--receipt-file' && next) {
      receiptFile = next;
      i++;
    } else if (arg === '--show-urls') {
      showUrls = true;
    }
  }

  if (!apiSecret) {
    throw new Error(
      'Missing publisher API secret. Set PUBLISHER_API_SECRET in a private environment.',
    );
  }
  if (!crmOrderUuid) {
    throw new Error('Missing CRM order UUID. Provide --crm-order-uuid or set CRM_ORDER_UUID.');
  }
  if (!storageRoot && (!manifestPath || !blobsDir)) {
    throw new Error(
      'Provide either --storage <dir> or both --manifest <file> and --blobs-dir <dir>.',
    );
  }

  return {
    storageRoot,
    manifestPath,
    blobsDir,
    apiOrigin,
    apiSecret,
    crmOrderUuid,
    logFile,
    recoverStaleLock,
    receiptFile,
    showUrls,
  };
}

/** Keep capability URL and token strictly identical even if API omits publicToken. */
export function validateActivationAccessUrl(receiptData) {
  let accessUrl;
  try {
    accessUrl = new URL(receiptData.accessUrl);
  } catch (error) {
    throw new Error('PUBLICATION_ACCESS_URL_INVALID', { cause: error });
  }
  if (
    accessUrl.protocol !== 'https:' ||
    accessUrl.hostname !== 'jogos.fotosdenatal.com' ||
    accessUrl.username ||
    accessUrl.password ||
    accessUrl.port ||
    accessUrl.search ||
    accessUrl.hash ||
    !/^\/s\/[A-Za-z0-9_-]{16,128}$/.test(accessUrl.pathname)
  ) {
    throw new Error('PUBLICATION_ACCESS_URL_INVALID');
  }
  const publicToken = accessUrl.pathname.slice('/s/'.length);
  if (receiptData.publicToken !== undefined && receiptData.publicToken !== publicToken) {
    throw new Error('PUBLICATION_ACTIVATION_RECEIPT_INVALID');
  }
  return { accessUrl, publicToken };
}

/** The receipt is an irreversible delivery fence, not a mutable status report.
 * Reserve before making any HTTP call. If publication fails or times out, leave
 * the .inflight file for manual remote reconciliation instead of blind replay.
 * Separate worktrees on the same private filesystem share this reservation.
 */
export async function reservePrivateReceipt(path) {
  if (!path || !isAbsolute(path)) {
    throw new Error('PUBLISHER_RECEIPT_REQUIRES_ABSOLUTE_PATH');
  }
  try {
    await lstat(path);
    throw new Error('PUBLISHER_RECEIPT_EXISTS_RECONCILE_MANUALLY');
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
  const marker = `${path}.inflight`;
  let handle;
  try {
    handle = await open(marker, 'wx', 0o600);
    await handle.writeFile(
      JSON.stringify({ schema: 1, pid: process.pid, startedAt: new Date().toISOString() }),
    );
    await handle.sync();
  } catch (error) {
    if (error?.code === 'EEXIST') {
      throw new Error('PUBLISHER_RECEIPT_INFLIGHT_RECONCILE_MANUALLY', { cause: error });
    }
    throw error;
  } finally {
    await handle?.close();
  }
  // Recheck after acquiring the exclusive marker (another process may have
  // completed before it could reserve this receipt).
  try {
    await lstat(path);
    throw new Error('PUBLISHER_RECEIPT_EXISTS_RECONCILE_MANUALLY');
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
  return async () => unlink(marker);
}

/** Exclusive and durable private receipt publication; never overwrite a
 * previously accepted access token/revision even during a race.
 */
export async function writePrivateReceipt(path, receipt) {
  const temporary = `${path}.tmp-${randomUUID()}`;
  try {
    const handle = await open(temporary, 'wx', 0o600);
    try {
      await handle.writeFile(JSON.stringify(receipt, null, 2), 'utf8');
      await handle.sync();
    } finally {
      await handle.close();
    }
    // Atomic no-replace on NTFS/POSIX when temp and receipt share a directory.
    // rename() would overwrite an existing receipt on some platforms.
    await link(temporary, path);
  } finally {
    await unlink(temporary).catch(() => undefined);
  }
}

async function main() {
  const options = parseCliArgs(process.argv.slice(2));
  if (options.showUrls) {
    throw new Error('PUBLISHER_URL_STDOUT_DISABLED_USE_RECEIPT_FILE');
  }
  if (!options.receiptFile || !isAbsolute(options.receiptFile)) {
    throw new Error('PUBLISHER_RECEIPT_REQUIRES_ABSOLUTE_PATH');
  }
  // Failure or timeout intentionally leaves .inflight for operator review.
  // Do not remove the reservation in a generic catch/finally branch.
  const releaseReservation = await reservePrivateReceipt(options.receiptFile);
  const receipt = await publishSession(options);
  await writePrivateReceipt(options.receiptFile, receipt);
  await releaseReservation();

  {
    const safeSummary = {
      status: receipt.status,
      sessionId: receipt.sessionId,
      revisionId: receipt.revisionId,
      photosCount: receipt.photosCount,
      blobsCount: receipt.blobsCount,
      totalBytes: receipt.totalBytes,
      durationMs: receipt.durationMs,
    };
    process.stdout.write(`${JSON.stringify(safeSummary, null, 2)}\n`);
  }
}

if (process.argv[1]?.endsWith('publish-session.mjs')) {
  main().catch((err) => {
    process.stderr.write(
      `${JSON.stringify({
        status: 'error',
        message: err instanceof Error ? err.message : String(err),
      })}\n`,
    );
    process.exit(1);
  });
}
