import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';

export function assertReleaseAllowed(readiness, stage) {
  if (!readiness || typeof readiness !== 'object' || Array.isArray(readiness)) {
    throw new Error('deploy/readiness.json must contain an object.');
  }
  if (readiness.schemaVersion !== 1) {
    throw new Error('deploy/readiness.json schemaVersion must be 1.');
  }
  if (!Array.isArray(readiness.allowedReleaseStages)) {
    throw new Error('deploy/readiness.json allowedReleaseStages must be an array.');
  }
  if (typeof readiness.pilotReady !== 'boolean' || typeof readiness.customerDataAllowed !== 'boolean') {
    throw new Error('deploy/readiness.json must declare pilotReady and customerDataAllowed booleans.');
  }
  if (!readiness.allowedReleaseStages.includes(stage)) {
    const blockers = Array.isArray(readiness.blockersBeforePilot)
      ? readiness.blockersBeforePilot.join('; ')
      : 'readiness blockers are not documented';
    throw new Error(
      `Release stage ${stage} is blocked by deploy/readiness.json. Allowed: ${readiness.allowedReleaseStages.join(', ') || 'none'}. Blockers: ${blockers}`,
    );
  }
  if (stage === 'staging-demo') {
    if (readiness.customerDataAllowed) {
      throw new Error('staging-demo must never allow customer data.');
    }
    if (readiness.pilotReady) {
      throw new Error('staging-demo readiness cannot claim pilotReady=true.');
    }
  }
  if (stage === 'pilot' && (!readiness.pilotReady || !readiness.customerDataAllowed)) {
    throw new Error('pilot requires pilotReady=true and customerDataAllowed=true.');
  }
}

export async function inventoryReleaseFiles(root, options = {}) {
  const excluded = new Set(options.excludePaths ?? []);
  const files = [];
  await visit(root);
  files.sort((left, right) => left.path.localeCompare(right.path));
  return files;

  async function visit(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      const absolute = join(directory, entry.name);
      const releasePath = relative(root, absolute).split(sep).join('/');
      if (excluded.has(releasePath)) continue;
      if (entry.isSymbolicLink()) {
        throw new Error(`Release bundle must not contain symlinks: ${releasePath}`);
      }
      if (entry.isDirectory()) {
        await visit(absolute);
        continue;
      }
      if (!entry.isFile()) {
        throw new Error(`Release bundle contains an unsupported filesystem entry: ${releasePath}`);
      }
      const bytes = await readFile(absolute);
      files.push({
        path: releasePath,
        bytes: bytes.byteLength,
        sha256: createHash('sha256').update(bytes).digest('hex'),
      });
    }
  }
}

export function assertNoForbiddenReleaseFiles(files) {
  const forbidden = files.filter(({ path }) => {
    const lower = path.toLowerCase();
    const basename = lower.split('/').at(-1) ?? lower;
    return (
      lower.endsWith('.map') ||
      lower.endsWith('.ts') ||
      lower.endsWith('.tsx') ||
      lower.endsWith('.db') ||
      lower.endsWith('.sqlite') ||
      lower.endsWith('.sqlite3') ||
      lower.endsWith('.log') ||
      lower.endsWith('.pem') ||
      lower.endsWith('.key') ||
      basename === '.env' ||
      basename === 'credentials.json' ||
      basename.endsWith('-wal') ||
      basename.endsWith('-shm') ||
      lower.includes('node_modules/') ||
      lower.includes('/originals/') ||
      lower.startsWith('originals/') ||
      lower.includes('local-test-media') ||
      lower.includes('local-private-media')
    );
  });
  if (forbidden.length > 0) {
    throw new Error(`Forbidden files in VPS release: ${forbidden.map(({ path }) => path).join(', ')}`);
  }
}
