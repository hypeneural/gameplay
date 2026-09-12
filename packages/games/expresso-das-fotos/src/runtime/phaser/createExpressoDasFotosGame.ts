import { createPhotoSurface, createViewportLayout, SceneScope } from '@christmas-games/platform';
import type {
  GameContext,
  GameController,
  GameModule,
  GameViewport,
  Photo,
} from '@christmas-games/platform';
import type * as PhaserModule from 'phaser';
import { attachCrystalControl, attachCrystalPause } from '@christmas-games/theme';

import { expressoDasFotosDefinition } from '../../definition.js';
import {
  arriveAtExpressStation,
  chooseExpressStation,
  createExpressJourney,
  deliverExpressMemory,
  finishExpressTrackSwitch,
  getCurrentExpressStop,
  pauseExpressJourney,
  resumeExpressJourney,
  startExpressJourney,
} from '../../domain/ExpressJourney.js';
import { getExpressHint } from '../../domain/ExpressHint.js';
import { planExpressLayout, type ExpressLayout } from '../../domain/ExpressLayout.js';
import { planExpressRailTravel } from '../../domain/ExpressMotionPlan.js';
import { planExpressPhotoLoads } from '../../domain/ExpressPhotoLoadPlan.js';
import {
  EXPRESS_INITIAL_PRESENTATION_EPOCH,
  invalidateExpressPresentation,
  issueExpressArrivalToken,
  issueExpressCollectionToken,
  issueExpressTrackSwitchToken,
  ownsExpressArrivalToken,
  ownsExpressCollectionToken,
  ownsExpressTrackSwitchToken,
  type ExpressPresentationEpoch,
} from '../../domain/ExpressPresentationEpoch.js';
import { getExpressProgress } from '../../domain/ExpressProgress.js';
import { selectExpressPhotos } from '../../domain/ExpressPhotoSelection.js';
import { createExpressRoute } from '../../domain/ExpressRoute.js';
import type {
  ExpressJourney,
  ExpressRailRouteId,
  ExpressStationCandidate,
  ExpressStationId,
} from '../../domain/ExpressTypes.js';
import { expressoDasFotosTuning } from '../../tuning.js';
import { RequiredAssetLedger } from '../RequiredAssetLedger.js';
import { ExpressAudioDirector } from './ExpressAudioDirector.js';
import { expressoAudio } from './audioAssets.js';
import { createRuntimeRailPaths, type RuntimeRailPath } from './RailPathFactory.js';
import { expressoVisualAssets } from './visualAssets.js';

interface ExpressPhotoView {
  readonly frame: PhaserModule.GameObjects.Rectangle;
  readonly matte: PhaserModule.GameObjects.Rectangle;
  readonly photo: PhaserModule.GameObjects.Image;
}

interface ExpressStationView {
  readonly shell: PhaserModule.GameObjects.Container;
  readonly shadow: PhaserModule.GameObjects.Ellipse;
  readonly frame: PhaserModule.GameObjects.Rectangle;
  readonly matte: PhaserModule.GameObjects.Rectangle;
  readonly photo: PhaserModule.GameObjects.Image;
  readonly label: PhaserModule.GameObjects.Text;
  readonly lock: PhaserModule.GameObjects.Text;
  readonly zone: PhaserModule.GameObjects.Rectangle;
}

interface ExpressTrainView {
  readonly container: PhaserModule.GameObjects.Container;
  readonly rig: PhaserModule.GameObjects.Container;
  readonly headlight: PhaserModule.GameObjects.Arc;
  readonly shadow: PhaserModule.GameObjects.Ellipse;
}

interface ExpressMemoryTree {
  readonly container: PhaserModule.GameObjects.Container;
  readonly star: PhaserModule.GameObjects.Text;
  readonly ornaments: readonly PhaserModule.GameObjects.Arc[];
}

type ExpressTransientEffect = PhaserModule.GameObjects.Arc | PhaserModule.GameObjects.Text;

const color = {
  brass: 0xe7bd66,
  cream: 0xfff6df,
  charcoal: 0x10222f,
  night: 0x061724,
  pine: 0x0f4f45,
  pineDeep: 0x082f30,
  red: 0xb63545,
  redLight: 0xdf6570,
  snow: 0xf8f5ec,
  wood: 0x4d302c,
  rail: 0x513730,
  railHighlight: 0xf4d37a,
  mist: 0x9ed9d5,
} as const;

function photoTextureKey(runId: string, ordinal: number): string {
  return 'expresso-' + runId + '-photo-' + ordinal;
}

function selectRunPhotos(context: GameContext): readonly Photo[] {
  const catalog = context.session.photos.map((photo, catalogPosition) => ({
    id: photo.id,
    orientation: photo.orientation,
    catalogPosition,
  }));
  const anchorCatalogPosition = Math.max(
    0,
    context.session.photos.findIndex((photo) => photo.id === context.selectedPhoto.id),
  );
  const selection = selectExpressPhotos({
    anchor: {
      id: context.selectedPhoto.id,
      orientation: context.selectedPhoto.orientation,
      catalogPosition: anchorCatalogPosition,
    },
    candidates: catalog,
    random: context.random,
  });
  const photosById = new Map(context.session.photos.map((photo) => [photo.id, photo]));
  photosById.set(context.selectedPhoto.id, context.selectedPhoto);
  return selection.destinationPhotoIds.map((id) => {
    const photo = photosById.get(id);
    if (!photo) {
      throw new Error('Expresso photo selection must resolve to an authorized session photo.');
    }
    return photo;
  });
}

export function createExpressoDasFotosGame(
  Phaser: typeof PhaserModule,
  parent: HTMLElement,
  context: GameContext,
): GameController {
  const runPhotos = selectRunPhotos(context);
  const photoLoadPlan = planExpressPhotoLoads({
    anchorPhotoId: context.selectedPhoto.id,
    destinationPhotoIds: runPhotos.map((photo) => photo.id),
  });
  const textureKeys = new Map(
    photoLoadPlan.map((photo, index) => [photo.photoId, photoTextureKey(context.run.runId, index)]),
  );
  const route = createExpressRoute(
    runPhotos.map((photo) => photo.id),
    context.random,
  );
  let setVisibilityPaused: ((paused: boolean) => void) | undefined;

  class ExpressoDasFotosScene extends Phaser.Scene {
    private readonly scope = new SceneScope();
    private readonly activeTimers = new Set<PhaserModule.Time.TimerEvent>();
    private readonly activeTransientEffects = new Set<ExpressTransientEffect>();
    private readonly activeTweens = new Set<PhaserModule.Tweens.Tween>();
    private readonly trainMotionTweens = new Set<PhaserModule.Tweens.Tween>();
    private readonly stationViews = new Map<ExpressStationId, ExpressStationView>();
    private readonly assetLedger = new RequiredAssetLedger(
      new Set([
        expressoVisualAssets.background.key,
        expressoVisualAssets.train.key,
        ...textureKeys.values(),
      ]),
    );
    private readonly photosById = new Map(runPhotos.map((photo) => [photo.id, photo]));
    private readonly pathPoint: PhaserModule.Math.Vector2;
    private readonly pathTangent: PhaserModule.Math.Vector2;
    private readonly setVisibilityPausedFromGame = (paused: boolean): void => {
      if (this.visibilityPaused === paused) return;
      this.visibilityPaused = paused;
      this.syncPauseState();
    };

    private anchorPhoto?: ExpressPhotoView;
    private audio?: ExpressAudioDirector;
    private assetFailure = false;
    private backgroundArt?: PhaserModule.GameObjects.Image;
    private backgroundVeil?: PhaserModule.GameObjects.Rectangle;
    private coachText?: PhaserModule.GameObjects.Text;
    private completionCard?: PhaserModule.GameObjects.Container;
    private header?: PhaserModule.GameObjects.Rectangle;
    private idleAssistActive = false;
    private idleAssistTimer: PhaserModule.Time.TimerEvent | undefined;
    private journey: ExpressJourney = createExpressJourney(route);
    private layoutPlan?: ExpressLayout;
    private manualPaused = false;
    private memoryToken?: PhaserModule.GameObjects.Text;
    private memoryTree?: ExpressMemoryTree;
    private missionCaption?: PhaserModule.GameObjects.Text;
    private pauseButton?: PhaserModule.GameObjects.Rectangle;
    private pauseLabel?: PhaserModule.GameObjects.Text;
    private pauseOverlay?: PhaserModule.GameObjects.Rectangle;
    private pauseText?: PhaserModule.GameObjects.Text;
    private presentation: ExpressPresentationEpoch = EXPRESS_INITIAL_PRESENTATION_EPOCH;
    private progressText?: PhaserModule.GameObjects.Text;
    private railGraphics?: PhaserModule.GameObjects.Graphics;
    private railGlowGraphics?: PhaserModule.GameObjects.Graphics;
    private railPaths?: Readonly<Record<ExpressRailRouteId, RuntimeRailPath>>;
    private railProgress = 0;
    private soundButton?: PhaserModule.GameObjects.Rectangle;
    private soundEnabled = context.preferences?.soundEnabled ?? true;
    private soundLabel?: PhaserModule.GameObjects.Text;
    private train?: ExpressTrainView;
    private visibilityPaused = false;

    constructor() {
      super('ExpressoDasFotosScene');
      this.pathPoint = new Phaser.Math.Vector2();
      this.pathTangent = new Phaser.Math.Vector2();
    }

    init(): void {
      setVisibilityPaused = this.setVisibilityPausedFromGame;
      context.run.open();
      this.load.on(Phaser.Loader.Events.FILE_COMPLETE, this.handleFileComplete, this);
      this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, this.handleFileFailure, this);
      this.scope.add(() =>
        this.load.off(Phaser.Loader.Events.FILE_COMPLETE, this.handleFileComplete, this),
      );
      this.scope.add(() =>
        this.load.off(Phaser.Loader.Events.FILE_LOAD_ERROR, this.handleFileFailure, this),
      );
      this.scope.add(() => {
        if (setVisibilityPaused === this.setVisibilityPausedFromGame) {
          setVisibilityPaused = undefined;
        }
      });
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scope.dispose());
    }

    preload(): void {
      this.load.image(expressoVisualAssets.background.key, expressoVisualAssets.background.url);
      this.load.image(expressoVisualAssets.train.key, expressoVisualAssets.train.url);
      for (const asset of Object.values(expressoAudio)) {
        this.load.audio(asset.key, [...asset.urls], { instances: 2 });
      }
      for (const item of photoLoadPlan) {
        const photo = this.photosById.get(item.photoId);
        if (!photo) throw new Error('Expresso photo loader received a photo outside the session.');
        this.load.image(textureKeys.get(item.photoId)!, photo.variants[item.variant]);
      }
    }

    create(): void {
      if (this.assetFailure || !this.assetLedger.isReady) {
        this.showAssetFailure();
        return;
      }
      for (const key of textureKeys.values()) {
        const frame = this.textures.get(key).get();
        if (frame.width <= 0 || frame.height <= 0) {
          this.failAsset('expresso-invalid-photo-texture');
          this.showAssetFailure();
          return;
        }
        this.scope.texture(this.textures, key);
      }
      const requiredVisualKeys = [
        expressoVisualAssets.background.key,
        expressoVisualAssets.train.key,
      ] as const;
      if (
        requiredVisualKeys.some((key) => {
          const frame = this.textures.get(key).get();
          return frame.width <= 0 || frame.height <= 0;
        })
      ) {
        this.failAsset('expresso-invalid-visual-texture');
        this.showAssetFailure();
        return;
      }
      for (const key of requiredVisualKeys) this.scope.texture(this.textures, key);
      this.scope.add(() => {
        for (const asset of Object.values(expressoAudio)) this.cache.audio.remove(asset.key);
      });
      this.audio = new ExpressAudioDirector(this.sound, () => this.time.now, this.soundEnabled);
      this.scope.add(() => this.audio?.destroy());
      this.scope.add(() => this.clearTransientEffects());

      this.createPresentation();
      this.input.topOnly = true;
      const resize = (gameSize: { width: number; height: number }): void =>
        this.layout(createViewportLayout(gameSize.width, gameSize.height));
      this.scope.on(this.scale, Phaser.Scale.Events.RESIZE, resize);
      this.layout(createViewportLayout(this.scale.gameSize.width, this.scale.gameSize.height));

      context.run.ready();
      context.run.start();
      this.journey = startExpressJourney(this.journey).state;
      this.renderJourney();
    }

    private readonly handleFileComplete = (key: string): void => {
      this.assetLedger.markComplete(key);
    };

    private readonly handleFileFailure = (file: { key?: string }): void => {
      if (!file.key) return;
      this.assetLedger.markFailed(file.key);
      const isRequiredVisual =
        file.key === expressoVisualAssets.background.key ||
        file.key === expressoVisualAssets.train.key ||
        [...textureKeys.values()].includes(file.key);
      if (isRequiredVisual) this.failAsset('expresso-required-asset-load-failed');
    };

    private createPresentation(): void {
      this.backgroundArt = this.add
        .image(0, 0, expressoVisualAssets.background.key)
        .setOrigin(0.5)
        .setAlpha(0.94)
        .setDepth(-12);
      this.backgroundVeil = this.add
        .rectangle(0, 0, 1, 1, color.night, 0.3)
        .setOrigin(0)
        .setDepth(-11);
      this.header = this.add
        .rectangle(0, 0, 1, 1, color.pineDeep, 0.82)
        .setOrigin(0)
        .setStrokeStyle(1, color.brass, 0.55)
        .setDepth(-4);
      this.progressText = this.add
        .text(0, 0, '', {
          color: '#fff6df',
          fontFamily: 'Nunito, system-ui, sans-serif',
          fontSize: '14px',
          fontStyle: 'bold',
        })
        .setOrigin(0, 0.5)
        .setDepth(30);
      this.missionCaption = this.add
        .text(0, 0, 'CARTA PARA O EXPRESSO', {
          color: '#f4d37a',
          fontFamily: 'Nunito, system-ui, sans-serif',
          fontSize: '11px',
          fontStyle: 'bold',
          letterSpacing: 1.2,
        })
        .setOrigin(0.5)
        .setDepth(32);
      this.anchorPhoto = this.createPhotoView(8);
      this.coachText = this.add
        .text(0, 0, 'Encontre a foto igual e toque nela.', {
          align: 'center',
          color: '#fff6df',
          fontFamily: 'Nunito, system-ui, sans-serif',
          fontSize: '17px',
          fontStyle: 'bold',
          wordWrap: { width: 340 },
        })
        .setOrigin(0.5)
        .setDepth(34);
      this.railGraphics = this.add.graphics().setDepth(2);
      this.railGlowGraphics = this.add.graphics().setDepth(3);
      this.memoryTree = this.createMemoryTree();
      this.memoryToken = this.add
        .text(0, 0, '✦', {
          color: '#fff6df',
          fontFamily: 'system-ui, sans-serif',
          fontSize: '30px',
          fontStyle: 'bold',
        })
        .setOrigin(0.5)
        .setDepth(41)
        .setVisible(false);
      this.train = this.createTrain();

      for (const stationId of ['station-left', 'station-center', 'station-right'] as const) {
        this.createStation(stationId);
      }
      this.createPauseControls();
      this.completionCard = this.createCompletionCard();
    }

    private createPhotoView(depth: number): ExpressPhotoView {
      const frame = this.add
        .rectangle(0, 0, 1, 1, color.cream, 1)
        .setOrigin(0.5)
        .setStrokeStyle(2, color.brass, 0.94)
        .setDepth(depth);
      const matte = this.add
        .rectangle(0, 0, 1, 1, color.wood, 1)
        .setOrigin(0.5)
        .setStrokeStyle(1, color.cream, 0.9)
        .setDepth(depth + 0.1);
      const photo = this.add
        .image(0, 0, textureKeys.get(context.selectedPhoto.id)!)
        .setOrigin(0.5)
        .setDepth(depth + 0.2);
      attachCrystalControl({
        target: frame,
        graphics: this.scope.resource(this.add.graphics().setDepth(depth + 0.05)),
        events: this.events,
        scope: this.scope,
        reducedMotion: context.preferences?.reducedMotion ?? false,
        panel: true,
      });
      matte.setFillStyle(color.pineDeep).setRounded(8);
      return { frame, matte, photo };
    }

    private createStation(stationId: ExpressStationId): void {
      const shadow = this.add.ellipse(0, 10, 94, 20, color.charcoal, 0.42).setOrigin(0.5);
      const frame = this.add
        .rectangle(0, 0, 1, 1, color.cream, 1)
        .setOrigin(0.5)
        .setStrokeStyle(2, color.brass, 0.92);
      const matte = this.add
        .rectangle(0, 0, 1, 1, color.wood, 1)
        .setOrigin(0.5)
        .setStrokeStyle(1, color.cream, 0.8);
      const photo = this.add.image(0, 0, textureKeys.get(context.selectedPhoto.id)!).setOrigin(0.5);
      const label = this.add
        .text(0, 0, '', {
          align: 'center',
          color: '#fff6df',
          fontFamily: 'Nunito, system-ui, sans-serif',
          fontSize: '10px',
          fontStyle: 'bold',
        })
        .setOrigin(0.5);
      const lock = this.add
        .text(0, 0, '✦', {
          color: '#e7bd66',
          fontFamily: 'system-ui, sans-serif',
          fontSize: '21px',
          fontStyle: 'bold',
        })
        .setOrigin(0.5)
        .setVisible(false);
      const shell = this.add
        .container(0, 0, [shadow, frame, matte, photo, label, lock])
        .setDepth(14);
      const skin = this.scope.resource(this.add.graphics());
      shell.addAt(skin, 2);
      matte.setFillStyle(color.pineDeep).setRounded(6);
      attachCrystalControl({
        target: frame,
        graphics: skin,
        events: this.events,
        scope: this.scope,
        reducedMotion: context.preferences?.reducedMotion ?? false,
        panel: true,
      });
      const zone = this.add
        .rectangle(0, 0, 1, 1, 0x000000, 0.001)
        .setOrigin(0.5)
        .setDepth(45)
        .setInteractive({ useHandCursor: true });
      zone.on(
        Phaser.Input.Events.POINTER_DOWN,
        (
          _pointer: PhaserModule.Input.Pointer,
          _x: number,
          _y: number,
          event: { stopPropagation?: () => void },
        ) => {
          event.stopPropagation?.();
          this.selectStation(stationId);
        },
      );
      this.stationViews.set(stationId, { shell, shadow, frame, matte, photo, label, lock, zone });
    }

    private createMemoryTree(): ExpressMemoryTree {
      const shadow = this.add.ellipse(0, 31, 78, 18, color.charcoal, 0.45).setOrigin(0.5);
      const trunk = this.add.rectangle(0, 12, 13, 38, color.wood, 1).setOrigin(0.5);
      const crownBottom = this.add.circle(0, 2, 26, color.pineDeep, 1);
      const crownMiddle = this.add.circle(-9, -12, 23, color.pine, 1);
      const crownTop = this.add.circle(10, -16, 20, color.pine, 1);
      const snow = this.add.ellipse(0, -24, 38, 10, color.snow, 0.78);
      const star = this.add
        .text(0, -48, '✦', {
          color: '#f4d37a',
          fontFamily: 'system-ui, sans-serif',
          fontSize: '29px',
          fontStyle: 'bold',
        })
        .setOrigin(0.5);
      const ornaments = Array.from({ length: 6 }, (_, index) =>
        this.add
          .circle(
            (index % 2 === 0 ? -1 : 1) * (8 + (index % 3) * 5),
            -4 - index * 4,
            4,
            color.red,
            0,
          )
          .setStrokeStyle(1, color.brass, 0.9),
      );
      const container = this.add
        .container(0, 0, [
          shadow,
          trunk,
          crownBottom,
          crownMiddle,
          crownTop,
          snow,
          star,
          ...ornaments,
        ])
        .setDepth(16);
      return { container, star, ornaments };
    }

    private createTrain(): ExpressTrainView {
      const shadow = this.add.ellipse(0, 18, 102, 16, color.charcoal, 0.38).setOrigin(0.5);
      const sprite = this.add
        .image(0, -7, expressoVisualAssets.train.key)
        .setOrigin(0.5)
        .setDisplaySize(96, 64);
      const headlight = this.add.circle(43, -5, 7, color.cream, 0.12).setOrigin(0.5);
      const rig = this.add.container(0, 0, [shadow, sprite, headlight]);
      const container = this.add
        .container(0, 0, [rig])
        .setDepth(25)
        .setSize(110, 84)
        .setInteractive({ useHandCursor: true });
      container.on(Phaser.Input.Events.POINTER_DOWN, () => {
        if (this.isPaused() || this.journey.phase !== 'awaiting-station') return;
        this.playSound('toyWhistle');
        if (context.preferences?.reducedMotion) return;
        this.tweens.killTweensOf(headlight);
        headlight.setAlpha(0.8);
        this.ownTween({ targets: headlight, alpha: 0.12, duration: 520, ease: 'Sine.easeOut' });
      });
      return {
        container,
        rig,
        headlight,
        shadow,
      };
    }

    private createPauseControls(): void {
      this.soundButton = this.add
        .rectangle(0, 0, 54, expressoDasFotosTuning.secondaryTargetMinCssPx, color.pineDeep, 0.94)
        .setOrigin(0.5)
        .setStrokeStyle(1, color.brass, 0.82)
        .setDepth(60)
        .setInteractive({ useHandCursor: true });
      this.soundLabel = this.add
        .text(0, 0, this.soundEnabled ? 'Som' : 'Mudo', {
          color: '#fff6df',
          fontFamily: 'Nunito, system-ui, sans-serif',
          fontSize: '11px',
          fontStyle: 'bold',
        })
        .setOrigin(0.5)
        .setDepth(61);
      this.soundButton.on(
        Phaser.Input.Events.POINTER_DOWN,
        (
          _pointer: PhaserModule.Input.Pointer,
          _x: number,
          _y: number,
          event: { stopPropagation?: () => void },
        ) => {
          event.stopPropagation?.();
          this.toggleSound();
        },
      );
      this.pauseButton = this.add
        .rectangle(0, 0, 72, expressoDasFotosTuning.secondaryTargetMinCssPx, color.pineDeep, 0.94)
        .setOrigin(0.5)
        .setStrokeStyle(1, color.brass, 0.82)
        .setDepth(60)
        .setInteractive({ useHandCursor: true });
      this.pauseLabel = this.add
        .text(0, 0, 'Pausar', {
          color: '#fff6df',
          fontFamily: 'Nunito, system-ui, sans-serif',
          fontSize: '12px',
          fontStyle: 'bold',
        })
        .setOrigin(0.5)
        .setDepth(61);
      this.pauseButton.on(
        Phaser.Input.Events.POINTER_DOWN,
        (
          _pointer: PhaserModule.Input.Pointer,
          _x: number,
          _y: number,
          event: { stopPropagation?: () => void },
        ) => {
          event.stopPropagation?.();
          this.setManualPaused(!this.manualPaused);
        },
      );
      for (const [target, label, icon] of [
        [
          this.soundButton,
          this.soundLabel,
          () => (this.soundEnabled ? ('sound' as const) : ('muted' as const)),
        ],
        [
          this.pauseButton,
          this.pauseLabel,
          () => (this.manualPaused ? ('play' as const) : ('pause' as const)),
        ],
      ] as const) {
        attachCrystalControl({
          target,
          label,
          icon,
          graphics: this.scope.resource(this.add.graphics().setDepth(60.5)),
          events: this.events,
          scope: this.scope,
          reducedMotion: context.preferences?.reducedMotion ?? false,
        });
      }
      this.pauseOverlay = this.add
        .rectangle(0, 0, 1, 1, color.night, 0.93)
        .setOrigin(0)
        .setDepth(70)
        .setVisible(false)
        .setInteractive({ useHandCursor: true });
      this.pauseText = this.add
        .text(0, 0, ['Pausa de Natal', '', 'Toque para continuar.'].join('\n'), {
          align: 'center',
          color: '#fff6df',
          fontFamily: 'Nunito, system-ui, sans-serif',
          fontSize: '19px',
          fontStyle: 'bold',
          wordWrap: { width: 320 },
        })
        .setOrigin(0.5)
        .setDepth(71)
        .setVisible(false);
      attachCrystalPause({
        backdrop: this.pauseOverlay,
        graphics: this.scope.resource(this.add.graphics().setDepth(70.5)),
        events: this.events,
        scope: this.scope,
      });
      this.pauseOverlay.on(
        Phaser.Input.Events.POINTER_DOWN,
        (
          _pointer: PhaserModule.Input.Pointer,
          _x: number,
          _y: number,
          event: { stopPropagation?: () => void },
        ) => {
          event.stopPropagation?.();
          this.setManualPaused(false);
        },
      );
    }

    private createCompletionCard(): PhaserModule.GameObjects.Container {
      const veil = this.add.rectangle(0, 0, 332, 178, color.pineDeep, 0.96).setOrigin(0.5);
      veil.setStrokeStyle(2, color.brass, 0.94);
      const title = this.add
        .text(0, -22, 'Árvore das Memórias iluminada!', {
          align: 'center',
          color: '#fff6df',
          fontFamily: 'Nunito, system-ui, sans-serif',
          fontSize: '21px',
          fontStyle: 'bold',
          wordWrap: { width: 290 },
        })
        .setOrigin(0.5);
      const body = this.add
        .text(0, 43, 'Cada foto encontrou seu lugar nesta viagem de Natal.', {
          align: 'center',
          color: '#f4d37a',
          fontFamily: 'Nunito, system-ui, sans-serif',
          fontSize: '14px',
          wordWrap: { width: 272 },
        })
        .setOrigin(0.5);
      return this.add.container(0, 0, [veil, title, body]).setDepth(80).setVisible(false);
    }

    private selectStation(stationId: ExpressStationId): void {
      if (this.isPaused() || this.journey.phase !== 'awaiting-station') return;
      const transition = chooseExpressStation(this.journey, stationId);
      this.journey = transition.state;
      if (!transition.accepted) {
        this.gentleWrongStation(stationId);
        return;
      }
      this.disarmIdleAssist();
      void context.haptics.impact('light');
      this.renderJourney();
      this.beginTrackSwitch();
    }

    private beginTrackSwitch(): void {
      if (this.journey.phase !== 'switching-track') return;
      const issued = issueExpressTrackSwitchToken(this.presentation);
      this.presentation = issued.state;
      const stop = getCurrentExpressStop(this.journey);
      const target = stop?.stations[stop.targetStationIndex];
      const view = target ? this.stationViews.get(target.stationId) : undefined;
      if (!view) return;
      this.playSound('tap');
      this.ownTween({
        targets: view.shell,
        scaleX: 1.04,
        scaleY: 1.04,
        duration: expressoDasFotosTuning.trackSwitchDurationMs / 2,
        yoyo: true,
        ease: 'Sine.easeInOut',
        onComplete: () => {
          if (
            !ownsExpressTrackSwitchToken(this.presentation, issued.token) ||
            this.journey.phase !== 'switching-track'
          ) {
            return;
          }
          this.journey = finishExpressTrackSwitch(this.journey).state;
          this.renderJourney();
          this.beginTrainTravel(0);
        },
      });
    }

    private beginTrainTravel(fromProgress: number): void {
      if (this.journey.phase !== 'travelling') return;
      const stop = getCurrentExpressStop(this.journey);
      const rail = stop && this.railPaths ? this.railPaths[stop.railRouteId] : undefined;
      const train = this.train;
      if (!rail || !train) return;
      const issued = issueExpressArrivalToken(this.presentation);
      this.presentation = issued.state;
      this.railProgress = fromProgress;
      this.placeTrainOnRail(rail, fromProgress);
      const travel = planExpressRailTravel(rail.lengthPx * (1 - fromProgress), {
        baseDurationMs: expressoDasFotosTuning.railTravelBaseDurationMs,
        minimumDurationMs: expressoDasFotosTuning.railTravelMinimumDurationMs,
        millisecondsPerPixel: expressoDasFotosTuning.railTravelMillisecondsPerPixel,
      });
      this.beginTravelMotion(train);
      this.emitDepartureSteam(train);
      this.playSound('steamRelease');
      this.playSound('toyWhistle');
      this.audio?.startTravel();
      const tween = this.tweens.addCounter({
        from: fromProgress,
        to: 1,
        duration: travel.durationMs,
        ease: 'Sine.easeInOut',
        onUpdate: (
          _tween: PhaserModule.Tweens.Tween,
          _target: unknown,
          _key: string,
          current: number,
        ) => {
          this.railProgress = current;
          this.placeTrainOnRail(rail, current);
          this.renderTravelRailGlow(rail);
        },
        onComplete: () => {
          this.activeTweens.delete(tween);
          if (
            !ownsExpressArrivalToken(this.presentation, issued.token) ||
            this.journey.phase !== 'travelling'
          ) {
            return;
          }
          this.railProgress = 1;
          this.stopTrainMotion(false);
          this.audio?.stopTravel();
          this.playSound('arrivalBrake');
          this.journey = arriveAtExpressStation(this.journey).state;
          this.renderJourney();
          this.celebrateArrivalStation();
          this.beginDelivery();
        },
      });
      this.trackTween(tween);
    }

    private beginDelivery(): void {
      if (this.journey.phase !== 'delivering' || !this.layoutPlan || !this.memoryToken) return;
      const stop = getCurrentExpressStop(this.journey);
      const target = stop?.stations[stop.targetStationIndex];
      const stationBounds = target ? this.layoutPlan.stations[target.stationId] : undefined;
      const tree = this.memoryTree;
      if (!stationBounds || !tree) return;
      const issued = issueExpressCollectionToken(this.presentation);
      this.presentation = issued.state;
      this.memoryToken
        .setPosition(
          stationBounds.x + stationBounds.width / 2,
          stationBounds.y + stationBounds.height / 2,
        )
        .setScale(0.7)
        .setAlpha(1)
        .setVisible(true);
      this.ownTween({
        targets: this.memoryToken,
        x: tree.container.x,
        y: tree.container.y - 12,
        scale: 1.2,
        duration: expressoDasFotosTuning.deliveryDurationMs,
        ease: 'Cubic.easeInOut',
        onComplete: () => {
          if (
            !ownsExpressCollectionToken(this.presentation, issued.token) ||
            this.journey.phase !== 'delivering'
          ) {
            return;
          }
          this.memoryToken?.setVisible(false).setScale(1);
          this.lightNextTreeMemory();
          this.playSound('correct');
          this.journey = deliverExpressMemory(this.journey).state;
          context.run.interactionSettled();
          this.railProgress = 0;
          if (this.journey.phase === 'completed') {
            this.showVictory();
            return;
          }
          this.train?.container.setPosition(
            this.layoutPlan!.trainHome.x,
            this.layoutPlan!.trainHome.y,
          );
          this.renderJourney();
        },
      });
    }

    private placeTrainOnRail(rail: RuntimeRailPath, progress: number): void {
      const train = this.train;
      if (!train) return;
      const point = rail.path.getPoint(progress, this.pathPoint);
      const tangent = rail.path.getTangent(progress, this.pathTangent);
      train.container.setPosition(point.x, point.y);
      /**
       * The premium locomotive is intentionally a side-view illustration.
       * A slight banking response sells motion without turning the artwork
       * vertical on a portrait rail, where that would read as a broken train.
       */
      train.container.setAngle(Math.max(-14, Math.min(14, tangent.x * 18)));
    }

    private beginTravelMotion(train: ExpressTrainView): void {
      this.stopTrainMotion(true);
      train.headlight.setAlpha(1);
      this.ownTrainTween({
        targets: train.rig,
        y: -3,
        duration: 180,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
      this.ownTrainTween({
        targets: train.shadow,
        scaleX: 0.9,
        alpha: 0.22,
        duration: 190,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }

    /**
     * A compact burst gives the locomotive a physical departure without a
     * permanent particle emitter. The puffs live only in the lower rail area,
     * never on top of a client's photo surface.
     */
    private emitDepartureSteam(train: ExpressTrainView): void {
      if (context.preferences?.reducedMotion) return;
      const puffs = [
        { dx: -30, dy: -30, radius: 7, delay: 0 },
        { dx: -38, dy: -38, radius: 9, delay: 60 },
        { dx: -48, dy: -46, radius: 11, delay: 120 },
      ] as const;
      for (const puffPlan of puffs) {
        const puff = this.ownTransientEffect(
          this.add
            .circle(
              train.container.x + puffPlan.dx,
              train.container.y + puffPlan.dy,
              puffPlan.radius,
              color.snow,
              0.46,
            )
            .setDepth(24),
        );
        this.ownTween({
          targets: puff,
          x: puff.x - 10,
          y: puff.y - 18,
          scale: 1.5,
          alpha: 0,
          delay: puffPlan.delay,
          duration: 340,
          ease: 'Sine.easeOut',
          onComplete: () => this.disposeTransientEffect(puff),
        });
      }
    }

    private stopTrainMotion(reset: boolean): void {
      for (const tween of this.trainMotionTweens) {
        tween.stop();
        this.activeTweens.delete(tween);
      }
      this.trainMotionTweens.clear();
      if (!reset || !this.train) return;
      this.train.rig.setPosition(0, 0).setAngle(0).setScale(1);
      this.train.shadow.setScale(1).setAlpha(0.42);
    }

    private celebrateArrivalStation(): void {
      const stop = getCurrentExpressStop(this.journey);
      const station = stop?.stations[stop.targetStationIndex];
      const view = station ? this.stationViews.get(station.stationId) : undefined;
      if (!view) return;
      view.frame.setStrokeStyle(3, color.railHighlight, 1);
      if (context.preferences?.reducedMotion) return;
      this.ownTween({
        targets: view.shell,
        scaleX: 1.035,
        scaleY: 1.035,
        duration: expressoDasFotosTuning.arrivalSettleDurationMs,
        yoyo: true,
        ease: 'Sine.easeInOut',
        onComplete: () => view.frame.setStrokeStyle(2, color.brass, 0.92),
      });
    }

    private lightNextTreeMemory(): void {
      const tree = this.memoryTree;
      if (!tree) return;
      const index = this.journey.collectedStopIds.length;
      const ornament = tree.ornaments[Math.min(index, tree.ornaments.length - 1)];
      if (!ornament) return;
      ornament
        .setAlpha(1)
        .setScale(0.6)
        .setFillStyle(index % 2 === 0 ? color.redLight : color.brass);
      this.ownTween({
        targets: ornament,
        scale: 1,
        duration: expressoDasFotosTuning.arrivalSettleDurationMs,
        ease: 'Back.easeOut',
      });
      this.emitTreeSparkles(tree, index);
      if (index + 1 >= this.journey.route.stops.length) {
        this.ownTween({
          targets: tree.star,
          scale: 1.22,
          duration: 260,
          yoyo: true,
          ease: 'Sine.easeInOut',
        });
      }
    }

    /** Short, destination-only glints make each collected memory feel placed. */
    private emitTreeSparkles(tree: ExpressMemoryTree, memoryIndex: number): void {
      if (context.preferences?.reducedMotion) return;
      const sparkles = [
        { dx: -27, dy: -19, delay: 0, color: '#fff6df' },
        { dx: 22, dy: -31, delay: 55, color: '#f4d37a' },
        { dx: -8, dy: -54, delay: 110, color: '#df6570' },
      ] as const;
      for (const sparklePlan of sparkles) {
        const sparkle = this.ownTransientEffect(
          this.add
            .text(tree.container.x + sparklePlan.dx, tree.container.y + sparklePlan.dy, '✦', {
              color: sparklePlan.color,
              fontFamily: 'system-ui, sans-serif',
              fontSize: memoryIndex % 2 === 0 ? '16px' : '14px',
              fontStyle: 'bold',
            })
            .setOrigin(0.5)
            .setDepth(42)
            .setScale(0.55)
            .setAlpha(0),
        );
        this.ownTween({
          targets: sparkle,
          y: sparkle.y - 13,
          scale: 1,
          alpha: 1,
          delay: sparklePlan.delay,
          duration: 150,
          yoyo: true,
          hold: 80,
          ease: 'Sine.easeOut',
          onComplete: () => this.disposeTransientEffect(sparkle),
        });
      }
    }

    private gentleWrongStation(stationId: ExpressStationId): void {
      const station = this.stationViews.get(stationId);
      if (!station) return;
      this.playSound('wrong');
      this.ownTween({
        targets: station.shell,
        x: station.shell.x + 7,
        duration: expressoDasFotosTuning.feedbackDurationMs / 2,
        yoyo: true,
        ease: 'Sine.easeInOut',
      });
      this.coachText?.setText('Quase! Procure a mesma foto da carta.');
      this.schedule(expressoDasFotosTuning.feedbackDurationMs * 4, () => {
        if (this.journey.phase === 'awaiting-station') {
          this.coachText?.setText('Encontre a foto igual e toque nela.');
        }
      });
    }

    private renderJourney(): void {
      const layout = this.layoutPlan;
      if (!layout) return;
      const stop = getCurrentExpressStop(this.journey);
      const targetPhoto = stop ? this.photosById.get(stop.targetPhotoId) : context.selectedPhoto;
      if (targetPhoto) this.layoutPhoto(this.anchorPhoto, targetPhoto, layout.mission);
      this.renderStations(stop?.stations ?? []);
      this.renderRails(stop?.railRouteId);
      const progress = getExpressProgress(this.journey);
      this.progressText?.setText(
        'Lembranças ' + progress.collectedStops + ' de ' + progress.totalStops,
      );
      this.missionCaption?.setText(
        this.journey.phase === 'completed' ? 'VIAGEM CONCLUÍDA' : 'ACHE A FOTO IGUAL',
      );
      this.coachText?.setVisible(this.journey.phase !== 'completed');
      if (this.journey.phase === 'awaiting-station') {
        this.coachText?.setText('Encontre a foto igual e toque nela.');
      } else if (this.journey.phase === 'switching-track') {
        this.coachText?.setText('O trilho está sendo preparado...');
      } else if (this.journey.phase === 'travelling') {
        this.coachText?.setText('O expresso está a caminho!');
      } else if (this.journey.phase === 'delivering') {
        this.coachText?.setText('Uma nova lembrança vai iluminar a árvore.');
      }
      if (this.journey.phase === 'awaiting-station') {
        this.train?.container.setAngle(0);
      }
      this.armIdleAssist();
    }

    private renderStations(candidates: readonly ExpressStationCandidate[]): void {
      const hint = getExpressHint(this.journey);
      for (const [stationId, view] of this.stationViews) {
        const candidate = candidates.find((entry) => entry.stationId === stationId);
        const available = candidate?.availability === 'available' && Boolean(candidate.photoId);
        const isHinted = hint?.stationId === stationId && this.idleAssistActive;
        view.photo.setVisible(available);
        view.lock.setVisible(!available);
        view.label.setText(available ? '' : 'Em descanso');
        view.shell.setAlpha(available ? 1 : 0.55);
        view.frame.setStrokeStyle(
          isHinted ? 4 : 2,
          isHinted ? color.railHighlight : color.brass,
          1,
        );
        view.matte.setStrokeStyle(isHinted ? 2 : 1, color.cream, isHinted ? 1 : 0.78);
        view.zone.setVisible(
          available && !this.isPaused() && this.journey.phase === 'awaiting-station',
        );
        if (available && candidate?.photoId && this.layoutPlan) {
          const photo = this.photosById.get(candidate.photoId);
          if (photo) this.layoutStationPhoto(view, photo, this.layoutPlan.stations[stationId]);
        }
      }
    }

    private renderRails(activeRailId?: ExpressRailRouteId): void {
      const rails = this.railPaths;
      const base = this.railGraphics;
      const glow = this.railGlowGraphics;
      if (!rails || !base || !glow) return;
      base.clear();
      glow.clear();
      for (const rail of Object.values(rails)) {
        base.lineStyle(7, color.rail, 0.82);
        rail.path.draw(base, 48);
        base.lineStyle(2, color.brass, 0.78);
        rail.path.draw(base, 48);
        for (const point of rail.path.getSpacedPoints(12)) {
          base.fillStyle(color.wood, 0.88);
          base.fillCircle(point.x, point.y, 3);
        }
      }
      if (activeRailId && this.journey.phase === 'switching-track') {
        const activeRail = rails[activeRailId];
        glow.lineStyle(10, color.railHighlight, 0.46);
        activeRail.path.draw(glow, 56);
        glow.lineStyle(3, color.cream, 0.88);
        activeRail.path.draw(glow, 56);
      }
      if (activeRailId && this.journey.phase === 'travelling') {
        this.renderTravelRailGlow(rails[activeRailId]);
      }
    }

    /**
     * The selected route is not a permanent neon border. A short travelling
     * glint follows the same progress value that places the locomotive, so the
     * rail itself explains where the train is going.
     */
    private renderTravelRailGlow(rail: RuntimeRailPath): void {
      const glow = this.railGlowGraphics;
      if (!glow) return;
      glow.clear();
      if (context.preferences?.reducedMotion) {
        glow.lineStyle(8, color.railHighlight, 0.32);
        rail.path.draw(glow, 48);
        return;
      }
      const span = 0.09;
      const start = Math.max(0, this.railProgress - span);
      const end = Math.min(1, this.railProgress + span * 0.28);
      const pointCount = 8;
      const points = Array.from({ length: pointCount }, (_, index) =>
        rail.path.getPoint(start + ((end - start) * index) / (pointCount - 1)),
      );
      const first = points[0];
      const head = points[points.length - 1];
      if (!first || !head) return;
      glow.lineStyle(11, color.railHighlight, 0.35);
      glow.beginPath();
      glow.moveTo(first.x, first.y);
      for (const point of points.slice(1)) glow.lineTo(point.x, point.y);
      glow.strokePath();
      glow.fillStyle(color.cream, 0.72);
      glow.fillCircle(head.x, head.y, 5);
    }

    private layoutPhoto(
      view: ExpressPhotoView | undefined,
      photo: Photo,
      bounds: { x: number; y: number; width: number; height: number },
    ): void {
      if (!view) return;
      const surface = createPhotoSurface(photo, bounds, 'contain');
      const frameWidth = surface.photo.width + 16;
      const frameHeight = surface.photo.height + 16;
      view.frame
        .setPosition(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2)
        .setSize(frameWidth, frameHeight);
      view.matte
        .setPosition(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2)
        .setSize(surface.photo.width + 6, surface.photo.height + 6);
      view.photo
        .setTexture(textureKeys.get(photo.id)!)
        .setPosition(
          surface.photo.x + surface.photo.width / 2,
          surface.photo.y + surface.photo.height / 2,
        )
        .setDisplaySize(surface.photo.width, surface.photo.height)
        .setVisible(true);
    }

    private layoutStationPhoto(
      view: ExpressStationView,
      photo: Photo,
      hitBounds: { x: number; y: number; width: number; height: number },
    ): void {
      const shellX = hitBounds.x + hitBounds.width / 2;
      const shellY = hitBounds.y + hitBounds.height / 2;
      const frameWidth = Math.max(66, hitBounds.width - 8);
      const frameHeight = Math.max(82, hitBounds.height - 10);
      view.shell.setPosition(shellX, shellY);
      view.shadow.setPosition(0, frameHeight / 2 - 1).setSize(frameWidth * 0.78, 15);
      view.frame.setPosition(0, 0).setSize(frameWidth, frameHeight);
      view.matte.setPosition(0, -4).setSize(frameWidth - 10, frameHeight - 23);
      const localFrame = {
        x: -(frameWidth - 16) / 2,
        y: -(frameHeight - 29) / 2 - 4,
        width: frameWidth - 16,
        height: frameHeight - 29,
      };
      const surface = createPhotoSurface(photo, localFrame, 'contain');
      view.photo
        .setTexture(textureKeys.get(photo.id)!)
        .setPosition(
          surface.photo.x + surface.photo.width / 2,
          surface.photo.y + surface.photo.height / 2,
        )
        .setDisplaySize(surface.photo.width, surface.photo.height);
      view.label.setPosition(0, frameHeight / 2 - 10);
      view.lock.setPosition(0, -4);
      view.zone
        .setPosition(shellX, shellY)
        .setSize(
          Math.max(expressoDasFotosTuning.primaryTargetMinCssPx, hitBounds.width),
          Math.max(expressoDasFotosTuning.primaryTargetMinCssPx, hitBounds.height),
        );
    }

    private layout(viewport: GameViewport): void {
      const resumePhase = this.journey.phase;
      const needsResume =
        !this.isPaused() &&
        (resumePhase === 'switching-track' ||
          resumePhase === 'travelling' ||
          resumePhase === 'delivering');
      if (needsResume) this.cancelPresentation();
      const layout = planExpressLayout(viewport);
      this.layoutPlan = layout;
      this.railPaths = createRuntimeRailPaths(Phaser, layout);
      this.layoutBackgroundArt(viewport);
      this.backgroundVeil?.setSize(viewport.width, viewport.height);
      this.header
        ?.setPosition(0, 0)
        .setSize(viewport.width, layout.header.y + layout.header.height + 9);
      this.progressText?.setPosition(layout.header.x, layout.header.y + layout.header.height / 2);
      this.soundButton?.setPosition(
        viewport.width - 119,
        layout.header.y + layout.header.height / 2,
      );
      this.soundLabel?.setPosition(
        viewport.width - 119,
        layout.header.y + layout.header.height / 2,
      );
      this.pauseButton?.setPosition(
        viewport.width - 51,
        layout.header.y + layout.header.height / 2,
      );
      this.pauseLabel?.setPosition(viewport.width - 51, layout.header.y + layout.header.height / 2);
      this.missionCaption?.setPosition(viewport.width / 2, layout.mission.y - 18);
      const tree = this.memoryTree;
      if (tree) {
        tree.container.setPosition(
          layout.memoryTree.x + layout.memoryTree.width / 2,
          layout.memoryTree.y + layout.memoryTree.height / 2,
        );
      }
      for (const [stationId, station] of this.stationViews) {
        const bounds = layout.stations[stationId];
        station.shell.setPosition(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
        station.zone
          .setPosition(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2)
          .setSize(bounds.width, bounds.height);
      }
      if (this.journey.phase === 'awaiting-station' || this.journey.phase === 'ready') {
        this.train?.container.setPosition(layout.trainHome.x, layout.trainHome.y).setAngle(0);
      }
      this.coachText?.setPosition(
        viewport.width / 2,
        Math.min(viewport.height - viewport.safeBottom - 18, layout.memoryTree.y - 28),
      );
      this.coachText?.setWordWrapWidth(Math.min(340, viewport.width - 36));
      this.pauseOverlay?.setSize(viewport.width, viewport.height);
      this.pauseText?.setPosition(viewport.width / 2, viewport.height / 2 - 23);
      this.completionCard?.setPosition(viewport.width / 2, viewport.height / 2);
      this.renderJourney();
      if (needsResume) {
        if (resumePhase === 'switching-track') this.beginTrackSwitch();
        if (resumePhase === 'travelling') this.beginTrainTravel(this.railProgress);
        if (resumePhase === 'delivering') this.beginDelivery();
      }
    }

    private layoutBackgroundArt(viewport: GameViewport): void {
      const art = this.backgroundArt;
      if (!art) return;
      const frame = this.textures.get(expressoVisualAssets.background.key).get();
      const scale = Math.max(viewport.width / frame.width, viewport.height / frame.height);
      art.setPosition(viewport.width / 2, viewport.height / 2).setScale(scale);
    }

    private armIdleAssist(): void {
      if (
        this.idleAssistActive ||
        this.idleAssistTimer ||
        this.isPaused() ||
        this.journey.phase !== 'awaiting-station'
      ) {
        return;
      }
      this.idleAssistTimer = this.schedule(expressoDasFotosTuning.idleAssistDelayMs, () => {
        this.idleAssistTimer = undefined;
        if (this.isPaused() || this.journey.phase !== 'awaiting-station') return;
        this.idleAssistActive = true;
        this.coachText?.setText('Veja a carta de novo: qual foto é igual?');
        this.renderStations(getCurrentExpressStop(this.journey)?.stations ?? []);
        const hint = getExpressHint(this.journey);
        const view = hint ? this.stationViews.get(hint.stationId) : undefined;
        if (!view) return;
        this.ownTween({
          targets: view.shell,
          scaleX: 1.04,
          scaleY: 1.04,
          duration: expressoDasFotosTuning.hintPulseDurationMs / 2,
          yoyo: true,
          repeat: 1,
          ease: 'Sine.easeInOut',
        });
      });
    }

    private disarmIdleAssist(): void {
      this.idleAssistTimer?.remove();
      if (this.idleAssistTimer) this.activeTimers.delete(this.idleAssistTimer);
      this.idleAssistTimer = undefined;
      this.idleAssistActive = false;
    }

    private schedule(delay: number, callback: () => void): PhaserModule.Time.TimerEvent {
      const timer = this.time.delayedCall(delay, () => {
        this.activeTimers.delete(timer);
        callback();
      });
      this.activeTimers.add(timer);
      this.scope.resource(timer);
      return timer;
    }

    private ownTween(
      config: PhaserModule.Types.Tweens.TweenBuilderConfig,
    ): PhaserModule.Tweens.Tween {
      const tween = this.tweens.add(config);
      this.trackTween(tween);
      return tween;
    }

    private ownTrainTween(
      config: PhaserModule.Types.Tweens.TweenBuilderConfig,
    ): PhaserModule.Tweens.Tween {
      const tween = this.ownTween(config);
      this.trainMotionTweens.add(tween);
      tween.once(Phaser.Tweens.Events.TWEEN_COMPLETE, () => this.trainMotionTweens.delete(tween));
      return tween;
    }

    private ownTransientEffect<T extends ExpressTransientEffect>(effect: T): T {
      this.activeTransientEffects.add(effect);
      return effect;
    }

    private disposeTransientEffect(effect: ExpressTransientEffect): void {
      this.activeTransientEffects.delete(effect);
      effect.destroy();
    }

    private clearTransientEffects(): void {
      for (const effect of this.activeTransientEffects) effect.destroy();
      this.activeTransientEffects.clear();
    }

    private trackTween(tween: PhaserModule.Tweens.Tween): void {
      this.activeTweens.add(tween);
      tween.once(Phaser.Tweens.Events.TWEEN_COMPLETE, () => this.activeTweens.delete(tween));
      this.scope.resource(tween);
    }

    private setManualPaused(paused: boolean): void {
      if (this.manualPaused === paused) return;
      this.manualPaused = paused;
      this.syncPauseState();
      this.playSound('tap');
    }

    private toggleSound(): void {
      this.soundEnabled = !this.soundEnabled;
      context.run.soundChanged?.(this.soundEnabled);
      this.audio?.setSoundEnabled(this.soundEnabled);
      if (this.soundEnabled) {
        this.playSound('tap');
        if (this.journey.phase === 'travelling') this.audio?.startTravel();
      }
      this.soundLabel?.setText(this.soundEnabled ? 'Som' : 'Mudo');
    }

    private playSound(cue: Exclude<keyof typeof expressoAudio, 'railRoll'>): void {
      this.audio?.play(cue);
    }

    private syncPauseState(): void {
      const paused = this.isPaused();
      if (this.journey.phase === 'completed' || paused === (this.journey.phase === 'paused')) {
        this.pauseOverlay?.setVisible(paused);
        this.pauseText?.setVisible(paused);
        this.pauseLabel?.setText(paused ? 'Jogar' : 'Pausar');
        return;
      }
      if (paused) {
        const transition = pauseExpressJourney(this.journey);
        if (!transition.accepted) return;
        this.journey = transition.state;
        this.cancelPresentation();
        context.run.pause();
      } else {
        const transition = resumeExpressJourney(this.journey);
        if (!transition.accepted) return;
        this.journey = transition.state;
        context.run.resume();
      }
      this.pauseOverlay?.setVisible(paused);
      this.pauseText?.setVisible(paused);
      this.pauseLabel?.setText(paused ? 'Jogar' : 'Pausar');
      this.renderJourney();
      if (!paused && this.journey.phase === 'switching-track') this.beginTrackSwitch();
      if (!paused && this.journey.phase === 'travelling') this.beginTrainTravel(this.railProgress);
      if (!paused && this.journey.phase === 'delivering') this.beginDelivery();
    }

    private isPaused(): boolean {
      return this.manualPaused || this.visibilityPaused;
    }

    private cancelPresentation(): void {
      this.presentation = invalidateExpressPresentation(this.presentation);
      this.audio?.pauseTravel();
      for (const tween of this.activeTweens) tween.stop();
      this.activeTweens.clear();
      this.clearTransientEffects();
      this.trainMotionTweens.clear();
      for (const timer of this.activeTimers) timer.remove();
      this.activeTimers.clear();
      this.idleAssistTimer = undefined;
      this.idleAssistActive = false;
    }

    private showVictory(): void {
      this.playSound('celebrate');
      this.cancelPresentation();
      this.coachText?.setVisible(false);
      this.completionCard?.setVisible(true);
      this.pauseButton?.setVisible(false).disableInteractive();
      this.pauseLabel?.setVisible(false);
      this.soundButton?.setVisible(false).disableInteractive();
      this.soundLabel?.setVisible(false);
      context.run.complete();
    }

    private failAsset(reason: string): void {
      if (this.assetFailure) return;
      this.assetFailure = true;
      context.run.assetFailed(reason);
    }

    private showAssetFailure(): void {
      this.add
        .text(
          24,
          24,
          'Não foi possível preparar as fotos desta viagem.\\nVolte e tente novamente.',
          {
            color: '#fff6df',
            fontFamily: 'system-ui, sans-serif',
            fontSize: '18px',
            wordWrap: { width: 320 },
          },
        )
        .setDepth(2);
    }
  }

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    pixelArt: false,
    antialias: true,
    backgroundColor: color.night,
    input: { activePointers: 1 },
    loader: { maxRetries: 1, timeout: 8_000 },
    scale: { mode: Phaser.Scale.RESIZE, parent, width: '100%', height: '100%' },
    scene: ExpressoDasFotosScene,
  });
  let destroyPromise: Promise<void> | undefined;
  const pauseRun = (): void => setVisibilityPaused?.(true);
  const resumeRun = (): void => setVisibilityPaused?.(false);
  game.events.on(Phaser.Core.Events.HIDDEN, pauseRun);
  game.events.on(Phaser.Core.Events.BLUR, pauseRun);
  game.events.on(Phaser.Core.Events.VISIBLE, resumeRun);
  game.events.on(Phaser.Core.Events.FOCUS, resumeRun);

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

export const expressoDasFotosGameModule: GameModule<typeof PhaserModule, HTMLElement> = {
  definition: expressoDasFotosDefinition,
  create: createExpressoDasFotosGame,
};
