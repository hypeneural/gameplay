export interface SharePayload {
  readonly title: string;
  readonly text: string;
  readonly url: string;
}

export type ShareResult = 'shared' | 'cancelled' | 'copied' | 'manual-copy';

export interface ShareAdapter {
  canShare?(payload: SharePayload): boolean;
  share?(payload: SharePayload): Promise<void>;
  copy?(url: string): Promise<void>;
}

/**
 * Keeps the Web Share decision testable and browser-independent. A cancelled
 * native sheet is a normal player choice, not an error to surface.
 */
export async function shareLink(
  payload: SharePayload,
  adapter: ShareAdapter,
): Promise<ShareResult> {
  if (adapter.share && (!adapter.canShare || adapter.canShare(payload))) {
    try {
      await adapter.share(payload);
      return 'shared';
    } catch (error) {
      if (isShareCancelled(error)) return 'cancelled';
    }
  }

  if (adapter.copy) {
    try {
      await adapter.copy(payload.url);
      return 'copied';
    } catch {
      // The visible control exposes the exact link for a deliberate manual copy.
    }
  }
  return 'manual-copy';
}

export function createBrowserShareAdapter(browser: Navigator): ShareAdapter {
  const navigatorWithShare = browser as Navigator & {
    canShare?: (payload: SharePayload) => boolean;
    share?: (payload: SharePayload) => Promise<void>;
  };
  const clipboard = browser.clipboard;
  return {
    ...(navigatorWithShare.canShare
      ? { canShare: (payload: SharePayload) => navigatorWithShare.canShare?.(payload) ?? false }
      : {}),
    ...(navigatorWithShare.share
      ? {
          share: (payload: SharePayload) => navigatorWithShare.share?.(payload) ?? Promise.reject(),
        }
      : {}),
    ...(clipboard?.writeText ? { copy: (url: string) => clipboard.writeText(url) } : {}),
  };
}

export function createCurrentSharePayload(location: Pick<Location, 'href'>): SharePayload {
  return {
    title: 'Jogos de Natal — Estúdio Evydência',
    text: 'Venha brincar com as fotos de Natal do Estúdio Evydência!',
    url: location.href,
  };
}

function isShareCancelled(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    (error as { name?: unknown }).name === 'AbortError'
  );
}
