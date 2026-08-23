import type { GameId } from '../contracts/index.js';

export interface RegisteredGame {
  id: GameId;
  displayName: string;
}

export class GameRegistry {
  constructor(private readonly games: readonly RegisteredGame[]) {}

  list(): readonly RegisteredGame[] {
    return this.games;
  }

  get(id: GameId): RegisteredGame {
    const game = this.games.find((candidate) => candidate.id === id);
    if (!game) throw new Error(`Game ${id} is not registered.`);
    return game;
  }
}
