import { describe, expect, it } from 'vitest';
import {
  SlingshotStateMachine,
  type StateTransitionEvent,
} from '../src/domain/SlingshotStateMachine.js';

describe('SlingshotStateMachine (FSM de Estilingue)', () => {
  it('executa o ciclo completo de vida de um disparo com sucesso', () => {
    const fsm = new SlingshotStateMachine();
    const transitions: StateTransitionEvent[] = [];
    fsm.onTransition((e) => transitions.push(e));

    expect(fsm.state).toBe('BOOT');

    expect(fsm.startIntro()).toBe(true);
    expect(fsm.state).toBe('INTRO');

    expect(fsm.becomeReady()).toBe(true);
    expect(fsm.state).toBe('READY');

    expect(fsm.startAiming()).toBe(true);
    expect(fsm.state).toBe('AIMING');

    expect(fsm.releaseShot()).toBe(true);
    expect(fsm.state).toBe('RELEASE');

    expect(fsm.launchProjectile()).toBe(true);
    expect(fsm.state).toBe('FLYING');

    expect(fsm.registerImpact()).toBe(true);
    expect(fsm.state).toBe('IMPACT');

    expect(fsm.startResolving()).toBe(true);
    expect(fsm.state).toBe('RESOLVING');

    expect(fsm.reloadSnowball()).toBe(true);
    expect(fsm.state).toBe('RELOADING');

    expect(fsm.becomeReady()).toBe(true);
    expect(fsm.state).toBe('READY');

    expect(transitions).toHaveLength(9);
  });

  it('permite cancelamento suave de mira (retorno para READY)', () => {
    const fsm = new SlingshotStateMachine('READY');
    fsm.startAiming();
    expect(fsm.state).toBe('AIMING');

    expect(fsm.cancelAiming()).toBe(true);
    expect(fsm.state).toBe('READY');
  });

  it('gerencia transição de vitória para celebração e brinquedo livre (FREE_PLAY)', () => {
    const fsm = new SlingshotStateMachine('RESOLVING');

    expect(fsm.celebrateVictory()).toBe(true);
    expect(fsm.state).toBe('CELEBRATING');

    expect(fsm.startFreePlay()).toBe(true);
    expect(fsm.state).toBe('FREE_PLAY');

    // No modo FREE_PLAY, o jogador pode continuar mirando
    expect(fsm.startAiming()).toBe(true);
    expect(fsm.state).toBe('AIMING');

    // Ao cancelar no FREE_PLAY, retorna para FREE_PLAY
    expect(fsm.cancelAiming()).toBe(true);
    expect(fsm.state).toBe('FREE_PLAY');
  });

  it('preserva o estado anterior durante pause e restaura no resume', () => {
    const fsm = new SlingshotStateMachine('AIMING');

    expect(fsm.pause()).toBe(true);
    expect(fsm.state).toBe('PAUSED');
    expect(fsm.previousState).toBe('AIMING');

    expect(fsm.resume()).toBe(true);
    expect(fsm.state).toBe('AIMING');
  });

  it('permite recuperação limpa em caso de erro de tiro (miss) sem soft-lock', () => {
    const fsm = new SlingshotStateMachine('FLYING');

    // Em caso de erro/miss, transiciona para RESOLVING
    expect(fsm.registerMiss()).toBe(true);
    expect(fsm.state).toBe('RESOLVING');

    // Recarrega bola
    expect(fsm.reloadSnowball()).toBe(true);
    expect(fsm.state).toBe('RELOADING');

    // Retorna para READY
    expect(fsm.becomeReady()).toBe(true);
    expect(fsm.state).toBe('READY');
  });

  it('watchdog garante recuperação forçada para READY a partir de qualquer estado transitório', () => {
    const fsmFlying = new SlingshotStateMachine('FLYING');
    expect(fsmFlying.becomeReady()).toBe(true);
    expect(fsmFlying.state).toBe('READY');

    const fsmResolving = new SlingshotStateMachine('RESOLVING');
    expect(fsmResolving.becomeReady()).toBe(true);
    expect(fsmResolving.state).toBe('READY');

    const fsmStuck = new SlingshotStateMachine('IMPACT');
    expect(fsmStuck.forceRecoverReady()).toBe(true);
    expect(fsmStuck.state).toBe('READY');
  });
});
