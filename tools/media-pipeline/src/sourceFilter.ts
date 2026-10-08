import { createHash } from 'node:crypto';
import { readdir, stat } from 'node:fs/promises';
import { extname, join } from 'node:path';

const supportedExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const ignoredPrefixPattern = /^\s*(calend[aá]rio|globo)/i;

interface FilteredSourceFile {
  readonly sourcePath: string;
  readonly fileName: string;
  readonly photoId: string;
}

export interface SourceFilterCounts {
  readonly totalEntries: number;
  readonly eligible: number;
  readonly ignoredByPrefix: number;
  readonly ignoredSubdirectories: number;
  readonly incompatibleFormat: number;
}

export interface SourceFilterResult {
  readonly eligible: readonly FilteredSourceFile[];
  readonly counts: SourceFilterCounts;
  readonly details: {
    readonly ignoredByPrefixFiles: readonly string[];
    readonly ignoredSubdirectoriesNames: readonly string[];
    readonly incompatibleFiles: readonly string[];
  };
}

/**
 * Generates an opaque, stable photo ID based on the normalized filename.
 * Does not expose the original name in the ID.
 */
function opaquePhotoIdFromSourceName(name: string): string {
  const normalized = name.normalize('NFC').toLowerCase();
  const digest = createHash('sha256').update(normalized, 'utf8').digest('hex');
  return `photo-${digest.slice(0, 20)}`;
}

/**
 * Filters source directories strictly according to business requirements:
 * 1. Only processes images directly in the root of the source directory.
 * 2. Subdirectories are ignored (and counted).
 * 3. Files whose names start with Calendário, Calendario, or Globo (case-insensitive,
 *    leading spaces tolerated) are ignored. Names with these words in the middle are preserved.
 * 4. Only JPEG, PNG, and WebP extensions are supported; other files (e.g. .zip) are counted as incompatible.
 * 5. Original files are never modified, moved, renamed, or compressed.
 */
export async function filterSourceDirectory(sourceDirectory: string): Promise<SourceFilterResult> {
  const entries = await readdir(sourceDirectory, { withFileTypes: true });

  const eligible: FilteredSourceFile[] = [];
  const ignoredByPrefixFiles: string[] = [];
  const ignoredSubdirectoriesNames: string[] = [];
  const incompatibleFiles: string[] = [];

  for (const entry of entries) {
    if (entry.isDirectory()) {
      ignoredSubdirectoriesNames.push(entry.name);
      continue;
    }

    if (!entry.isFile()) continue;

    if (ignoredPrefixPattern.test(entry.name)) {
      ignoredByPrefixFiles.push(entry.name);
      continue;
    }

    const extension = extname(entry.name).toLowerCase();
    if (!supportedExtensions.has(extension)) {
      incompatibleFiles.push(entry.name);
      continue;
    }

    const sourcePath = join(sourceDirectory, entry.name);
    eligible.push({
      sourcePath,
      fileName: entry.name,
      photoId: opaquePhotoIdFromSourceName(entry.name),
    });
  }

  // Sort deterministically by filename
  eligible.sort((left, right) => left.fileName.localeCompare(right.fileName));

  // Verify opaque ID collisions
  if (new Set(eligible.map((item) => item.photoId)).size !== eligible.length) {
    throw new Error('Opaque photo id collision detected; rename one source before retrying.');
  }

  // Validate that all eligible entries are regular readable files
  await Promise.all(
    eligible.map(async ({ sourcePath }) => {
      const stats = await stat(sourcePath);
      if (!stats.isFile()) {
        throw new Error(`Local media source must be a regular file: ${sourcePath}`);
      }
    }),
  );

  return {
    eligible,
    counts: {
      totalEntries: entries.length,
      eligible: eligible.length,
      ignoredByPrefix: ignoredByPrefixFiles.length,
      ignoredSubdirectories: ignoredSubdirectoriesNames.length,
      incompatibleFormat: incompatibleFiles.length,
    },
    details: {
      ignoredByPrefixFiles,
      ignoredSubdirectoriesNames,
      incompatibleFiles,
    },
  };
}
