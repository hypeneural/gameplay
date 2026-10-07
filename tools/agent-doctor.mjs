import { readFile } from 'node:fs/promises';

const readiness = JSON.parse(await readFile(new URL('../../deploy/readiness.json', import.meta.url), 'utf8'));
const rootPackage = JSON.parse(await readFile(new URL('../../package.json', import.meta.url), 'utf8'));

const failures = [];
const nodeMajor = Number(process.versions.node.split('.')[0]);
if (nodeMajor !== 24) failures.push(`Node 24 required; running ${process.versions.node}.`);
if (readiness.schemaVersion !== 1) failures.push('deploy/readiness.json schemaVersion must be 1.');
if (readiness.currentStage !== 'vps-staging-demo') {
  failures.push(`Unexpected currentStage: ${String(readiness.currentStage)}.`);
}
if (readiness.pilotReady !== false) failures.push('pilotReady must remain false in the current repository stage.');
if (readiness.customerDataAllowed !== false) {
  failures.push('customerDataAllowed must remain false in staging-demo.');
}
if (!Array.isArray(readiness.allowedReleaseStages) || !readiness.allowedReleaseStages.includes('staging-demo')) {
  failures.push('staging-demo must be the explicitly allowed release stage.');
}
if (readiness.allowedReleaseStages?.includes('pilot')) {
  failures.push('pilot must not be allowed before the real session/media authority is implemented.');
}

for (const script of [
  'check:fast',
  'check',
  'build',
  'gallery:prepare',
  'gallery:lab',
  'deploy:readiness',
  'release:staging',
  'release:verify',
  'deploy:smoke',
]) {
  if (typeof rootPackage.scripts?.[script] !== 'string') failures.push(`Missing canonical script: ${script}.`);
}

if (failures.length > 0) {
  process.stderr.write(`${JSON.stringify({ status: 'blocked', failures })}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(
    `${JSON.stringify({
      status: 'ok',
      node: process.versions.node,
      stage: readiness.currentStage,
      pilotReady: readiness.pilotReady,
      customerDataAllowed: readiness.customerDataAllowed,
      pythonRequiredForCurrentValidation: false,
      allowedReleaseStages: readiness.allowedReleaseStages,
      blockersBeforePilot: readiness.blockersBeforePilot,
      nextMilestone: readiness.nextMilestone,
    })}\n`,
  );
}
