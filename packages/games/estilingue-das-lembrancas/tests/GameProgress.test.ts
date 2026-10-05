import { describe, expect, it } from 'vitest';
import { GameProgress } from '../src/domain/GameProgress.js';

describe('GameProgress (Coordenação Geral de Progresso)', () => {
  it('gerencia o ciclo de disparos, acertos e precisão', () => {
    const game = new GameProgress();

    game.recordShot();
    expect(game.totalShots).toBe(1);
    expect(game.totalHits).toBe(0);
    expect(game.accuracy).toBe(0);

    game.recordShot();
    const hit1 = game.recordHit('wood-square');
    expect(hit1.newlyCompletedTarget).toBe(true);
    expect(hit1.allCompletedNow).toBe(false);
    expect(game.totalHits).toBe(1);
    expect(game.accuracy).toBe(0.5);
    expect(game.progressRatio).toBe(0.25);

    game.recordShot();
    game.recordHit('gingerbread');
    game.recordShot();
    game.recordHit('gold-star');
    game.recordShot();
    const hit4 = game.recordHit('round-bauble');

    expect(hit4.newlyCompletedTarget).toBe(true);
    expect(hit4.allCompletedNow).toBe(true);
    expect(game.isCompleted).toBe(true);
    expect(game.progressRatio).toBe(1.0);
    expect(game.frame.isFullyLit).toBe(true);
  });
});
