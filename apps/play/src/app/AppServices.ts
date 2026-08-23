import { GameBridge, MemoryAnalytics, noOpHaptics } from '@christmas-games/platform';

/** Stable product ports shared by route screens, never by a concrete Phaser Scene. */
export function createAppServices() {
  return {
    analytics: new MemoryAnalytics(),
    bridge: new GameBridge(),
    haptics: noOpHaptics,
  };
}
