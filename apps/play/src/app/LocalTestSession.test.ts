import { describe, expect, it, vi } from 'vitest';
import { fetchLocalTestSession, shouldUseLocalTestMedia } from './LocalTestSession.js';

describe('LocalTestSession', () => {
  it('requires the explicit local test query value', () => {
    expect(shouldUseLocalTestMedia('?test-media=local')).toBe(true);
    expect(shouldUseLocalTestMedia('?test-media=fixture')).toBe(false);
    expect(shouldUseLocalTestMedia('')).toBe(false);
  });

  it('queries session endpoint with token when provided', async () => {
    const fakeSession = {
      id: 'session-123',
      publicToken: 'token-abc',
      displayName: 'Cliente A',
      photos: [
        {
          id: 'ph-1',
          width: 800,
          height: 600,
          aspectRatio: 1.333,
          orientation: 'landscape',
          variants: {
            thumb: '/__local-test/media/token-abc/ph-1/thumb',
            card: '/__local-test/media/token-abc/ph-1/card',
            game: '/__local-test/media/token-abc/ph-1/game',
          },
        },
      ],
    };

    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => fakeSession,
    });
    vi.stubGlobal('fetch', fetchSpy);

    const result = await fetchLocalTestSession('token-abc');
    expect(fetchSpy).toHaveBeenCalledWith('/__local-test/sessions/token-abc', {
      cache: 'no-store',
    });
    expect(result.id).toBe('session-123');

    await fetchLocalTestSession();
    expect(fetchSpy).toHaveBeenCalledWith('/__local-test/session', { cache: 'no-store' });

    vi.unstubAllGlobals();
  });

  it('fails closed when local session endpoint returns non-OK or invalid contract', async () => {
    const fetchSpy = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 403 })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'bad-session', photos: [] }),
      });
    vi.stubGlobal('fetch', fetchSpy);

    await expect(fetchLocalTestSession('token-abc')).rejects.toThrow(
      'A sessão local de teste ainda não está preparada.',
    );
    await expect(fetchLocalTestSession('token-abc')).rejects.toThrow(
      'A sessão local de teste retornou um contrato inválido.',
    );

    vi.unstubAllGlobals();
  });
});
