import { execFileSync } from 'node:child_process';
import { URL } from 'node:url';
import { readFile } from 'node:fs/promises';

const readiness = JSON.parse(
  await readFile(new URL('../deploy/readiness.json', import.meta.url), 'utf8'),
);
const agentState = JSON.parse(
  await readFile(new URL('../.agents/current-state.json', import.meta.url), 'utf8'),
);
const rootPackage = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
const workflowSources = await Promise.all([
  readFile(new URL('../.github/workflows/ci.yml', import.meta.url), 'utf8'),
  readFile(new URL('../.github/workflows/release-staging.yml', import.meta.url), 'utf8'),
]);

const failures = [];

const trackedFiles = readTrackedFiles();
if (!trackedFiles) {
  failures.push('Unable to read the Git index; repository safety checks cannot be trusted.');
}
const forbiddenTrackedPatterns = [
  /(^|\/)credentials\.json$/i,
  /(^|\/)\.env(?:\.|$)/i,
  /\.(?:db|sqlite|sqlite3|log|pem|key|p12|pfx)$/i,
  /-(?:wal|shm)$/i,
  /(^|\/)id_(?:rsa|ed25519)$/i,
];
const forbiddenTrackedFiles = (trackedFiles ?? []).filter((path) => {
  if (path === '.env.example' || path.endsWith('/.env.example')) return false;
  return forbiddenTrackedPatterns.some((pattern) => pattern.test(path));
});
if (forbiddenTrackedFiles.length > 0) {
  failures.push(
    `Sensitive/runtime files are tracked by Git: ${forbiddenTrackedFiles.join(', ')}.`,
  );
}

const nodeMajor = Number(process.versions.node.split('.')[0]);
if (nodeMajor !== 24) failures.push(`Node 24 required; running ${process.versions.node}.`);

if (readiness.schemaVersion !== 1) failures.push('deploy/readiness.json schemaVersion must be 1.');
if (readiness.currentStage !== 'vps-staging-demo') {
  failures.push(`Unexpected currentStage: ${String(readiness.currentStage)}.`);
}
if (readiness.pilotReady !== false) {
  failures.push('pilotReady must remain false in the current repository stage.');
}
if (readiness.customerDataAllowed !== false) {
  failures.push('customerDataAllowed must remain false in staging-demo.');
}
if (
  !Array.isArray(readiness.allowedReleaseStages) ||
  readiness.allowedReleaseStages.length !== 1 ||
  readiness.allowedReleaseStages[0] !== 'staging-demo'
) {
  failures.push('staging-demo must be the only explicitly allowed release stage.');
}

if (agentState.schemaVersion !== 1) failures.push('.agents/current-state.json schemaVersion must be 1.');
if (agentState.releaseStage !== readiness.currentStage) {
  failures.push('Agent current state releaseStage must match deploy/readiness.json currentStage.');
}
if (agentState.nextMilestone?.id !== readiness.nextMilestone) {
  failures.push('Agent current state nextMilestone must match deploy/readiness.json nextMilestone.');
}
if (!Array.isArray(agentState.forbiddenUntilPilot) || agentState.forbiddenUntilPilot.length === 0) {
  failures.push('Agent current state must declare explicit forbiddenUntilPilot actions.');
}

for (const script of [
  'check:fast',
  'check',
  'build',
  'build:staging-demo',
  'gallery:prepare',
  'gallery:lab',
  'asset:validate:all',
  'deploy:readiness',
  'deploy:staging-config',
  'release:staging',
  'release:verify',
  'deploy:smoke',
  'test:e2e:gallery',
]) {
  if (typeof rootPackage.scripts?.[script] !== 'string') {
    failures.push(`Missing canonical script: ${script}.`);
  }
}

if (!rootPackage.scripts?.build?.includes('@christmas-games/catalog-server build')) {
  failures.push('Root build must compile apps/catalog-server; production must not depend on tsx.');
}
if (!rootPackage.scripts?.['release:staging']?.includes('build:staging-demo')) {
  failures.push('release:staging must build the explicit staging-demo browser mode.');
}

for (const [index, source] of workflowSources.entries()) {
  for (const match of source.matchAll(/^\s*uses:\s*([^\s#]+)(?:\s+#.*)?$/gm)) {
    const reference = match[1] ?? '';
    if (!/@[0-9a-f]{40}$/.test(reference)) {
      failures.push(`Workflow ${index + 1} action is not pinned to a full commit SHA: ${reference}.`);
    }
  }
  if (/actions\/checkout@[0-9a-f]{40}/.test(source) && !/persist-credentials:\s*false/.test(source)) {
    failures.push(`Workflow ${index + 1} checkout must set persist-credentials: false.`);
  }
}

const expectedActionPins = [
  'actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1',
  'actions/setup-node@820762786026740c76f36085b0efc47a31fe5020',
  'pnpm/action-setup@ea17c68df8912ef543352723c149a84f56e3d413',
];
for (const pin of expectedActionPins) {
  if (!workflowSources.every((source) => source.includes(pin))) {
    failures.push(`Canonical workflows must use verified action pin: ${pin}.`);
  }
}
if (!workflowSources[0]?.includes('actions/cache@55cc8345863c7cc4c66a329aec7e433d2d1c52a9')) {
  failures.push('CI cache action pin is not the verified v6.1.0 commit.');
}
if (
  !workflowSources[1]?.includes(
    'actions/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a',
  )
) {
  failures.push('Staging artifact action pin is not the verified v7.0.1 commit.');
}

if (failures.length > 0) {
  process.stderr.write(`${JSON.stringify({ status: 'blocked', failures })}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(
    `${JSON.stringify({
      status: 'ok',
      node: process.versions.node,
      repositoryMode: agentState.repositoryMode,
      stage: readiness.currentStage,
      pilotReady: readiness.pilotReady,
      customerDataAllowed: readiness.customerDataAllowed,
      pythonRequiredForCurrentValidation: false,
      allowedReleaseStages: readiness.allowedReleaseStages,
      blockersBeforePilot: readiness.blockersBeforePilot,
      nextMilestone: agentState.nextMilestone,
      canonicalCommands: agentState.canonicalCommands,
    })}\n`,
  );
}

function readTrackedFiles() {
  try {
    return execFileSync('git', ['ls-files'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .split(/\r?\n/)
      .filter(Boolean);
  } catch {
    return undefined;
  }
}
