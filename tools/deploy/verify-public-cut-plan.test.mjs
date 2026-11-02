import { describe, expect, it } from 'vitest';
import { evaluatePublicCutPlan } from './verify-public-cut-plan.mjs';

const base = '/srv/runtime/christmas-games/releases/';
const current = base + '20261027-oldhash';
const next = base + '20261029-newhash';
const makeMount = (source, destination, rw = false) => ({
  Source: source,
  Destination: destination,
  RW: rw,
});
const vol = (source, target, readOnly = true) => ({
  type: 'bind',
  source,
  target,
  read_only: readOnly,
});
function fixture() {
  const makeContainer = (service, mounts, env = []) => ({
    Id: 'abcdef0123456789',
    State: { Running: true },
    Config: {
      Image: service === 'gateway' ? 'nginx:alpine' : 'node:24-alpine',
      Env: env,
      Labels: {
        'com.docker.compose.project': 'christmas-games',
        'com.docker.compose.service': service,
        'com.docker.compose.config-hash': 'abc',
      },
    },
    Mounts: mounts,
    NetworkSettings: {
      Networks: {
        'christmas-games_backend': {},
        ...(service === 'gateway' ? { edge: {} } : {}),
      },
    },
  });
  const catalogMounts = [
    makeMount(current + '/server', '/app/server'),
    makeMount(current + '/package.json', '/app/package.json'),
    makeMount(current + '/web', '/var/www/html/web'),
    makeMount('/srv/runtime/christmas-games/data', '/var/lib/christmas-games', true),
  ];
  const gatewayMounts = [
    makeMount(current + '/web', '/var/www/html/web'),
    makeMount(current + '/public/social', '/var/www/html/public/social'),
  ];
  const readerMounts = [makeMount(current + '/server', '/app/server')];
  const actual = {
    catalog: makeContainer('catalog', catalogMounts, ['CATALOG_FLAG=1']),
    gateway: makeContainer('gateway', gatewayMounts),
    reader: makeContainer('catalog-reader', readerMounts),
  };
  const config = {
    name: 'christmas-games',
    networks: { backend: { name: 'christmas-games_backend' }, edge: { name: 'edge' } },
    services: {
      catalog: {
        image: 'node:24-alpine',
        environment: { CATALOG_FLAG: '1' },
        volumes: catalogMounts.map((m) =>
          vol(
            m.Destination === '/var/lib/christmas-games'
              ? m.Source
              : next +
                  '/' +
                  m.Destination.replace(/^\/(?:app|var\/www\/html)\//, '').replace('app/', ''),
            m.Destination,
          ),
        ),
        networks: { backend: {} },
      },
      gateway: {
        image: 'nginx:alpine',
        environment: {},
        networks: { backend: {}, edge: {} },
        volumes: [
          vol(next + '/web', '/var/www/html/web'),
          vol(next + '/public/social', '/var/www/html/public/social'),
        ],
      },
      'catalog-reader': {
        volumes: readerMounts.map((m) => vol(m.Source, m.Destination)),
        networks: { backend: {} },
      },
    },
  };
  config.services.catalog.volumes = [
    vol(next + '/server', '/app/server'),
    vol(next + '/package.json', '/app/package.json'),
    vol(next + '/web', '/var/www/html/web'),
    vol('/srv/runtime/christmas-games/data', '/var/lib/christmas-games', false),
  ];
  return { actual, config };
}

describe('safe one-shot cut plan', () => {
  it('accepts only approved public bind changes with preserved reader', () => {
    const { actual, config } = fixture();
    expect(evaluatePublicCutPlan(config, actual, next).status).toBe('PUBLIC_CUT_PLAN_PASS');
  });
  it('blocks any change to private reader mounts', () => {
    const { actual, config } = fixture();
    config.services['catalog-reader'].volumes[0].source = next + '/server';
    expect(evaluatePublicCutPlan(config, actual, next).failures).toContain(
      'READER_MOUNT_DRIFT:/app/server',
    );
  });
  it('blocks changes to database mount or catalog environment', () => {
    const { actual, config } = fixture();
    config.services.catalog.volumes[3].source = '/tmp/fake-data';
    config.services.catalog.environment.CATALOG_FLAG = '0';
    const result = evaluatePublicCutPlan(config, actual, next);
    expect(result.failures).toContain('UNEXPECTED_MOUNT_SOURCE:catalog:/var/lib/christmas-games');
    expect(result.failures).toContain('CHANGED_ENVIRONMENT:catalog:CATALOG_FLAG');
  });
  it('blocks image and network drift that could impact other services', () => {
    const { actual, config } = fixture();
    config.services.gateway.image = 'different:latest';
    config.services.gateway.networks = { backend: {} };
    expect(evaluatePublicCutPlan(config, actual, next).failures).toContain('CHANGED_IMAGE:gateway');
  });
  it('blocks unexpected project or extra service in Compose model', () => {
    const { actual, config } = fixture();
    config.name = 'other-stack';
    config.services.zapi = {};
    const result = evaluatePublicCutPlan(config, actual, next);
    expect(result.failures).toContain('COMPOSE_PROJECT_MISMATCH');
    expect(result.failures).toContain('COMPOSE_UNEXPECTED_SERVICES');
  });
});
