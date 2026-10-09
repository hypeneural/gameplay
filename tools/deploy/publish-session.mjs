import { createHash, randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { appendFile, readFile } from 'node:fs/promises';
import { join } from 'node:path';
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

/**
 * Executes full publication flow against the catalog-server internal API.
 */
export async function publishSession(options) {
  const startTime = Date.now();
  const { apiOrigin, apiSecret, crmOrderUuid, logFile } = options;

  if (!UUID_PATTERN.test(crmOrderUuid)) {
    throw new Error('PUBLISHER_ORDER_UUID_INVALID');
  }

  const normalizedOrigin = apiOrigin.replace(/\/+$/, '');
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

  // Step 4: Upload all pending blobs
  let totalBytesUploaded = 0;
  for (const blobId of pendingBlobIds) {
    const filePath = blobFileMap.get(blobId);
    if (!filePath) {
      throw new Error(`No file mapping found for pending blob ${blobId}`);
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

    if (!uploadRes.ok && uploadRes.status !== 201) {
      throw new Error(`PUBLISHER_UPLOAD_HTTP_${uploadRes.status}`);
    }

    totalBytesUploaded += fileBytes.byteLength;
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
  let accessUrl;
  try {
    accessUrl = new URL(receiptData.accessUrl);
  } catch {
    throw new Error('PUBLICATION_ACCESS_URL_INVALID');
  }
  if (
    accessUrl.protocol !== 'https:' ||
    accessUrl.hostname !== 'jogos.fotosdenatal.com' ||
    accessUrl.port ||
    accessUrl.search ||
    accessUrl.hash ||
    !new RegExp('^[/]s[/][A-Za-z0-9_-]{16,128}$').test(accessUrl.pathname)
  ) {
    throw new Error('PUBLICATION_ACCESS_URL_INVALID');
  }
  const durationMs = Date.now() - startTime;

  const receipt = {
    status: 'ACTIVE',
    crmOrderUuid,
    sessionId,
    revisionId,
    publicToken: receiptData.publicToken,
    accessUrl: accessUrl.href,
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
    } else if (arg === '--api-secret' && next) {
      apiSecret = next;
      i++;
    } else if (arg === '--crm-order-uuid' && next) {
      crmOrderUuid = next;
      i++;
    } else if (arg === '--log-file' && next) {
      logFile = next;
      i++;
    }
  }

  if (!apiSecret) {
    throw new Error(
      'Missing publisher API secret. Provide --api-secret or set PUBLISHER_API_SECRET.',
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
  };
}

async function main() {
  const options = parseCliArgs(process.argv.slice(2));
  const receipt = await publishSession(options);
  process.stdout.write(`${JSON.stringify(receipt, null, 2)}\n`);
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
