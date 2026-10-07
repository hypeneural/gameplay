import { execFileSync } from 'node:child_process';
import { cp, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { basename, join, relative } from 'node:path';
import { fileURLToPath, URL } from 'node:url';
import {
  assertNoForbiddenReleaseFiles,
  assertReleaseAllowed,
  inventoryReleaseFiles,
} from './release-utils.mjs';

const repositoryRoot = fileURLToPath(new URL('../../', import.meta.url));
const readinessPath = join(repositoryRoot, 'deploy', 'readiness.json');
const outputRoot = join(repositoryRoot, '.release', 'vps');

const options = parseArguments(process.argv.slice(2));
const readiness = JSON.parse(await readFile(readinessPath, 'utf8'));
assertReleaseAllowed(readiness, options.stage);

if (options.checkOnly) {
  process.stdout.write(
    `${JSON.stringify({ status: 'allowed', stage: options.stage, readiness: readiness.currentStage })}\n`,
  );
  process.exit(0);
}

const webSource = join(repositoryRoot, 'apps', 'play', 'dist');
const serverSource = join(repositoryRoot, 'apps', 'catalog-server', 'dist');
const socialSource = join(
  repositoryRoot,
  'apps',
  'catalog-server',
  'public',
  'social',
  'evydencia-christmas-v1.webp',
);
const socialConfigExampleSource = join(
  repositoryRoot,
  'apps',
  'catalog-server',
  'config',
  'social-preview.example.json',
);
const opsSource = join(repositoryRoot, 'deploy', 'vps');
const releaseToolsSource = join(repositoryRoot, 'tools', 'deploy');

await assertFile(join(webSource, 'index.html'), 'apps/play/dist/index.html');
await assertFile(join(serverSource, 'main.js'), 'apps/catalog-server/dist/main.js');
await assertFile(socialSource, 'generic social preview');
await assertFile(socialConfigExampleSource, 'social preview config example');

await rm(outputRoot, { recursive: true, force: true });
await mkdir(outputRoot, { recursive: true });

await copyTree(webSource, join(outputRoot, 'web'), { excludeSourceMaps: true });
await copyTree(serverSource, join(outputRoot, 'server'), { excludeSourceMaps: true });
await mkdir(join(outputRoot, 'public', 'social'), { recursive: true });
await cp(socialSource, join(outputRoot, 'public', 'social', basename(socialSource)));
await copyTree(opsSource, join(outputRoot, 'ops'), { excludeSourceMaps: true });
await cp(socialConfigExampleSource, join(outputRoot, 'ops', 'social-preview.example.json'));
await mkdir(join(outputRoot, 'ops', 'tools'), { recursive: true });
for (const toolName of ['release-utils.mjs', 'verify-vps-release.mjs', 'smoke-staging.mjs']) {
  await cp(join(releaseToolsSource, toolName), join(outputRoot, 'ops', 'tools', toolName));
}

const files = await inventoryReleaseFiles(outputRoot);
assertNoForbiddenReleaseFiles(files);

const release = {
  schemaVersion: 1,
  stage: options.stage,
  gitSha: readGitSha(),
  generatedAt: new Date().toISOString(),
  nodeVersion: process.version,
  customerDataAllowed: readiness.customerDataAllowed === true,
  fileCount: files.length,
  files,
};
await writeFile(join(outputRoot, 'RELEASE.json'), `${JSON.stringify(release, null, 2)}\n`, 'utf8');

process.stdout.write(
  `${JSON.stringify({
    status: 'ready',
    stage: options.stage,
    output: relative(repositoryRoot, outputRoot),
    gitSha: release.gitSha,
    fileCount: files.length,
  })}\n`,
);

function parseArguments(argv) {
  let stage;
  let checkOnly = false;
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    if (flag === '--check-only') {
      checkOnly = true;
      continue;
    }
    if (flag === '--') continue;
    const value = argv[index + 1];
    if (!flag || !value) throw new Error(`Expected a value after ${flag ?? 'option'}.`);
    index += 1;
    if (flag === '--stage') stage = value;
    else throw new Error(`Unknown release option: ${flag}.`);
  }
  if (!stage) throw new Error('Usage: node tools/deploy/prepare-vps-release.mjs --stage <stage>');
  return { stage, checkOnly };
}

async function copyTree(source, destination, { excludeSourceMaps }) {
  await cp(source, destination, {
    recursive: true,
    filter: (currentSource) => {
      if (!excludeSourceMaps) return true;
      return !currentSource.endsWith('.map');
    },
  });
}

async function assertFile(path, label) {
  try {
    const info = await stat(path);
    if (!info.isFile()) throw new Error(`${label} is not a file.`);
  } catch (error) {
    throw new Error(
      `Missing ${label}. Run the canonical staging build before preparing a release.`,
      { cause: error },
    );
  }
}

function readGitSha() {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: repositoryRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return 'unknown';
  }
}
