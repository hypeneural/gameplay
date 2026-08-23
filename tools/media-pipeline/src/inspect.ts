import { readdir, stat } from 'node:fs/promises';
import { extname, join } from 'node:path';
import sharp from 'sharp';

const supportedExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const knownImageExtensions = new Set([
  ...supportedExtensions,
  '.avif',
  '.gif',
  '.heic',
  '.heif',
  '.tif',
  '.tiff',
]);

export interface PhotoCorpusStats {
  /** The scope and decoder depth, not a claim that every input is game-ready. */
  method: string;
  sourceLayout: 'session-root' | 'day-batches';
  /** Directories evaluated as potential sessions before candidate filtering. */
  sessionDirectories: number;
  sessions: number;
  emptySessionDirectories: number;
  /** Direct files with a production-supported extension, before header validation. */
  directImages: number;
  supportedCandidates: number;
  unsupportedCandidates: Record<string, number>;
  unreadableCandidates: number;
  sampledImages: number;
  sessionPhotoCounts: { min: number; median: number; p90: number; max: number };
  orientation: { portrait: number; landscape: number; square: number };
  dimensionsPx: {
    widthMedian: number;
    widthP10: number;
    widthP90: number;
    heightMedian: number;
    heightP10: number;
    heightP90: number;
  };
  aspectRatio: { median: number; p10: number; p90: number };
  megapixels: { median: number; p10: number; p90: number };
  fileSizeMiB: { median: number; p90: number; totalSampleGiB: number };
  format: Record<string, number>;
  colourSpace: Record<string, number>;
  embeddedProfiles: number;
  /** EXIF values 2–8 require a transform, including mirrored orientations. */
  exifOrientationRequiresNormalization: number;
  /** EXIF values 5–8 swap the logical width and height. */
  exifOrientationSwapsDimensions: number;
}

interface ImageHeader {
  width: number;
  height: number;
  bytes: number;
  orientation: number;
  format: string;
  colourSpace: string;
  hasProfile: boolean;
}

interface InspectionSuccess {
  status: 'valid';
  header: ImageHeader;
}

interface InspectionFailure {
  status: 'unreadable';
}

type InspectionResult = InspectionSuccess | InspectionFailure;

/**
 * Inspects only immediate files of every session folder. Nested folders are
 * intentionally excluded so low-resolution delivery folders cannot skew the
 * production baseline or become accidental game inputs. It does not transform
 * pixels: a valid header remains a candidate until the worker fully decodes it.
 */
export async function inspectPhotoCorpus(
  root: string,
  samplePerSession = 0,
): Promise<PhotoCorpusStats> {
  if (!Number.isInteger(samplePerSession) || ![0, 1, 3].includes(samplePerSession)) {
    throw new Error('samplePerSession must be 0 (all), 1, or 3 (first, middle, last).');
  }
  const { layout, directories: sessions } = await discoverSessionDirectories(root);
  const sessionPhotoCounts: number[] = [];
  const paths: string[] = [];
  const unsupportedCandidates = new Map<string, number>();

  for (const directory of sessions) {
    const files = (await readdir(directory, { withFileTypes: true }))
      .filter((entry) => entry.isFile())
      .sort((left, right) => left.name.localeCompare(right.name));
    const supported = files.filter((entry) => {
      const extension = extname(entry.name).toLowerCase();
      if (supportedExtensions.has(extension)) return true;
      if (knownImageExtensions.has(extension)) {
        unsupportedCandidates.set(extension, (unsupportedCandidates.get(extension) ?? 0) + 1);
      }
      return false;
    });
    sessionPhotoCounts.push(supported.length);
    paths.push(
      ...selectFiles(
        supported.map((file) => join(directory, file.name)),
        samplePerSession,
      ),
    );
  }

  const inspected = await mapWithConcurrency(paths, 12, inspectHeader);
  const nonEmptySessionPhotoCounts = sessionPhotoCounts.filter((count) => count > 0);
  const headers = inspected
    .filter((result): result is InspectionSuccess => result.status === 'valid')
    .map((result) => result.header);
  const values = <Key extends keyof ImageHeader>(key: Key): number[] =>
    headers.map((header) => header[key] as number);
  const width = values('width');
  const height = values('height');
  const bytes = values('bytes');
  const ratios = headers.map((header) => header.width / header.height);
  const megapixels = headers.map((header) => (header.width * header.height) / 1_000_000);

  return {
    method:
      samplePerSession === 0
        ? 'all direct supported-image headers; nested delivery folders excluded; no pixel transform'
        : `stratified direct supported-image headers (first, middle, last); nested delivery folders excluded; no pixel transform`,
    sourceLayout: layout,
    sessionDirectories: sessions.length,
    sessions: nonEmptySessionPhotoCounts.length,
    emptySessionDirectories: sessionPhotoCounts.length - nonEmptySessionPhotoCounts.length,
    directImages: sessionPhotoCounts.reduce((total, count) => total + count, 0),
    supportedCandidates: sessionPhotoCounts.reduce((total, count) => total + count, 0),
    unsupportedCandidates: Object.fromEntries(
      [...unsupportedCandidates.entries()].sort(([left], [right]) => left.localeCompare(right)),
    ),
    unreadableCandidates: inspected.filter((result) => result.status === 'unreadable').length,
    sampledImages: headers.length,
    sessionPhotoCounts: {
      min: percentile(nonEmptySessionPhotoCounts, 0),
      median: percentile(nonEmptySessionPhotoCounts, 0.5),
      p90: percentile(nonEmptySessionPhotoCounts, 0.9),
      max: percentile(nonEmptySessionPhotoCounts, 1),
    },
    orientation: {
      portrait: headers.filter((header) => header.height > header.width).length,
      landscape: headers.filter((header) => header.width > header.height).length,
      square: headers.filter((header) => header.width === header.height).length,
    },
    dimensionsPx: {
      widthMedian: percentile(width, 0.5),
      widthP10: percentile(width, 0.1),
      widthP90: percentile(width, 0.9),
      heightMedian: percentile(height, 0.5),
      heightP10: percentile(height, 0.1),
      heightP90: percentile(height, 0.9),
    },
    aspectRatio: {
      median: percentile(ratios, 0.5),
      p10: percentile(ratios, 0.1),
      p90: percentile(ratios, 0.9),
    },
    megapixels: {
      median: percentile(megapixels, 0.5),
      p10: percentile(megapixels, 0.1),
      p90: percentile(megapixels, 0.9),
    },
    fileSizeMiB: {
      median: round(percentile(bytes, 0.5) / 1_048_576),
      p90: round(percentile(bytes, 0.9) / 1_048_576),
      totalSampleGiB: round(bytes.reduce((total, value) => total + value, 0) / 1_073_741_824),
    },
    format: histogram(headers.map((header) => header.format)),
    colourSpace: histogram(headers.map((header) => header.colourSpace)),
    embeddedProfiles: headers.filter((header) => header.hasProfile).length,
    exifOrientationRequiresNormalization: headers.filter((header) => header.orientation !== 1)
      .length,
    exifOrientationSwapsDimensions: headers.filter((header) =>
      [5, 6, 7, 8].includes(header.orientation),
    ).length,
  };
}

/**
 * A season may have session folders directly at root or one date-folder layer
 * such as `01 11 2024`. Only that explicit date wrapper is traversed; folders
 * inside a session (for example `baixa`) are never included.
 */
async function discoverSessionDirectories(
  root: string,
): Promise<{ layout: 'session-root' | 'day-batches'; directories: string[] }> {
  const rootDirectories = (await readdir(root, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .sort((left, right) => left.name.localeCompare(right.name));
  const dayDirectories = rootDirectories.filter((entry) => isDayFolderName(entry.name));
  const isDayBatchRoot =
    dayDirectories.length > 0 && dayDirectories.length / rootDirectories.length >= 0.9;
  if (!isDayBatchRoot) {
    return {
      layout: 'session-root',
      directories: rootDirectories.map((entry) => join(root, entry.name)),
    };
  }

  const directories: string[] = [];
  for (const day of dayDirectories) {
    const daySessions = (await readdir(join(root, day.name), { withFileTypes: true }))
      .filter((entry) => entry.isDirectory())
      .sort((left, right) => left.name.localeCompare(right.name));
    directories.push(...daySessions.map((entry) => join(root, day.name, entry.name)));
  }
  return { layout: 'day-batches', directories };
}

function isDayFolderName(name: string): boolean {
  return /^\d{2}[ ._-]\d{2}[ ._-]\d{4}$/.test(name);
}

function selectFiles(files: readonly string[], samplePerSession: number): readonly string[] {
  if (samplePerSession === 0 || files.length <= samplePerSession) return files;
  if (samplePerSession === 1) return files.slice(0, 1);
  return [...new Set([files[0], files[Math.floor((files.length - 1) / 2)], files.at(-1)])].filter(
    (file): file is string => file !== undefined,
  );
}

async function inspectHeader(path: string): Promise<InspectionResult> {
  try {
    const [metadata, file] = await Promise.all([
      sharp(path, { failOn: 'warning' }).metadata(),
      stat(path),
    ]);
    if (!metadata.width || !metadata.height || !metadata.format) return { status: 'unreadable' };
    const orientation = metadata.orientation ?? 1;
    const swapsDimensions = [5, 6, 7, 8].includes(orientation);
    return {
      status: 'valid',
      header: {
        width: swapsDimensions ? metadata.height : metadata.width,
        height: swapsDimensions ? metadata.width : metadata.height,
        bytes: file.size,
        orientation,
        format: metadata.format,
        colourSpace: metadata.space ?? 'unknown',
        hasProfile: metadata.hasProfile ?? false,
      },
    };
  } catch {
    return { status: 'unreadable' };
  }
}

async function mapWithConcurrency<T, Result>(
  values: readonly T[],
  concurrency: number,
  mapper: (value: T) => Promise<Result>,
): Promise<Result[]> {
  const results: Result[] = [];
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(concurrency, values.length) }, async () => {
      while (true) {
        const value = values[next++];
        if (value === undefined) return;
        results.push(await mapper(value));
      }
    }),
  );
  return results;
}

function histogram(values: readonly string[]): Record<string, number> {
  return Object.fromEntries(
    [
      ...values.reduce(
        (counts, value) => counts.set(value, (counts.get(value) ?? 0) + 1),
        new Map<string, number>(),
      ),
    ].sort(([left], [right]) => left.localeCompare(right)),
  );
}

function percentile(values: readonly number[], fraction: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  return round(sorted[Math.round((sorted.length - 1) * fraction)]!);
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

async function main(): Promise<void> {
  const [root, flag, value] = process.argv.slice(2);
  if (!root || (flag !== undefined && flag !== '--sample-per-session')) {
    throw new Error('Usage: pnpm media:inspect <session-root> [--sample-per-session 0|1|3]');
  }
  const samplePerSession = value === undefined ? 0 : Number(value);
  console.log(JSON.stringify(await inspectPhotoCorpus(root, samplePerSession), null, 2));
}

if (process.argv[1]?.endsWith('inspect.ts')) {
  void main();
}
