import type {
  GameBridge,
  GameContext,
  GameController,
  GameModule,
} from '@christmas-games/platform';
import type * as PhaserModule from 'phaser';
import { mosaicoEmQuedaDefinition } from '../../definition.js';
import { createMosaicRuntimePhotoPlan } from '../MosaicRuntimePhotoPlan.js';
import { createMosaicoEmQuedaScene } from './MosaicoEmQuedaScene.js';
import { mosaicoEmQuedaTuning } from '../../tuning.js';

export function createMosaicoEmQuedaGame(
  Phaser: typeof PhaserModule,
  parent: HTMLElement,
  context: GameContext,
  _bridge: GameBridge,
): GameController {
  const photoPlan = createMosaicRuntimePhotoPlan(context);
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: 0x082821,
    pixelArt: false,
    antialias: true,
    fps: { target: 60, limit: 0, forceSetTimeOut: false },
    input: { activePointers: 2, windowEvents: true },
    loader: {
      maxRetries: mosaicoEmQuedaTuning.assetMaxRetries,
      timeout: mosaicoEmQuedaTuning.assetTimeoutMs,
    },
    scale: { mode: Phaser.Scale.RESIZE, parent, width: '100%', height: '100%' },
    scene: createMosaicoEmQuedaScene(Phaser, context, parent, photoPlan),
  });
  let destroyPromise: Promise<void> | undefined;

  return {
    destroy(): Promise<void> {
      if (destroyPromise) return destroyPromise;
      destroyPromise = new Promise<void>((resolve, reject) => {
        const complete = (): void => {
          context.run.exit();
          resolve();
        };
        game.events.once(Phaser.Core.Events.DESTROY, complete);
        try {
          game.destroy(true, false);
        } catch (error) {
          game.events.off(Phaser.Core.Events.DESTROY, complete);
          reject(error);
        }
      });
      return destroyPromise;
    },
  };
}

export const mosaicoEmQuedaGameModule: GameModule<typeof PhaserModule, HTMLElement> = {
  definition: mosaicoEmQuedaDefinition,
  create: createMosaicoEmQuedaGame,
};
