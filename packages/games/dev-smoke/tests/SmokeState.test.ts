import { describe, expect, it } from 'vitest';
import { completeSmokeGame, startSmokeGame } from '../src/index.js';

describe('SmokeState', () => {
  it('makes completion explicit and deterministic', () => {
    expect(completeSmokeGame(startSmokeGame())).toEqual({ started: true, completed: true });
  });
});
