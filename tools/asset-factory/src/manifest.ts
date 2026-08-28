import { createHash } from 'node:crypto';
import { lstat, readdir, readFile } from 'node:fs/promises';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import {
  assetFormats,
  assetKinds,
  assetManifestVersion,
  assetReviewStates,
  legacyAssetManifestVersion,
  qualityBehaviors,
  type AssetAudit,
  type AssetBudget,
  type AssetBudgetTotals,
  type AssetManifest,
  type AssetManifestDocument,
  type AssetManifestV1,
  type AssetRecord,
  type AssetRecordV1,
  type AssetRuntime,
} from './contracts.js';

const gameIdPattern = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const assetIdPattern = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const sha256Pattern = /^[a-f0-9]{64}$/;
const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;
const safeReferencePattern = /^[A-Za-z0-9][A-Za-z0-9._/:# -]*$/;
const publicRoot = 'apps/play/public';

const legacyMigrationReview = {
  reviewedOn: '2026-08-25',
  reviewedBy: 'asset-factory-v1-migration',
} as const;

export function assetManifestRelativePath(gameId: string): string {
  assertGameId(gameId);
  return `packages/games/${gameId}/assets/manifest.json`;
}

export async function loadAssetManifest(
  root: string,
  gameId: string,
): Promise<AssetManifestDocument> {
  const relativePath = assetManifestRelativePath(gameId);
  const parsed: unknown = JSON.parse(await readFile(resolve(root, relativePath), 'utf8'));
  return parseAssetManifest(parsed, gameId);
}

/** Parses both published document versions without silently changing either one. */
export function parseAssetManifest(input: unknown, expectedGameId?: string): AssetManifestDocument {
  const value = object(input, 'manifest');
  const version = integer(value.version, 'manifest.version');
  if (version === legacyAssetManifestVersion) return parseAssetManifestV1(value, expectedGameId);
  if (version === assetManifestVersion) return parseAssetManifestV2(value, expectedGameId);
  throw new Error(
    `manifest.version must be ${legacyAssetManifestVersion} or ${assetManifestVersion}.`,
  );
}

/**
 * Produces a deterministic v2 document from v1. Files are read only to attach
 * the actual SHA-256; running it again on its v2 output returns that output.
 */
export async function migrateAssetManifest(
  root: string,
  manifest: AssetManifestDocument,
): Promise<AssetManifest> {
  if (manifest.version === assetManifestVersion) return manifest;

  const assets = await Promise.all(
    manifest.assets.map(async (asset) => ({
      id: asset.id,
      kind: asset.kind,
      format: asset.format,
      source: {
        provider:
          asset.provenance.source === 'project-created'
            ? 'internal-project'
            : 'owner-authorized-legacy-bundle',
        origin: asset.provenance.source,
        identifier: asset.id,
        license: asset.provenance.license,
        reviewedOn: legacyMigrationReview.reviewedOn,
        reviewedBy: legacyMigrationReview.reviewedBy,
        record: asset.provenance.record,
      },
      art: {
        family: 'christmas-photo-first',
        christmasFit: 'approved' as const,
        photoSafety: 'approved' as const,
        mobileLegibility: 'approved' as const,
        state: 'PRONTO_PARA_RUNTIME' as const,
        justification: `Migrado de v1 com proveniência ${asset.provenance.source}.`,
      },
      processing: {
        recipe: `migration-v1:${asset.provenance.record}`,
        tools: ['asset-factory-v1-migration'],
      },
      runtime: {
        file: asset.file,
        publicPath: asset.publicPath,
        bytes: asset.bytes,
        sha256: await sha256File(resolveWorkspaceFile(root, asset.file)),
        ...(asset.dimensions === undefined ? {} : { dimensions: asset.dimensions }),
        ...(asset.durationSeconds === undefined ? {} : { durationSeconds: asset.durationSeconds }),
        ...(asset.textureKey === undefined ? {} : { textureKey: asset.textureKey }),
        ...(asset.cue === undefined ? {} : { cue: asset.cue }),
        ...(asset.deliveryGroup === undefined ? {} : { deliveryGroup: asset.deliveryGroup }),
        quality: asset.quality,
      },
    })),
  );
  return {
    version: assetManifestVersion,
    gameId: manifest.gameId,
    budget: manifest.budget,
    assets,
  };
}

function parseAssetManifestV1(
  value: Record<string, unknown>,
  expectedGameId?: string,
): AssetManifestV1 {
  const { gameId, budget, assets } = parseManifestHeader(value, expectedGameId);
  return {
    version: legacyAssetManifestVersion,
    gameId,
    budget,
    assets: assets.map((asset, index) => parseAssetRecordV1(asset, gameId, index)),
  };
}

function parseAssetManifestV2(
  value: Record<string, unknown>,
  expectedGameId?: string,
): AssetManifest {
  const { gameId, budget, assets } = parseManifestHeader(value, expectedGameId);
  return {
    version: assetManifestVersion,
    gameId,
    budget,
    assets: assets.map((asset, index) => parseAssetRecordV2(asset, gameId, index)),
  };
}

function parseManifestHeader(
  value: Record<string, unknown>,
  expectedGameId?: string,
): { gameId: string; budget: AssetBudget; assets: readonly unknown[] } {
  const gameId = string(value.gameId, 'manifest.gameId');
  assertGameId(gameId);
  if (expectedGameId && gameId !== expectedGameId) {
    throw new Error(`manifest.gameId must match requested game "${expectedGameId}".`);
  }
  const budgetValue = object(value.budget, 'manifest.budget');
  const budget = {
    publicBytesMax: positiveInteger(budgetValue.publicBytesMax, 'manifest.budget.publicBytesMax'),
    runtimeBytesMax: positiveInteger(
      budgetValue.runtimeBytesMax,
      'manifest.budget.runtimeBytesMax',
    ),
    visualBytesMax: positiveInteger(budgetValue.visualBytesMax, 'manifest.budget.visualBytesMax'),
  };
  if (!Array.isArray(value.assets) || value.assets.length === 0) {
    throw new Error('manifest.assets must be a non-empty array.');
  }
  const ids = value.assets.map((asset, index) =>
    string(object(asset, `manifest.assets[${index}]`).id, `manifest.assets[${index}].id`),
  );
  if (new Set(ids).size !== ids.length)
    throw new Error('manifest.assets contains duplicate asset ids.');
  return { gameId, budget, assets: value.assets };
}

function parseAssetRecordV1(input: unknown, gameId: string, index: number): AssetRecordV1 {
  const label = `manifest.assets[${index}]`;
  const value = object(input, label);
  const common = parseAssetIdentity(value, gameId, label);
  const runtime = parseAssetRuntime(value, gameId, label, false, common.kind, common.format);
  const provenanceValue = object(value.provenance, `${label}.provenance`);
  const source = oneOf(
    provenanceValue.source,
    ['project-created', 'owner-authorized-legacy'] as const,
    `${label}.provenance.source`,
  );
  const license = oneOf(
    provenanceValue.license,
    ['project-owned'] as const,
    `${label}.provenance.license`,
  );
  const record = provenanceRecord(provenanceValue.record, `${label}.provenance.record`);
  return {
    ...common,
    file: runtime.file,
    publicPath: runtime.publicPath,
    bytes: runtime.bytes,
    ...(runtime.dimensions === undefined ? {} : { dimensions: runtime.dimensions }),
    ...(runtime.durationSeconds === undefined ? {} : { durationSeconds: runtime.durationSeconds }),
    ...(runtime.textureKey === undefined ? {} : { textureKey: runtime.textureKey }),
    ...(runtime.cue === undefined ? {} : { cue: runtime.cue }),
    ...(runtime.deliveryGroup === undefined ? {} : { deliveryGroup: runtime.deliveryGroup }),
    quality: runtime.quality,
    provenance: { source, license, record },
  };
}

function parseAssetRecordV2(input: unknown, gameId: string, index: number): AssetRecord {
  const label = `manifest.assets[${index}]`;
  const value = object(input, label);
  const common = parseAssetIdentity(value, gameId, label);
  const sourceValue = object(value.source, `${label}.source`);
  const source = {
    provider: reference(sourceValue.provider, `${label}.source.provider`),
    origin: oneOf(
      sourceValue.origin,
      ['project-created', 'owner-authorized-legacy'] as const,
      `${label}.source.origin`,
    ),
    identifier: reference(sourceValue.identifier, `${label}.source.identifier`),
    ...(sourceValue.referenceUrl === undefined
      ? {}
      : { referenceUrl: webReference(sourceValue.referenceUrl, `${label}.source.referenceUrl`) }),
    license: oneOf(sourceValue.license, ['project-owned'] as const, `${label}.source.license`),
    ...(sourceValue.licenseUrl === undefined
      ? {}
      : { licenseUrl: webReference(sourceValue.licenseUrl, `${label}.source.licenseUrl`) }),
    reviewedOn: isoDate(sourceValue.reviewedOn, `${label}.source.reviewedOn`),
    reviewedBy: reference(sourceValue.reviewedBy, `${label}.source.reviewedBy`),
    record: provenanceRecord(sourceValue.record, `${label}.source.record`),
  };
  const artValue = object(value.art, `${label}.art`);
  const art = {
    family: reference(artValue.family, `${label}.art.family`),
    christmasFit: oneOf(artValue.christmasFit, ['approved'] as const, `${label}.art.christmasFit`),
    photoSafety: oneOf(artValue.photoSafety, ['approved'] as const, `${label}.art.photoSafety`),
    mobileLegibility: oneOf(
      artValue.mobileLegibility,
      ['approved'] as const,
      `${label}.art.mobileLegibility`,
    ),
    state: oneOf(artValue.state, assetReviewStates, `${label}.art.state`),
    justification: text(artValue.justification, `${label}.art.justification`),
  };
  const processingValue = object(value.processing, `${label}.processing`);
  const tools = nonEmptyStringArray(processingValue.tools, `${label}.processing.tools`);
  const processing = {
    recipe: reference(processingValue.recipe, `${label}.processing.recipe`),
    tools,
  };
  return {
    ...common,
    source,
    art,
    processing,
    runtime: parseAssetRuntime(
      value.runtime,
      gameId,
      `${label}.runtime`,
      true,
      common.kind,
      common.format,
    ),
  };
}

function parseAssetIdentity(
  value: Record<string, unknown>,
  gameId: string,
  label: string,
): Pick<AssetRecord, 'id' | 'kind' | 'format'> {
  const id = string(value.id, `${label}.id`);
  if (!assetIdPattern.test(id)) throw new Error(`${label}.id must be lowercase kebab-case.`);
  return {
    id,
    kind: oneOf(value.kind, assetKinds, `${label}.kind`),
    format: oneOf(value.format, assetFormats, `${label}.format`),
  };
}

function parseAssetRuntime(
  input: unknown,
  gameId: string,
  label: string,
  requireHash: boolean,
  knownKind?: AssetRecord['kind'],
  knownFormat?: AssetRecord['format'],
): AssetRuntime {
  const value = object(input, label);
  const format = knownFormat ?? oneOf(value.format, assetFormats, `${label}.format`);
  const file = string(value.file, `${label}.file`);
  const publicPath = string(value.publicPath, `${label}.publicPath`);
  assertAssetLocation(file, publicPath, gameId, label);
  const expectedExtension = `.${format}`;
  if (!file.endsWith(expectedExtension) || !publicPath.endsWith(expectedExtension)) {
    throw new Error(`${label} file and publicPath must end in ${expectedExtension}.`);
  }
  const kind = knownKind ?? oneOf(value.kind, assetKinds, `${label}.kind`);
  const dimensions =
    value.dimensions === undefined
      ? undefined
      : {
          width: positiveInteger(
            object(value.dimensions, `${label}.dimensions`).width,
            `${label}.dimensions.width`,
          ),
          height: positiveInteger(
            object(value.dimensions, `${label}.dimensions`).height,
            `${label}.dimensions.height`,
          ),
        };
  const durationSeconds =
    value.durationSeconds === undefined
      ? undefined
      : positiveNumber(value.durationSeconds, `${label}.durationSeconds`);
  if (kind === 'audio' && durationSeconds === undefined) {
    throw new Error(`${label}.durationSeconds is required for audio.`);
  }
  if (kind !== 'audio' && dimensions === undefined) {
    throw new Error(`${label}.dimensions is required for visual assets.`);
  }
  const textureKey = optionalReference(value.textureKey, `${label}.textureKey`);
  const cue = optionalReference(value.cue, `${label}.cue`);
  if (kind === 'audio' ? cue === undefined : textureKey === undefined) {
    throw new Error(
      kind === 'audio'
        ? `${label}.cue is required for audio.`
        : `${label}.textureKey is required for visual assets.`,
    );
  }
  const deliveryGroup = optionalReference(value.deliveryGroup, `${label}.deliveryGroup`);
  const qualityValue = object(value.quality, `${label}.quality`);
  const sha256 =
    value.sha256 === undefined && !requireHash ? '' : hash(value.sha256, `${label}.sha256`);
  return {
    file,
    publicPath,
    bytes: positiveInteger(value.bytes, `${label}.bytes`),
    ...(requireHash ? { sha256 } : { sha256: '' }),
    ...(dimensions === undefined ? {} : { dimensions }),
    ...(durationSeconds === undefined ? {} : { durationSeconds }),
    ...(textureKey === undefined ? {} : { textureKey }),
    ...(cue === undefined ? {} : { cue }),
    ...(deliveryGroup === undefined ? {} : { deliveryGroup }),
    quality: {
      low: oneOf(qualityValue.low, qualityBehaviors, `${label}.quality.low`),
      reducedMotion: oneOf(
        qualityValue.reducedMotion,
        qualityBehaviors,
        `${label}.quality.reducedMotion`,
      ),
    },
  };
}

function calculateAssetBudget(assets: readonly AssetRecord[]): AssetBudgetTotals {
  const grouped = new Map<string, number>();
  let publicBytes = 0;
  let runtimeBytes = 0;
  let visualBytes = 0;
  for (const asset of assets) {
    const runtime = asset.runtime;
    publicBytes += runtime.bytes;
    if (asset.kind !== 'audio') visualBytes += runtime.bytes;
    if (runtime.deliveryGroup) {
      grouped.set(
        runtime.deliveryGroup,
        Math.max(grouped.get(runtime.deliveryGroup) ?? 0, runtime.bytes),
      );
    } else {
      runtimeBytes += runtime.bytes;
    }
  }
  for (const maximum of grouped.values()) runtimeBytes += maximum;
  return { publicBytes, runtimeBytes, visualBytes };
}

export async function auditAssetManifest(root: string, gameId: string): Promise<AssetAudit> {
  const document = await loadAssetManifest(root, gameId);
  const manifest = await migrateAssetManifest(root, document);
  const errors: string[] = [];
  const warnings: string[] = [];
  if (document.version === legacyAssetManifestVersion) {
    warnings.push(
      'Manifesto v1 lido por compatibilidade; registre o v2 migrado antes da próxima alteração.',
    );
  }
  const manifestFiles = new Set(manifest.assets.map((asset) => asset.runtime.file));
  for (const asset of manifest.assets) {
    const runtime = asset.runtime;
    const absolutePath = resolveWorkspaceFile(root, runtime.file);
    try {
      const facts = await lstat(absolutePath);
      if (!facts.isFile()) {
        errors.push(`${asset.id}: declared asset is not a regular file.`);
        continue;
      }
      if (facts.size !== runtime.bytes) {
        errors.push(`${asset.id}: declared ${runtime.bytes} bytes but found ${facts.size}.`);
      }
      if ((await sha256File(absolutePath)) !== runtime.sha256) {
        errors.push(`${asset.id}: SHA-256 does not match the declared runtime file.`);
      }
    } catch {
      errors.push(`${asset.id}: declared file is missing.`);
    }
    if (asset.art.state !== 'PRONTO_PARA_RUNTIME') {
      errors.push(`${asset.id}: art review state must be PRONTO_PARA_RUNTIME for public delivery.`);
    }
  }
  const assetRoot = resolveWorkspaceFile(root, `apps/play/public/assets/${gameId}`);
  const trackedFiles = await listRegularFiles(root, assetRoot);
  const untrackedFiles = trackedFiles
    .map((file) => workspaceRelativePath(root, file))
    .filter((file) => !manifestFiles.has(file))
    .sort();
  for (const file of untrackedFiles) errors.push(`untracked public asset: ${file}`);

  const totals = calculateAssetBudget(manifest.assets);
  if (totals.publicBytes > manifest.budget.publicBytesMax) {
    errors.push(
      `static public bytes ${totals.publicBytes} exceed budget ${manifest.budget.publicBytesMax}.`,
    );
  }
  if (totals.runtimeBytes > manifest.budget.runtimeBytesMax) {
    errors.push(
      `single-run bytes ${totals.runtimeBytes} exceed budget ${manifest.budget.runtimeBytesMax}.`,
    );
  }
  if (totals.visualBytes > manifest.budget.visualBytesMax) {
    errors.push(
      `visual bytes ${totals.visualBytes} exceed budget ${manifest.budget.visualBytesMax}.`,
    );
  }
  if (
    manifest.assets.some((asset) => asset.kind === 'vfx' && asset.runtime.quality.low === 'keep')
  ) {
    warnings.push(
      'A VFX asset is enabled in LOW; confirm it remains functional rather than decorative.',
    );
  }
  return { errors, warnings, untrackedFiles, totals };
}

async function sha256File(file: string): Promise<string> {
  return createHash('sha256')
    .update(await readFile(file))
    .digest('hex');
}

function assertAssetLocation(
  file: string,
  publicPath: string,
  gameId: string,
  label: string,
): void {
  const expectedFilePrefix = `${publicRoot}/assets/${gameId}/`;
  if (
    isAbsolute(file) ||
    file.includes('\\') ||
    !file.startsWith(expectedFilePrefix) ||
    file.includes('/../') ||
    file.startsWith('../')
  ) {
    throw new Error(`${label}.file must remain inside the public asset directory for this game.`);
  }
  const expectedPublicPath = `/${file.slice(publicRoot.length + 1)}`;
  if (publicPath !== expectedPublicPath) {
    throw new Error(`${label}.publicPath must mirror its public file location.`);
  }
}

function assertGameId(gameId: string): void {
  if (!gameIdPattern.test(gameId)) throw new Error('Game id must use lowercase kebab-case.');
}

function resolveWorkspaceFile(root: string, file: string): string {
  const resolvedRoot = resolve(root);
  const resolvedFile = resolve(resolvedRoot, file);
  const pathFromRoot = relative(resolvedRoot, resolvedFile);
  if (pathFromRoot === '' || pathFromRoot.startsWith(`..${sep}`) || isAbsolute(pathFromRoot)) {
    throw new Error('Asset manifest path resolves outside the workspace.');
  }
  return resolvedFile;
}

async function listRegularFiles(root: string, directory: string): Promise<readonly string[]> {
  try {
    const entries = await readdir(directory, { withFileTypes: true });
    const files: string[] = [];
    for (const entry of entries) {
      const next = resolve(directory, entry.name);
      if (entry.isDirectory()) files.push(...(await listRegularFiles(root, next)));
      else if (entry.isFile()) files.push(next);
      else
        throw new Error(
          `Public asset directory contains a non-file entry: ${workspaceRelativePath(root, next)}`,
        );
    }
    return files;
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return [];
    throw error;
  }
}

function workspaceRelativePath(root: string, file: string): string {
  return relative(resolve(root), file).split(sep).join('/');
}

function object(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error(`${label} must be an object.`);
  return value as Record<string, unknown>;
}

function string(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.length === 0)
    throw new Error(`${label} must be a non-empty string.`);
  return value;
}

function text(value: unknown, label: string): string {
  const result = string(value, label);
  if (result.length > 500) throw new Error(`${label} must contain at most 500 characters.`);
  return result;
}

function reference(value: unknown, label: string): string {
  const result = string(value, label);
  if (!safeReferencePattern.test(result))
    throw new Error(`${label} contains unsupported characters.`);
  return result;
}

function optionalReference(value: unknown, label: string): string | undefined {
  return value === undefined ? undefined : reference(value, label);
}

function provenanceRecord(value: unknown, label: string): string {
  const result = reference(value, label);
  if (!result.startsWith('ASSET_PROVENANCE.md#'))
    throw new Error(`${label} must point to ASSET_PROVENANCE.md.`);
  return result;
}

function webReference(value: unknown, label: string): string {
  const result = string(value, label);
  try {
    const url = new URL(result);
    if (url.protocol !== 'https:') throw new Error();
    return result;
  } catch {
    throw new Error(`${label} must be an HTTPS URL.`);
  }
}

function isoDate(value: unknown, label: string): string {
  const result = string(value, label);
  if (!isoDatePattern.test(result) || Number.isNaN(Date.parse(`${result}T00:00:00.000Z`))) {
    throw new Error(`${label} must be an ISO date (YYYY-MM-DD).`);
  }
  return result;
}

function hash(value: unknown, label: string): string {
  const result = string(value, label);
  if (!sha256Pattern.test(result))
    throw new Error(`${label} must be a lowercase SHA-256 hex digest.`);
  return result;
}

function nonEmptyStringArray(value: unknown, label: string): readonly string[] {
  if (!Array.isArray(value) || value.length === 0)
    throw new Error(`${label} must be a non-empty array.`);
  return value.map((entry, index) => reference(entry, `${label}[${index}]`));
}

function integer(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value))
    throw new Error(`${label} must be an integer.`);
  return value;
}

function positiveInteger(value: unknown, label: string): number {
  const result = integer(value, label);
  if (result < 1) throw new Error(`${label} must be positive.`);
  return result;
}

function positiveNumber(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new Error(`${label} must be a positive finite number.`);
  }
  return value;
}

function oneOf<const T extends readonly string[]>(
  value: unknown,
  values: T,
  label: string,
): T[number] {
  if (typeof value !== 'string' || !values.includes(value)) {
    throw new Error(`${label} must be one of: ${values.join(', ')}.`);
  }
  return value as T[number];
}
