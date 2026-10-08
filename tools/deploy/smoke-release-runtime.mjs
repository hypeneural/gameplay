import { randomBytes } from 'node:crypto';
import { once } from 'node:events';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawn } from 'node:child_process';

const releaseRoot = resolve(process.argv[2] ?? '.release/vps');
const serverEntry = join(releaseRoot, 'server', 'main.js');
const shellPath = join(releaseRoot, 'web', 'index.html');
const temporaryRoot = await mkdtemp(join(tmpdir(), 'christmas-staging-runtime-'));
const previewPath = join(temporaryRoot, 'social-preview.json');
const token = randomBytes(32).toString('base64url');
const port = await findFreePort();
const origin = 'https://staging-runtime.example.test';

await writeFile(
  previewPath,
  `${JSON.stringify(
    {
      version: 1,
      sessions: [
        {
          token,
          status: 'active',
          preview: { kind: 'generic', version: 'evydencia-christmas-v1' },
        },
      ],
    },
    null,
    2,
  )}\n`,
  { encoding: 'utf8', mode: 0o600 },
);

const child = spawn(process.execPath, [serverEntry], {
  cwd: releaseRoot,
  env: {
    ...process.env,
    NODE_ENV: 'production',
    CATALOG_RELEASE_STAGE: 'staging-demo',
    CATALOG_PUBLIC_ORIGIN: origin,
    CATALOG_SOCIAL_PREVIEW_FILE: previewPath,
    CATALOG_APPLICATION_SHELL: shellPath,
    PORT: String(port),
  },
  stdio: ['ignore', 'pipe', 'pipe'],
  shell: false,
});

let stderr = '';
child.stderr?.setEncoding('utf8');
child.stderr?.on('data', (chunk) => {
  stderr = (stderr + String(chunk)).slice(-4_000);
});

try {
  await waitForHealth(port, child);

  const health = await request(port, '/healthz');
  const healthBody = JSON.parse(health.body);
  if (
    health.status !== 200 ||
    healthBody.status !== 'ok' ||
    healthBody.releaseStage !== 'staging-demo'
  ) {
    throw new Error('Compiled catalog-server health contract failed.');
  }

  for (const suffix of ['', '/fotos', '/game/puzzle-swap']) {
    const result = await request(port, `/s/${encodeURIComponent(token)}${suffix}`);
    if (result.status !== 200 || !result.contentType.includes('text/html')) {
      throw new Error('Compiled catalog-server session route failed.');
    }
    if (result.referrerPolicy !== 'no-referrer') {
      throw new Error('Compiled catalog-server session route lost no-referrer policy.');
    }
    if (!result.body.includes(`https://staging-runtime.example.test/s/${token}${suffix}`)) {
      throw new Error('Compiled catalog-server session canonical URL is incorrect.');
    }
  }

  const unknown = await request(port, '/s/unknown-staging-token-000000000000');
  if (unknown.status !== 404) {
    throw new Error('Compiled catalog-server did not fail closed for an unknown token.');
  }

  process.stdout.write(
    `${JSON.stringify({
      status: 'ok',
      releaseRuntime: 'staging-demo',
      tokenPrinted: false,
      checks: ['healthz', 'hub', 'gallery', 'puzzle', 'unknown-token'],
    })}\n`,
  );
} catch (error) {
  const detail =
    child.exitCode === null ? '' : ` Catalog process exited with code ${String(child.exitCode)}.`;
  const safeDiagnostic = stderr
    .replaceAll(previewPath, '<private-preview-config>')
    .replaceAll(token, '<redacted-token>')
    .slice(-1_000);
  throw new Error(
    `${error instanceof Error ? error.message : 'Release runtime smoke failed.'}${detail}${safeDiagnostic ? ` Diagnostic: ${safeDiagnostic}` : ''}`,
    { cause: error },
  );
} finally {
  await stopChild(child);
  await rm(temporaryRoot, { recursive: true, force: true });
}

async function request(port, pathname) {
  const response = await fetch(`http://127.0.0.1:${port}${pathname}`, {
    redirect: 'error',
    signal: AbortSignal.timeout(3_000),
  });
  return {
    status: response.status,
    contentType: response.headers.get('content-type') ?? '',
    referrerPolicy: response.headers.get('referrer-policy') ?? '',
    body: await response.text(),
  };
}

async function waitForHealth(port, processHandle) {
  const deadline = Date.now() + 8_000;
  while (Date.now() < deadline) {
    if (processHandle.exitCode !== null) {
      throw new Error('Compiled catalog-server exited before becoming healthy.');
    }
    try {
      const health = await request(port, '/healthz');
      if (health.status === 200) return;
    } catch {
      // The listener may not be ready yet.
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 100));
  }
  throw new Error('Compiled catalog-server did not become healthy in time.');
}

async function findFreePort() {
  const server = createServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  if (!address || typeof address === 'string') {
    server.close();
    throw new Error('Could not allocate a loopback port for release runtime smoke.');
  }
  const port = address.port;
  server.close();
  await once(server, 'close');
  return port;
}

async function stopChild(processHandle) {
  if (processHandle.exitCode !== null) return;
  const exited = once(processHandle, 'exit');
  processHandle.kill('SIGTERM');
  const timedOut = new Promise((resolvePromise) => setTimeout(resolvePromise, 3_000, 'timeout'));
  if ((await Promise.race([exited, timedOut])) === 'timeout' && processHandle.exitCode === null) {
    const forcedExit = once(processHandle, 'exit');
    processHandle.kill('SIGKILL');
    await forcedExit;
  }
}
