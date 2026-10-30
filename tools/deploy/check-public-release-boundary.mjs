import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const CONTAINERS = [
  'christmas-games-catalog',
  'christmas-games-gateway',
  'christmas-games-catalog-reader',
];
const RELEASE_PREFIX = '/srv/runtime/christmas-games/releases/';
const PATHS = {
  catalog: ['/app/server', '/app/package.json', '/var/www/html/web'],
  gateway: ['/var/www/html/web', '/var/www/html/public/social'],
};

function releaseForSource(source, suffix) {
  if (
    typeof source !== 'string' ||
    !source.startsWith(RELEASE_PREFIX) ||
    !source.endsWith('/' + suffix)
  )
    return null;
  const name = source.slice(RELEASE_PREFIX.length, -suffix.length - 1);
  return /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(name) ? name : null;
}

export function evaluatePublicMounts(containers) {
  const catalog = containers?.catalog;
  const gateway = containers?.gateway;
  const reader = containers?.reader;
  const findings = [];
  if (!catalog || !gateway || !reader)
    return {
      status: 'BLOCKED_CONTAINER_INVENTORY',
      findings: ['MISSING_CONTAINER'],
    };

  const entries = [
    ['catalog', catalog, PATHS.catalog],
    ['gateway', gateway, PATHS.gateway],
  ];
  const releaseNames = new Set();
  let project;
  for (const [service, container, required] of entries) {
    const labels = container.Config?.Labels ?? {};
    const actualService = labels['com.docker.compose.service'];
    const currentProject = labels['com.docker.compose.project'];
    if (actualService !== service || !currentProject) {
      findings.push('INVALID_COMPOSE_IDENTITY:' + service);
    }
    if (project && currentProject !== project) findings.push('COMPOSE_PROJECT_DRIFT');
    else if (currentProject) project = currentProject;
    if (!container.State?.Running) findings.push('CONTAINER_NOT_RUNNING:' + service);
    const mounts = container.Mounts ?? [];
    for (const destination of required) {
      const m = mounts.find((value) => value.Destination === destination);
      if (!m || m.RW !== false) {
        findings.push('MISSING_READONLY_MOUNT:' + service + ':' + destination);
        continue;
      }
      const suffix =
        destination === '/app/server'
          ? 'server'
          : destination === '/app/package.json'
            ? 'package.json'
            : destination === '/var/www/html/public/social'
              ? 'public/social'
              : 'web';
      const name = releaseForSource(m.Source, suffix);
      if (!name) findings.push('NOT_IMMUTABLE_RELEASE:' + service + ':' + destination);
      else releaseNames.add(name);
    }
  }
  if (releaseNames.size !== 1) findings.push('MIXED_PUBLIC_RELEASES');
  if (!reader.State?.Running) findings.push('READER_NOT_RUNNING');
  if (reader.Config?.Labels?.['com.docker.compose.service'] !== 'catalog-reader') {
    findings.push('READER_IDENTITY_UNEXPECTED');
  }
  if (reader.Config?.Labels?.['com.docker.compose.project'] !== project) {
    findings.push('READER_PROJECT_DRIFT');
  }
  const readerReleaseMount = (reader.Mounts ?? []).find((x) => x.Destination === '/app/server');
  if (!readerReleaseMount || readerReleaseMount.RW !== false) {
    findings.push('READER_RELEASE_NOT_READONLY');
  }
  return {
    status: findings.length ? 'BLOCKED_PUBLIC_RELEASE_BOUNDARY' : 'PUBLIC_RELEASE_BOUNDARY_PASS',
    findings,
    publicRelease: releaseNames.size === 1 ? [...releaseNames][0] : null,
    project: project ?? null,
    containerIds: {
      catalog: catalog.Id?.slice(0, 12) ?? null,
      gateway: gateway.Id?.slice(0, 12) ?? null,
      reader: reader.Id?.slice(0, 12) ?? null,
    },
  };
}

export function inspectPublicMounts() {
  const raw = execFileSync('docker', ['inspect', ...CONTAINERS], {
    timeout: 15000,
    maxBuffer: 2 * 1024 * 1024,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed) || parsed.length !== 3) throw Error('DOCKER_INSPECT_INVALID');
  return evaluatePublicMounts({
    catalog: parsed[0],
    gateway: parsed[1],
    reader: parsed[2],
  });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    if (process.argv.length !== 2) throw Error('ARGUMENTS_NOT_ALLOWED');
    const result = inspectPublicMounts();
    process.stdout.write(JSON.stringify(result) + '\n');
    if (result.status !== 'PUBLIC_RELEASE_BOUNDARY_PASS') process.exitCode = 2;
  } catch (error) {
    process.stderr.write(
      JSON.stringify({
        status: 'PUBLIC_RELEASE_INSPECTION_UNAVAILABLE',
        reason: error?.code === 'ENOENT' ? 'DOCKER_NOT_FOUND' : 'INSPECTION_FAILED',
      }) + '\n',
    );
    process.exitCode = 2;
  }
}
