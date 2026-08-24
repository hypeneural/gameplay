import { lstat, readdir, readFile } from 'node:fs/promises';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import {
  assetFormats,
  assetKinds,
  assetManifestVersion,
  qualityBehaviors,
  type AssetAudit,
  type AssetBudgetTotals,
  type AssetManifest,
  type AssetRecord,
} from './contracts.js';

const gameIdPattern = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const assetIdPattern = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const safeReferencePattern = /^[A-Za-z0-9][A-Za-z0-9._/# -]*$/;
const publicRoot = 'apps/play/public';

export function assetManifestRelativePath(gameId: string): string {
  assertGameId(gameId);
  return `packages/games/${gameId}/assets/manifest.json`;
}

export async function loadAssetManifest(root: string, gameId: string): Promise<AssetManifest> {
  const relativePath = assetManifestRelativePath(gameId);
  const parsed: unknown = JSON.parse(await readFile(resolve(root, relativePath), 'utf8'));
  return parseAssetManifest(parsed, gameId);
}

export function parseAssetManifest(input: unknown, expectedGameId?: string): AssetManifest {
  const value = object(input, 'manifest');
  const version = integer(value.version, 'manifest.version');
  if (version !== assetManifestVersion) {
    throw new Error(`manifest.version must be ${assetManifestVersion}.`);
  }
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
  const assets = value.assets.map((asset, index) => parseAssetRecord(asset, gameId, index));
  const uniqueIds = new Set(assets.map((asset) => asset.id));
  if (uniqueIds.size !== assets.length)
    throw new Error('manifest.assets contains duplicate asset ids.');
  const uniqueFiles = new Set(assets.map((asset) => asset.file));
  if (uniqueFiles.size !== assets.length)
    throw new Error('manifest.assets contains duplicate files.');

  return { version: assetManifestVersion, gameId, budget, assets };
}

function calculateAssetBudget(assets: readonly AssetRecord[]): AssetBudgetTotals {
  const grouped = new Map<string, number>();
  let publicBytes = 0;
  let runtimeBytes = 0;
  let visualBytes = 0;

  for (const asset of assets) {
    publicBytes += asset.bytes;
    if (asset.kind !== 'audio') visualBytes += asset.bytes;
    if (asset.deliveryGroup) {
      grouped.set(
        asset.deliveryGroup,
        Math.max(grouped.get(asset.deliveryGroup) ?? 0, asset.bytes),
      );
    } else {
      runtimeBytes += asset.bytes;
    }
  }
  for (const maximum of grouped.values()) runtimeBytes += maximum;
  return { publicBytes, runtimeBytes, visualBytes };
}

export async function auditAssetManifest(root: string, gameId: string): Promise<AssetAudit> {
  const manifest = await loadAssetManifest(root, gameId);
  const errors: string[] = [];
  const warnings: string[] = [];
  const manifestFiles = new Set(manifest.assets.map((asset) => asset.file));

  for (const asset of manifest.assets) {
    const absolutePath = resolveWorkspaceFile(root, asset.file);
    try {
      const facts = await lstat(absolutePath);
      if (!facts.isFile()) {
        errors.push(`${asset.id}: declared asset is not a regular file.`);
        continue;
      }
      if (facts.size !== asset.bytes) {
        errors.push(`${asset.id}: declared ${asset.bytes} bytes but found ${facts.size}.`);
      }
    } catch {
      errors.push(`${asset.id}: declared file is missing.`);
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
  if (manifest.assets.some((asset) => asset.kind === 'vfx' && asset.quality.low === 'keep')) {
    warnings.push(
      'A VFX asset is enabled in LOW; confirm it remains functional rather than decorative.',
    );
  }
  return { errors, warnings, untrackedFiles, totals };
}

function parseAssetRecord(input: unknown, gameId: string, index: number): AssetRecord {
  const label = `manifest.assets[${index}]`;
  const value = object(input, label);
  const id = string(value.id, `${label}.id`);
  if (!assetIdPattern.test(id)) throw new Error(`${label}.id must be lowercase kebab-case.`);
  const kind = oneOf(value.kind, assetKinds, `${label}.kind`);
  const format = oneOf(value.format, assetFormats, `${label}.format`);
  const file = string(value.file, `${label}.file`);
  const publicPath = string(value.publicPath, `${label}.publicPath`);
  assertAssetLocation(file, publicPath, gameId, label);
  const expectedExtension = `.${format}`;
  if (!file.endsWith(expectedExtension) || !publicPath.endsWith(expectedExtension)) {
    throw new Error(`${label} file and publicPath must end in ${expectedExtension}.`);
  }

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
  const record = string(provenanceValue.record, `${label}.provenance.record`);
  if (!safeReferencePattern.test(record) || !record.startsWith('ASSET_PROVENANCE.md#')) {
    throw new Error(`${label}.provenance.record must point to ASSET_PROVENANCE.md.`);
  }

  return {
    id,
    kind,
    format,
    file,
    publicPath,
    bytes: positiveInteger(value.bytes, `${label}.bytes`),
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
    provenance: { source, license, record },
  };
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
  if (!gameIdPattern.test(gameId)) {
    throw new Error('Game id must use lowercase kebab-case.');
  }
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
      if (entry.isDirectory()) {
        files.push(...(await listRegularFiles(root, next)));
      } else if (entry.isFile()) {
        files.push(next);
      } else {
        throw new Error(
          `Public asset directory contains a non-file entry: ${workspaceRelativePath(root, next)}`,
        );
      }
    }
    return files;
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

function workspaceRelativePath(root: string, file: string): string {
  return relative(resolve(root), file).split(sep).join('/');
}

function object(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
  return value as Record<string, unknown>;
}

function string(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.length === 0)
    throw new Error(`${label} must be a non-empty string.`);
  return value;
}

function optionalReference(value: unknown, label: string): string | undefined {
  if (value === undefined) return undefined;
  const result = string(value, label);
  if (!safeReferencePattern.test(result))
    throw new Error(`${label} contains unsupported characters.`);
  return result;
}

function integer(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw new Error(`${label} must be an integer.`);
  }
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
