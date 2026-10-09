import { describe, expect, it, vi } from 'vitest';
import { fetchSessionData, isSessionPayload, SessionLoadError } from './SessionDataLoader.js';

describe('SessionDataLoader', () => {
  const validSession = {
    id: 'test-session-id',
    publicToken: 'test-token-1234567890',
    displayName: 'Seu Álbum de Natal',
    photos: [
      {
        id: 'photo-1',
        width: 1200,
        height: 800,
        aspectRatio: 1.5,
        orientation: 'landscape' as const,
        variants: {
          thumb: '/s/test-token-1234567890/media/rev-1/photo-1/thumb',
          card: '/s/test-token-1234567890/media/rev-1/photo-1/card',
          game: '/s/test-token-1234567890/media/rev-1/photo-1/game',
        },
      },
    ],
  };

  describe('isSessionPayload', () => {
    it('accepts valid session payload with relative media URLs', () => {
      expect(isSessionPayload(validSession)).toBe(true);
    });

    it('rejects null or non-object payloads', () => {
      expect(isSessionPayload(null)).toBe(false);
      expect(isSessionPayload(undefined)).toBe(false);
      expect(isSessionPayload('string')).toBe(false);
      expect(isSessionPayload(123)).toBe(false);
    });

    it('rejects session with empty photos array', () => {
      expect(isSessionPayload({ ...validSession, photos: [] })).toBe(false);
    });

    it('rejects session with unsafe or protocol-relative media URLs', () => {
      const unsafeSession = {
        ...validSession,
        photos: [
          {
            ...validSession.photos[0]!,
            variants: {
              ...validSession.photos[0]!.variants,
              thumb: '//malicious.com/attack.jpg',
            },
          },
        ],
      };
      expect(isSessionPayload(unsafeSession)).toBe(false);
    });

    it('rejects session with invalid photo dimensions', () => {
      const badDims = {
        ...validSession,
        photos: [
          {
            ...validSession.photos[0]!,
            width: -100,
          },
        ],
      };
      expect(isSessionPayload(badDims)).toBe(false);
    });
  });

  describe('fetchSessionData', () => {
    it('fetches and returns session data on 200 OK', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => validSession,
      });
      vi.stubGlobal('fetch', mockFetch);

      try {
        const session = await fetchSessionData('test-token-1234567890');
        expect(session.id).toBe('test-session-id');
        expect(mockFetch).toHaveBeenCalledWith(
          '/s/test-token-1234567890/data',
          expect.objectContaining({ cache: 'no-store' }),
        );
      } finally {
        vi.unstubAllGlobals();
      }
    });

    it('throws SESSION_NOT_FOUND on 404', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      });
      vi.stubGlobal('fetch', mockFetch);

      try {
        await expect(fetchSessionData('unknown-token')).rejects.toBeInstanceOf(SessionLoadError);
        await expect(fetchSessionData('unknown-token')).rejects.toThrow(
          expect.objectContaining({ code: 'SESSION_NOT_FOUND' }),
        );
      } finally {
        vi.unstubAllGlobals();
      }
    });

    it('throws SESSION_UNAUTHORIZED on 401/403', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
      });
      vi.stubGlobal('fetch', mockFetch);

      try {
        await expect(fetchSessionData('revoked-token')).rejects.toThrow(
          expect.objectContaining({ code: 'SESSION_UNAUTHORIZED' }),
        );
      } finally {
        vi.unstubAllGlobals();
      }
    });

    it('throws SESSION_SERVER_ERROR on 500', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      });
      vi.stubGlobal('fetch', mockFetch);

      try {
        await expect(fetchSessionData('valid-token')).rejects.toThrow(
          expect.objectContaining({ code: 'SESSION_SERVER_ERROR' }),
        );
      } finally {
        vi.unstubAllGlobals();
      }
    });

    it('throws SESSION_INVALID_PAYLOAD when server returns invalid contract', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ invalid: 'contract' }),
      });
      vi.stubGlobal('fetch', mockFetch);

      try {
        await expect(fetchSessionData('valid-token')).rejects.toThrow(
          expect.objectContaining({ code: 'SESSION_INVALID_PAYLOAD' }),
        );
      } finally {
        vi.unstubAllGlobals();
      }
    });

    it('throws SESSION_ABORTED when signal is aborted', async () => {
      const controller = new AbortController();
      controller.abort();

      const mockFetch = vi
        .fn()
        .mockRejectedValue(new DOMException('The user aborted a request.', 'AbortError'));
      vi.stubGlobal('fetch', mockFetch);

      try {
        await expect(fetchSessionData('valid-token', controller.signal)).rejects.toThrow(
          expect.objectContaining({ code: 'SESSION_ABORTED' }),
        );
      } finally {
        vi.unstubAllGlobals();
      }
    });
  });
});
