import type { MosaicRules } from './EngineTypes.js';
import type { MosaicMode } from './MosaicProgress.js';

export const MOSAIC_NORMAL_RULES: MosaicRules = {
  gravityIntervalTicks: 66,
  lockDelayTicks: 39,
  maxLockResets: 15,
  lineClearDelayTicks: 14,
  spawnDelayTicks: 0,
  dasTicks: 13,
  arrTicks: 5,
};

export const MOSAIC_CHALLENGE_RULES: MosaicRules = {
  gravityIntervalTicks: 54,
  lockDelayTicks: 30,
  maxLockResets: 15,
  lineClearDelayTicks: 11,
  spawnDelayTicks: 0,
  dasTicks: 10,
  arrTicks: 3,
};

export function rulesForMosaicMode(mode: MosaicMode): MosaicRules {
  return mode === 'normal' ? MOSAIC_NORMAL_RULES : MOSAIC_CHALLENGE_RULES;
}
