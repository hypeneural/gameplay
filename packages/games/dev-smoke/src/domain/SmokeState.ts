export interface SmokeState {
  started: boolean;
  completed: boolean;
}

export function startSmokeGame(): SmokeState {
  return { started: true, completed: false };
}

export function completeSmokeGame(state: SmokeState): SmokeState {
  if (!state.started) {
    throw new Error('The smoke game cannot complete before it starts.');
  }
  return { ...state, completed: true };
}
