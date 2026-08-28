import { SceneScope, createViewportLayout } from '@christmas-games/platform';
import type {
  GameContext,
  GameController,
  GameModule,
  GameViewport,
  Photo,
} from '@christmas-games/platform';
import { christmasTheme } from '@christmas-games/theme';
import type * as PhaserModule from 'phaser';
import { memoryDefinition } from '../../definition.js';
import { createMemoryDeck, type MemoryCard } from '../../domain/MemoryDeck.js';
import {
  selectMemoryPhotos,
  type MemoryPhotoCandidate,
} from '../../domain/MemoryPhotoSelection.js';
import { formatMemoryProgress } from '../../domain/MemoryProgress.js';
import {
  createMemoryTurn,
  selectMemoryCard,
  settleMemoryTurn,
  type MemoryTurn,
} from '../../domain/MemoryTurn.js';
import { planMemoryBoardLayout } from '../MemoryBoardLayout.js';
import { canRevealMemoryCard } from '../MemoryInteractionArbiter.js';

interface MemoryCardView {
  readonly back: PhaserModule.GameObjects.Rectangle;
  readonly backMark: PhaserModule.GameObjects.Text;
  readonly card: MemoryCard;
  readonly container: PhaserModule.GameObjects.Container;
  readonly frontFrame: PhaserModule.GameObjects.Rectangle;
  readonly matte: PhaserModule.GameObjects.Rectangle;
  readonly photo: PhaserModule.GameObjects.Image;
}

const pairCount = 4;
const mismatchDelayMs = 750;
const stableSubsetRandom = {
  int: (minInclusive: number, _maxInclusive: number): number => minInclusive,
  next: (): number => 0,
};

function formatDuration(durationMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(durationMs / 1000));
  return `${Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, '0')}:${(totalSeconds % 60).toString().padStart(2, '0')}`;
}

function toMemoryCandidate(photo: Photo, catalogPosition: number): MemoryPhotoCandidate {
  return {
    id: photo.id,
    catalogPosition,
    orientation: photo.orientation,
  };
}

/**
 * Mounts one private, run-scoped Memory board. It only preloads the authorized
 * card derivative of four selected photos, then removes those textures on exit.
 */
export function createMemoryGame(
  Phaser: typeof PhaserModule,
  parent: HTMLElement,
  context: GameContext,
): GameController {
  const selectedCandidates = selectMemoryPhotos({
    anchorId: context.selectedPhoto.id,
    candidates: context.session.photos.map(toMemoryCandidate),
    pairCount,
    // Replay creates a fresh run seed for the deck. Keep the photo subset
    // stable so a child recognizes the same small album on "Brincar de novo".
    random: stableSubsetRandom,
  });
  const photosById = new Map(context.session.photos.map((photo) => [photo.id, photo]));
  const pairPhotos = selectedCandidates
    .map((candidate) => photosById.get(candidate.id))
    .filter((photo): photo is Photo => photo !== undefined);

  if (pairPhotos.length !== pairCount) {
    context.run.open();
    context.run.assetFailed('memory-insufficient-photos');
    return {
      async destroy(): Promise<void> {
        context.run.exit();
      },
    };
  }

  const textureKeys = new Map(
    pairPhotos.map((photo, index) => [photo.id, `memory-${context.run.runId}-${index}`]),
  );
  const deck = createMemoryDeck(
    pairPhotos.map((photo) => photo.id),
    context.random,
  );
  let setActiveSceneVisibilityPaused: ((paused: boolean) => void) | undefined;

  class MemoryScene extends Phaser.Scene {
    private readonly scope = new SceneScope();
    private readonly cardViews = new Map<string, MemoryCardView>();
    private readonly scheduledTimers = new Set<Phaser.Time.TimerEvent>();
    private assetFailure = false;
    private background?: Phaser.GameObjects.Rectangle;
    private coachMark?: Phaser.GameObjects.Text;
    private completed = false;
    private hintButton?: Phaser.GameObjects.Rectangle;
    private hintLabel?: Phaser.GameObjects.Text;
    private hinting = false;
    private lastDisplayedSecond = -1;
    private manualPaused = false;
    private pauseCover?: Phaser.GameObjects.Rectangle;
    private pauseLabel?: Phaser.GameObjects.Text;
    private pauseTitle?: Phaser.GameObjects.Text;
    private progressText?: Phaser.GameObjects.Text;
    private reducedMotion = context.preferences?.reducedMotion ?? false;
    private timerText?: Phaser.GameObjects.Text;
    private titleText?: Phaser.GameObjects.Text;
    private turn: MemoryTurn = createMemoryTurn(deck);
    private visibilityPaused = false;
    private winText?: Phaser.GameObjects.Text;

    private readonly setVisibilityPausedFromGame = (paused: boolean): void => {
      this.setVisibilityPaused(paused);
    };

    constructor() {
      super('MemoryScene');
    }

    init(): void {
      setActiveSceneVisibilityPaused = this.setVisibilityPausedFromGame;
      context.run.open();
      this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, this.handleAssetFailure, this);
      this.scope.add(() =>
        this.load.off(Phaser.Loader.Events.FILE_LOAD_ERROR, this.handleAssetFailure, this),
      );
      this.scope.add(() => {
        if (setActiveSceneVisibilityPaused === this.setVisibilityPausedFromGame) {
          setActiveSceneVisibilityPaused = undefined;
        }
      });
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scope.dispose());
    }

    preload(): void {
      for (const photo of pairPhotos) {
        this.load.image(textureKeys.get(photo.id)!, photo.variants.card);
      }
    }

    create(): void {
      if (this.assetFailure) return;
      for (const key of textureKeys.values()) {
        const frame = this.textures.get(key).get();
        if (frame.width <= 0 || frame.height <= 0) {
          this.failAsset('memory-invalid-photo-texture');
          return;
        }
        this.scope.texture(this.textures, key);
      }

      this.background = this.add.rectangle(0, 0, 1, 1, 0x082821, 1).setOrigin(0);
      this.titleText = this.add
        .text(0, 0, 'MEMÓRIAS DE NATAL', {
          color: christmasTheme.color.gold,
          fontFamily: 'system-ui, sans-serif',
          fontSize: '20px',
          fontStyle: 'bold',
        })
        .setOrigin(0.5);
      this.progressText = this.add
        .text(0, 0, formatMemoryProgress(this.turn), {
          color: christmasTheme.color.snow,
          fontFamily: 'system-ui, sans-serif',
          fontSize: '15px',
          fontStyle: 'bold',
        })
        .setOrigin(0, 0.5);
      this.timerText = this.add
        .text(0, 0, '00:00', {
          color: christmasTheme.color.gold,
          fontFamily: 'system-ui, sans-serif',
          fontSize: '15px',
          fontStyle: 'bold',
        })
        .setOrigin(0.5);
      this.coachMark = this.add
        .text(0, 0, 'Toque em uma carta para começar.', {
          align: 'center',
          color: christmasTheme.color.snow,
          fontFamily: 'system-ui, sans-serif',
          fontSize: '14px',
          fontStyle: 'bold',
          wordWrap: { width: 280 },
        })
        .setOrigin(0.5);

      this.hintButton = this.add
        .rectangle(0, 0, 52, 40, 0x8f1d35, 1)
        .setStrokeStyle(2, 0xf8dfa0, 0.85)
        .setInteractive({ useHandCursor: true });
      this.hintLabel = this.add
        .text(0, 0, 'Dica', {
          color: christmasTheme.color.snow,
          fontFamily: 'system-ui, sans-serif',
          fontSize: '13px',
          fontStyle: 'bold',
        })
        .setOrigin(0.5);
      this.hintButton.on(Phaser.Input.Events.POINTER_DOWN, () => this.showManualHint());

      const pauseButton = this.add
        .rectangle(0, 0, 58, 40, 0x103e35, 1)
        .setStrokeStyle(2, 0xf8dfa0, 0.85)
        .setInteractive({ useHandCursor: true })
        .setName('memory-pause-button');
      this.pauseLabel = this.add
        .text(0, 0, 'Pausar', {
          color: christmasTheme.color.snow,
          fontFamily: 'system-ui, sans-serif',
          fontSize: '13px',
          fontStyle: 'bold',
        })
        .setOrigin(0.5);
      pauseButton.on(Phaser.Input.Events.POINTER_DOWN, () => this.toggleManualPause());

      this.pauseCover = this.add
        .rectangle(0, 0, 1, 1, 0x082821, 0.98)
        .setOrigin(0)
        .setDepth(50)
        .setVisible(false)
        .setInteractive({ useHandCursor: true });
      this.pauseTitle = this.add
        .text(0, 0, 'Pausa', {
          color: christmasTheme.color.gold,
          fontFamily: 'system-ui, sans-serif',
          fontSize: '28px',
          fontStyle: 'bold',
        })
        .setOrigin(0.5)
        .setDepth(51)
        .setVisible(false);
      this.pauseCover.on(Phaser.Input.Events.POINTER_DOWN, () => this.toggleManualPause());

      this.winText = this.add
        .text(0, 0, 'Você encontrou todos os pares! ✦', {
          align: 'center',
          color: christmasTheme.color.gold,
          fontFamily: 'system-ui, sans-serif',
          fontSize: '17px',
          fontStyle: 'bold',
          wordWrap: { width: 300 },
        })
        .setOrigin(0.5)
        .setVisible(false)
        .setDepth(20);

      for (const card of deck) this.createCardView(card);
      const resize = (gameSize: { width: number; height: number }): void =>
        this.layout(createViewportLayout(gameSize.width, gameSize.height));
      this.scope.on(this.scale, Phaser.Scale.Events.RESIZE, resize);
      this.layout(createViewportLayout(this.scale.gameSize.width, this.scale.gameSize.height));
      context.run.ready();
      context.run.start();
      this.applyPauseState();
    }

    override update(): void {
      if (this.isPaused() || context.run.state !== 'started') return;
      const currentSecond = Math.floor(context.run.elapsedMs() / 1000);
      if (currentSecond === this.lastDisplayedSecond) return;
      this.lastDisplayedSecond = currentSecond;
      this.timerText?.setText(formatDuration(context.run.elapsedMs()));
    }

    setVisibilityPaused(paused: boolean): void {
      this.visibilityPaused = paused;
      this.applyPauseState();
    }

    private readonly handleAssetFailure = (): void => this.failAsset('memory-photo-load-failed');

    private failAsset(reason: string): void {
      if (this.assetFailure) return;
      this.assetFailure = true;
      context.run.assetFailed(reason);
    }

    private createCardView(card: MemoryCard): void {
      const textureKey = textureKeys.get(card.pairId)!;
      const shadow = this.add.rectangle(0, 4, 1, 1, 0x041611, 0.48).setOrigin(0.5);
      const frontFrame = this.add
        .rectangle(0, 0, 1, 1, 0xf8dfa0, 1)
        .setStrokeStyle(2, 0xb98a2d, 1)
        .setOrigin(0.5);
      const matte = this.add.rectangle(0, 0, 1, 1, 0xfffaf0, 1).setOrigin(0.5);
      const photo = this.add.image(0, 0, textureKey).setOrigin(0.5);
      const back = this.add
        .rectangle(0, 0, 1, 1, 0x8f1d35, 1)
        .setStrokeStyle(3, 0xf8dfa0, 1)
        .setOrigin(0.5);
      const backMark = this.add
        .text(0, 0, '✦', {
          color: christmasTheme.color.gold,
          fontFamily: 'system-ui, sans-serif',
          fontSize: '28px',
          fontStyle: 'bold',
        })
        .setOrigin(0.5);
      const container = this.add.container(0, 0, [
        shadow,
        frontFrame,
        matte,
        photo,
        back,
        backMark,
      ]);
      container.setSize(1, 1).setInteractive({ useHandCursor: true });
      container.on(Phaser.Input.Events.POINTER_DOWN, () => this.handleCardSelection(card.id));
      const view: MemoryCardView = { back, backMark, card, container, frontFrame, matte, photo };
      this.setCardFace(view, false);
      this.cardViews.set(card.id, view);
    }

    private layout(viewport: GameViewport): void {
      this.background?.setSize(viewport.width, viewport.height);
      const layout = planMemoryBoardLayout(viewport, deck.length);
      this.titleText?.setPosition(viewport.width / 2, layout.headerY);
      this.progressText?.setPosition(16, layout.headerY + 30);
      this.timerText?.setPosition(viewport.width / 2, layout.headerY + 30);
      this.hintButton?.setPosition(viewport.width - 94, layout.headerY + 30);
      this.hintLabel?.setPosition(viewport.width - 94, layout.headerY + 30);
      const pauseButton = this.children.getByName(
        'memory-pause-button',
      ) as Phaser.GameObjects.Rectangle;
      pauseButton.setPosition(viewport.width - 32, layout.headerY + 30);
      this.pauseLabel?.setPosition(viewport.width - 32, layout.headerY + 30);
      this.coachMark?.setPosition(viewport.width / 2, layout.headerY + 62);
      this.winText?.setPosition(viewport.width / 2, layout.headerY + 62);
      this.pauseCover?.setSize(viewport.width, viewport.height);
      this.pauseTitle?.setPosition(viewport.width / 2, viewport.height / 2);

      for (const [index, card] of deck.entries()) {
        const placement = layout.placements[index]!;
        const view = this.cardViews.get(card.id)!;
        this.layoutCard(view, placement.x, placement.y, layout.cardWidth, layout.cardHeight);
      }
    }

    private layoutCard(
      view: MemoryCardView,
      x: number,
      y: number,
      width: number,
      height: number,
    ): void {
      view.container
        .setPosition(x, y)
        .setSize(width, height)
        .setInteractive({ useHandCursor: true });
      const inset = Math.max(5, Math.round(width * 0.06));
      const contentWidth = width - inset * 2;
      const contentHeight = height - inset * 2;
      view.frontFrame.setSize(width, height);
      view.matte.setSize(contentWidth, contentHeight);
      view.back.setSize(width, height);
      view.backMark.setFontSize(Math.round(Math.max(24, width * 0.3)));
      const frame = this.textures.get(textureKeys.get(view.card.pairId)!).get();
      const photoScale = Math.min(contentWidth / frame.width, contentHeight / frame.height);
      view.photo.setScale(photoScale);
    }

    private handleCardSelection(cardId: string): void {
      if (
        !canRevealMemoryCard(this.turn, cardId, { hinting: this.hinting, paused: this.isPaused() })
      ) {
        return;
      }
      const result = selectMemoryCard(this.turn, cardId);
      if (!result.accepted) return;
      this.turn = result.state;
      this.coachMark?.setVisible(false);
      const selectedView = this.cardViews.get(cardId)!;
      if (!result.resolution) {
        this.flipCards([selectedView], true, () => {
          context.run.interactionSettled();
          if (!this.hinting && this.turn.phase === 'one-open') {
            this.showCoach('Agora toque em outra carta.');
          }
        });
        return;
      }

      this.flipCards([selectedView], true, () => {
        const delay = result.resolution === 'mismatch' ? mismatchDelayMs : 240;
        this.schedule(delay, () => this.settleCurrentTurn(result.resolution!));
      });
    }

    private settleCurrentTurn(resolution: 'match' | 'mismatch'): void {
      const openCardIds = this.turn.openCardIds;
      this.turn = settleMemoryTurn(this.turn);
      const openViews = openCardIds.map((id) => this.cardViews.get(id)!);
      if (resolution === 'mismatch') {
        this.flipCards(openViews, false, () => this.finishResolution());
        return;
      }

      for (const view of openViews) {
        view.back.setAlpha(0.16);
        this.scope.resource(
          this.tweens.add({
            targets: view.container,
            scaleX: 1.04,
            scaleY: 1.04,
            yoyo: true,
            duration: this.reducedMotion ? 1 : 180,
          }),
        );
      }
      this.finishResolution();
    }

    private finishResolution(): void {
      this.progressText?.setText(formatMemoryProgress(this.turn));
      context.run.interactionSettled();
      if (this.turn.phase === 'completed') {
        this.completeBoard();
        return;
      }
      this.showCoach('Muito bem! Encontre mais um par.');
    }

    private completeBoard(): void {
      if (this.completed) return;
      this.completed = true;
      this.coachMark?.setVisible(false);
      this.winText?.setVisible(true);
      context.run.complete();
    }

    private showManualHint(): void {
      if (this.completed || this.isPaused() || this.hinting) return;
      if (this.turn.phase !== 'ready' && this.turn.phase !== 'one-open') return;
      const openCard = this.turn.openCardIds[0]
        ? this.turn.cards.find((card) => card.id === this.turn.openCardIds[0])
        : undefined;
      const candidates = openCard
        ? this.turn.cards.filter(
            (card) => card.pairId === openCard.pairId && card.status === 'down',
          )
        : this.nextHintPair();
      if (candidates.length === 0) return;
      this.hinting = true;
      this.showCoach('Veja com calma estas cartas.');
      this.revealHintCards(
        candidates.map((card) => card.id),
        0,
      );
    }

    private nextHintPair(): readonly MemoryTurn['cards'][number][] {
      const first = this.turn.cards.find((card) => card.status === 'down');
      if (!first) return [];
      return this.turn.cards.filter(
        (card) => card.pairId === first.pairId && card.status === 'down',
      );
    }

    private revealHintCards(cardIds: readonly string[], index: number): void {
      const cardId = cardIds[index];
      if (!cardId) {
        this.hinting = false;
        context.run.interactionSettled();
        this.showCoach(
          this.turn.phase === 'one-open' ? 'Agora encontre a carta igual.' : 'Agora é sua vez.',
        );
        return;
      }
      const view = this.cardViews.get(cardId)!;
      this.flipCards([view], true, () => {
        this.schedule(480, () => {
          this.flipCards([view], false, () => {
            this.schedule(100, () => this.revealHintCards(cardIds, index + 1));
          });
        });
      });
    }

    private flipCards(
      views: readonly MemoryCardView[],
      faceUp: boolean,
      complete: () => void,
    ): void {
      if (views.length === 0) {
        complete();
        return;
      }
      if (this.reducedMotion) {
        views.forEach((view) => this.setCardFace(view, faceUp));
        complete();
        return;
      }
      let remaining = views.length;
      const cardComplete = (): void => {
        remaining -= 1;
        if (remaining === 0) complete();
      };
      for (const view of views) {
        this.scope.resource(
          this.tweens.add({
            targets: view.container,
            scaleX: 0,
            duration: 110,
            ease: 'Sine.easeIn',
            onComplete: () => {
              this.setCardFace(view, faceUp);
              this.scope.resource(
                this.tweens.add({
                  targets: view.container,
                  scaleX: 1,
                  duration: 110,
                  ease: 'Sine.easeOut',
                  onComplete: cardComplete,
                }),
              );
            },
          }),
        );
      }
    }

    private setCardFace(view: MemoryCardView, faceUp: boolean): void {
      view.frontFrame.setVisible(faceUp);
      view.matte.setVisible(faceUp);
      view.photo.setVisible(faceUp);
      view.back.setVisible(!faceUp);
      view.backMark.setVisible(!faceUp);
    }

    private schedule(delay: number, callback: () => void): void {
      const timer = this.time.delayedCall(delay, () => {
        this.scheduledTimers.delete(timer);
        callback();
      });
      timer.paused = this.isPaused();
      this.scheduledTimers.add(timer);
      this.scope.resource(timer);
    }

    private toggleManualPause(): void {
      if (this.completed) return;
      this.manualPaused = !this.manualPaused;
      this.applyPauseState();
    }

    private applyPauseState(): void {
      const paused = this.isPaused();
      this.pauseCover?.setVisible(paused);
      this.pauseTitle?.setVisible(paused);
      this.pauseLabel?.setText(paused ? 'Jogar' : 'Pausar');
      this.scheduledTimers.forEach((timer) => {
        timer.paused = paused;
      });
      if (paused) {
        this.tweens.pauseAll();
        context.run.pause();
      } else {
        this.tweens.resumeAll();
        context.run.resume();
      }
    }

    private isPaused(): boolean {
      return this.manualPaused || this.visibilityPaused;
    }

    private showCoach(message: string): void {
      this.coachMark?.setText(message).setVisible(true);
    }
  }

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: christmasTheme.color.pineDark,
    pixelArt: false,
    antialias: true,
    scale: { mode: Phaser.Scale.RESIZE, parent, width: '100%', height: '100%' },
    scene: MemoryScene,
  });

  const pauseRun = (): void => {
    if (setActiveSceneVisibilityPaused) setActiveSceneVisibilityPaused(true);
    else context.run.pause();
  };
  const resumeRun = (): void => {
    if (setActiveSceneVisibilityPaused) setActiveSceneVisibilityPaused(false);
    else context.run.resume();
  };
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

export const memoryGameModule: GameModule<typeof PhaserModule, HTMLElement> = {
  definition: memoryDefinition,
  create: createMemoryGame,
};
