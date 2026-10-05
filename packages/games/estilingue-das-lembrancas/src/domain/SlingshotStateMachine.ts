export type SlingshotStateName =
  | 'BOOT'
  | 'INTRO'
  | 'READY'
  | 'AIMING'
  | 'RELEASE'
  | 'FLYING'
  | 'IMPACT'
  | 'RESOLVING'
  | 'RELOADING'
  | 'CELEBRATING'
  | 'FREE_PLAY'
  | 'PAUSED';

export interface StateTransitionEvent {
  from: SlingshotStateName;
  to: SlingshotStateName;
  timestampMs?: number;
}

export class SlingshotStateMachine {
  private _state: SlingshotStateName = 'BOOT';
  private _previousState: SlingshotStateName = 'BOOT';
  private readonly listeners: Array<(event: StateTransitionEvent) => void> = [];

  constructor(initialState: SlingshotStateName = 'BOOT') {
    this._state = initialState;
    this._previousState = initialState;
  }

  get state(): SlingshotStateName {
    return this._state;
  }

  get previousState(): SlingshotStateName {
    return this._previousState;
  }

  onTransition(listener: (event: StateTransitionEvent) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const idx = this.listeners.indexOf(listener);
      if (idx >= 0) this.listeners.splice(idx, 1);
    };
  }

  private transitionTo(nextState: SlingshotStateName): boolean {
    if (this._state === nextState) return false;

    const from = this._state;
    this._previousState = from;
    this._state = nextState;

    const event: StateTransitionEvent = { from, to: nextState };
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
      this._state === 'RELOADING' ||
      this._state === 'BOOT' ||
      this._state === 'RESOLVING' ||
      this._state === 'FLYING' ||
      this._state === 'IMPACT'
    ) {
      return this.transitionTo('READY');
    }
    return false;
  }

  startAiming(): boolean {
    if (this._state === 'READY' || this._state === 'FREE_PLAY') {
      return this.transitionTo('AIMING');
    }
    return false;
  }

  cancelAiming(): boolean {
    if (this._state === 'AIMING') {
      return this.transitionTo(this._previousState === 'FREE_PLAY' ? 'FREE_PLAY' : 'READY');
    }
    return false;
  }

  releaseShot(): boolean {
    if (this._state === 'AIMING') {
      return this.transitionTo('RELEASE');
    }
    return false;
  }

  launchProjectile(): boolean {
    if (this._state === 'RELEASE') {
      return this.transitionTo('FLYING');
    }
    return false;
  }

  registerImpact(): boolean {
    if (this._state === 'FLYING') {
      return this.transitionTo('IMPACT');
    }
    return false;
  }

  registerMiss(): boolean {
    if (this._state === 'FLYING') {
      return this.transitionTo('RESOLVING');
    }
    return false;
  }

  startResolving(): boolean {
    if (this._state === 'IMPACT' || this._state === 'FLYING') {
      return this.transitionTo('RESOLVING');
    }
    return false;
  }

  reloadSnowball(): boolean {
    if (this._state === 'RESOLVING' || this._state === 'FLYING') {
      return this.transitionTo('RELOADING');
    }
    return false;
  }

  forceRecoverReady(): boolean {
    if (this._state !== 'CELEBRATING' && this._state !== 'PAUSED') {
      return this.transitionTo('READY');
    }
    return false;
  }

  celebrateVictory(): boolean {
    if (this._state === 'RESOLVING') {
      return this.transitionTo('CELEBRATING');
    }
    return false;
  }

  startFreePlay(): boolean {
    if (this._state === 'CELEBRATING') {
      return this.transitionTo('FREE_PLAY');
    }
    return false;
  }

  pause(): boolean {
    if (this._state !== 'PAUSED') {
      this._previousState = this._state;
      this._state = 'PAUSED';
      const event: StateTransitionEvent = {
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
      const event: StateTransitionEvent = { from: 'PAUSED', to: target };
      for (const listener of this.listeners) {
        listener(event);
      }
      return true;
    }
    return false;
  }
}
