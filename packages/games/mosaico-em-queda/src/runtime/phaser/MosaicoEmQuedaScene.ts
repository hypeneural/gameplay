import type { GameContext } from '@christmas-games/platform';
import type * as PhaserModule from 'phaser';
import type { MosaicRuntimePhotoPlan } from '../MosaicRuntimePhotoPlan.js';
import { createMosaicTechnicalScene } from './MosaicTechnicalScene.js';

/**
 * Production entry name. The temporary technical adapter remains isolated
 * while lifecycle and fixed-step code are moved out in the next P2 cut.
 */
export function createMosaicoEmQuedaScene(
  Phaser: typeof PhaserModule,
  context: GameContext,
  hostElement: HTMLElement,
  photoPlan: MosaicRuntimePhotoPlan,
): typeof PhaserModule.Scene {
  return createMosaicTechnicalScene(Phaser, context, hostElement, photoPlan);
}
