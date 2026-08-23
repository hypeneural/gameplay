import { createPhotoSurface, SceneScope } from '@christmas-games/platform';
import type {
  GameBridge,
  GameContext,
  GameController,
  GameModule,
  GameViewport,
} from '@christmas-games/platform';
import type * as PhaserModule from 'phaser';
import { createViewportLayout } from '@christmas-games/platform';
import { christmasTheme } from '@christmas-games/theme';
import { completeSmokeGame, startSmokeGame } from '../../domain/SmokeState.js';
import { devSmokeDefinition } from '../../definition.js';

export function createDevSmokeGame(
  Phaser: typeof PhaserModule,
  parent: HTMLElement,
  context: GameContext,
  _bridge: GameBridge,
): GameController {
  class DevSmokeScene extends Phaser.Scene {
    private readonly scope = new SceneScope();
    private layoutHandler?: (gameSize: { width: number; height: number }) => void;
    private state = startSmokeGame();
    private readonly cards: Phaser.GameObjects.Rectangle[] = [];
    private readonly labels: Phaser.GameObjects.Text[] = [];

    constructor() {
      super('DevSmokeScene');
    }

    create(): void {
      this.add
        .text(0, 0, 'Dev smoke · toque para concluir', {
          color: christmasTheme.color.snow,
          fontFamily: 'system-ui, sans-serif',
          fontSize: '18px',
          fontStyle: 'bold',
        })
        .setOrigin(0.5)
        .setName('title');

      for (const photo of context.session.photos.slice(0, 2)) {
        const card = this.add.rectangle(
          0,
          0,
          1,
          1,
          photo.orientation === 'portrait' ? 0x8f1d35 : 0x103e35,
          1,
        );
        card.setStrokeStyle(3, 0xf8dfa0, 1);
        card.setInteractive({ useHandCursor: true });
        card.on(Phaser.Input.Events.POINTER_UP, () => this.complete());
        this.cards.push(card);

        const label = this.add
          .text(0, 0, photo.orientation.toUpperCase(), {
            color: christmasTheme.color.gold,
            fontFamily: 'system-ui, sans-serif',
            fontSize: '15px',
            fontStyle: 'bold',
          })
          .setOrigin(0.5);
        this.labels.push(label);
      }

      this.layoutHandler = (gameSize) =>
        this.layout(createViewportLayout(gameSize.width, gameSize.height));
      this.scope.on(this.scale, Phaser.Scale.Events.RESIZE, this.layoutHandler);
      this.layout(createViewportLayout(this.scale.gameSize.width, this.scale.gameSize.height));
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
        this.scope.dispose();
      });

      context.run.open();
      context.run.ready();
      context.run.start();
    }

    private layout(viewport: GameViewport): void {
      const title = this.children.getByName('title') as Phaser.GameObjects.Text;
      title.setPosition(viewport.width / 2, viewport.safeTop + 18);
      const gap = Math.max(16, viewport.width * 0.04);
      const cardWidth = (viewport.width - gap * 3) / 2;
      const frame = {
        y: viewport.safeTop + 54,
        width: cardWidth,
        height: Math.min(viewport.contentHeight * 0.68, 390),
      };
      const first = createPhotoSurface(context.session.photos[0]!, { ...frame, x: gap }, 'contain');
      const second = createPhotoSurface(
        context.session.photos[1] ?? context.session.photos[0]!,
        { ...frame, x: gap * 2 + cardWidth },
        'contain',
      );

      this.cards[0]
        ?.setPosition(first.photo.x + first.photo.width / 2, first.photo.y + first.photo.height / 2)
        .setSize(first.photo.width, first.photo.height);
      this.cards[1]
        ?.setPosition(
          second.photo.x + second.photo.width / 2,
          second.photo.y + second.photo.height / 2,
        )
        .setSize(second.photo.width, second.photo.height);
      this.labels[0]?.setPosition(this.cards[0]?.x ?? 0, this.cards[0]?.y ?? 0);
      this.labels[1]?.setPosition(this.cards[1]?.x ?? 0, this.cards[1]?.y ?? 0);
    }

    private complete(): void {
      if (this.state.completed) {
        return;
      }
      this.state = completeSmokeGame(this.state);
      this.cards.forEach((card) =>
        this.scope.resource(
          this.tweens.add({ targets: card, scaleX: 1.04, scaleY: 1.04, yoyo: true, duration: 180 }),
        ),
      );
      context.run.complete();
    }
  }

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: christmasTheme.color.pineDark,
    pixelArt: false,
    antialias: true,
    scale: {
      mode: Phaser.Scale.RESIZE,
      parent,
      width: '100%',
      height: '100%',
    },
    scene: DevSmokeScene,
  });

  // Phaser is the authoritative lifecycle source once the engine exists.
  // Page Visibility remains attached in the host as an early-boot fallback.
  const pauseRun = (): void => context.run.pause();
  const resumeRun = (): void => context.run.resume();
  game.events.on(Phaser.Core.Events.HIDDEN, pauseRun);
  game.events.on(Phaser.Core.Events.BLUR, pauseRun);
  game.events.on(Phaser.Core.Events.VISIBLE, resumeRun);
  game.events.on(Phaser.Core.Events.FOCUS, resumeRun);

  let destroyPromise: Promise<void> | undefined;

  return {
    destroy(): Promise<void> {
      if (destroyPromise) return destroyPromise;
      destroyPromise = new Promise<void>((resolve, reject) => {
        const complete = (): void => {
          game.events.off(Phaser.Core.Events.HIDDEN, pauseRun);
          game.events.off(Phaser.Core.Events.BLUR, pauseRun);
          game.events.off(Phaser.Core.Events.VISIBLE, resumeRun);
          game.events.off(Phaser.Core.Events.FOCUS, resumeRun);
          context.run.exit();
          resolve();
        };
        game.events.once(Phaser.Core.Events.DESTROY, complete);
        try {
          // Phaser emits DESTROY during its pending-destroy frame. Waiting for
          // that event prevents a new canvas from mounting over the old one.
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

export const devSmokeGameModule: GameModule<typeof PhaserModule, HTMLElement> = {
  definition: devSmokeDefinition,
  create: createDevSmokeGame,
};
