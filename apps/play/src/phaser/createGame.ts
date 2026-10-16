import type { GameBridge, GameContext, GameController, Photo } from '@christmas-games/platform';
import type * as PhaserModule from 'phaser';
import type { AvailableGameId, PhaserGameModule } from './gameRegistry.js';
import { loadGameModule } from './gameRegistry.js';

export interface LoadedGameRuntime {
  Phaser: typeof PhaserModule;
  gameModule: PhaserGameModule;
  importMs: number;
}

const prefetchedGamePhotoUrls = new Set<string>();
const MAX_PREFETCHED_GAME_PHOTOS = 4;

function nowMs(): number {
  return typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now();
}

/**
 * Loading has no DOM or Phaser instance side effects and therefore requires no
 * mount lease. Browser module caching makes an intent prefetch reusable by the
 * eventual game entry.
 */
export async function loadGameRuntime(gameId: AvailableGameId): Promise<LoadedGameRuntime> {
  const startedAt = nowMs();
  const [Phaser, gameModule] = await Promise.all([import('phaser'), loadGameModule(gameId)]);
  return {
    Phaser,
    gameModule,
    importMs: Math.max(0, Math.round(nowMs() - startedAt)),
  };
}

/**
 * Warms the HTTP cache for a distinct `game` derivative on explicit user intent
 * (`pointerdown` / `focus`), without creating a second request when `game` and
 * `card` share the same URL (such as local SVG fixtures).
 */
export function prefetchGamePhoto(photo: Photo, lowQuality = false): void {
  if (typeof window === 'undefined' || lowQuality || typeof window.Image !== 'function') {
    return;
  }
  const gameUrl = photo.variants.game;
  if (!gameUrl || gameUrl === photo.variants.card) {
    return;
  }
  if (prefetchedGamePhotoUrls.has(gameUrl)) {
    return;
  }
  if (prefetchedGamePhotoUrls.size >= MAX_PREFETCHED_GAME_PHOTOS) {
    const oldest = prefetchedGamePhotoUrls.values().next().value;
    if (oldest) {
      prefetchedGamePhotoUrls.delete(oldest);
    }
  }
  prefetchedGamePhotoUrls.add(gameUrl);
  const img = new window.Image();
  img.decoding = 'async';
  img.src = gameUrl;
}

/** Starts a cached import without creating a game, canvas, scene or input manager. */
export function prefetchGame(
  gameId: AvailableGameId,
  photo?: Photo | undefined,
  lowQuality = false,
): void {
  void loadGameRuntime(gameId).catch((error: unknown) => {
    console.warn(`Unable to prefetch game ${gameId}. It will retry on entry.`, error);
  });
  if (photo) {
    prefetchGamePhoto(photo, lowQuality);
  }
}

/**
 * The caller must hold its Phaser mount lease until the returned controller is
 * destroyed. Game modules may make setup asynchronous without weakening that
 * ownership boundary.
 */
export async function mountLoadedGame(
  runtime: LoadedGameRuntime,
  parent: HTMLElement,
  context: GameContext,
  bridge: GameBridge,
): Promise<GameController> {
  return runtime.gameModule.create(runtime.Phaser, parent, context, bridge);
}
