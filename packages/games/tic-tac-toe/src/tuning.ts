/** Product knobs remain explicit and are never derived from wall-clock time. */
export const ticTacToeTuning = {
  easy: {
    blockImmediateLossChance: 0.65,
    positionalWeights: {
      center: 1.4,
      corner: 1.2,
      side: 1,
    },
  },
} as const;
