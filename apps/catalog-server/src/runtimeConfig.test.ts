import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { resolveCatalogRuntimeConfig } from './runtimeConfig.js';

const shell = resolve('/srv/christmas-games/current/web/index.html');

describe('resolveCatalogRuntimeConfig', () => {
  it('allows explicit staging-demo production configuration', () => {
    const config = resolveCatalogRuntimeConfig(
      'production',
      {
        CATALOG_RELEASE_STAGE: 'staging-demo',
        CATALOG_PUBLIC_ORIGIN: 'https://jogos.example.test',
        CATALOG_SOCIAL_PREVIEW_FILE: '/etc/christmas-games/social-preview.json',
        CATALOG_APPLICATION_SHELL: shell,
        PORT: '4180',
      },
      '/unused/index.html',
    );

    expect(config.releaseStage).toBe('staging-demo');
    expect(config.publicOrigin.href).toBe('https://jogos.example.test/');
    expect(config.applicationShellPath).toBe(shell);
    expect(config.port).toBe(4180);
    expect(config.host).toBe('127.0.0.1');
  });

  it('allows overriding host for container networking', () => {
    const config = resolveCatalogRuntimeConfig(
      'production',
      {
        CATALOG_RELEASE_STAGE: 'staging-demo',
        CATALOG_PUBLIC_ORIGIN: 'https://jogos.example.test',
        CATALOG_SOCIAL_PREVIEW_FILE: '/etc/christmas-games/social-preview.json',
        CATALOG_APPLICATION_SHELL: shell,
        PORT: '4180',
        HOST: '0.0.0.0',
      },
      '/unused/index.html',
    );

    expect(config.host).toBe('0.0.0.0');
  });

  it.each([
    [
      'release stage',
      {
        CATALOG_PUBLIC_ORIGIN: 'https://jogos.example.test',
        CATALOG_SOCIAL_PREVIEW_FILE: '/tmp/preview.json',
        CATALOG_APPLICATION_SHELL: shell,
      },
    ],
    [
      'public origin',
      {
        CATALOG_RELEASE_STAGE: 'staging-demo',
        CATALOG_SOCIAL_PREVIEW_FILE: '/tmp/preview.json',
        CATALOG_APPLICATION_SHELL: shell,
      },
    ],
    [
      'preview config',
      {
        CATALOG_RELEASE_STAGE: 'staging-demo',
        CATALOG_PUBLIC_ORIGIN: 'https://jogos.example.test',
        CATALOG_APPLICATION_SHELL: shell,
      },
    ],
    [
      'application shell',
      {
        CATALOG_RELEASE_STAGE: 'staging-demo',
        CATALOG_PUBLIC_ORIGIN: 'https://jogos.example.test',
        CATALOG_SOCIAL_PREVIEW_FILE: '/tmp/preview.json',
      },
    ],
  ])('fails closed when production %s is missing', (_label, environment) => {
    expect(() =>
      resolveCatalogRuntimeConfig('production', environment, '/fallback/index.html'),
    ).toThrow();
  });

  it('keeps local development HTTP-only defaults explicit', () => {
    const config = resolveCatalogRuntimeConfig(
      'development',
      { CATALOG_SOCIAL_PREVIEW_FILE: '/tmp/preview.json' },
      '/repo/apps/play/dist/index.html',
    );

    expect(config.releaseStage).toBe('development');
    expect(config.publicOrigin.href).toBe('http://127.0.0.1:4180/');
    expect(config.applicationShellPath).toBe(resolve('/repo/apps/play/dist/index.html'));
  });

  it('resolves secrets from file path when *_FILE is provided', () => {
    const config = resolveCatalogRuntimeConfig(
      'development',
      {
        CATALOG_SOCIAL_PREVIEW_FILE: '/tmp/preview.json',
        CATALOG_DATABASE_PATH: '/tmp/catalog.db',
        CATALOG_STORAGE_DIR: '/tmp/media',
        PUBLISHER_API_SECRET: 'direct-publisher-secret',
        CATALOG_SERVER_SECRET: 'direct-server-secret',
      },
      '/repo/apps/play/dist/index.html',
    );

    expect(config.databasePath).toBe(resolve('/tmp/catalog.db'));
    expect(config.storageDir).toBe(resolve('/tmp/media'));
    expect(config.publisherApiSecret).toBe('direct-publisher-secret');
    expect(config.serverSecret).toBe('direct-server-secret');
  });
});
