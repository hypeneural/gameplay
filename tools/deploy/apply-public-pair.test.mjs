import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const scriptPath = fileURLToPath(new URL('./apply-public-pair.sh', import.meta.url));

describe('isolated public cut command invariants', () => {
  it('requires an explicit, SHA-pinned immutable target and rollback', async () => {
    const script = await readFile(scriptPath, 'utf8');
    expect(script).toContain('USAGE_EXECUTE_TARGET_ROLLBACK_EXACT_SHA');
    expect(script).toContain('TARGET_SHA_NOT_PINNED');
    expect(script).toContain('RELEASE_SYMLINK_CHAIN');
    expect(script).toContain('verify-vps-release.mjs');
  });

  it('coordinates locks with reader and platform without ever touching reader', async () => {
    const script = await readFile(scriptPath, 'utf8');
    expect(script).toContain('/run/lock/stackctl-reader-christmas-games.lock');
    expect(script).toContain('/run/lock/stackctl-christmas-games.lock');
    expect(script).toContain('READER_RECREATED_UNEXPECTEDLY');
    expect(script).toContain('NONPUBLIC_CONTAINER_CHANGED');
    expect(script).toContain('SERVICES=(catalog gateway)');
    expect(script).not.toMatch(/(?:--remove-orphans|docker compose down)/);
  });

  it('never deploys without read-only Compose model inspection and post-cut smoke', async () => {
    const script = await readFile(scriptPath, 'utf8');
    expect(script).toContain('verify-public-cut-plan.mjs');
    expect(script).toContain('verify-public-runtime.mjs');
    expect(script).toContain('--no-deps --no-build');
    expect(script).toContain('--wait-timeout 90');
    expect(script).toContain('ROLLBACK_COMMAND_FAILED');
  });
});
