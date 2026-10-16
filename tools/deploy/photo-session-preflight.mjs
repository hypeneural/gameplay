import { Buffer } from 'node:buffer';
import { randomUUID } from 'node:crypto';
import { appendFile, lstat, open, readdir } from 'node:fs/promises';
import { extname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

// READ-ONLY LOCAL PREFLIGHT. No upload, customer identifiers, original file names or paths in logs.
// This is a header check; full image decoding happens in media:prepare-local.
const supported = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const ignoredPrefix = /^\s*(calend[aá]rio|globo)/i;
const allowedLogKeys = new Set([
  'schemaVersion',
  'at',
  'runId',
  'event',
  'result',
  'code',
  'index',
  'extension',
  'bytes',
  'eligible',
  'invalid',
  'ignoredByPrefix',
  'ignoredSubdirectories',
  'ignoredLinks',
  'unsupported',
  'totalBytes',
  'statusCode',
  'releaseStage',
  'durationMs',
]);

export class PreflightError extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
}

function magicValid(ext, bytes) {
  if (ext === '.jpg' || ext === '.jpeg') {
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (ext === '.png') {
    return bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  }
  return (
    bytes.subarray(0, 4).toString('ascii') === 'RIFF' &&
    bytes.subarray(8, 12).toString('ascii') === 'WEBP'
  );
}

export function safeLogEvent(input) {
  const result = {};
  for (const [key, value] of Object.entries(input)) {
    if (!allowedLogKeys.has(key)) continue;
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      result[key] = value;
    }
  }
  return result;
}

export async function scanPhotoSessionDirectory(sourceDirectory, emit = () => {}) {
  const root = resolve(sourceDirectory);
  let sourceStat;
  try {
    sourceStat = await lstat(root);
  } catch {
    throw new PreflightError('SOURCE_UNAVAILABLE');
  }
  if (!sourceStat.isDirectory() || sourceStat.isSymbolicLink()) {
    throw new PreflightError('SOURCE_NOT_DIRECTORY');
  }
  let entries;
  try {
    entries = await readdir(root, { withFileTypes: true });
  } catch {
    throw new PreflightError('SOURCE_UNREADABLE');
  }
  entries.sort((a, b) => a.name.localeCompare(b.name));
  const summary = {
    eligible: 0,
    invalid: 0,
    ignoredByPrefix: 0,
    ignoredSubdirectories: 0,
    ignoredLinks: 0,
    unsupported: 0,
    totalBytes: 0,
  };
  let index = 0;
  for (const entry of entries) {
    if (entry.isSymbolicLink()) {
      summary.ignoredLinks++;
      continue;
    }
    if (entry.isDirectory()) {
      summary.ignoredSubdirectories++;
      continue;
    }
    if (!entry.isFile()) {
      summary.ignoredLinks++;
      continue;
    }
    if (ignoredPrefix.test(entry.name)) {
      summary.ignoredByPrefix++;
      continue;
    }
    const extension = extname(entry.name).toLowerCase();
    if (!supported.has(extension)) {
      summary.unsupported++;
      continue;
    }
    index++;
    let valid;
    let fileBytes = 0;
    try {
      const filePath = join(root, entry.name);
      const fileStat = await lstat(filePath);
      if (!fileStat.isFile() || fileStat.isSymbolicLink() || fileStat.size === 0) {
        throw new PreflightError('NOT_REGULAR_IMAGE');
      }
      fileBytes = fileStat.size;
      const file = await open(filePath, 'r');
      try {
        const header = Buffer.alloc(12);
        const { bytesRead } = await file.read(header, 0, 12, 0);
        valid = magicValid(extension, header.subarray(0, bytesRead));
      } finally {
        await file.close();
      }
    } catch {
      valid = false;
    }
    if (valid) {
      summary.eligible++;
      summary.totalBytes += fileBytes;
      emit({ event: 'source.image', result: 'candidate', index, extension, bytes: fileBytes });
    } else {
      summary.invalid++;
      emit({
        event: 'source.image',
        result: 'rejected',
        code: 'INVALID_IMAGE_HEADER',
        index,
        extension,
      });
    }
  }
  emit({
    event: 'source.summary',
    result:
      summary.eligible > 0 && summary.invalid === 0 && summary.eligible <= 200 ? 'pass' : 'blocked',
    ...summary,
  });
  if (!summary.eligible) throw new PreflightError('NO_ELIGIBLE_IMAGES');
  if (summary.invalid) throw new PreflightError('INVALID_IMAGES_PRESENT');
  if (summary.eligible > 200) throw new PreflightError('PHOTO_LIMIT_EXCEEDED');
  return summary;
}

export async function checkPublicHealth(fetchImpl = fetch) {
  try {
    const response = await fetchImpl('https://jogos.fotosdenatal.com/healthz', {
      method: 'GET',
      redirect: 'error',
      signal: AbortSignal.timeout(5000),
      headers: { Accept: 'application/json' },
    });
    if (response.status !== 200) {
      return { result: 'blocked', code: 'HEALTH_HTTP_UNEXPECTED', statusCode: response.status };
    }
    const body = await response.json();
    if (body?.status !== 'ok' || body?.releaseStage !== 'staging-demo') {
      return { result: 'blocked', code: 'HEALTH_STAGE_UNEXPECTED', statusCode: response.status };
    }
    return { result: 'pass', statusCode: response.status, releaseStage: 'staging-demo' };
  } catch {
    return { result: 'blocked', code: 'HEALTH_UNAVAILABLE' };
  }
}

function within(candidate, parent) {
  const r = relative(parent, candidate);
  return r === '' || (r !== '..' && !r.startsWith(`..${sep}`) && !isAbsolute(r));
}

function optionsFrom(argv) {
  const options = { health: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--check-health') {
      options.health = true;
      continue;
    }
    if ((arg === '--source' || arg === '--log-file') && argv[i + 1]) {
      options[arg === '--source' ? 'source' : 'logFile'] = argv[++i];
      continue;
    }
    throw new PreflightError('INVALID_ARGUMENTS');
  }
  if (!options.source) throw new PreflightError('SOURCE_REQUIRED');
  if (
    options.logFile &&
    (within(resolve(options.logFile), resolve(options.source)) ||
      within(resolve(options.logFile), resolve(process.cwd())))
  ) {
    throw new PreflightError('LOG_PATH_UNSAFE');
  }
  return options;
}

export async function runPreflight(argv, write = (line) => process.stdout.write(line)) {
  let options;
  try {
    options = optionsFrom(argv);
  } catch (error) {
    write(
      `${JSON.stringify({ schemaVersion: 1, event: 'preflight.failed', code: error.code ?? 'INVALID_ARGUMENTS' })}\n`,
    );
    return 2;
  }
  const runId = randomUUID();
  const emit = async (item) => {
    const line = `${JSON.stringify(
      safeLogEvent({
        schemaVersion: 1,
        at: new Date().toISOString(),
        runId,
        ...item,
      }),
    )}\n`;
    write(line);
    if (options.logFile) {
      try {
        await appendFile(resolve(options.logFile), line, { mode: 0o600 });
      } catch {
        throw new PreflightError('LOG_WRITE_FAILED');
      }
    }
  };
  let logChain = Promise.resolve();
  const queue = (item) => {
    logChain = logChain.then(() => emit(item));
  };
  await emit({ event: 'preflight.start', result: 'started' });
  let passed = true;
  try {
    await scanPhotoSessionDirectory(options.source, queue);
  } catch (error) {
    passed = false;
    queue({ event: 'preflight.source', result: 'blocked', code: error.code ?? 'SCAN_FAILED' });
  }
  await logChain;
  if (options.health) {
    const start = Date.now();
    const result = await checkPublicHealth();
    await emit({ event: 'preflight.health', ...result, durationMs: Date.now() - start });
    if (result.result !== 'pass') passed = false;
  }
  await emit({
    event: 'preflight.finish',
    result: passed ? 'pass' : 'blocked',
    code: passed ? 'READ_ONLY_PREFLIGHT_ONLY' : 'PREFLIGHT_FAILED',
  });
  return passed ? 0 : 1;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  runPreflight(process.argv.slice(2)).then(
    (exitCode) => {
      process.exitCode = exitCode;
    },
    () => {
      process.stderr.write('{"event":"preflight.failed","code":"LOG_WRITE_FAILED"}\n');
      process.exitCode = 2;
    },
  );
}
