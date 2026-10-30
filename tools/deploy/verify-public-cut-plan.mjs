import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const STACK = '/srv/platform/stacks/christmas-games';
const PREFIX = '/srv/runtime/christmas-games/releases/';
const PUBLIC = {
  catalog: {
    '/app/server': 'server',
    '/app/package.json': 'package.json',
    '/var/www/html/web': 'web',
  },
  gateway: { '/var/www/html/web': 'web', '/var/www/html/public/social': 'public/social' },
};

const getMounts = (container) =>
  new Map((container?.Mounts ?? []).map((mount) => [mount.Destination, mount]));
const getVolumes = (service) =>
  new Map((service?.volumes ?? []).map((volume) => [volume.target, volume]));
function sameSet(a, b) {
  return a.length === b.length && a.every((item) => b.includes(item));
}

export function evaluatePublicCutPlan(config, actual, targetRelease) {
  const failures = [];
  const project = actual?.catalog?.Config?.Labels?.['com.docker.compose.project'];
  if (
    !/^\/srv\/runtime\/christmas-games\/releases\/[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(targetRelease)
  )
    failures.push('TARGET_NOT_PINNED_RELEASE');
  if (
    !project ||
    config?.name !== project ||
    actual.gateway?.Config?.Labels?.['com.docker.compose.project'] !== project ||
    actual.reader?.Config?.Labels?.['com.docker.compose.project'] !== project
  ) {
    failures.push('COMPOSE_PROJECT_MISMATCH');
  }
  for (const [key, serviceName] of [
    ['catalog', 'catalog'],
    ['gateway', 'gateway'],
    ['reader', 'catalog-reader'],
  ]) {
    if (actual[key]?.Config?.Labels?.['com.docker.compose.service'] !== serviceName) {
      failures.push('SERVICE_IDENTITY_MISMATCH:' + key);
    }
    if (!actual[key]?.State?.Running) failures.push('SERVICE_NOT_RUNNING:' + key);
  }

  const targetKeys = Object.keys(PUBLIC);
  const proposedNames = Object.keys(config?.services ?? {});
  if (!sameSet(proposedNames.sort(), ['catalog', 'catalog-reader', 'gateway'].sort())) {
    failures.push('COMPOSE_UNEXPECTED_SERVICES');
  }

  for (const serviceName of targetKeys) {
    const proposal = config?.services?.[serviceName];
    const live = actual?.[serviceName];
    if (!proposal || !live) {
      failures.push('PUBLIC_SERVICE_MISSING:' + serviceName);
      continue;
    }
    const volumes = getVolumes(proposal);
    const current = getMounts(live);
    if (volumes.size !== current.size) failures.push('MOUNT_COUNT_DRIFT:' + serviceName);
    for (const [destination, mounted] of current) {
      const planned = volumes.get(destination);
      if (!planned || planned.type !== 'bind' || Boolean(planned.read_only) !== !mounted.RW) {
        failures.push('MOUNT_PROTECTION_DRIFT:' + serviceName + ':' + destination);
        continue;
      }
      const immutablePart = PUBLIC[serviceName][destination];
      const expected = immutablePart ? targetRelease + '/' + immutablePart : mounted.Source;
      if (planned.source !== expected) {
        failures.push('UNEXPECTED_MOUNT_SOURCE:' + serviceName + ':' + destination);
      }
    }

    const env = proposal.environment ?? {};
    const liveEnvironment = new Map(
      (live.Config?.Env ?? []).map((entry) => {
        const equals = entry.indexOf('=');
        return [entry.slice(0, equals), entry.slice(equals + 1)];
      }),
    );
    if (serviceName === 'catalog') {
      for (const entry of live.Config?.Env ?? []) {
        const key = entry.split('=')[0];
        if (
          /^(?:CATALOG_|PUBLISHER_|NODE_ENV$|HOST$|PORT$)/.test(key) &&
          !Object.hasOwn(env, key)
        ) {
          failures.push('DROPPED_RUNTIME_ENVIRONMENT:' + key);
        }
      }
    }
    for (const [name, value] of Object.entries(env)) {
      if (String(value) !== liveEnvironment.get(name)) {
        failures.push('CHANGED_ENVIRONMENT:' + serviceName + ':' + name);
      }
    }
    if (proposal.image !== live.Config?.Image) failures.push('CHANGED_IMAGE:' + serviceName);
    const command = proposal.command;
    const actualCommand = live.Config?.Cmd;
    if (
      command !== undefined &&
      command !== null &&
      JSON.stringify(command) !== JSON.stringify(actualCommand ?? [])
    ) {
      failures.push('CHANGED_COMMAND:' + serviceName);
    }
    const portPairs = (proposal.ports ?? [])
      .map((port) => [
        String(port.target) + '/tcp',
        String(port.host_ip ?? '') + ':' + String(port.published),
      ])
      .sort((a, b) => a[0].localeCompare(b[0]));
    const actualPorts = Object.entries(live.HostConfig?.PortBindings ?? {})
      .flatMap(([port, values]) =>
        (values ?? []).map((value) => [
          port,
          String(value.HostIp ?? '') + ':' + String(value.HostPort),
        ]),
      )
      .sort((a, b) => a[0].localeCompare(b[0]));
    if (JSON.stringify(portPairs) !== JSON.stringify(actualPorts)) {
      failures.push('CHANGED_PUBLISHED_PORTS:' + serviceName);
    }
    const currentNetworks = Object.keys(live.NetworkSettings?.Networks ?? {}).sort();
    const desiredNetworks = Object.keys(proposal.networks ?? {})
      .map((name) => config.networks?.[name]?.name ?? name)
      .sort();
    if (!sameSet(currentNetworks, desiredNetworks)) {
      failures.push('CHANGED_NETWORKS:' + serviceName);
    }
  }

  const readerConfig = config?.services?.['catalog-reader'];
  const reader = actual?.reader;
  if (!readerConfig || !reader) failures.push('READER_NOT_PRESENT');
  else {
    const live = getMounts(reader);
    const proposed = getVolumes(readerConfig);
    if (live.size !== proposed.size) failures.push('READER_MOUNT_COUNT_DRIFT');
    for (const [destination, mount] of live) {
      const candidate = proposed.get(destination);
      if (
        !candidate ||
        candidate.source !== mount.Source ||
        Boolean(candidate.read_only) !== !mount.RW
      ) {
        failures.push('READER_MOUNT_DRIFT:' + destination);
      }
    }
    const name = reader.Config?.Labels?.['com.docker.compose.config-hash'];
    if (!name) failures.push('READER_CONFIG_HASH_MISSING');
  }

  return {
    status: failures.length ? 'BLOCKED_PUBLIC_CUT_PLAN' : 'PUBLIC_CUT_PLAN_PASS',
    failures,
    project: project ?? null,
    targetRelease,
    readerId: reader?.Id?.slice(0, 12) ?? null,
  };
}

export function inspectPublicCutPlan(targetRelease) {
  const names = [
    'christmas-games-catalog',
    'christmas-games-gateway',
    'christmas-games-catalog-reader',
  ];
  const containers = JSON.parse(
    execFileSync('docker', ['inspect', ...names], {
      timeout: 12000,
      maxBuffer: 3 * 1024 * 1024,
      encoding: 'utf8',
    }),
  );
  const actual = { catalog: containers[0], gateway: containers[1], reader: containers[2] };
  const readerServer = getMounts(actual.reader).get('/app/server')?.Source;
  if (!readerServer?.startsWith(PREFIX) || !readerServer.endsWith('/server')) {
    throw Error('READER_RELEASE_UNVERIFIED');
  }
  const readerRelease = readerServer.slice(0, -'/server'.length);
  const project = actual.catalog?.Config?.Labels?.['com.docker.compose.project'];
  if (!project || !/^[a-zA-Z0-9_-]+$/.test(project)) throw Error('PROJECT_UNVERIFIED');
  const args = [
    'compose',
    '--project-name',
    project,
    '--profile',
    'audit-private',
    '-f',
    'compose.yaml',
    '-f',
    'compose.private-audit.yaml',
    'config',
    '--format',
    'json',
  ];
  const output = execFileSync('docker', args, {
    cwd: STACK,
    timeout: 12000,
    maxBuffer: 3 * 1024 * 1024,
    encoding: 'utf8',
    env: { ...process.env, RELEASE_DIR: targetRelease, CATALOG_READER_RELEASE_DIR: readerRelease },
  });
  // The Compose JSON can contain credentials. Never print or persist it.
  return evaluatePublicCutPlan(JSON.parse(output), actual, targetRelease);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const requested = process.argv[2];
  if (process.argv.length !== 3) {
    process.stderr.write('Usage: node verify-public-cut-plan.mjs ABSOLUTE_IMMUTABLE_RELEASE\n');
    process.exitCode = 2;
  } else {
    try {
      const result = inspectPublicCutPlan(requested);
      process.stdout.write(JSON.stringify(result) + '\n');
      if (result.status !== 'PUBLIC_CUT_PLAN_PASS') process.exitCode = 2;
    } catch {
      process.stderr.write(JSON.stringify({ status: 'PUBLIC_CUT_PLAN_UNAVAILABLE' }) + '\n');
      process.exitCode = 2;
    }
  }
}
