import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { parsePublicationManifestV1 } from './publicationManifest.js';

const openapiUrl = new URL('../../../../docs/contracts/mvp-photo-publication-v1.openapi.json', import.meta.url);
const paths = [
  '/internal/v1/sessions/resolve',
  '/internal/v1/publications',
  '/internal/v1/publications/{revisionId}/blobs/{blobId}',
  '/internal/v1/publications/{revisionId}',
  '/internal/v1/publications/{revisionId}/activate',
  '/s/{token}/data',
  '/s/{token}/media/{revisionId}/{photoId}/{variant}',
] as const;

async function readSpec() {
  return JSON.parse(await readFile(openapiUrl, 'utf8')) as {
    openapi: string;
    paths: Record<string, Record<string, {
      security?: unknown;
      requestBody?: { content?: Record<string, { example?: unknown }> };
      responses?: Record<string, unknown>;
    }>>;
  };
}

describe('MVP OpenAPI contract is only a planned interface', () => {
  it('defines precisely five private operations and two public read operations', async () => {
    const api = await readSpec();
    expect(api.openapi).toBe('3.1.1');
    expect(Object.keys(api.paths).sort()).toEqual([...paths].sort());
    const privateOperations = Object.entries(api.paths)
      .filter(([path]) => path.startsWith('/internal/'))
      .flatMap(([, verbs]) => Object.keys(verbs));
    expect(privateOperations.sort()).toEqual(['get', 'post', 'post', 'post', 'put']);
  });

  it('protects private operations with bearer and never exposes POST on public routes', async () => {
    const api = await readSpec();
    for (const [path, operations] of Object.entries(api.paths)) {
      if (path.startsWith('/internal/')) {
        for (const op of Object.values(operations))
          expect(op.security).toEqual([{ publisherBearer: [] }]);
      } else expect(Object.keys(operations)).toEqual(['get']);
    }
  });

  it('keeps the sample upload manifesto compatible with existing strict parser', async () => {
    const api = await readSpec();
    const example = api.paths['/internal/v1/publications']?.post?.requestBody?.content?.['application/json']?.example;
    expect(parsePublicationManifestV1(example).photos).toHaveLength(1);
  });
});
