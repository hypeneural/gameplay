import type { GameBridge, GameContext, GameController } from '@christmas-games/platform';
import type * as PhaserModule from 'phaser';
import type { AvailableGameId, PhaserGameModule } from './gameRegistry.js';
import { loadGameModule } from './gameRegistry.js';

export interface LoadedGameRuntime {
  Phaser: typeof PhaserModule;
  gameModule: PhaserGameModule;
}

/**
 * Loading has no DOM or Phaser instance side effects and therefore requires no
 * mount lease. Browser module caching makes an intent prefetch reusable by the
 * eventual game entry.
 */
export async function loadGameRuntime(gameId: AvailableGameId): Promise<LoadedGameRuntime> {
  const [Phaser, gameModule] = await Promise.all([import('phaser'), loadGameModule(gameId)]);
  return { Phaser, gameModule };
}

/** Starts a cached import without creating a game, canvas, scene or input manager. */
export function prefetchGame(gameId: AvailableGameId): void {
  void loadGameRuntime(gameId).catch((error: unknown) => {
    console.warn(`Unable to prefetch game ${gameId}. It will retry on entry.`, error);
  });
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
