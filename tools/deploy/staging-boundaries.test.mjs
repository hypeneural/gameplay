import { readFile } from 'node:fs/promises';
import { URL } from 'node:url';
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

  it('private metadata reader starts the bundled catalog process and never exposes a public port', async () => {
    const overlay = await readFile(
      new URL('deploy/vps/docker/compose.private-audit.yaml', root),
      'utf8',
    );
    const persistent = await readFile(
      new URL('deploy/vps/docker/compose.persistence.yaml', root),
      'utf8',
    );
    expect(overlay).toContain("command: ['node', 'server/main.js']");
    expect(overlay).toContain("CATALOG_PRIVATE_METADATA_READ_ONLY: '1'");
    expect(overlay).toContain('read_only: true');
    expect(overlay).toContain('no-new-privileges:true');
    expect(overlay).toContain(
      'CATALOG_INTERNAL_READ_SECRET_FILE: /run/catalog-secrets/reader.secret',
    );
    expect(overlay).toContain("'127.0.0.1:${CATALOG_READER_HOST_PORT:-4182}:4180'");
    expect(overlay).not.toContain('100.116.8.109:4180');
    expect(overlay).not.toContain(' - edge');
    expect(persistent).toContain('  backend:');
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
