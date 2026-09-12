import { SceneScope, createViewportLayout } from '@christmas-games/platform';
import type {
  GameContext,
  GameController,
  GameModule,
  GameViewport,
  Photo,
} from '@christmas-games/platform';
import { attachCrystalControl, attachCrystalPause, christmasTheme } from '@christmas-games/theme';
import type * as PhaserModule from 'phaser';
import { memoryDefinition } from '../../definition.js';
import { createMemoryDeck, type MemoryCard } from '../../domain/MemoryDeck.js';
import { pairCountForMemoryDifficulty } from '../../domain/MemoryDifficulty.js';
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
import { planMemoryCardMaterial } from '../MemoryCardLab.js';
import { canRevealMemoryCard } from '../MemoryInteractionArbiter.js';
import { memoryTuning } from '../../tuning.js';
import { memoryAudio } from './audioAssets.js';
import { MemoryAudioDirector } from './MemoryAudioDirector.js';
import { memoryVisualAssets } from './visualAssets.js';

interface MemoryCardView {
  readonly back: PhaserModule.GameObjects.Rectangle;
  readonly backInset: PhaserModule.GameObjects.Rectangle;
  readonly backLabel: PhaserModule.GameObjects.Text;
  readonly backMark: PhaserModule.GameObjects.Text;
  readonly backRibbon: PhaserModule.GameObjects.Rectangle;
  readonly backSeal: PhaserModule.GameObjects.Rectangle;
  readonly card: MemoryCard;
  readonly container: PhaserModule.GameObjects.Container;
  readonly frontFrame: PhaserModule.GameObjects.Rectangle;
  readonly hitSurface: PhaserModule.GameObjects.Rectangle;
  readonly matchMark: PhaserModule.GameObjects.Text;
  readonly matte: PhaserModule.GameObjects.Rectangle;
  readonly photo: PhaserModule.GameObjects.Image;
  readonly shadow: PhaserModule.GameObjects.Rectangle;
}

interface MemoryWarmLightView {
  readonly core: PhaserModule.GameObjects.Arc;
  readonly halo: PhaserModule.GameObjects.Arc;
  readonly xFraction: number;
  readonly yFraction: number;
}

const stableSubsetRandom = {
  int: (minInclusive: number, _maxInclusive: number): number => minInclusive,
  next: (): number => 0,
};

// These anchors follow the warm windows and lanterns already painted into the
// winter-village background. They are L1 only: the board stays at depth 0.
const warmLightAnchors = [
  { radius: 14, xFraction: 0.16, yFraction: 0.77 },
  { radius: 9, xFraction: 0.31, yFraction: 0.83 },
  { radius: 15, xFraction: 0.74, yFraction: 0.82 },
  { radius: 9, xFraction: 0.88, yFraction: 0.74 },
] as const;

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
 * card derivative of the selected small album, then removes those textures on exit.
 */
export function createMemoryGame(
  Phaser: typeof PhaserModule,
  parent: HTMLElement,
  context: GameContext,
): GameController {
  const pairCount = pairCountForMemoryDifficulty(context.difficulty);
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
    private audio: MemoryAudioDirector | undefined;
    private assetFailure = false;
    private background?: Phaser.GameObjects.Rectangle;
    private backgroundArt?: Phaser.GameObjects.Image;
    private coachMark?: Phaser.GameObjects.Text;
    private completed = false;
    private developmentScenarioStarted = false;
    private hintButton?: Phaser.GameObjects.Rectangle;
    private hintLabel?: Phaser.GameObjects.Text;
    private hinting = false;
    private lastDisplayedSecond = -1;
    private manualPaused = false;
    private pendingResolution: 'match' | 'mismatch' | undefined;
    private pauseButton?: Phaser.GameObjects.Rectangle;
    private pauseCover?: Phaser.GameObjects.Rectangle;
    private pauseLabel?: Phaser.GameObjects.Text;
    private pauseMessage?: Phaser.GameObjects.Text;
    private pauseTitle?: Phaser.GameObjects.Text;
    private progressText?: Phaser.GameObjects.Text;
    private reducedMotion = context.preferences?.reducedMotion ?? false;
    private resolutionTimer: Phaser.Time.TimerEvent | undefined;
    private timerText?: Phaser.GameObjects.Text;
    private titleText?: Phaser.GameObjects.Text;
    private turn: MemoryTurn = createMemoryTurn(deck);
    private visibilityPaused = false;
    private winText?: Phaser.GameObjects.Text;
    private snowSpawnZone?: Phaser.Geom.Rectangle;
    private soundButton?: Phaser.GameObjects.Rectangle;
    private soundLabel?: Phaser.GameObjects.Text;
    private readonly warmLights: MemoryWarmLightView[] = [];

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
      this.load.image(memoryVisualAssets.background.key, memoryVisualAssets.background.url);
      if (this.usesAmbientSnow()) {
        this.load.svg(memoryVisualAssets.snow.key, memoryVisualAssets.snow.url, {
          width: 48,
          height: 48,
        });
      }
      for (const [role, asset] of Object.entries(memoryAudio)) {
        if (role === 'music' && context.quality === 'LOW') continue;
        this.load.audio(asset.key, [...asset.urls], { instances: role === 'music' ? 1 : 2 });
      }
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

      this.scope.texture(this.textures, memoryVisualAssets.background.key);
      if (this.usesAmbientSnow()) this.scope.texture(this.textures, memoryVisualAssets.snow.key);
      this.audio = new MemoryAudioDirector({
        allowMusic: context.quality !== 'LOW',
        Phaser,
        initiallyEnabled: context.preferences?.soundEnabled ?? true,
        scene: this,
        scope: this.scope,
      });
      this.scope.add(() => {
        Object.values(memoryAudio).forEach((asset) => this.cache.audio.remove(asset.key));
      });

      this.backgroundArt = this.add
        .image(0, 0, memoryVisualAssets.background.key)
        .setOrigin(0.5)
        .setDepth(-2);
      this.background = this.add.rectangle(0, 0, 1, 1, 0x082821, 0.76).setOrigin(0).setDepth(-1);
      this.createWarmLights();
      this.createAmbientSnow();
      this.titleText = this.add
        .text(0, 0, 'MEMÓRIAS DE NATAL', {
          color: christmasTheme.color.gold,
          fontFamily: 'system-ui, sans-serif',
          fontSize: '20px',
          fontStyle: 'bold',
        })
        .setOrigin(0, 0.5);
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
        .setOrigin(1, 0.5);
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
        .rectangle(
          0,
          0,
          memoryTuning.controlTargetMinCssPx,
          memoryTuning.controlTargetMinCssPx,
          0x8f1d35,
          1,
        )
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

      this.soundButton = this.add
        .rectangle(
          0,
          0,
          memoryTuning.controlTargetMinCssPx,
          memoryTuning.controlTargetMinCssPx,
          0x103e35,
          1,
        )
        .setStrokeStyle(2, 0xf8dfa0, 0.85)
        .setInteractive({ useHandCursor: true });
      this.soundLabel = this.add
        .text(0, 0, this.audio.soundEnabled ? 'Som' : 'Mudo', {
          color: christmasTheme.color.snow,
          fontFamily: 'system-ui, sans-serif',
          fontSize: '12px',
          fontStyle: 'bold',
        })
        .setOrigin(0.5);
      this.soundButton.on(Phaser.Input.Events.POINTER_DOWN, () => this.toggleSound());

      this.pauseButton = this.add
        .rectangle(0, 0, 64, memoryTuning.controlTargetMinCssPx, 0x103e35, 1)
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
      this.pauseButton.on(Phaser.Input.Events.POINTER_DOWN, () => this.toggleManualPause());

      for (const [target, label, icon] of [
        [this.hintButton, this.hintLabel, () => 'hint' as const],
        [
          this.soundButton,
          this.soundLabel,
          () => (this.audio?.soundEnabled ? ('sound' as const) : ('muted' as const)),
        ],
        [
          this.pauseButton,
          this.pauseLabel,
          () => (this.manualPaused ? ('play' as const) : ('pause' as const)),
        ],
      ] as const) {
        label.setDepth(1.1);
        attachCrystalControl({
          target,
          label,
          icon,
          graphics: this.scope.resource(this.add.graphics().setDepth(1)),
          events: this.events,
          scope: this.scope,
          reducedMotion: this.reducedMotion,
        });
      }

      this.pauseCover = this.add
        .rectangle(0, 0, 1, 1, 0x082821, 0.82)
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
      this.pauseMessage = this.add
        .text(0, 0, 'A brincadeira está esperando.\nToque para continuar.', {
          align: 'center',
          color: christmasTheme.color.snow,
          fontFamily: 'system-ui, sans-serif',
          fontSize: '16px',
          fontStyle: 'bold',
          wordWrap: { width: 280 },
        })
        .setOrigin(0.5)
        .setDepth(51)
        .setVisible(false);
      this.pauseCover.on(Phaser.Input.Events.POINTER_DOWN, () => this.toggleManualPause());
      attachCrystalPause({
        backdrop: this.pauseCover,
        graphics: this.scope.resource(this.add.graphics().setDepth(50.5)),
        events: this.events,
        scope: this.scope,
      });

      this.winText = this.add
        .text(0, 0, 'Álbum completo! ✦', {
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
      this.runDevelopmentScenario();
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
      const matte = this.add
        .rectangle(0, 0, 1, 1, 0xfff0c7, 1)
        .setStrokeStyle(1, 0xd4a94b, 0.55)
        .setOrigin(0.5);
      const photo = this.add.image(0, 0, textureKey).setOrigin(0.5);
      const matchMark = this.add
        .text(0, 0, '✦', {
          color: christmasTheme.color.gold,
          fontFamily: 'system-ui, sans-serif',
          fontSize: '18px',
          fontStyle: 'bold',
        })
        .setOrigin(0.5)
        .setVisible(false);
      const back = this.add
        .rectangle(0, 0, 1, 1, 0x8f1d35, 1)
        .setStrokeStyle(3, 0xf8dfa0, 1)
        .setOrigin(0.5);
      const backInset = this.add
        .rectangle(0, 0, 1, 1, 0x5d1730, 1)
        .setStrokeStyle(1, 0xe7bc62, 0.72)
        .setOrigin(0.5);
      const backRibbon = this.add.rectangle(0, 0, 1, 1, 0xbd344d, 1).setOrigin(0.5);
      const backSeal = this.add
        .rectangle(0, 0, 1, 1, 0x0b4b3d, 1)
        .setStrokeStyle(2, 0xf3ce74, 1)
        .setOrigin(0.5);
      const backMark = this.add
        .text(0, 0, '✦', {
          color: christmasTheme.color.gold,
          fontFamily: 'system-ui, sans-serif',
          fontSize: '28px',
          fontStyle: 'bold',
        })
        .setOrigin(0.5);
      const backLabel = this.add
        .text(0, 0, 'NATAL', {
          color: christmasTheme.color.snow,
          fontFamily: 'system-ui, sans-serif',
          fontSize: '11px',
          fontStyle: 'bold',
        })
        .setOrigin(0.5);
      // A Rectangle owns a concrete geometry hit area. It is more reliable than
      // making the transform-only Container interactive, especially after a
      // responsive board resize on touch devices.
      const hitSurface = this.add
        .rectangle(0, 0, 1, 1, 0x000000, 0.001)
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });
      const container = this.add.container(0, 0, [
        shadow,
        frontFrame,
        matte,
        photo,
        matchMark,
        back,
        backInset,
        backRibbon,
        backSeal,
        backMark,
        backLabel,
        hitSurface,
      ]);
      hitSurface.on(Phaser.Input.Events.POINTER_DOWN, () => this.handleCardSelection(card.id));
      const backSkin = this.scope.resource(this.add.graphics());
      container.addAt(backSkin, container.getIndex(backLabel));
      for (const decoration of [backInset, backRibbon, backSeal, backMark]) decoration.setAlpha(0);
      attachCrystalControl({
        target: back,
        gesture: hitSurface,
        label: backLabel,
        icon: 'hint',
        iconSize: 44,
        graphics: backSkin,
        events: this.events,
        scope: this.scope,
        reducedMotion: this.reducedMotion,
        ruby: true,
        panel: true,
      });
      shadow.setRounded(12);
      frontFrame.setRounded(12);
      matte.setRounded(8);
      const view: MemoryCardView = {
        back,
        backInset,
        backLabel,
        backMark,
        backRibbon,
        backSeal,
        card,
        container,
        frontFrame,
        hitSurface,
        matchMark,
        matte,
        photo,
        shadow,
      };
      this.setCardFace(view, false);
      this.setCardMatched(view, false);
      this.cardViews.set(card.id, view);
    }

    private layout(viewport: GameViewport): void {
      this.background?.setSize(viewport.width, viewport.height);
      const backgroundFrame = this.textures.get(memoryVisualAssets.background.key).get();
      const backgroundScale = Math.max(
        viewport.width / backgroundFrame.width,
        viewport.height / backgroundFrame.height,
      );
      this.backgroundArt
        ?.setPosition(viewport.width / 2, viewport.height / 2)
        .setScale(backgroundScale);
      this.layoutWarmLights(viewport);
      if (this.snowSpawnZone) this.snowSpawnZone.width = viewport.width;
      const layout = planMemoryBoardLayout(viewport, deck.length);
      const commandY = layout.headerY + 54;
      this.titleText?.setPosition(16, layout.headerY);
      this.progressText?.setPosition(16, commandY);
      this.timerText?.setPosition(viewport.width - 16, layout.headerY);
      this.hintButton?.setPosition(viewport.width - 94, commandY);
      this.hintLabel?.setPosition(viewport.width - 94, commandY);
      this.soundButton?.setPosition(viewport.width - 156, commandY);
      this.soundLabel?.setPosition(viewport.width - 156, commandY);
      this.pauseButton?.setPosition(viewport.width - 32, commandY);
      this.pauseLabel?.setPosition(viewport.width - 32, commandY);
      this.coachMark?.setPosition(viewport.width / 2, layout.headerY + 98);
      this.winText?.setPosition(viewport.width / 2, layout.headerY + 98);
      this.pauseCover?.setSize(viewport.width, viewport.height);
      this.pauseTitle?.setPosition(viewport.width / 2, viewport.height / 2 - 44);
      this.pauseMessage?.setPosition(viewport.width / 2, viewport.height / 2 + 2);

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
      view.container.setPosition(x, y);
      view.hitSurface.setSize(width, height);
      const material = planMemoryCardMaterial(width, height);
      const contentWidth = width - material.frameInset * 2;
      const contentHeight = height - material.frameInset * 2;
      view.shadow.setPosition(0, material.shadowOffset).setSize(width, height);
      view.frontFrame.setSize(width, height);
      view.matte.setSize(contentWidth, contentHeight);
      view.back.setSize(width, height);
      view.backInset.setSize(material.backInnerWidth, material.backInnerHeight);
      view.backRibbon
        .setPosition(0, material.backRibbonY)
        .setSize(material.backInnerWidth, material.backRibbonHeight);
      view.backSeal
        .setPosition(0, material.backSealY)
        .setSize(material.backSealDiameter, material.backSealDiameter);
      view.backMark.setPosition(0, material.backSealY).setFontSize(material.backStarFontSize);
      view.backLabel.setPosition(0, material.backLabelY).setFontSize(material.backLabelFontSize);
      view.matchMark
        .setPosition(
          contentWidth / 2 - material.matchMarkInset,
          -contentHeight / 2 + material.matchMarkInset,
        )
        .setFontSize(material.matchMarkFontSize);
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
      this.audio?.startMusicAfterGesture();
      this.audio?.play('card.flip');
      const selectedView = this.cardViews.get(cardId)!;
      this.pressCard(selectedView);
      if (!result.resolution) {
        this.flipCards([selectedView], true, () => {
          context.run.interactionSettled();
          if (!this.hinting && this.turn.phase === 'one-open') {
            this.showCoach('Agora toque em outra carta.');
          }
        });
        return;
      }

      this.pendingResolution = result.resolution;
      this.flipCards([selectedView], true, () => {
        this.scheduleResolution();
      });
    }

    /** Local-only proof of the terminal album and shell handoff. */
    private runDevelopmentScenario(): void {
      if (this.developmentScenarioStarted || context.development?.scenario !== 'victory') return;
      this.developmentScenarioStarted = true;
      this.schedule(80, () => {
        if (this.completed || context.run.state !== 'started') return;
        let completedTurn = this.turn;
        while (completedTurn.phase !== 'completed') {
          const first = completedTurn.cards.find((card) => card.status === 'down');
          const second = first
            ? completedTurn.cards.find(
                (card) =>
                  card.id !== first.id && card.pairId === first.pairId && card.status === 'down',
              )
            : undefined;
          if (!first || !second) return;
          const firstResult = selectMemoryCard(completedTurn, first.id);
          const secondResult = selectMemoryCard(firstResult.state, second.id);
          if (!secondResult.resolution) return;
          completedTurn = settleMemoryTurn(secondResult.state);
        }
        this.turn = completedTurn;
        for (const card of completedTurn.cards) {
          const view = this.cardViews.get(card.id);
          if (!view) continue;
          this.setCardFace(view, true);
          this.setCardMatched(view, true);
        }
        this.progressText?.setText(formatMemoryProgress(completedTurn));
        this.completeBoard();
      });
    }

    private scheduleResolution(): void {
      if (!this.pendingResolution || this.resolutionTimer) return;
      const delay =
        this.pendingResolution === 'mismatch'
          ? memoryTuning.mismatchDelayMs
          : memoryTuning.matchRecognitionDelayMs;
      this.resolutionTimer = this.schedule(delay, () => {
        this.resolutionTimer = undefined;
        const resolution = this.pendingResolution;
        this.pendingResolution = undefined;
        if (resolution) this.settleCurrentTurn(resolution);
      });
    }

    private settleCurrentTurn(resolution: 'match' | 'mismatch'): void {
      const openCardIds = this.turn.openCardIds;
      this.turn = settleMemoryTurn(this.turn);
      const openViews = openCardIds.map((id) => this.cardViews.get(id)!);
      if (resolution === 'mismatch') {
        this.audio?.play('card.return');
        this.flipCards(openViews, false, () => this.finishResolution());
        return;
      }

      this.audio?.play('pair.match');
      for (const view of openViews) {
        this.setCardMatched(view, true);
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

    private pressCard(view: MemoryCardView): void {
      view.back.setFillStyle(0xb93350);
      view.backRibbon.setFillStyle(0xd44b5e);
      this.scope.resource(
        this.tweens.add({
          targets: view.container,
          scaleY: 0.975,
          yoyo: true,
          duration: memoryTuning.pressDurationMs / 2,
          ease: 'Sine.easeOut',
          onComplete: () => {
            view.back.setFillStyle(0x8f1d35);
            view.backRibbon.setFillStyle(0xbd344d);
          },
        }),
      );
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
      this.hintButton?.setVisible(false);
      this.hintLabel?.setVisible(false);
      this.pauseButton?.setVisible(false);
      this.pauseLabel?.setVisible(false);
      this.soundButton?.setVisible(false);
      this.soundLabel?.setVisible(false);
      this.winText
        ?.setVisible(true)
        .setAlpha(this.reducedMotion ? 1 : 0)
        .setScale(this.reducedMotion ? 1 : 0.9);
      if (this.winText && !this.reducedMotion) {
        this.scope.resource(
          this.tweens.add({
            targets: this.winText,
            alpha: 1,
            duration: 220,
            ease: 'Sine.easeOut',
            scaleX: 1,
            scaleY: 1,
          }),
        );
      }
      this.audio?.play('winter.win');
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
      this.audio?.play('hint.magic');
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
            duration: memoryTuning.flipHalfDurationMs,
            ease: 'Sine.easeIn',
            onComplete: () => {
              this.setCardFace(view, faceUp);
              this.scope.resource(
                this.tweens.add({
                  targets: view.container,
                  scaleX: 1,
                  duration: memoryTuning.flipHalfDurationMs,
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
      view.backInset.setVisible(!faceUp);
      view.backRibbon.setVisible(!faceUp);
      view.backSeal.setVisible(!faceUp);
      view.backMark.setVisible(!faceUp);
      view.backLabel.setVisible(!faceUp);
    }

    private setCardMatched(view: MemoryCardView, matched: boolean): void {
      view.frontFrame.setStrokeStyle(3, matched ? 0x55b58a : 0xb98a2d, 1);
      view.matchMark.setVisible(matched);
    }

    private usesAmbientSnow(): boolean {
      return context.quality !== 'LOW' && !this.reducedMotion;
    }

    private usesWarmLights(): boolean {
      return context.quality !== 'LOW';
    }

    private createWarmLights(): void {
      if (!this.usesWarmLights()) return;
      for (const anchor of warmLightAnchors) {
        const halo = this.add.circle(0, 0, anchor.radius * 2.2, 0xe9b45d, 0.055).setDepth(-0.25);
        const core = this.add
          .circle(0, 0, Math.max(2.5, anchor.radius * 0.22), 0xf6d789, 0.52)
          .setDepth(-0.24);
        this.warmLights.push({
          core,
          halo,
          xFraction: anchor.xFraction,
          yFraction: anchor.yFraction,
        });
        if (this.reducedMotion) continue;
        this.scope.resource(
          this.tweens.add({
            targets: halo,
            alpha: 0.11,
            delay: this.warmLights.length * 330,
            duration: 2_400 + this.warmLights.length * 300,
            ease: 'Sine.easeInOut',
            repeat: -1,
            yoyo: true,
          }),
        );
      }
    }

    private layoutWarmLights(viewport: GameViewport): void {
      const scale = Math.max(0.78, Math.min(1.4, viewport.width / 390));
      for (const light of this.warmLights) {
        const x = viewport.width * light.xFraction;
        const y = viewport.height * light.yFraction;
        light.halo.setPosition(x, y).setScale(scale);
        light.core.setPosition(x, y).setScale(scale);
      }
    }

    private createAmbientSnow(): void {
      if (!this.usesAmbientSnow()) return;
      this.snowSpawnZone = new Phaser.Geom.Rectangle(0, -28, this.scale.gameSize.width, 28);
      this.scope.resource(
        this.add
          .particles(0, 0, memoryVisualAssets.snow.key, {
            advance: 3_600,
            alpha: { start: 0.62, end: 0.08 },
            emitZone: {
              type: 'random',
              source: {
                getRandomPoint: (point) => {
                  point.x =
                    this.snowSpawnZone!.x + context.random.next() * this.snowSpawnZone!.width;
                  point.y =
                    this.snowSpawnZone!.y + context.random.next() * this.snowSpawnZone!.height;
                },
              },
            },
            frequency: 620,
            gravityY: 5,
            lifespan: { min: 6_500, max: 10_500 },
            maxAliveParticles: 18,
            maxParticles: 20,
            quantity: 1,
            radial: false,
            reserve: 18,
            scale: { start: 0.24, end: 0.1, ease: 'Sine.easeOut' },
            speedX: { min: -11, max: 13 },
            speedY: { min: 62, max: 96 },
          })
          .setDepth(-0.5),
      );
    }

    private schedule(delay: number, callback: () => void): Phaser.Time.TimerEvent {
      const timer = this.time.delayedCall(delay, () => {
        this.scheduledTimers.delete(timer);
        callback();
      });
      timer.paused = this.isPaused();
      this.scheduledTimers.add(timer);
      this.scope.resource(timer);
      return timer;
    }

    private toggleManualPause(): void {
      if (this.completed) return;
      this.manualPaused = !this.manualPaused;
      this.applyPauseState();
      this.audio?.play('ui.button');
    }

    private toggleSound(): void {
      const audio = this.audio;
      if (!audio) return;
      const soundEnabled = audio.toggleAfterGesture();
      context.run.soundChanged?.(soundEnabled);
      if (soundEnabled) audio.play('ui.button');
      this.soundLabel?.setText(soundEnabled ? 'Som' : 'Mudo');
      this.soundButton?.setFillStyle(soundEnabled ? 0x103e35 : 0x6c2335);
    }

    private applyPauseState(): void {
      const paused = this.isPaused();
      if (paused) this.stabilizePresentationForPause();
      this.pauseCover?.setVisible(paused);
      this.pauseTitle?.setVisible(paused);
      this.pauseMessage?.setVisible(paused);
      this.pauseLabel?.setText(paused ? 'Jogar' : 'Pausar');
      this.scheduledTimers.forEach((timer) => {
        timer.paused = paused;
      });
      if (paused) {
        this.tweens.pauseAll();
        this.audio?.pause();
        context.run.pause();
      } else {
        this.tweens.resumeAll();
        this.audio?.resume();
        context.run.resume();
      }
    }

    private stabilizePresentationForPause(): void {
      this.hinting = false;
      for (const card of this.turn.cards) {
        const view = this.cardViews.get(card.id);
        if (!view) continue;
        this.tweens.killTweensOf(view.container);
        view.container.setScale(1, 1);
        this.setCardFace(view, card.status !== 'down');
        this.setCardMatched(view, card.status === 'matched');
      }
      // If pause interrupted the second flip, its truth was already recorded
      // by MemoryTurn. Arm a paused timer so resume cannot leave the board in
      // a resolving state forever.
      this.scheduleResolution();
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
    loader: {
      timeout: memoryTuning.assetTimeoutMs,
      maxRetries: memoryTuning.assetMaxRetries,
    },
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
