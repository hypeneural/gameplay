import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { isAbsolute, join, resolve } from 'node:path';
import { prepareMultiLocalMedia } from './prepareMultiLocal.js';
import type { MultiClientPreparationSummary } from './prepareMultiLocal.js';

const repositoryRoot = fileURLToPath(new URL('../../../', import.meta.url));
const defaultConfigFile = join(repositoryRoot, '.local-test-media', 'clients.private.json');

function resolveRepositoryPath(targetPath: string): string {
  if (isAbsolute(targetPath)) return targetPath;
  const cwdPath = resolve(targetPath);
  if (existsSync(cwdPath)) return cwdPath;
  return resolve(repositoryRoot, targetPath);
}

export interface GalleryLabMultiOptions {
  readonly configPath: string;
  readonly storageRoot?: string;
  readonly concurrency?: number;
  readonly port: number;
  readonly prepareOnly: boolean;
}

export async function runGalleryLabMulti(
  options: GalleryLabMultiOptions,
): Promise<MultiClientPreparationSummary> {
  const summary = await prepareMultiLocalMedia({
    configPath: resolveRepositoryPath(options.configPath),
    ...(options.concurrency === undefined ? {} : { concurrency: options.concurrency }),
    ...(options.storageRoot === undefined ? {} : { overrideStorageRoot: options.storageRoot }),
  });

  const origin = `http://127.0.0.1:${options.port}`;

  process.stderr.write('\n=== LABORATÓRIO LOCAL MULTI-CLIENTE PREPARADO ===\n');
  process.stderr.write(`Storage Root (Privado): ${summary.storageRoot}\n\n`);

  for (const client of summary.clients) {
    const sessionPath = `/s/${encodeURIComponent(client.publicToken)}`;
    const query = '?test-media=local';
    const origMb = (client.metrics.originalBytes / (1024 * 1024)).toFixed(2);
    const derivMb = (client.metrics.derivedBytes / (1024 * 1024)).toFixed(2);

    process.stderr.write(`--- ${client.displayName} (${client.alias}) ---\n`);
    process.stderr.write(
      `  • Fotos elegíveis: ${client.counts.eligible} | Processadas: ${client.counts.processed} | Falhas: ${client.counts.failed}\n`,
    );
    process.stderr.write(
      `  • Descartes: ${client.counts.ignoredByPrefix} por prefixo | ${client.counts.ignoredSubdirectories} subpastas | ${client.counts.incompatibleFormat} formato incompatível\n`,
    );
    process.stderr.write(
      `  • Armazenamento: ${origMb} MB originais -> ${derivMb} MB derivados (${client.metrics.compressionRatioPercent}% de economia)\n`,
    );
    process.stderr.write(
      `  • Duração: ${client.metrics.durationMs}ms ${client.metrics.cacheHit ? '(Cache Hit)' : ''}\n`,
    );
    process.stderr.write(`  • Hub:     ${origin}${sessionPath}${query}\n`);
    process.stderr.write(`  • Galeria: ${origin}${sessionPath}/fotos${query}\n`);
    process.stderr.write(`  • Puzzle:  ${origin}${sessionPath}/game/puzzle-swap${query}\n\n`);
  }

  process.stderr.write(`DASHBOARD GERAL DO OPERADOR:\n`);
  process.stderr.write(`  ${origin}/__local-test/clients\n\n`);

  if (options.prepareOnly) {
    return summary;
  }

  process.stderr.write('Servidor restrito a 127.0.0.1; Pressione Ctrl+C para encerrar.\n\n');
  await launchPlayServer(summary.storageRoot, summary.registryPath, options.port);
  return summary;
}

async function launchPlayServer(
  storageRoot: string,
  registryPath: string,
  port: number,
): Promise<void> {
  const pnpmEntry = process.env.npm_execpath;
  if (!pnpmEntry) {
    throw new Error(
      'Gallery Lab Multi must be launched through pnpm so npm_execpath is available.',
    );
  }
  const child = spawn(
    process.execPath,
    [
      pnpmEntry,
      '--filter',
      '@christmas-games/play',
      'exec',
      'vite',
      '--host',
      '127.0.0.1',
      '--port',
      String(port),
      '--strictPort',
    ],
    {
      cwd: repositoryRoot,
      env: {
        ...process.env,
        LOCAL_TEST_MEDIA_ROOT: storageRoot,
        LOCAL_TEST_MEDIA_MULTI_REGISTRY: registryPath,
      },
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
      reject(new Error(`Gallery Lab Multi dev server exited with code ${String(code)}.`));
    });
  });
}

function parseArguments(argv: readonly string[]): GalleryLabMultiOptions {
  let configPath = defaultConfigFile;
  let storageRoot: string | undefined;
  let concurrency: number | undefined;
  let port = 5173;
  let prepareOnly = false;

  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    if (flag === '--') continue;
    if (flag === '--prepare-only') {
      prepareOnly = true;
      continue;
    }
    const value = argv[index + 1];
    if (!flag || !value) throw new Error(`Expected a value after ${flag ?? 'option'}.`);
    index += 1;
    if (flag === '--config') configPath = value;
    else if (flag === '--storage') storageRoot = value;
    else if (flag === '--concurrency') concurrency = Number(value);
    else if (flag === '--port') port = Number(value);
    else throw new Error(`Unknown Gallery Lab Multi option: ${flag}.`);
  }

  if (!Number.isInteger(port) || port < 1024 || port > 65_535) {
    throw new Error('Gallery Lab Multi port must be an integer between 1024 and 65535.');
  }

  return {
    configPath,
    port,
    prepareOnly,
    ...(storageRoot === undefined ? {} : { storageRoot }),
    ...(concurrency === undefined ? {} : { concurrency }),
  };
}

async function main(): Promise<void> {
  const options = parseArguments(process.argv.slice(2));
  const summary = await runGalleryLabMulti(options);
  if (options.prepareOnly) {
    process.stdout.write(`${JSON.stringify(summary)}\n`);
  }
}

if (process.argv[1]?.endsWith('galleryLabMulti.ts')) {
  void main().catch((error: unknown) => {
    process.stderr.write(
      `${JSON.stringify({
        code: 'gallery_lab_multi_failed',
        message: error instanceof Error ? error.message : 'Unknown Gallery Lab Multi error.',
      })}\n`,
    );
    process.exitCode = 1;
  });
}
