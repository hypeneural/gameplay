import { describe, expect, it } from 'vitest';
import { FrameProgress } from '../src/domain/FrameProgress.js';

describe('FrameProgress (Progresso da Moldura)', () => {
  it('inicializa com 4 segmentos apagados', () => {
    const frame = new FrameProgress();
    expect(frame.activeCount).toBe(0);
    expect(frame.isFullyLit).toBe(false);
    expect(frame.frameGlowBonus).toBe(0);
  });

  it('ativa segmentos por targetId e calcula o bônus de iluminação', () => {
    const frame = new FrameProgress();

    expect(frame.activateByTargetId('wood-square')).toBe(true);
    expect(frame.activeCount).toBe(1);
    expect(frame.frameGlowBonus).toBe(0.03);

    // Ativação repetida retorna false
    expect(frame.activateByTargetId('wood-square')).toBe(false);
    expect(frame.activeCount).toBe(1);

    frame.activateByTargetId('gingerbread');
    expect(frame.activeCount).toBe(2);
    expect(frame.frameGlowBonus).toBe(0.07);

    frame.activateByTargetId('gold-star');
    expect(frame.activeCount).toBe(3);
    expect(frame.frameGlowBonus).toBe(0.12);

    frame.activateByTargetId('round-bauble');
    expect(frame.activeCount).toBe(4);
    expect(frame.isFullyLit).toBe(true);
    expect(frame.frameGlowBonus).toBe(0.25);
  });
});
