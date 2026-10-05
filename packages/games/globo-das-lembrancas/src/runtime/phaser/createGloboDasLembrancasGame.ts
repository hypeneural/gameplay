import type {
  GameBridge,
  GameContext,
  GameController,
  GameModule,
} from '@christmas-games/platform';
import type * as PhaserModule from 'phaser';
import { globoDasLembrancasDefinition } from '../../definition.js';
import { GloboScene } from './GloboScene.js';

export function createGloboDasLembrancasGame(
  Phaser: typeof PhaserModule,
  parent: HTMLElement,
  context: GameContext,
  bridge: GameBridge,
): GameController {
  const scene = new GloboScene(context, bridge);

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    pixelArt: false,
    antialias: true,
    backgroundColor: 0x071520,
    input: { activePointers: 2 },
    scale: { mode: Phaser.Scale.RESIZE, parent, width: '100%', height: '100%' },
    scene,
  });

  const visibilityEvents = [
    [Phaser.Core.Events.HIDDEN, () => scene.setVisibilityPaused(true)],
    [Phaser.Core.Events.VISIBLE, () => scene.setVisibilityPaused(false)],
    [Phaser.Core.Events.BLUR, () => scene.setVisibilityPaused(true)],
    [Phaser.Core.Events.FOCUS, () => scene.setVisibilityPaused(false)],
  ] as const;
  for (const [event, listener] of visibilityEvents) {
    game.events.on(event, listener);
  }

  let destroyPromise: Promise<void> | undefined;

  return {
    destroy(): Promise<void> {
      if (destroyPromise) return destroyPromise;
      destroyPromise = new Promise<void>((resolve, reject) => {
        const complete = (): void => {
          for (const [event, listener] of visibilityEvents) {
            game.events.off(event, listener);
          }
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

export const globoDasLembrancasGameModule: GameModule<typeof PhaserModule, HTMLElement> = {
  definition: globoDasLembrancasDefinition,
  create: createGloboDasLembrancasGame,
};
