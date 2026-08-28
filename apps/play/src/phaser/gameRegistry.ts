import type { GameDefinition, GameModule } from '@christmas-games/platform';
import type * as PhaserModule from 'phaser';
import { devSmokeDefinition } from '@christmas-games/dev-smoke/definition';
import { memoryDefinition } from '@christmas-games/memory/definition';
import { puzzleSwapDefinition } from '@christmas-games/puzzle-swap/definition';

export type PhaserGameModule = GameModule<typeof PhaserModule, HTMLElement>;
export interface InstalledGame {
  definition: GameDefinition;
  load(): Promise<PhaserGameModule>;
}

/**
 * Composition boundary for games shipped by this web build. Generated games
 * add one lazy loader here; platform packages never import the Phaser engine.
 */
const installedGames = {
  'dev-smoke': {
    definition: devSmokeDefinition,
    load: async () => (await import('@christmas-games/dev-smoke')).devSmokeGameModule,
  },
  'puzzle-swap': {
    definition: puzzleSwapDefinition,
    load: async () => (await import('@christmas-games/puzzle-swap')).puzzleSwapGameModule,
  },
  memory: {
    definition: memoryDefinition,
    load: async () => (await import('@christmas-games/memory')).memoryGameModule,
  },
} satisfies Record<string, InstalledGame>;

export type AvailableGameId = keyof typeof installedGames;

export const gameDefinitions = Object.values(installedGames).map((game) => game.definition);

export function getInstalledGame(gameId: string): InstalledGame | undefined {
  return installedGames[gameId as AvailableGameId];
}

export async function loadGameModule(gameId: AvailableGameId): Promise<PhaserGameModule> {
  const game = getInstalledGame(gameId);
  if (!game) {
    throw new Error(`Game ${gameId} is not installed in this build.`);
  }
  return game.load();
}
