/**
 * Commercial order in the mobile Hub. This does not alter the installed game
 * registry, minimum-photo rules, launch routes or lazy Phaser loaders.
 */
export const HUB_GAME_PRIORITY = [
  'puzzle-swap',
  'memory',
  'tic-tac-toe',
  'expresso-das-fotos',
  'mosaico-em-queda',
] as const;

const priorityIndex = new Map<string, number>(HUB_GAME_PRIORITY.map((id, index) => [id, index]));

/** Preserve original relative order for all other games, including future additions. */
export function orderHubGames<T extends { id: string }>(games: readonly T[]): T[] {
  return games
    .map((game, index) => ({
      game,
      index,
      priority: priorityIndex.get(game.id) ?? Number.MAX_SAFE_INTEGER,
    }))
    .sort((a, b) => a.priority - b.priority || a.index - b.index)
    .map(({ game }) => game);
}
