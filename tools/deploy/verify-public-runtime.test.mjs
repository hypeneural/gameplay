import { describe, expect, it } from 'vitest';
import { summarizePublicRuntime, verifyPublicRuntime } from './verify-public-runtime.mjs';

const allGood = {
  boundary: { status: 'PUBLIC_RELEASE_BOUNDARY_PASS', publicRelease: '20261029-abc123',
    project: 'christmas-games' },
  web: { status: 'WEB_ASSETS_ALIGNED' },
  edge: { status: 'PUBLIC_EDGE_ASSETS_PASS' },
};

describe('one-shot public runtime readiness', () => {
  it('passes only if all independent gates are healthy', () => {
    expect(summarizePublicRuntime(allGood).status).toBe('PUBLIC_RUNTIME_PASS');
  });
  it('blocks if edge returns HTML with wrong MIME', () => {
    expect(summarizePublicRuntime({ ...allGood,
      edge: { status: 'BLOCKED_PUBLIC_EDGE_ASSETS' },
    }).status).toBe('BLOCKED_PUBLIC_RUNTIME');
  });
  it('blocks if gateway uses old assets despite valid public HTTPS', () => {
    expect(summarizePublicRuntime({ ...allGood,
      boundary: { status: 'BLOCKED_PUBLIC_RELEASE_BOUNDARY' },
    }).status).toBe('BLOCKED_PUBLIC_RUNTIME');
  });
  it('fails closed if one probe is unavailable without losing other results', async () => {
    const result = await verifyPublicRuntime({
      boundary: async () => allGood.boundary,
      web: async () => { throw Error('Synthetic docker failure'); },
      edge: async () => allGood.edge,
    });
    expect(result.status).toBe('BLOCKED_PUBLIC_RUNTIME');
    expect(result.checks.web).toBe('UNAVAILABLE');
    expect(result.checks.edge).toBe('PUBLIC_EDGE_ASSETS_PASS');
  });
});
