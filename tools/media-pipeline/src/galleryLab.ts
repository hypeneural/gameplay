import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join, resolve } from 'node:path';
import { prepareLocalMedia } from './prepareLocal.js';
import { mediaWorkerFingerprint } from './recipe.js';

const repositoryRoot = fileURLToPath(new URL('../../../', import.meta.url));
const defaultStorageRoot = join(repositoryRoot, '.local-test-media', 'gallery-lab');

interface GalleryLabOptions {
  readonly sourceDirectory: string;
  readonly storageRoot: string;
  readonly displayName?: string;
  readonly sessionUuid?: string;
  readonly concurrency?: number;
  readonly port: number;
  readonly prepareOnly: boolean;
}

interface GalleryLabSummary {
  readonly status: 'ready';
  readonly mode: 'prepare-only' | 'serve';
  readonly ready: number;
  readonly failed: number;
  readonly sessionId: string;
  readonly recipeKey: string;
  readonly configPath: string;
  readonly storageRoot: string;
  readonly urls: {
    readonly hub: string;
    readonly gallery: string;
    readonly puzzle: string;
  };
  readonly worker: typeof mediaWorkerFingerprint;
}

async function runGalleryLab(options: GalleryLabOptions): Promise<GalleryLabSummary> {
  const storageRoot = resolve(options.storageRoot);
  const prepared = await prepareLocalMedia({
    sourceDirectory: resolve(options.sourceDirectory),
    storageRoot,
    ...(options.displayName === undefined ? {} : { displayName: options.displayName }),
    ...(options.sessionUuid === undefined ? {} : { sessionUuid: options.sessionUuid }),
    ...(options.concurrency === undefined ? {} : { concurrency: options.concurrency }),
  });
  const origin = `http://127.0.0.1:${options.port}`;
  const sessionPath = `/s/${encodeURIComponent(prepared.publicToken)}`;
  const query = '?test-media=local';
  const summary: GalleryLabSummary = {
    status: 'ready',
    mode: options.prepareOnly ? 'prepare-only' : 'serve',
    ready: prepared.ready,
    failed: prepared.failed,
    sessionId: prepared.sessionId,
    recipeKey: prepared.recipeKey,
    configPath: prepared.configPath,
    storageRoot,
    urls: {
      hub: `${origin}${sessionPath}${query}`,
      gallery: `${origin}${sessionPath}/fotos${query}`,
      puzzle: `${origin}${sessionPath}/game/puzzle-swap${query}`,
    },
    worker: mediaWorkerFingerprint,
  };

  if (options.prepareOnly) return summary;

  process.stderr.write(
    [
      `Gallery Lab preparado com ${prepared.ready} fotos.`,
      `Hub: ${summary.urls.hub}`,
      `Galeria: ${summary.urls.gallery}`,
      `Puzzle: ${summary.urls.puzzle}`,
      'Servidor restrito a 127.0.0.1; Ctrl+C encerra o laboratório.',
      '',
    ].join('\n'),
  );
  await launchPlayServer(storageRoot, options.port);
  return summary;
}

async function launchPlayServer(storageRoot: string, port: number): Promise<void> {
  // Gallery Lab is itself launched through a pnpm script. Reuse the actual pnpm
  // JS entrypoint with the current Node executable instead of spawning
  // pnpm.cmd. This keeps shell=false on Windows and preserves structured args.
  const pnpmEntry = process.env.npm_execpath;
  if (!pnpmEntry) {
    throw new Error('Gallery Lab must be launched through pnpm so npm_execpath is available.');
  }
  const child = spawn(
    process.execPath,
    [
      pnpmEntry,
      '--filter',
      '@christmas-games/play',
      'dev',
      '--',
      '--host',
      '127.0.0.1',
      '--port',
      String(port),
      '--strictPort',
    ],
    {
      cwd: repositoryRoot,
      env: { ...process.env, LOCAL_TEST_MEDIA_ROOT: storageRoot },
      stdio: 'inherit',
      windowsHide: false,
      shell: false,
    },
  );

  await new Promise<void>((resolvePromise, reject) => {
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (code === 0 || signal === 'SIGINT' || signal === 'SIGTERM') {
        resolvePromise();
        return;
      }
      reject(new Error(`Gallery Lab dev server exited with code ${String(code)}.`));
    });
  });
}

function parseArguments(argv: readonly string[]): GalleryLabOptions {
  let sourceDirectory: string | undefined;
  let storageRoot = defaultStorageRoot;
  let displayName: string | undefined;
  let sessionUuid: string | undefined;
  let concurrency: number | undefined;
  let port = 5173;
  let prepareOnly = false;

  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    if (flag === '--prepare-only') {
      prepareOnly = true;
      continue;
    }
    const value = argv[index + 1];
    if (!flag || !value) throw new Error(`Expected a value after ${flag ?? 'option'}.`);
    index += 1;
    if (flag === '--source') sourceDirectory = value;
    else if (flag === '--storage') storageRoot = value;
    else if (flag === '--display-name') displayName = value;
    else if (flag === '--session') sessionUuid = value;
    else if (flag === '--concurrency') concurrency = Number(value);
    else if (flag === '--port') port = Number(value);
    else throw new Error(`Unknown Gallery Lab option: ${flag}.`);
  }

  if (!sourceDirectory) {
    throw new Error(
      'Usage: pnpm gallery:lab --source <photo-directory> [--storage <private-root>] [--display-name <name>] [--session <uuid>] [--concurrency <1-8>] [--port <port>] [--prepare-only]',
    );
  }
  if (!Number.isInteger(port) || port < 1024 || port > 65_535) {
    throw new Error('Gallery Lab port must be an integer between 1024 and 65535.');
  }

  return {
    sourceDirectory,
    storageRoot,
    port,
    prepareOnly,
    ...(displayName === undefined ? {} : { displayName }),
    ...(sessionUuid === undefined ? {} : { sessionUuid }),
    ...(concurrency === undefined ? {} : { concurrency }),
  };
}

async function main(): Promise<void> {
  const options = parseArguments(process.argv.slice(2));
  const summary = await runGalleryLab(options);
  if (options.prepareOnly) process.stdout.write(`${JSON.stringify(summary)}\n`);
}

if (process.argv[1]?.endsWith('galleryLab.ts')) {
  void main().catch((error: unknown) => {
    process.stderr.write(
      `${JSON.stringify({
        code: 'gallery_lab_failed',
        message: error instanceof Error ? error.message : 'Unknown Gallery Lab error.',
      })}\n`,
    );
    process.exitCode = 1;
  });
}
