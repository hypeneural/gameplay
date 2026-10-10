import { readFile } from 'node:fs/promises';
import { genericPreviewVersion, isOpaquePublicToken, legacyGenericPreviewVersion } from './socialPreview.js';
import type { SocialPreviewRecord, SocialPreviewRepository } from './socialPreview.js';

/**
 * Small deployment adapter for a private, atomically replaced JSON file. It
 * reloads on every decision so consent revocation does not wait for a process
 * restart. A database adapter can replace it through the same interface.
 */
export function createFilePreviewRepository(
  configPath: string,
  options: PreviewConfigurationOptions = {},
): SocialPreviewRepository {
  return {
    async getByPublicToken(token) {
      const source = await readFile(configPath, 'utf8');
      const parsed: unknown = JSON.parse(source);
      return parsePreviewConfiguration(parsed, options).get(token);
    },
  };
}

export interface PreviewConfigurationOptions {
  readonly rejectExampleTokens?: boolean;
}

export function parsePreviewConfiguration(
  value: unknown,
  options: PreviewConfigurationOptions = {},
): ReadonlyMap<string, SocialPreviewRecord> {
  if (!isRecord(value) || value.version !== 1 || !Array.isArray(value.sessions)) {
    throw new Error('A configuração de prévia social deve conter version 1 e sessions.');
  }
  const records = new Map<string, SocialPreviewRecord>();
  for (const entry of value.sessions) {
    if (
      !isRecord(entry) ||
      typeof entry.token !== 'string' ||
      !isOpaquePublicToken(entry.token) ||
      records.has(entry.token) ||
      (options.rejectExampleTokens === true && isExampleToken(entry.token))
    ) {
      throw new Error('A configuração de prévia social contém uma sessão inválida ou repetida.');
    }
    records.set(entry.token, parsePreviewRecord(entry));
  }
  return records;
}

function isExampleToken(token: string): boolean {
  return token.toLowerCase().includes('change-me') || token.toLowerCase().includes('example');
}

function parsePreviewRecord(value: Record<string, unknown>): SocialPreviewRecord {
  if (value.status === 'revoked') return { status: 'revoked' };
  if (
    value.status !== 'active' ||
    !isRecord(value.preview) ||
    typeof value.preview.kind !== 'string'
  ) {
    throw new Error('A configuração de prévia social contém um estado inválido.');
  }
  if (value.preview.kind === 'generic' &&
    (value.preview.version === genericPreviewVersion ||
      value.preview.version === legacyGenericPreviewVersion)) {
    return { status: 'active', preview: { kind: 'generic', version: value.preview.version } };
  }
  if (
    value.preview.kind === 'customer-photo' &&
    (value.preview.consent === 'granted' || value.preview.consent === 'revoked') &&
    typeof value.preview.derivativeKey === 'string' &&
    /^[A-Za-z0-9_-]{16,128}$/.test(value.preview.derivativeKey) &&
    typeof value.preview.version === 'string' &&
    /^[A-Za-z0-9_-]{1,64}$/.test(value.preview.version) &&
    (value.preview.format === undefined ||
      value.preview.format === 'webp' ||
      value.preview.format === 'jpeg')
  ) {
    return {
      status: 'active',
      preview: {
        kind: 'customer-photo',
        consent: value.preview.consent,
        derivativeKey: value.preview.derivativeKey,
        version: value.preview.version,
        ...(value.preview.format ? { format: value.preview.format as 'webp' | 'jpeg' } : {}),
      },
    };
  }
  throw new Error('A configuração de prévia social contém uma prévia inválida.');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
