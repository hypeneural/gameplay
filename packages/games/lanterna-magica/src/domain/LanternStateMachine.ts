export type LanternStateName =
  | 'BOOT'
  | 'INTRO'
  | 'READY'
  | 'AIMING'
  | 'CHARGING'
  | 'ILLUMINATED'
  | 'PROJECTING'
  | 'CELEBRATING'
  | 'PAUSED';

export interface LanternTransitionEvent {
  from: LanternStateName;
  to: LanternStateName;
  timestampMs?: number | undefined;
  metadata?: Record<string, unknown> | undefined;
}

export class LanternStateMachine {
  private _state: LanternStateName = 'BOOT';
  private _previousState: LanternStateName = 'BOOT';
  private _activeMirrorId: string | null = null;
  private readonly listeners: Array<(event: LanternTransitionEvent) => void> = [];

  constructor(initialState: LanternStateName = 'BOOT') {
    this._state = initialState;
    this._previousState = initialState;
  }

  get state(): LanternStateName {
    return this._state;
  }

  get previousState(): LanternStateName {
    return this._previousState;
  }

  get activeMirrorId(): string | null {
    return this._activeMirrorId;
  }

  onTransition(listener: (event: LanternTransitionEvent) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const idx = this.listeners.indexOf(listener);
      if (idx >= 0) this.listeners.splice(idx, 1);
    };
  }

  private transitionTo(nextState: LanternStateName, metadata?: Record<string, unknown>): boolean {
    if (this._state === nextState) return false;

    const from = this._state;
    this._previousState = from;
    this._state = nextState;

    const event: LanternTransitionEvent = { from, to: nextState, metadata };
    for (const listener of this.listeners) {
      listener(event);
    }
    return true;
  }

  startIntro(): boolean {
    if (this._state === 'BOOT') {
      return this.transitionTo('INTRO');
    }
    return false;
  }

  becomeReady(): boolean {
    if (
      this._state === 'INTRO' ||
      this._state === 'BOOT' ||
      this._state === 'AIMING' ||
      this._state === 'CHARGING' ||
      this._state === 'PAUSED'
    ) {
      this._activeMirrorId = null;
      return this.transitionTo('READY');
    }
    return false;
  }

  startAiming(mirrorId: string): boolean {
    if (this._state === 'READY' || this._state === 'AIMING' || this._state === 'CHARGING') {
      this._activeMirrorId = mirrorId;
      return this.transitionTo('AIMING', { mirrorId });
    }
    return false;
  }

  finishAiming(): boolean {
    if (this._state === 'AIMING') {
      this._activeMirrorId = null;
      return this.transitionTo('READY');
    }
    return false;
  }

  startCharging(): boolean {
    if (this._state === 'READY' || this._state === 'AIMING') {
      return this.transitionTo('CHARGING');
    }
    return false;
  }

  interruptCharging(): boolean {
    if (this._state === 'CHARGING') {
      const target = this._activeMirrorId ? 'AIMING' : 'READY';
      return this.transitionTo(target);
    }
    return false;
  }

  illuminateTarget(): boolean {
    if (this._state === 'READY' || this._state === 'AIMING' || this._state === 'CHARGING') {
      this._activeMirrorId = null;
      return this.transitionTo('ILLUMINATED');
    }
    return false;
  }

  startProjection(): boolean {
    if (this._state === 'ILLUMINATED') {
      return this.transitionTo('PROJECTING');
    }
    return false;
  }

  celebrateVictory(): boolean {
    if (this._state === 'PROJECTING' || this._state === 'ILLUMINATED') {
      return this.transitionTo('CELEBRATING');
    }
    return false;
  }

  pause(): boolean {
    if (this._state !== 'PAUSED') {
      this._previousState = this._state;
      this._state = 'PAUSED';
      const event: LanternTransitionEvent = {
        from: this._previousState,
        to: 'PAUSED',
      };
      for (const listener of this.listeners) {
        listener(event);
      }
      return true;
    }
    return false;
  }

  resume(): boolean {
    if (this._state === 'PAUSED') {
      const target = this._previousState === 'PAUSED' ? 'READY' : this._previousState;
      this._state = target;
      const event: LanternTransitionEvent = { from: 'PAUSED', to: target };
      for (const listener of this.listeners) {
        listener(event);
      }
      return true;
    }
    return false;
  }

  reset(): void {
    this._state = 'READY';
    this._previousState = 'READY';
    this._activeMirrorId = null;
  }
}
