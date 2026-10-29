import { describe, expect, it } from 'vitest';
import { evaluatePublicMounts } from './check-public-release-boundary.mjs';

const root = '/srv/runtime/christmas-games/releases/20261028-16e7f65';
const mount = (suffix, dest) => ({ Source: root + '/' + suffix,
  Destination: dest, RW: false });

function example() {
  const make = (service, mounts) => ({
    Id: service.repeat(12), State: { Running: true }, Config: { Labels: {
      'com.docker.compose.project': 'christmas-games',
      'com.docker.compose.service': service,
    } }, Mounts: mounts,
  });
  return {
    catalog: make('catalog', [
      mount('server', '/app/server'),
      mount('package.json', '/app/package.json'),
      mount('web', '/var/www/html/web'),
    ]),
    gateway: make('gateway', [
      mount('web', '/var/www/html/web'),
      mount('public/social', '/var/www/html/public/social'),
    ]),
    reader: make('catalog-reader', [mount('server', '/app/server')]),
  };
}

describe('immutable public release and private reader boundaries', () => {
  it('permits identical, explicit immutable release on public containers', () => {
    const result = evaluatePublicMounts(example());
    expect(result.status).toBe('PUBLIC_RELEASE_BOUNDARY_PASS');
    expect(result.publicRelease).toBe('20261028-16e7f65');
  });
  it('blocks mixed public releases even if both are healthy', () => {
    const data = example();
    data.gateway.Mounts[0].Source =
      '/srv/runtime/christmas-games/releases/20261029-abcdef0/web';
    expect(evaluatePublicMounts(data).findings).toContain('MIXED_PUBLIC_RELEASES');
  });
  it('rejects implicit mutable current symlink and absent readonly mounts', () => {
    const data = example();
    data.catalog.Mounts[2].Source = '/srv/runtime/christmas-games/current/web';
    data.gateway.Mounts[0].RW = true;
    const result = evaluatePublicMounts(data);
    expect(result.findings).toContain('NOT_IMMUTABLE_RELEASE:catalog:/var/www/html/web');
    expect(result.findings).toContain('MISSING_READONLY_MOUNT:gateway:/var/www/html/web');
  });
  it('fails closed for compose project drift or another container identity', () => {
    const data = example();
    data.gateway.Config.Labels['com.docker.compose.project'] = 'other-stack';
    data.reader.Config.Labels['com.docker.compose.service'] = 'catalog';
    const result = evaluatePublicMounts(data);
    expect(result.findings).toContain('COMPOSE_PROJECT_DRIFT');
    expect(result.findings).toContain('READER_IDENTITY_UNEXPECTED');
  });
  it('never reports success for unhealthy reader or missing inventory', () => {
    const data = example();
    data.reader.State.Running = false;
    expect(evaluatePublicMounts(data).findings).toContain('READER_NOT_RUNNING');
    expect(evaluatePublicMounts({}).status).toBe('BLOCKED_CONTAINER_INVENTORY');
  });
});
