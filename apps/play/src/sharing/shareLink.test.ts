import { describe, expect, it, vi } from 'vitest';
import { createCurrentSharePayload, shareLink, type SharePayload } from './shareLink.js';

const payload: SharePayload = {
  title: 'Jogos de Natal — Estúdio Evydência',
  text: 'Venha brincar!',
  url: 'https://jogos.exemplo.test/s/sessao-opaca',
};

describe('shareLink', () => {
  it('uses the native panel when the browser accepts the payload', async () => {
    const share = vi.fn<() => Promise<void>>().mockResolvedValue();

    await expect(shareLink(payload, { canShare: () => true, share })).resolves.toBe('shared');
    expect(share).toHaveBeenCalledWith(payload);
  });

  it('treats native-sheet cancellation as a normal result', async () => {
    const cancelled = { name: 'AbortError' };

    await expect(
      shareLink(payload, { canShare: () => true, share: () => Promise.reject(cancelled) }),
    ).resolves.toBe('cancelled');
  });

  it('copies the link when native sharing is unavailable', async () => {
    const copy = vi.fn<(url: string) => Promise<void>>().mockResolvedValue();

    await expect(shareLink(payload, { copy })).resolves.toBe('copied');
    expect(copy).toHaveBeenCalledWith(payload.url);
  });

  it('returns manual copy when neither browser path is available', async () => {
    await expect(shareLink(payload, {})).resolves.toBe('manual-copy');
  });

  it('shares the full current route without attaching photo data', () => {
    expect(
      createCurrentSharePayload({
        href: 'https://jogos.exemplo.test/s/sessao-opaca/game/puzzle-swap',
      }),
    ).toMatchObject({
      title: 'Jogos de Natal — Estúdio Evydência',
      url: 'https://jogos.exemplo.test/s/sessao-opaca/game/puzzle-swap',
    });
  });
});
