import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const root = new URL('../../', import.meta.url);

describe('staging Docker boundary', () => {
  it('has no writable customer data mount and waits for healthy catalog', async () => {
    const compose = await readFile(new URL('deploy/vps/docker/compose.yaml', root), 'utf8');
    expect(compose).toContain('condition: service_healthy');
    expect(compose).toContain('read_only: true');
    expect(compose).toContain('no-new-privileges:true');
    expect(compose).not.toContain('christmas-private/derived:ro');
    expect(compose).not.toContain('/var/lib/christmas-games:rw');
    expect(compose).not.toMatch(/^\s+ports:/m);
  });

  it('disables access logs for malformed capability URLs too', async () => {
    const nginx = await readFile(new URL('deploy/vps/docker/nginx.conf', root), 'utf8');
    const serverStart = nginx.slice(0, nginx.indexOf('location ^~ /assets/'));
    expect(serverStart).toContain('access_log off;');
    expect(serverStart).toContain('error_log /dev/stderr crit;');
    expect(nginx).toContain('location ^~ /internal-media/');
    expect(nginx).toContain('internal;');
  });
});
