import { describe, expect, it } from 'vitest';
import { TargetProgress } from '../src/domain/TargetProgress.js';

describe('TargetProgress (Progresso dos Alvos)', () => {
  it('inicializa com 4 alvos em estado idle', () => {
    const progress = new TargetProgress();
    expect(progress.totalCount).toBe(4);
    expect(progress.completedCount).toBe(0);
    expect(progress.allCompleted).toBe(false);

    const targets = progress.getAllTargets();
    expect(targets).toHaveLength(4);
    for (const t of targets) {
      expect(t.state).toBe('idle');
      expect(t.hitCount).toBe(0);
    }
  });

  it('registra acertos e transições de estado', () => {
    const progress = new TargetProgress();

    const hit = progress.markHit('wood-square');
    expect(hit?.newlyCompleted).toBe(true);
    expect(hit?.target.state).toBe('hit');
    expect(hit?.target.hitCount).toBe(1);

    progress.markFlying('wood-square');
    expect(progress.getTarget('wood-square')?.state).toBe('flying_to_frame');

    const completed = progress.markCompleted('wood-square');
    expect(completed).toBe(true);
    expect(progress.isCompleted('wood-square')).toBe(true);
    expect(progress.completedCount).toBe(1);

    // Segundo acerto no mesmo alvo já completado não deve contabilizar como recém-completado
    const secondHit = progress.markHit('wood-square');
    expect(secondHit?.newlyCompleted).toBe(false);
    expect(secondHit?.target.hitCount).toBe(2);
  });

  it('identifica vitória quando todos os 4 alvos são concluídos', () => {
    const progress = new TargetProgress();

    progress.markCompleted('wood-square');
    progress.markCompleted('gingerbread');
    progress.markCompleted('gold-star');
    expect(progress.allCompleted).toBe(false);
    expect(progress.completedCount).toBe(3);

    progress.markCompleted('round-bauble');
    expect(progress.allCompleted).toBe(true);
    expect(progress.completedCount).toBe(4);
  });
});
