export interface LanternaMagicaState {
  started: boolean;
  completed: boolean;
}

export const LANTERNA_MAGICA_INITIAL_STATE: LanternaMagicaState = {
  started: false,
  completed: false,
};

export function startLanternaMagica(state: LanternaMagicaState): LanternaMagicaState {
  return state.started ? state : { ...state, started: true };
}

export function completeLanternaMagica(state: LanternaMagicaState): LanternaMagicaState {
  if (!state.started || state.completed) return state;
  return { ...state, completed: true };
}
