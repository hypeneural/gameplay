import { describe, expect, it } from 'vitest';
import { HUB_GAME_PRIORITY, orderHubGames } from './hubGameOrder.js';

describe('mobile Hub game catalog', () => {
  it('prioritizes five games in the exact commercial order', () => {
    const source = [
      { id: 'magic-photo' },
      { id: 'expresso-das-fotos' },
      { id: 'puzzle-swap' },
      { id: 'globo-das-lembrancas' },
      { id: 'mosaico-em-queda' },
      { id: 'memory' },
      { id: 'tic-tac-toe' },
    ];

    const actual = orderHubGames(source);
    expect(actual.slice(0, 5).map((game) => game.id)).toEqual([...HUB_GAME_PRIORITY]);
    expect(actual.slice(5).map((game) => game.id)).toEqual(['magic-photo', 'globo-das-lembrancas']);
    expect(source[0]?.id).toBe('magic-photo');
    expect(actual.find((game) => game.id === 'puzzle-swap')).toBe(source[2]);
  });

  it('does not mutate inputs or lose unknown future games', () => {
    const games = Object.freeze([
      Object.freeze({ id: 'future-a' }),
      Object.freeze({ id: 'memory' }),
      Object.freeze({ id: 'future-b' }),
      Object.freeze({ id: 'puzzle-swap' }),
    ]);
    expect(orderHubGames(games).map((game) => game.id)).toEqual([
      'puzzle-swap',
      'memory',
      'future-a',
      'future-b',
    ]);
    expect(games[0]?.id).toBe('future-a');
  });
});
