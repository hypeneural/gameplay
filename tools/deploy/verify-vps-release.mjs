import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { assertNoForbiddenReleaseFiles, inventoryReleaseFiles } from './release-utils.mjs';

const releaseRoot = resolve(process.argv[2] ?? '.release/vps');
const releasePath = resolve(releaseRoot, 'RELEASE.json');
const release = JSON.parse(await readFile(releasePath, 'utf8'));

if (
  !release ||
  typeof release !== 'object' ||
  Array.isArray(release) ||
  release.schemaVersion !== 1 ||
  release.stage !== 'staging-demo' ||
  release.customerDataAllowed !== false ||
  !/^[0-9a-f]{40}$/.test(release.gitSha ?? '') ||
  !Array.isArray(release.files)
) {
  throw new Error('RELEASE.json is not a valid staging-demo release manifest.');
}

const releasePackage = JSON.parse(await readFile(resolve(releaseRoot, 'package.json'), 'utf8'));
if (releasePackage?.type !== 'module' || releasePackage?.private !== true) {
  throw new Error('VPS release package.json must declare private=true and type=module.');
}

const actual = await inventoryReleaseFiles(releaseRoot, { excludePaths: ['RELEASE.json'] });
assertNoForbiddenReleaseFiles(actual);

const actualPaths = new Set(actual.map(({ path }) => path));
for (const requiredPath of [
  'package.json',
  'web/index.html',
  'server/main.js',
  'ops/catalog.env.example',
  'ops/christmas-games-catalog.service.example',
  'ops/nginx/christmas-games.conf.example',
  'ops/tools/verify-vps-release.mjs',
]) {
  if (!actualPaths.has(requiredPath)) {
    throw new Error(`VPS release is missing required runtime file: ${requiredPath}.`);
  }
}

const expected = [...release.files].sort((left, right) => left.path.localeCompare(right.path));
if (expected.length !== actual.length) {
  throw new Error(
    `Release inventory mismatch: expected ${expected.length}, found ${actual.length}.`,
  );
}

for (let index = 0; index < expected.length; index += 1) {
  const wanted = expected[index];
  const found = actual[index];
  if (
    !wanted ||
    !found ||
    wanted.path !== found.path ||
    wanted.bytes !== found.bytes ||
    wanted.sha256 !== found.sha256
  ) {
    throw new Error(
      `Release integrity mismatch at ${wanted?.path ?? found?.path ?? 'unknown entry'}.`,
    );
  }
}

process.stdout.write(
  `${JSON.stringify({
    status: 'verified',
    stage: release.stage,
    gitSha: release.gitSha,
    fileCount: actual.length,
  })}\n`,
);
