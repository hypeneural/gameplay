export interface TouchProfile {
  dragDistanceThresholdPx: number;
  dragTimeThresholdMs: number;
  idleAssistDelayMs: number;
  primaryTargetMinCssPx: number;
  secondaryTargetMinCssPx: number;
}

/** Product defaults to test with children, not values imposed by browser APIs. */
export const childTouchProfile: TouchProfile = {
  primaryTargetMinCssPx: 52,
  secondaryTargetMinCssPx: 44,
  dragDistanceThresholdPx: 16,
  dragTimeThresholdMs: 200,
  idleAssistDelayMs: 7000,
};
