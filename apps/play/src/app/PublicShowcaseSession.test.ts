import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  fetchPublicShowcaseSession,
  isApprovedShowcaseVariantUrl,
  parsePublicShowcaseManifest,
  PublicShowcaseLoadError,
  toPublicShowcaseSession,
} from './PublicShowcaseSession.js';

const validSha = 'a'.repeat(64);
const validManifest = {
  schemaVersion: 1 as const,
  collectionId: 'christmas-2026-public-showcase-v1',
  generatedAt: '2026-10-17T23:00:00.000Z',
  photos: [
    {
      photoId: 'demo_001',
      orientation: 'landscape' as const,
      width: 1600,
      height: 1067,
      variants: {
        thumb: '/showcase/v1/demo_001/thumb.webp?v=aaaaaaaaaaaa',
        card: '/showcase/v1/demo_001/card.webp?v=bbbbbbbbbbbb',
        game: '/showcase/v1/demo_001/game.webp?v=cccccccccccc',
      },
      sha256: {
        thumb: validSha,
        card: validSha,
        game: validSha,
      },
    },
  ],
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('PublicShowcaseSession', () => {
  it('validates approved showcase URLs and rejects private or traversal URLs', () => {
    expect(
      isApprovedShowcaseVariantUrl(
        '/showcase/v1/demo_001/thumb.webp?v=238396d859dc',
        'demo_001',
        'thumb',
      ),
    ).toBe(true);
    expect(
      isApprovedShowcaseVariantUrl('/showcase/v1/demo_001/card.webp', 'demo_001', 'card'),
    ).toBe(true);
    expect(
      isApprovedShowcaseVariantUrl(
        '/s/private-token/media/rev/demo_001/thumb',
        'demo_001',
        'thumb',
      ),
    ).toBe(false);
    expect(isApprovedShowcaseVariantUrl('/fixtures/portrait.svg', 'demo_001', 'thumb')).toBe(false);
    expect(
      isApprovedShowcaseVariantUrl('/showcase/v1/../demo_001/thumb.webp', 'demo_001', 'thumb'),
    ).toBe(false);
    expect(
      isApprovedShowcaseVariantUrl(
        'https://jogos.fotosdenatal.com/showcase/v1/demo_001/thumb.webp',
        'demo_001',
        'thumb',
      ),
    ).toBe(false);
  });

  it('parses a valid manifest and converts it to a Session', () => {
    const parsed = parsePublicShowcaseManifest(validManifest);
    const session = toPublicShowcaseSession(parsed);
    expect(session.id).toBe('showcase_christmas-2026-public-showcase-v1');
    expect(session.publicToken).toBe('local-demo-token');
    expect(session.photos).toHaveLength(1);
    expect(session.photos[0]?.id).toBe('demo_001');
    expect(session.photos[0]?.variants.game).toBe('/showcase/v1/demo_001/game.webp?v=cccccccccccc');
  });

  it('rejects manifests with private session URLs or duplicate photoIds', () => {
    expect(() =>
      parsePublicShowcaseManifest({
        ...validManifest,
        photos: [
          {
            ...validManifest.photos[0]!,
            variants: {
              thumb: '/s/secret/media/1/2/thumb',
              card: '/showcase/v1/demo_001/card.webp',
              game: '/showcase/v1/demo_001/game.webp',
            },
          },
        ],
      }),
    ).toThrowError(PublicShowcaseLoadError);

    expect(() =>
      parsePublicShowcaseManifest({
        ...validManifest,
        photos: [validManifest.photos[0]!, validManifest.photos[0]!],
      }),
    ).toThrowError(PublicShowcaseLoadError);
  });

  it('fetches /showcase/v1/manifest.json and fails closed on 404', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => validManifest,
    });
    vi.stubGlobal('fetch', fetchMock);

    const session = await fetchPublicShowcaseSession();
    expect(session.photos).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledWith(
      '/showcase/v1/manifest.json',
      expect.objectContaining({ cache: 'no-cache' }),
    );

    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 404,
    });
    await expect(fetchPublicShowcaseSession()).rejects.toMatchObject({
      code: 'PUBLIC_SHOWCASE_NOT_FOUND',
      status: 404,
    });
  });
});
