import { fileURLToPath } from 'node:url';
import { inspectPublicMounts } from './check-public-release-boundary.mjs';
import { inspectDockerWebAlignment } from './check-public-web-alignment.mjs';
import { auditPublicEdge } from './check-public-asset-http.mjs';

export function summarizePublicRuntime(results) {
  const expected = {
    boundary: 'PUBLIC_RELEASE_BOUNDARY_PASS',
    web: 'WEB_ASSETS_ALIGNED',
    edge: 'PUBLIC_EDGE_ASSETS_PASS',
  };
  const checks = Object.fromEntries(
    Object.entries(expected).map(([key]) => [
      key,
      results[key]?.status ?? 'UNAVAILABLE',
    ]),
  );
  const status = Object.entries(expected).every(([key, value]) => checks[key] === value)
    ? 'PUBLIC_RUNTIME_PASS'
    : 'BLOCKED_PUBLIC_RUNTIME';
  return { status, checks,
    publicRelease: results.boundary?.publicRelease ?? null,
    project: results.boundary?.project ?? null,
  };
}

export async function verifyPublicRuntime(probes = {
  boundary: inspectPublicMounts,
  web: inspectDockerWebAlignment,
  edge: auditPublicEdge,
}) {
  const settled = await Promise.allSettled([
    Promise.resolve().then(() => probes.boundary()),
    Promise.resolve().then(() => probes.web()),
    Promise.resolve().then(() => probes.edge()),
  ]);
  const names = ['boundary', 'web', 'edge'];
  const results = Object.fromEntries(
    settled.map((item, i) => [
      names[i], item.status === 'fulfilled' ? item.value : { status: 'UNAVAILABLE' },
    ]),
  );
  return summarizePublicRuntime(results);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  if (process.argv.length !== 2) {
    process.stderr.write('PUBLIC_RUNTIME_ARGS_INVALID\n');
    process.exitCode = 2;
  } else {
    const result = await verifyPublicRuntime();
    process.stdout.write(JSON.stringify(result) + '\n');
    if (result.status !== 'PUBLIC_RUNTIME_PASS') process.exitCode = 2;
  }
}
