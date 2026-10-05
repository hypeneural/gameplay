import type { GameDefinition, GameModule } from '@christmas-games/platform';
import type * as PhaserModule from 'phaser';
import { devSmokeDefinition } from '@christmas-games/dev-smoke/definition';
import { expressoDasFotosDefinition } from '@christmas-games/expresso-das-fotos/definition';
import { globoDasLembrancasDefinition } from '@christmas-games/globo-das-lembrancas/definition';
import { guirlandaDasLembrancasDefinition } from '@christmas-games/guirlanda-das-lembrancas/definition';
import { memoryDefinition } from '@christmas-games/memory/definition';
import { magicPhotoDefinition } from '@christmas-games/magic-photo/definition';
import { renaDasLembrancasDefinition } from '@christmas-games/rena-das-lembrancas/definition';
import { mosaicoEmQuedaDefinition } from '@christmas-games/mosaico-em-queda/definition';
import { puzzleSwapDefinition } from '@christmas-games/puzzle-swap/definition';
import { ticTacToeDefinition } from '@christmas-games/tic-tac-toe/definition';
import { estilingueDasLembrancasDefinition } from '@christmas-games/estilingue-das-lembrancas/definition';
import { lanternaMagicaDefinition } from '@christmas-games/lanterna-magica/definition';

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
  'magic-photo': {
    definition: magicPhotoDefinition,
    load: async () => (await import('@christmas-games/magic-photo')).magicPhotoGameModule,
  },
  'dev-smoke': {
    definition: devSmokeDefinition,
    load: async () => (await import('@christmas-games/dev-smoke')).devSmokeGameModule,
  },
  'puzzle-swap': {
    definition: puzzleSwapDefinition,
    load: async () => (await import('@christmas-games/puzzle-swap')).puzzleSwapGameModule,
  },
  'expresso-das-fotos': {
    definition: expressoDasFotosDefinition,
    load: async () =>
      (await import('@christmas-games/expresso-das-fotos')).expressoDasFotosGameModule,
  },
  'globo-das-lembrancas': {
    definition: globoDasLembrancasDefinition,
    load: async () =>
      (await import('@christmas-games/globo-das-lembrancas')).globoDasLembrancasGameModule,
  },
  'guirlanda-das-lembrancas': {
    definition: guirlandaDasLembrancasDefinition,
    load: async () =>
      (await import('@christmas-games/guirlanda-das-lembrancas')).guirlandaDasLembrancasGameModule,
  },
  memory: {
    definition: memoryDefinition,
    load: async () => (await import('@christmas-games/memory')).memoryGameModule,
  },
  'mosaico-em-queda': {
    definition: mosaicoEmQuedaDefinition,
    load: async () => (await import('@christmas-games/mosaico-em-queda')).mosaicoEmQuedaGameModule,
  },
  'tic-tac-toe': {
    definition: ticTacToeDefinition,
    load: async () => (await import('@christmas-games/tic-tac-toe')).ticTacToeGameModule,
  },
  'rena-das-lembrancas': {
    definition: renaDasLembrancasDefinition,
    load: async () =>
      (await import('@christmas-games/rena-das-lembrancas')).renaDasLembrancasGameModule,
  },
  'estilingue-das-lembrancas': {
    definition: estilingueDasLembrancasDefinition,
    load: async () =>
      (await import('@christmas-games/estilingue-das-lembrancas'))
        .estilingueDasLembrancasGameModule,
  },
  'lanterna-magica': {
    definition: lanternaMagicaDefinition,
    load: async () => (await import('@christmas-games/lanterna-magica')).lanternaMagicaGameModule,
  },
} satisfies Record<string, InstalledGame>;

export type AvailableGameId = keyof typeof installedGames;

export const gameDefinitions = Object.values(installedGames)
  .map((game) => game.definition)
  .filter((definition) => definition.id !== 'rena-das-lembrancas' || import.meta.env.DEV);

export function getInstalledGame(gameId: string): InstalledGame | undefined {
  if (gameId === 'rena-das-lembrancas' && !import.meta.env.DEV) return undefined;
  return installedGames[gameId as AvailableGameId];
}

export async function loadGameModule(gameId: AvailableGameId): Promise<PhaserGameModule> {
  const game = getInstalledGame(gameId);
  if (!game) {
    throw new Error(`Game ${gameId} is not installed in this build.`);
  }
  return game.load();
}
