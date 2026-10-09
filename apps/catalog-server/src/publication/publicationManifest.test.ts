import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { parsePublicationManifestV1, publicationLimits } from './publicationManifest.js';

function validManifest() {
  const variant = () => ({
    blobId: randomUUID(),
    sha256: 'a'.repeat(64),
    byteLength: 230_000,
    width: 800,
    height: 600,
  });
  return {
    schemaVersion: 1,
    requestId: randomUUID(),
    sessionId: randomUUID(),
    expectedActiveRevisionId: null,
    recipeKey: 'recipe-1-webp82-srgb-inside',
    photos: [
      {
        photoId: 'photo-01abc',
        contentHash: 'b'.repeat(64),
        sortIndex: 0,
        width: 1600,
        height: 1200,
        variants: { thumb: variant(), card: variant(), game: variant() },
      },
    ],
  };
}

describe('publicationManifestV1 (untrusted Node / Python boundary)', () => {
  it('accepts a complete derived-media manifest without exposing originals', () => {
    expect(parsePublicationManifestV1(validManifest())).toMatchObject({
      schemaVersion: 1,
      photos: [{ photoId: 'photo-01abc', sortIndex: 0 }],
    });
  });

  it('supports optimistic concurrency against an existing revision', () => {
    const manifest = validManifest();
    manifest.expectedActiveRevisionId = randomUUID() as never;
    expect(parsePublicationManifestV1(manifest).expectedActiveRevisionId).toBe(
      manifest.expectedActiveRevisionId,
    );
  });

  it('rejects an unknown field containing a customer path, URL or token', () => {
    const manifest = validManifest();
    expect(() =>
      parsePublicationManifestV1({ ...manifest, originalPath: 'C:/private/customer.jpeg' }),
    ).toThrow('publication_manifest_invalid');
    expect(() =>
      parsePublicationManifestV1({
        ...manifest,
        photos: [{ ...manifest.photos[0], customerName: 'SENSITIVE' }],
      }),
    ).toThrow('publication_manifest_invalid');
    expect(() =>
      parsePublicationManifestV1({
        ...manifest,
        photos: [{
          ...manifest.photos[0],
          variants: {
            ...manifest.photos[0]!.variants,
            thumb: { ...manifest.photos[0]!.variants.thumb, publicUrl: 'https://example.test' },
          },
        }],
      }),
    ).toThrow('publication_manifest_invalid');
  });

  it('rejects path-like and duplicate photo identifiers', () => {
    const manifest = validManifest();
    for (const photoId of ['../client-a', 'a/b', '', 'a\\b', '.hidden']) {
      expect(() =>
        parsePublicationManifestV1({
          ...manifest,
          photos: [{ ...manifest.photos[0], photoId }],
        }),
      ).toThrow('publication_manifest_invalid');
    }
    expect(() =>
      parsePublicationManifestV1({ ...manifest, photos: [manifest.photos[0], manifest.photos[0]] }),
    ).toThrow('publication_manifest_invalid');
  });

  it('rejects duplicate blob identifiers and malformed hashes', () => {
    const manifest = validManifest();
    manifest.photos[0]!.variants.card.blobId = manifest.photos[0]!.variants.thumb.blobId;
    expect(() => parsePublicationManifestV1(manifest)).toThrow('publication_manifest_invalid');
    manifest.photos[0]!.variants.card.blobId = randomUUID();
    manifest.photos[0]!.variants.game.sha256 = 'sha256-bad';
    expect(() => parsePublicationManifestV1(manifest)).toThrow('publication_manifest_invalid');
  });

  it('rejects missing variants and wrong dimensions', () => {
    const manifest = validManifest();
    expect(() =>
      parsePublicationManifestV1({
        ...manifest,
        photos: [{ ...manifest.photos[0], variants: { thumb: manifest.photos[0]!.variants.thumb } }],
      }),
    ).toThrow('publication_manifest_invalid');
    manifest.photos[0]!.variants.game.width = 9999;
    expect(() => parsePublicationManifestV1(manifest)).toThrow('publication_manifest_invalid');
  });

  it('rejects oversized files and batches', () => {
    const manifest = validManifest();
    manifest.photos[0]!.variants.thumb.byteLength = publicationLimits.maxVariantBytes + 1;
    expect(() => parsePublicationManifestV1(manifest)).toThrow('publication_manifest_invalid');
    expect(() => parsePublicationManifestV1({ ...manifest, photos: [] })).toThrow(
      'publication_manifest_invalid',
    );
  });

  it('rejects ambiguous sort indexes and preserves explicit gallery order', () => {
    const manifest = validManifest();
    const other = {
      ...manifest.photos[0]!,
      photoId: 'photo-02def',
      sortIndex: 1,
      variants: {
        thumb: { ...manifest.photos[0]!.variants.thumb, blobId: randomUUID() },
        card: { ...manifest.photos[0]!.variants.card, blobId: randomUUID() },
        game: { ...manifest.photos[0]!.variants.game, blobId: randomUUID() },
      },
    };
    expect(
      parsePublicationManifestV1({ ...manifest, photos: [other, manifest.photos[0]] }).photos.map(
        (photo) => photo.photoId,
      ),
    ).toEqual(['photo-01abc', 'photo-02def']);
    expect(() =>
      parsePublicationManifestV1({ ...manifest, photos: [{ ...other, sortIndex: 5 }] }),
    ).toThrow('publication_manifest_invalid');
  });

  it('rejects invalid or missing idempotency request identifiers', () => {
    const manifest = validManifest();
    expect(() => parsePublicationManifestV1({ ...manifest, requestId: 'retry' })).toThrow(
      'publication_manifest_invalid',
    );
    expect(() => parsePublicationManifestV1({ ...manifest, requestId: undefined })).toThrow(
      'publication_manifest_invalid',
    );
  });
});
