import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createFilePreviewRepository, parsePreviewConfiguration } from './filePreviewRepository.js';
import { genericPreviewVersion } from './socialPreview.js';

describe('parsePreviewConfiguration', () => {
  it('accepts an opaque generic record and a consented customer derivative', () => {
    const records = parsePreviewConfiguration({
      version: 1,
      sessions: [
        {
          token: 'local-demo-token',
          status: 'active',
          preview: { kind: 'generic', version: genericPreviewVersion },
        },
        {
          token: 'another-opaque-token',
          status: 'active',
          preview: {
            kind: 'customer-photo',
            consent: 'granted',
            derivativeKey: 'social-derivative-key',
            version: 'social-v1',
          },
        },
      ],
    });

    expect(records.get('local-demo-token')).toMatchObject({
      status: 'active',
      preview: { kind: 'generic' },
    });
    expect(records.get('another-opaque-token')).toMatchObject({
      status: 'active',
      preview: { kind: 'customer-photo', consent: 'granted' },
    });
  });

  it('rejects example tokens when the runtime requests production-safe configuration', () => {
    expect(() =>
      parsePreviewConfiguration(
        {
          version: 1,
          sessions: [
            {
              token: 'demo-session-token-change-me-001',
              status: 'active',
              preview: { kind: 'generic', version: genericPreviewVersion },
            },
          ],
        },
        { rejectExampleTokens: true },
      ),
    ).toThrow('sessão inválida');
  });

  it('re-applies production token policy after an atomic config replacement', async () => {
    const root = await mkdtemp(join(tmpdir(), 'catalog-preview-'));
    const path = join(root, 'social-preview.json');
    try {
      await writeFile(
        path,
        JSON.stringify({
          version: 1,
          sessions: [
            {
              token: 'safe-staging-token-1234567890',
              status: 'active',
              preview: { kind: 'generic', version: genericPreviewVersion },
            },
          ],
        }),
        'utf8',
      );
      const repository = createFilePreviewRepository(path, { rejectExampleTokens: true });
      await expect(repository.getByPublicToken('safe-staging-token-1234567890')).resolves.toMatchObject({
        status: 'active',
      });

      await writeFile(
        path,
        JSON.stringify({
          version: 1,
          sessions: [
            {
              token: 'demo-session-token-change-me-001',
              status: 'active',
              preview: { kind: 'generic', version: genericPreviewVersion },
            },
          ],
        }),
        'utf8',
      );

      await expect(repository.getByPublicToken('demo-session-token-change-me-001')).rejects.toThrow(
        'sessão inválida',
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('rejects a token that cannot appear in a public route', () => {
    expect(() =>
      parsePreviewConfiguration({
        version: 1,
        sessions: [
          {
            token: '../customer-name',
            status: 'active',
            preview: { kind: 'generic', version: genericPreviewVersion },
          },
        ],
      }),
    ).toThrow('sessão inválida');
  });
});
