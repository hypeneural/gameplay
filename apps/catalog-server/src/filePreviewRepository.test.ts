import { describe, expect, it } from 'vitest';
import { parsePreviewConfiguration } from './filePreviewRepository.js';
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
