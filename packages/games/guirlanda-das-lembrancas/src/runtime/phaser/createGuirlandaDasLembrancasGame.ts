import { SceneScope } from '@christmas-games/platform';
import type {
  GameBridge,
  GameContext,
  GameController,
  GameModule,
  Photo,
} from '@christmas-games/platform';
import type * as PhaserModule from 'phaser';
import { attachCrystalControl, attachCrystalPause } from '@christmas-games/theme';
import {
  createGuirlandaDasLembrancasState,
  getCurrentGuirlandaPhotoId,
  placeCurrentGuirlandaPhoto,
  selectCurrentGuirlandaPhoto,
} from '../../domain/GuirlandaDasLembrancasState.js';
import { guirlandaDasLembrancasDefinition } from '../../definition.js';
import { guirlandaDasLembrancasTuning } from '../../tuning.js';
import { GarlandAudioDirector, garlandAudio } from './audioAssets.js';
import { garlandVisualAssets } from './visualAssets.js';
import { createGarlandLayout, garlandFrameDimensions } from './GarlandLayout.js';
import type { GarlandLayout } from './GarlandLayout.js';
import { createGarlandPhotoFrame, layoutGarlandPhotoFrame } from './GarlandPhotoFrame.js';
import type { PhotoFrameView } from './GarlandPhotoFrame.js';
import { GarlandMotionDirector, garlandMotion } from './GarlandMotionDirector.js';
import { GarlandAmbientDirector } from './GarlandAmbientDirector.js';

const colors = {
  amber: 0xe9b85d,
  amberLight: 0xffe0a2,
  charcoal: 0x08111d,
  cream: 0xfff5df,
  cranberry: 0x6d1f2b,
  goldDark: 0x9d6b26,
  night: 0x07111e,
  pine: 0x11372e,
  walnut: 0x392419,
} as const;

const photoTextureKey = (photoId: string) => `guirlanda-session-photo-${photoId}`;
const sparkleTextureKey = 'guirlanda-sparkle-dot';

interface GarlandSlotView {
  readonly glow: PhaserModule.GameObjects.Graphics;
  readonly hook: PhaserModule.GameObjects.Image;
  readonly zone: PhaserModule.GameObjects.Zone;
  readonly frame: PhotoFrameView;
  x: number;
  y: number;
}

interface ProgressLightView {
  readonly core: PhaserModule.GameObjects.Arc;
  readonly glow: PhaserModule.GameObjects.Arc;
  readonly ring: PhaserModule.GameObjects.Arc;
}

/** A calm, photo-first construction game: the domain decides; Phaser makes it tactile. */
export function createGuirlandaDasLembrancasGame(
  Phaser: typeof PhaserModule,
  parent: HTMLElement,
  context: GameContext,
  _bridge: GameBridge,
): GameController {
  let setVisibilityPaused: ((paused: boolean) => void) | undefined;
  const photos = selectRunPhotos(context.session.photos, context.selectedPhoto);
  const photosById = new Map(photos.map((photo) => [photo.id, photo]));
  const textureKeys = new Map(photos.map((photo) => [photo.id, photoTextureKey(photo.id)]));

  class GuirlandaDasLembrancasScene extends Phaser.Scene {
    private audio?: GarlandAudioDirector;
    private ambient?: GarlandAmbientDirector;
    private background?: PhaserModule.GameObjects.Image;
    private backgroundVeil?: PhaserModule.GameObjects.Rectangle;
    private coachText?: PhaserModule.GameObjects.Text;
    private completionText?: PhaserModule.GameObjects.Text;
    private currentFrame?: PhotoFrameView;
    private currentPhotoId: string | undefined;
    private currentZone?: PhaserModule.GameObjects.Zone;
    private dragging = false;
    private feedbackText?: PhaserModule.GameObjects.Text;
    private frameDimensions = { width: 1, height: 1 };
    private giftBox?: PhaserModule.GameObjects.Image;
    private warmth?: PhaserModule.GameObjects.Rectangle;
    private boxLight?: PhaserModule.GameObjects.Ellipse;
    private motion?: GarlandMotionDirector;
    private busy = false;
    private celebrating = false;
    private completionPublished = false;
    private arriving = false;
    private hintTimer: PhaserModule.Time.TimerEvent | undefined;
    private innerWell?: PhaserModule.GameObjects.Ellipse;
    private layoutPlan?: GarlandLayout;
    private manualPaused = false;
    private pauseButton?: PhaserModule.GameObjects.Container;
    private pausePrompt?: PhaserModule.GameObjects.Text;
    private pauseOverlay?: PhaserModule.GameObjects.Rectangle;
    private pauseTitle?: PhaserModule.GameObjects.Text;
    private presentationEpoch = 0;
    private readonly progressLights: ProgressLightView[] = [];
    private runtimePaused = false;
    private readonly scope = new SceneScope();
    private soundButton?: PhaserModule.GameObjects.Container;
    private soundEnabled = context.preferences?.soundEnabled ?? true;
    private sparkleEmitter?: PhaserModule.GameObjects.Particles.ParticleEmitter;
    private state = createGuirlandaDasLembrancasState(photos.map((photo) => photo.id));
    private readonly slots: GarlandSlotView[] = [];
    private stageShadow?: PhaserModule.GameObjects.Ellipse;
    private readonly transientEffects = new Set<PhaserModule.GameObjects.GameObject>();
    private visibilityPaused = false;
    private viewerBackdrop?: PhaserModule.GameObjects.Rectangle;
    private viewerClose?: PhaserModule.GameObjects.Container;
    private viewerFrame?: PhotoFrameView;
    private viewerLabel?: PhaserModule.GameObjects.Text;
    private viewingMemory = false;
    private viewedPhotoId: string | undefined;
    private wreath?: PhaserModule.GameObjects.Image;

    constructor() {
      super('GuirlandaDasLembrancasScene');
    }

    init(): void {
      setVisibilityPaused = this.setVisibilityPausedFromGame;
      context.run.open();
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scope.dispose());
      this.scope.add(() => {
        if (setVisibilityPaused === this.setVisibilityPausedFromGame)
          setVisibilityPaused = undefined;
      });
      this.scope.add(() => this.cancelPresentation());
    }

    preload(): void {
      this.load.image(garlandVisualAssets.background.key, garlandVisualAssets.background.url);
      this.load.image(garlandVisualAssets.wreath.key, garlandVisualAssets.wreath.url);
      this.load.image(garlandVisualAssets.framePortrait.key, garlandVisualAssets.framePortrait.url);
      this.load.image(
        garlandVisualAssets.frameLandscape.key,
        garlandVisualAssets.frameLandscape.url,
      );
      this.load.image(garlandVisualAssets.memoryBox.key, garlandVisualAssets.memoryBox.url);
      this.load.image(garlandVisualAssets.hook.key, garlandVisualAssets.hook.url);
      for (const asset of Object.values(garlandAudio)) {
        this.load.audio(asset.key, [...asset.urls], { instances: 2 });
      }
      for (const photo of photos) this.load.image(textureKeys.get(photo.id)!, photo.variants.game);
    }

    create(): void {
      const requiredTextureKeys = [
        garlandVisualAssets.background.key,
        garlandVisualAssets.wreath.key,
        garlandVisualAssets.framePortrait.key,
        garlandVisualAssets.frameLandscape.key,
        garlandVisualAssets.memoryBox.key,
        garlandVisualAssets.hook.key,
        ...textureKeys.values(),
      ];
      if (requiredTextureKeys.some((key) => !this.textures.exists(key))) {
        this.showAssetFailure();
        return;
      }
      for (const key of requiredTextureKeys) this.scope.texture(this.textures, key);
      this.scope.add(() => {
        for (const asset of Object.values(garlandAudio)) this.cache.audio.remove(asset.key);
      });
      this.audio = new GarlandAudioDirector(
        this.sound,
        this.cache.audio,
        () => this.time.now,
        this.soundEnabled,
      );
      this.scope.add(() => this.audio?.destroy());
      this.motion = new GarlandMotionDirector(
        this.tweens,
        context.preferences?.reducedMotion ?? false,
      );
      this.input.topOnly = true;
      this.input.dragDistanceThreshold = guirlandaDasLembrancasTuning.dragDistanceThresholdPx;
      this.input.dragTimeThreshold = guirlandaDasLembrancasTuning.dragTimeThresholdMs;

      if (context.quality !== 'LOW' && !context.preferences?.reducedMotion)
        this.createSparkleTexture();
      this.createPresentation();
      if (context.quality !== 'LOW' && !context.preferences?.reducedMotion && this.boxLight) {
        this.ambient = new GarlandAmbientDirector(this, this.boxLight);
        this.scope.add(() => this.ambient?.destroy());
      }
      const resize = (gameSize: { width: number; height: number }): void => {
        this.cancelPresentation();
        this.layout(gameSize.width, gameSize.height);
        this.renderStableState();
      };
      this.scope.on(this.scale, Phaser.Scale.Events.RESIZE, resize);
      this.layout(this.scale.gameSize.width, this.scale.gameSize.height);
      context.run.ready();
      context.run.start();
      this.renderStableState();
      this.deliverCurrentPhoto();
    }

    private createSparkleTexture(): void {
      const graphics = this.add.graphics().setVisible(false);
      graphics.fillStyle(colors.amber, 0.14).fillCircle(12, 12, 11);
      graphics.fillStyle(colors.amberLight, 0.95).fillTriangle(12, 0, 9, 12, 15, 12);
      graphics.fillTriangle(12, 24, 9, 12, 15, 12);
      graphics.fillTriangle(0, 12, 12, 9, 12, 15);
      graphics.fillTriangle(24, 12, 12, 9, 12, 15);
      graphics.fillStyle(colors.cream, 1).fillCircle(12, 12, 2);
      graphics.generateTexture(sparkleTextureKey, 24, 24);
      this.scope.texture(this.textures, sparkleTextureKey);
      this.scope.add(() => graphics.destroy());
      this.sparkleEmitter = this.add.particles(0, 0, sparkleTextureKey, {
        alpha: { start: 0.95, end: 0 },
        emitting: false,
        lifespan: 420,
        scale: { start: 0.58, end: 0 },
        speed: { min: 45, max: 126 },
      });
      this.sparkleEmitter.setDepth(8);
      this.scope.resource(this.sparkleEmitter);
    }

    private createProgressLights(): void {
      for (let index = 0; index < 24; index += 1) {
        const glow = this.add.circle(0, 0, 11, colors.amber, 0).setDepth(5);
        const ring = this.add.circle(0, 0, 3.5, colors.goldDark, 0.9).setDepth(6);
        const core = this.add.circle(0, 0, 1.8, colors.amberLight, 0.25).setDepth(7);
        this.progressLights.push({ core, glow, ring });
      }
    }

    private createPresentation(): void {
      this.background = this.add
        .image(0, 0, garlandVisualAssets.background.key)
        .setOrigin(0.5)
        .setDepth(-20);
      this.backgroundVeil = this.add
        .rectangle(0, 0, 1, 1, colors.night, 0.32)
        .setOrigin(0)
        .setDepth(-19);
      this.warmth = this.add.rectangle(0, 0, 1, 1, colors.amber, 0).setOrigin(0).setDepth(-18);
      this.createProgressLights();
      this.coachText = this.add
        .text(0, 0, '', {
          ...textStyle(16, '#fff5df'),
          align: 'center',
          fontStyle: 'bold',
          wordWrap: { width: 340 },
        })
        .setOrigin(0.5)
        .setDepth(26);
      this.feedbackText = this.add
        .text(0, 0, '', { ...textStyle(13, '#ffe2a6'), align: 'center', fontStyle: 'bold' })
        .setOrigin(0.5)
        .setDepth(35)
        .setAlpha(0);
      this.stageShadow = this.add.ellipse(0, 0, 1, 1, colors.charcoal, 0.62).setDepth(0);
      this.wreath = this.add.image(0, 0, garlandVisualAssets.wreath.key).setDepth(2);
      this.innerWell = this.add.ellipse(0, 0, 1, 1, colors.night, 0.84).setDepth(3);

      this.currentFrame = this.createPhotoFrame(12, 'hero');
      this.currentZone = this.add
        .zone(
          0,
          0,
          guirlandaDasLembrancasTuning.primaryTargetMinCssPx,
          guirlandaDasLembrancasTuning.primaryTargetMinCssPx,
        )
        .setDepth(23)
        .setInteractive({ useHandCursor: true });
      this.input.setDraggable(this.currentZone);
      this.currentZone.on(Phaser.Input.Events.POINTER_DOWN, this.handleCurrentPointerDown, this);
      this.currentZone.on(Phaser.Input.Events.DRAG_START, this.handleCurrentDragStart, this);
      this.currentZone.on(Phaser.Input.Events.DRAG, this.handleCurrentDrag, this);
      this.currentZone.on(Phaser.Input.Events.DRAG_END, this.handleCurrentDragEnd, this);
      for (
        let slotIndex = 0;
        slotIndex < guirlandaDasLembrancasTuning.maximumPhotos;
        slotIndex += 1
      ) {
        this.slots.push(this.createSlot(slotIndex));
      }
      this.createGiftBox();
      this.createControls();
      this.pauseOverlay = this.add
        .rectangle(0, 0, 1, 1, colors.charcoal, 0.82)
        .setOrigin(0)
        .setDepth(80)
        .setVisible(false);
      this.pauseOverlay.setInteractive({ useHandCursor: true });
      attachCrystalPause({
        backdrop: this.pauseOverlay,
        graphics: this.scope.resource(this.add.graphics().setDepth(80.5)),
        events: this.events,
        scope: this.scope,
      });
      this.pauseOverlay.on(
        Phaser.Input.Events.POINTER_DOWN,
        (
          _pointer: PhaserModule.Input.Pointer,
          _localX: number,
          _localY: number,
          event: {
            stopPropagation?: () => void;
          },
        ) => {
          event.stopPropagation?.();
          if (this.manualPaused) this.togglePause();
        },
      );
      this.pauseTitle = this.add
        .text(0, 0, 'Pausa', { ...textStyle(26, '#fff5df'), fontStyle: 'bold' })
        .setOrigin(0.5)
        .setDepth(81)
        .setVisible(false);
      this.pausePrompt = this.add
        .text(0, 0, 'Toque para continuar', {
          ...textStyle(16, '#ffe2a6'),
          align: 'center',
          fontStyle: 'bold',
        })
        .setOrigin(0.5)
        .setDepth(81)
        .setVisible(false);
      this.completionText = this.add
        .text(0, 0, 'Que linda guirlanda!', {
          ...textStyle(22, '#fff5df'),
          align: 'center',
          fontStyle: 'bold',
          stroke: '#392419',
          strokeThickness: 5,
        })
        .setOrigin(0.5)
        .setDepth(36)
        .setVisible(false);
      this.createMemoryViewer();
    }

    private createPhotoFrame(
      depth: number,
      _role: 'hero' | 'medallion' = 'medallion',
    ): PhotoFrameView {
      return createGarlandPhotoFrame(this, textureKeys.get(context.selectedPhoto.id)!, depth);
    }

    private createSlot(slotIndex: number): GarlandSlotView {
      const glow = this.add.graphics().setDepth(6);
      const hook = this.add
        .image(0, 0, garlandVisualAssets.hook.key)
        .setDepth(20)
        .setDisplaySize(24, 60);
      const zone = this.add
        .zone(
          0,
          0,
          guirlandaDasLembrancasTuning.primaryTargetMinCssPx,
          guirlandaDasLembrancasTuning.primaryTargetMinCssPx,
        )
        .setRectangleDropZone(
          guirlandaDasLembrancasTuning.primaryTargetMinCssPx,
          guirlandaDasLembrancasTuning.primaryTargetMinCssPx,
        )
        .setDepth(22)
        .setInteractive({ useHandCursor: true });
      const frame = this.createPhotoFrame(10);
      frame.container
        .setVisible(false)
        .setSize(
          guirlandaDasLembrancasTuning.primaryTargetMinCssPx,
          guirlandaDasLembrancasTuning.primaryTargetMinCssPx,
        );
      frame.container.setInteractive({ useHandCursor: true });
      frame.container.on(
        Phaser.Input.Events.POINTER_DOWN,
        (
          _pointer: PhaserModule.Input.Pointer,
          _localX: number,
          _localY: number,
          event: { stopPropagation?: () => void },
        ) => {
          event.stopPropagation?.();
          const photoId = this.state.mountedBySlot[slotIndex];
          if (photoId && !this.runtimePaused && !this.busy && !this.viewingMemory)
            this.openMemoryViewer(photoId);
        },
      );
      const view: GarlandSlotView = { frame, glow, hook, zone, x: 0, y: 0 };
      zone.on(
        Phaser.Input.Events.POINTER_DOWN,
        (
          _pointer: PhaserModule.Input.Pointer,
          _localX: number,
          _localY: number,
          event: { stopPropagation?: () => void },
        ) => {
          event.stopPropagation?.();
          this.handleSlotTap(slotIndex);
        },
      );
      return view;
    }

    private createGiftBox(): void {
      this.boxLight = this.add.ellipse(0, 0, 130, 48, colors.amber, 0.11).setDepth(3);
      this.giftBox = this.add
        .image(0, 0, garlandVisualAssets.memoryBox.key)
        .setName('garland-box')
        .setDepth(4)
        .setInteractive({ useHandCursor: true });
      this.giftBox.on(Phaser.Input.Events.POINTER_DOWN, () => {
        if (!this.giftBox) return;
        if (this.runtimePaused || this.busy || this.arriving || this.viewingMemory) return;
        this.audio?.unlockAfterGesture();
        this.audio?.play('box-open');
        this.haptic('light');
        if (context.preferences?.reducedMotion) return;
        this.tweens.killTweensOf(this.giftBox);
        this.giftBox?.setAngle(-2);
        this.ownTween({ targets: this.giftBox, angle: 0, duration: 480, ease: 'Sine.easeOut' });
        if (this.layoutPlan)
          this.emitSparkles(
            this.layoutPlan.box.x,
            this.layoutPlan.box.y - this.layoutPlan.box.height * 0.3,
            5,
          );
      });
    }

    private createControls(): void {
      this.soundButton = this.createControl('♪', 'Som', () => {
        this.audio?.unlockAfterGesture();
        this.soundEnabled = !this.soundEnabled;
        context.run.soundChanged?.(this.soundEnabled);
        this.audio?.setEnabled(this.soundEnabled);
        if (this.soundEnabled) this.audio?.play('press');
        this.updateControlLabels();
      });
      this.pauseButton = this.createControl('Ⅱ', 'Pausar', () => this.togglePause());
    }

    private createMemoryViewer(): void {
      this.viewerBackdrop = this.add
        .rectangle(0, 0, 1, 1, colors.charcoal, 0.9)
        .setOrigin(0)
        .setDepth(60)
        .setVisible(false);
      this.viewerBackdrop.setInteractive({ useHandCursor: true });
      this.viewerBackdrop.on(
        Phaser.Input.Events.POINTER_DOWN,
        (
          _pointer: PhaserModule.Input.Pointer,
          _localX: number,
          _localY: number,
          event: {
            stopPropagation?: () => void;
          },
        ) => event.stopPropagation?.(),
      );
      this.viewerFrame = this.createPhotoFrame(64, 'hero');
      this.viewerFrame.container.setVisible(false);
      this.viewerLabel = this.add
        .text(0, 0, 'Uma lembrança na sua guirlanda', {
          ...textStyle(16, '#fff5df'),
          align: 'center',
          fontStyle: 'bold',
        })
        .setOrigin(0.5)
        .setDepth(65)
        .setVisible(false);
      const plate = this.add
        .rectangle(0, 0, 218, 50, colors.pine, 0.98)
        .setStrokeStyle(2, colors.amberLight, 0.95)
        .setOrigin(0.5);
      const label = this.add
        .text(0, 0, 'Voltar à guirlanda', { ...textStyle(15, '#fff5df'), fontStyle: 'bold' })
        .setOrigin(0.5);
      this.viewerClose = this.add
        .container(0, 0, [plate, label])
        .setSize(218, 50)
        .setDepth(66)
        .setVisible(false);
      this.viewerClose.setInteractive({ useHandCursor: true });
      const viewerSkin = this.scope.resource(this.add.graphics());
      this.viewerClose.addAt(viewerSkin, 1);
      attachCrystalControl({
        target: plate,
        gesture: this.viewerClose,
        graphics: viewerSkin,
        events: this.events,
        scope: this.scope,
        reducedMotion: context.preferences?.reducedMotion ?? false,
      });
      this.viewerClose.on(
        Phaser.Input.Events.POINTER_DOWN,
        (
          _pointer: PhaserModule.Input.Pointer,
          _localX: number,
          _localY: number,
          event: {
            stopPropagation?: () => void;
          },
        ) => {
          event.stopPropagation?.();
          this.closeMemoryViewer();
        },
      );
    }

    private openMemoryViewer(photoId: string): void {
      if (this.runtimePaused || this.busy || this.viewingMemory) return;
      this.cancelPresentation();
      this.renderStableState();
      this.viewingMemory = true;
      this.ambient?.stop();
      this.viewedPhotoId = photoId;
      this.disarmHint();
      this.audio?.unlockAfterGesture();
      this.audio?.play('select');
      this.haptic('light');
      this.layoutMemoryViewer(this.scale.gameSize.width, this.scale.gameSize.height);
      this.viewerBackdrop?.setVisible(true).setAlpha(0.9);
      this.viewerFrame?.container.setVisible(true).setAlpha(1).setScale(1);
      this.viewerLabel?.setVisible(true).setAlpha(1);
      this.viewerClose?.setVisible(true).setAlpha(1);
    }

    private closeMemoryViewer(): void {
      if (!this.viewingMemory) return;
      this.audio?.play('press');
      this.viewingMemory = false;
      this.viewedPhotoId = undefined;
      this.viewerBackdrop?.setVisible(false);
      this.viewerFrame?.container.setVisible(false);
      this.viewerLabel?.setVisible(false);
      this.viewerClose?.setVisible(false);
      if (!this.runtimePaused) this.ambient?.start();
      this.armHint();
    }

    private layoutMemoryViewer(width: number, height: number): void {
      const viewerFrame = this.viewerFrame;
      const photoId = this.viewedPhotoId;
      if (!viewerFrame || !photoId) {
        this.viewerBackdrop?.setSize(width, height);
        return;
      }
      const photo = this.photoFor(photoId);
      const dimensions = garlandFrameDimensions(photo, Math.min(width - 30, 510), height - 190);
      const centreX = width / 2;
      const centreY = Math.min(height * 0.46, height - dimensions.height * 0.5 - 118);
      this.viewerBackdrop?.setSize(width, height);
      this.layoutPhotoFrame(
        viewerFrame,
        photo,
        centreX,
        centreY,
        dimensions.width,
        dimensions.height,
      );
      this.viewerLabel?.setPosition(centreX, Math.max(100, centreY - dimensions.height * 0.54));
      this.viewerClose?.setPosition(centreX, height - 54);
    }

    private createControl(
      icon: string,
      label: string,
      action: () => void,
    ): PhaserModule.GameObjects.Container {
      const disc = this.add
        .circle(0, 0, 22, colors.charcoal, 0.9)
        .setStrokeStyle(2, colors.amberLight, 0.84);
      const glyph = this.add
        .text(0, -1, icon, { ...textStyle(18, '#fff5df'), fontStyle: 'bold' })
        .setOrigin(0.5);
      const text = this.add.text(0, 30, label, textStyle(9, '#fff5df')).setOrigin(0.5);
      const control = this.add.container(0, 0, [disc, glyph, text]).setDepth(30).setSize(48, 58);
      control.setInteractive({ useHandCursor: true });
      glyph.setVisible(false);
      const skin = this.scope.resource(this.add.graphics());
      control.addAt(skin, 1);
      attachCrystalControl({
        target: disc,
        gesture: control,
        graphics: skin,
        icon: () =>
          label === 'Som'
            ? this.soundEnabled
              ? 'sound'
              : 'muted'
            : this.manualPaused
              ? 'play'
              : 'pause',
        events: this.events,
        scope: this.scope,
        reducedMotion: context.preferences?.reducedMotion ?? false,
      });
      control.on(Phaser.Input.Events.POINTER_DOWN, () => {
        this.audio?.unlockAfterGesture();
        this.press(control);
        action();
      });
      control.setData('control-label', text);
      return control;
    }

    private layout(width: number, height: number): void {
      const photoId =
        this.state.phase === 'completed'
          ? context.selectedPhoto.id
          : getCurrentGuirlandaPhotoId(this.state);
      const layout = createGarlandLayout(
        width,
        height,
        this.photoFor(photoId!),
        this.completionPublished,
      );
      this.layoutPlan = layout;
      this.frameDimensions = layout.hero;
      this.layoutBackground(width, height);
      this.warmth?.setSize(width, height);
      this.coachText
        ?.setPosition(layout.coach.x, layout.coach.y)
        .setWordWrapWidth(layout.coach.width);
      this.feedbackText
        ?.setPosition(width / 2, layout.wreath.y + layout.wreath.height * 0.48)
        .setWordWrapWidth(width - 36);
      this.soundButton?.setPosition(layout.controls.sound.x, layout.controls.sound.y);
      this.pauseButton?.setPosition(layout.controls.pause.x, layout.controls.pause.y);
      this.pauseOverlay?.setSize(width, height);
      this.pauseTitle?.setPosition(width / 2, height / 2 - 44);
      this.pausePrompt?.setPosition(width / 2, height / 2 + 2);
      this.completionText?.setPosition(width / 2, layout.completionY);
      this.stageShadow
        ?.setPosition(layout.wreath.x, layout.wreath.y + layout.wreath.height * 0.48)
        .setSize(layout.wreath.width * 0.8, 26);
      this.wreath
        ?.setPosition(layout.wreath.x, layout.wreath.y)
        .setDisplaySize(layout.wreath.width, layout.wreath.height);
      this.innerWell
        ?.setPosition(layout.wreath.x, layout.wreath.y)
        .setSize(layout.wreath.width * 0.53, layout.wreath.height * 0.61);
      for (const [index, progress] of this.progressLights.entries()) {
        const angle = -Math.PI / 2 + (index * Math.PI * 2) / this.progressLights.length;
        const x = layout.wreath.x + Math.cos(angle) * layout.wreath.width * 0.43;
        const y = layout.wreath.y + Math.sin(angle) * layout.wreath.height * 0.43;
        progress.core.setPosition(x, y);
        progress.ring.setPosition(x, y);
        progress.glow.setPosition(x, y);
      }
      for (const [index, slot] of this.slots.entries()) {
        const point = layout.slots[index]!;
        slot.x = point.x;
        slot.y = point.y;
        slot.zone.setPosition(slot.x, slot.y);
        this.layoutSlotArt(slot, 24);
      }
      this.giftBox
        ?.setVisible(layout.box.visible)
        .setPosition(layout.box.x, layout.box.y)
        .setDisplaySize(layout.box.width, layout.box.height);
      this.boxLight
        ?.setVisible(layout.box.visible)
        .setPosition(layout.box.x - 10, layout.box.y - layout.box.height * 0.24)
        .setSize(layout.box.width * 0.68, layout.box.height * 0.28);
      this.layoutCurrentFrame();
      this.layoutMemoryViewer(width, height);
      this.ambient?.layout(width, height);
      if (!this.runtimePaused && !this.viewingMemory) this.ambient?.start();
    }

    private layoutBackground(width: number, height: number): void {
      const frame = this.textures.get(garlandVisualAssets.background.key).get();
      const scale = Math.max(width / frame.width, height / frame.height);
      this.background?.setPosition(width / 2, height / 2).setScale(scale);
      this.backgroundVeil?.setSize(width, height);
    }

    private layoutSlotArt(slot: GarlandSlotView, _radius: number): void {
      const index = this.slots.indexOf(slot);
      const isMounted = this.state.mountedBySlot[index] !== undefined;
      const ready = !isMounted && this.state.phase === 'awaiting-slot';
      const hint = ready && this.firstEmptySlotIndex() === index;
      slot.glow
        .clear()
        .fillStyle(colors.amber, ready ? (hint ? 0.23 : 0.12) : 0.035)
        .fillEllipse(slot.x, slot.y + 8, 42, 60);
      slot.hook
        .setPosition(slot.x, slot.y)
        .setAlpha(ready ? 1 : 0.72)
        .setVisible(!isMounted);
      slot.frame.container.setVisible(isMounted);
      slot.zone.setVisible(!isMounted).setActive(!isMounted);
      if (slot.zone.input)
        slot.zone.input.enabled = !isMounted && !this.busy && !this.runtimePaused;
      if (slot.frame.container.input)
        slot.frame.container.input.enabled = isMounted && !this.busy && !this.runtimePaused;
    }

    private layoutPhotoFrame(
      view: PhotoFrameView,
      photo: Photo,
      x: number,
      y: number,
      width: number,
      height: number,
    ): void {
      layoutGarlandPhotoFrame(view, photo, textureKeys.get(photo.id)!, x, y, width, height);
    }

    private slotFrameDimensions(photo: Photo): { width: number; height: number } {
      return garlandFrameDimensions(
        photo,
        this.layoutPlan?.slotMaxWidth ?? 88,
        this.layoutPlan?.slotMaxHeight ?? 118,
      );
    }

    private layoutCurrentFrame(): void {
      const layout = this.layoutPlan;
      if (!layout || !this.currentFrame || !this.currentPhotoId) return;
      this.layoutPhotoFrame(
        this.currentFrame,
        this.photoFor(this.currentPhotoId),
        layout.centreX,
        layout.centreY,
        this.frameDimensions.width,
        this.frameDimensions.height,
      );
      this.currentZone
        ?.setPosition(layout.centreX, layout.centreY)
        .setSize(this.frameDimensions.width, this.frameDimensions.height, true);
    }

    private renderStableState(): void {
      const layout = this.layoutPlan;
      if (!layout) return;
      for (const [index, slot] of this.slots.entries()) {
        const photoId = this.state.mountedBySlot[index];
        if (photoId) {
          const dimensions = this.slotFrameDimensions(this.photoFor(photoId));
          this.layoutPhotoFrame(
            slot.frame,
            this.photoFor(photoId),
            slot.x,
            slot.y,
            dimensions.width,
            dimensions.height,
          );
        }
        slot.frame.container.setVisible(Boolean(photoId)).setScale(1).setAlpha(1).setDepth(18);
        this.layoutSlotArt(slot, 24);
      }
      this.currentPhotoId =
        this.state.phase === 'completed'
          ? context.selectedPhoto.id
          : getCurrentGuirlandaPhotoId(this.state);
      if (this.currentPhotoId && this.currentFrame) {
        const isComplete = this.state.phase === 'completed';
        this.frameDimensions = createGarlandLayout(
          this.scale.width,
          this.scale.height,
          this.photoFor(this.currentPhotoId),
          this.completionPublished,
        ).hero;
        this.layoutCurrentFrame();
        this.currentFrame.container
          .setVisible(true)
          .setAlpha(1)
          .setScale(1)
          .setDepth(isComplete ? 15 : 12);
        this.currentZone
          ?.setVisible(!isComplete)
          .setActive(!isComplete)
          .setDepth(this.state.phase === 'awaiting-photo' ? 23 : 5);
      }
      this.completionText?.setVisible(false);
      this.updateCopy();
      this.armHint();
      if (this.state.phase === 'completed' && !this.celebrating && !this.runtimePaused)
        this.finishCompletion();
    }

    private updateCopy(animateProgress = false): void {
      const mountedCount = this.state.mountedBySlot.filter(Boolean).length;
      this.updateProgressLights(mountedCount, animateProgress);
      this.coachText?.setText(
        this.state.phase === 'completed'
          ? ''
          : mountedCount > 0
            ? ''
            : this.state.phase === 'awaiting-slot'
              ? 'Escolha um gancho iluminado'
              : 'Toque na sua lembrança',
      );
    }

    private updateProgressLights(mountedCount: number, animateNewest: boolean): void {
      const litCount = Math.round((mountedCount / photos.length) * this.progressLights.length);
      this.warmth?.setAlpha((mountedCount / photos.length) * 0.055);
      this.boxLight?.setAlpha(0.11 + mountedCount * 0.012);
      for (const [index, light] of this.progressLights.entries()) {
        const lit = index < litCount;
        light.glow.setAlpha(lit ? 0.28 : 0);
        light.core.setAlpha(lit ? 1 : 0.28);
        if (animateNewest && lit && index >= litCount - 4 && !context.preferences?.reducedMotion) {
          this.ownTween({
            targets: light.glow,
            alpha: 0.5,
            duration: 100,
            delay: (index % 4) * 45,
            yoyo: true,
          });
        }
      }
    }

    private updateControlLabels(): void {
      (
        this.soundButton?.getData('control-label') as PhaserModule.GameObjects.Text | undefined
      )?.setText(this.soundEnabled ? 'Som' : 'Mudo');
      (
        this.pauseButton?.getData('control-label') as PhaserModule.GameObjects.Text | undefined
      )?.setText(this.manualPaused ? 'Jogar' : 'Pausar');
    }

    private handleCurrentPointerDown(
      _pointer: PhaserModule.Input.Pointer,
      _localX: number,
      _localY: number,
      event: { stopPropagation?: () => void },
    ): void {
      event.stopPropagation?.();
      if (this.runtimePaused || this.busy || this.viewingMemory || this.state.phase === 'completed')
        return;
      this.audio?.unlockAfterGesture();
      if (this.state.phase !== 'awaiting-photo') return;
      if (this.arriving) {
        this.motion?.stopTarget(this.currentFrame!.container);
        this.arriving = false;
        this.layoutCurrentFrame();
        this.currentFrame!.container.setAlpha(1).setScale(1);
      }
      const transition = selectCurrentGuirlandaPhoto(this.state);
      if (!transition.accepted) return;
      this.state = transition.state;
      this.audio?.play('select');
      this.haptic('light');
      this.currentZone?.setDepth(5);
      this.selectCurrentFrame();
      this.updateCopy();
      this.armHint();
    }

    private handleCurrentDragStart(): void {
      if (this.runtimePaused || this.busy || this.viewingMemory || this.state.phase === 'completed')
        return;
      this.audio?.unlockAfterGesture();
      if (this.state.phase === 'awaiting-photo') {
        const transition = selectCurrentGuirlandaPhoto(this.state);
        if (transition.accepted) this.state = transition.state;
      }
      if (this.state.phase !== 'awaiting-slot' || !this.currentFrame) return;
      this.dragging = true;
      this.arriving = false;
      this.motion?.stopTarget(this.currentFrame.container);
      this.audio?.play('lift');
      this.disarmHint();
      this.currentFrame.container.setDepth(40).setScale(1.06);
      this.updateCopy();
    }

    private handleCurrentDrag(
      pointer: PhaserModule.Input.Pointer,
      dragX: number,
      dragY: number,
    ): void {
      if (this.dragging) {
        // This static presentation has no camera transform. Pointer coordinates
        // stay stable after Phaser moves the draggable Zone; dragX/Y remain a
        // fallback for unusual input adapters.
        const x = Number.isFinite(pointer.x) ? pointer.x : dragX;
        const y = Number.isFinite(pointer.y) ? pointer.y : dragY;
        if (this.currentFrame && !context.preferences?.reducedMotion) {
          this.currentFrame.pivot.setAngle(Math.max(-2, Math.min(2, pointer.velocity.x * 0.025)));
        }
        this.currentFrame?.container.setPosition(x, y);
        this.currentZone?.setPosition(x, y);
      }
    }

    private handleCurrentDragEnd(
      pointer: PhaserModule.Input.Pointer,
      dragX: number,
      dragY: number,
    ): void {
      if (!this.dragging) return;
      this.dragging = false;
      const x = Number.isFinite(pointer.x) ? pointer.x : dragX;
      const y = Number.isFinite(pointer.y) ? pointer.y : dragY;
      const targetIndex = this.emptySlotAt(x, y);
      if (targetIndex === undefined) this.returnCurrentFrame();
      else this.handleSlotTap(targetIndex, { x, y });
    }

    private handleSlotTap(slotIndex: number, from?: { x: number; y: number }): void {
      if (
        this.runtimePaused ||
        this.busy ||
        this.viewingMemory ||
        this.state.phase !== 'awaiting-slot'
      ) {
        if (!this.manualPaused && this.state.phase === 'awaiting-photo')
          this.showFeedback('Toque na lembrança e escolha um gancho.');
        return;
      }
      const transition = placeCurrentGuirlandaPhoto(this.state, slotIndex);
      if (!transition.accepted) {
        this.audio?.play('return');
        this.showFeedback('Este gancho já guarda uma lembrança.');
        return;
      }
      const mountedPhotoId = getCurrentGuirlandaPhotoId(this.state);
      if (!mountedPhotoId || !this.currentFrame) return;
      this.disarmHint();
      this.audio?.unlockAfterGesture();
      this.busy = true;
      this.state = transition.state;
      this.animatePlacement(slotIndex, mountedPhotoId, from);
    }

    private animatePlacement(
      slotIndex: number,
      photoId: string,
      from: { x: number; y: number } | undefined,
    ): void {
      const slot = this.slots[slotIndex];
      const current = this.currentFrame;
      const epoch = ++this.presentationEpoch;
      if (!slot || !current) return;
      const origin = from ?? { x: current.container.x, y: current.container.y };
      const targetSize = this.slotFrameDimensions(this.photoFor(photoId));
      current.container.setVisible(false);
      this.currentZone?.setVisible(false).setActive(false);
      for (const candidate of this.slots) this.layoutSlotArt(candidate, 24);
      this.layoutPhotoFrame(
        slot.frame,
        this.photoFor(photoId),
        origin.x,
        origin.y,
        targetSize.width,
        targetSize.height,
      );
      const initialScale = Math.min(
        this.frameDimensions.width / targetSize.width,
        this.frameDimensions.height / targetSize.height,
      );
      slot.frame.container.setVisible(true).setDepth(41).setScale(initialScale).setAlpha(1);
      this.ownTween({
        targets: slot.frame.container,
        x: slot.x,
        y: slot.y,
        scaleX: 1,
        scaleY: 1,
        duration: garlandMotion.snap,
        ease: 'Cubic.easeOut',
        onComplete: () => {
          if (epoch !== this.presentationEpoch) return;
          this.busy = false;
          slot.frame.container.setDepth(18);
          this.audio?.play('place');
          this.haptic('medium');
          this.updateCopy(true);
          if (this.state.phase === 'completed') this.showCompletion();
          else {
            this.currentPhotoId = getCurrentGuirlandaPhotoId(this.state);
            this.layout(this.scale.width, this.scale.height);
            this.renderStableState();
            this.deliverCurrentPhoto();
            context.run.interactionSettled();
          }
          if (!context.preferences?.reducedMotion) {
            slot.frame.pivot.setAngle(slotIndex < 3 ? -1.4 : 1.4);
            this.ownTween({
              targets: slot.frame.pivot,
              angle: 0,
              duration: 250,
              ease: 'Sine.easeOut',
            });
          }
          const next = this.firstEmptySlotIndex();
          if (next !== undefined)
            this.drawLightThread(slot.x, slot.y, this.slots[next]!.x, this.slots[next]!.y);
          this.emitSparkles(slot.x, slot.y - targetSize.height * 0.5, 5);
        },
      });
    }

    private deliverCurrentPhoto(): void {
      const current = this.currentFrame;
      const layout = this.layoutPlan;
      if (!current || !layout || this.runtimePaused || this.state.phase === 'completed') return;
      this.arriving = true;
      this.audio?.play('box-open');
      current.container
        .setVisible(true)
        .setDepth(12)
        .setPosition(layout.box.x, layout.box.y - layout.box.height * 0.3)
        .setScale(0.3)
        .setAlpha(0);
      this.ownTween({ targets: this.boxLight, alpha: 0.3, duration: 100, yoyo: true });
      this.ownTween({
        targets: current.container,
        x: layout.centreX,
        y: layout.centreY,
        alpha: 1,
        scaleX: 1,
        scaleY: 1,
        duration: garlandMotion.arrival,
        ease: 'Quint.easeOut',
        onComplete: () => {
          this.arriving = false;
        },
      });
    }

    private showCompletion(): void {
      const current = this.currentFrame;
      const layout = this.layoutPlan;
      if (!layout || !current) return;
      this.celebrating = true;
      this.currentPhotoId = context.selectedPhoto.id;
      this.layout(this.scale.width, this.scale.height);
      this.layoutCurrentFrame();
      current.container.setVisible(true).setAlpha(0).setScale(0.94).setDepth(15);
      this.currentZone?.setVisible(false).setActive(false);
      this.updateCopy(true);
      this.haptic('heavy');
      this.completionText
        ?.setText('Suas lembranças iluminam o Natal')
        .setFontSize(19)
        .setWordWrapWidth(this.scale.width - 36)
        .setVisible(true)
        .setAlpha(0);
      this.ownTween({
        targets: current.container,
        alpha: 1,
        scaleX: 1,
        scaleY: 1,
        delay: 230,
        duration: 320,
        ease: 'Sine.easeOut',
        onStart: () => this.audio?.play('victory'),
      });
      this.ownTween({
        targets: this.completionText,
        alpha: 1,
        delay: 350,
        duration: 240,
        hold: 440,
        yoyo: true,
      });
      for (let index = 0; index < this.progressLights.length; index += 1) {
        this.ownTween({
          targets: this.progressLights[index]!.glow,
          alpha: 0.65,
          delay: index * 28,
          duration: 100,
          yoyo: true,
        });
      }
      this.emitSparkles(layout.wreath.x - layout.wreath.width * 0.39, layout.wreath.y, 6);
      this.emitSparkles(layout.wreath.x + layout.wreath.width * 0.39, layout.wreath.y, 6);
      const beat = { progress: 0 };
      this.ownTween({
        targets: beat,
        progress: 1,
        duration: garlandMotion.victory,
        onComplete: () => this.finishCompletion(),
      });
    }

    private finishCompletion(): void {
      if (this.completionPublished || this.runtimePaused) return;
      this.completionPublished = true;
      this.celebrating = false;
      this.completionText?.setVisible(false);
      this.layout(this.scale.width, this.scale.height);
      this.renderStableState();
      context.run.interactionSettled();
      context.run.complete();
    }

    private selectCurrentFrame(): void {
      const frame = this.currentFrame?.container;
      if (!frame) return;
      this.motion?.stopTarget(frame);
      this.currentFrame?.shadow.setAlpha(0.27);
      this.ownTween({
        targets: frame,
        scaleX: 1.035,
        scaleY: 1.035,
        y: frame.y - 5,
        duration: garlandMotion.pickup,
        ease: 'Cubic.easeOut',
      });
    }

    private returnCurrentFrame(): void {
      const layout = this.layoutPlan;
      const current = this.currentFrame;
      if (!layout || !current) return;
      this.audio?.play('return');
      current.pivot.setAngle(0);
      this.ownTween({
        targets: this.currentZone ? [current.container, this.currentZone] : current.container,
        x: layout.centreX,
        y: layout.centreY,
        scaleX: 1,
        scaleY: 1,
        duration: garlandMotion.return,
        ease: 'Cubic.easeOut',
        onComplete: () => current.container.setDepth(12),
      });
      this.armHint();
    }

    private press(target: PhaserModule.GameObjects.Container): void {
      if (context.preferences?.reducedMotion) return;
      this.ownTween({
        targets: target,
        scaleX: guirlandaDasLembrancasTuning.pressScale,
        scaleY: guirlandaDasLembrancasTuning.pressScale,
        duration: garlandMotion.press,
        yoyo: true,
        ease: 'Cubic.easeOut',
      });
    }

    private drawLightThread(fromX: number, fromY: number, toX: number, toY: number): void {
      if (context.preferences?.reducedMotion || context.quality === 'LOW' || !this.layoutPlan)
        return;
      const wreath = this.layoutPlan.wreath;
      const start = Math.atan2(
        (fromY - wreath.y) / wreath.height,
        (fromX - wreath.x) / wreath.width,
      );
      const end = Math.atan2((toY - wreath.y) / wreath.height, (toX - wreath.x) / wreath.width);
      let delta = end - start;
      if (delta < 0) delta += Math.PI * 2;
      const mote = this.ownTransient(
        this.add.image(fromX, fromY, sparkleTextureKey).setDepth(8).setScale(0.5),
      );
      const travel = { progress: 0 };
      this.ownTween({
        targets: travel,
        progress: 1,
        duration: garlandMotion.lightTravel,
        ease: 'Sine.easeInOut',
        onUpdate: () => {
          const angle = start + delta * travel.progress;
          mote.setPosition(
            wreath.x + Math.cos(angle) * wreath.width * 0.43,
            wreath.y + Math.sin(angle) * wreath.height * 0.43,
          );
        },
        onComplete: () => this.destroyTransient(mote),
      });
    }

    private emitSparkles(x: number, y: number, count: number): void {
      if (context.preferences?.reducedMotion || context.quality === 'LOW') return;
      this.sparkleEmitter?.explode(count, x, y);
    }

    private armHint(): void {
      this.disarmHint();
      if (this.runtimePaused || this.busy || this.viewingMemory || this.state.phase === 'completed')
        return;
      this.hintTimer = this.time.delayedCall(guirlandaDasLembrancasTuning.idleAssistDelayMs, () => {
        this.hintTimer = undefined;
        if (
          this.runtimePaused ||
          this.busy ||
          this.viewingMemory ||
          this.state.phase === 'completed'
        )
          return;
        if (this.state.phase === 'awaiting-photo') {
          this.showFeedback('A moldura no centro está pronta para você.');
          this.audio?.play('hint');
          if (this.currentFrame)
            this.ownTween({
              targets: this.currentFrame.rimGlow,
              alpha: 0.4,
              duration: 260,
              yoyo: true,
            });
          return;
        }
        const next = this.firstEmptySlotIndex();
        const slot = next === undefined ? undefined : this.slots[next];
        if (!slot) return;
        this.showFeedback('Este gancho está pronto para uma lembrança.');
        this.audio?.play('hint');
        this.layoutSlotArt(slot, 27);
      });
    }

    private disarmHint(): void {
      this.hintTimer?.remove();
      this.hintTimer = undefined;
    }

    private showFeedback(message: string): void {
      const feedback = this.feedbackText;
      if (!feedback) return;
      feedback.setText(message).setAlpha(1);
      this.ownTween({
        targets: feedback,
        alpha: 0,
        duration: 1100,
        delay: 1000,
        ease: 'Sine.easeIn',
      });
    }

    private firstEmptySlotIndex(): number | undefined {
      const index = this.state.mountedBySlot.findIndex((photoId) => photoId === undefined);
      return index === -1 ? undefined : index;
    }

    private emptySlotAt(x: number, y: number): number | undefined {
      const target = this.slots.findIndex(
        (slot, index) =>
          this.state.mountedBySlot[index] === undefined &&
          Math.abs(x - slot.x) <= guirlandaDasLembrancasTuning.primaryTargetMinCssPx / 2 &&
          Math.abs(y - slot.y) <= guirlandaDasLembrancasTuning.primaryTargetMinCssPx / 2,
      );
      return target === -1 ? undefined : target;
    }

    private photoFor(photoId: string): Photo {
      const photo = photosById.get(photoId);
      if (!photo) throw new Error('Guirlanda state referred to a photo outside this session.');
      return photo;
    }

    private togglePause(): void {
      this.manualPaused = !this.manualPaused;
      this.syncPauseState();
      this.audio?.play('press');
    }

    private readonly setVisibilityPausedFromGame = (paused: boolean): void => {
      this.visibilityPaused = paused;
      this.syncPauseState();
    };

    private syncPauseState(): void {
      const shouldPause = this.manualPaused || this.visibilityPaused;
      this.pauseOverlay?.setVisible(shouldPause);
      this.pauseTitle?.setVisible(shouldPause);
      this.pausePrompt
        ?.setText(this.manualPaused ? 'Toque para continuar' : 'Sua guirlanda está em pausa')
        .setVisible(shouldPause);
      if (shouldPause !== this.runtimePaused) {
        this.runtimePaused = shouldPause;
        if (shouldPause) {
          this.cancelPresentation();
          this.renderStableState();
          this.audio?.pause();
          context.run.pause();
        } else {
          this.audio?.resume();
          context.run.resume();
          this.renderStableState();
          if (!this.viewingMemory) this.ambient?.start();
        }
      }
      this.updateControlLabels();
    }

    private cancelPresentation(): void {
      this.giftBox?.setAngle(0);
      this.presentationEpoch += 1;
      this.ambient?.stop();
      this.motion?.cancel();
      this.busy = false;
      this.arriving = false;
      this.celebrating = false;
      this.sparkleEmitter?.killAll();
      for (const effect of this.transientEffects) effect.destroy();
      this.transientEffects.clear();
      this.dragging = false;
      this.disarmHint();
    }

    private ownTween(
      config: PhaserModule.Types.Tweens.TweenBuilderConfig,
    ): PhaserModule.Tweens.Tween {
      return this.motion!.add(config);
    }

    private ownTransient<T extends PhaserModule.GameObjects.GameObject>(effect: T): T {
      this.transientEffects.add(effect);
      return effect;
    }

    private destroyTransient(effect: PhaserModule.GameObjects.GameObject): void {
      this.transientEffects.delete(effect);
      effect.destroy();
    }

    private haptic(style: 'light' | 'medium' | 'heavy'): void {
      void context.haptics.impact(style);
    }

    private showAssetFailure(): void {
      this.add
        .text(24, 24, 'Não foi possível preparar esta guirlanda.\nVolte e tente novamente.', {
          ...textStyle(18, '#fff5df'),
          wordWrap: { width: 320 },
        })
        .setDepth(2);
      context.run.assetFailed('guirlanda-required-asset-load-failed');
    }
  }

  const game = new Phaser.Game({
    antialias: true,
    backgroundColor: colors.night,
    input: { activePointers: 1 },
    parent,
    pixelArt: false,
    scale: { mode: Phaser.Scale.RESIZE, parent, width: '100%', height: '100%' },
    scene: GuirlandaDasLembrancasScene,
    type: Phaser.AUTO,
  });
  const pauseRun = (): void => setVisibilityPaused?.(true);
  const resumeRun = (): void => setVisibilityPaused?.(false);
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

function selectRunPhotos(sessionPhotos: readonly Photo[], selectedPhoto: Photo): readonly Photo[] {
  return [selectedPhoto, ...sessionPhotos.filter((photo) => photo.id !== selectedPhoto.id)].slice(
    0,
    guirlandaDasLembrancasTuning.maximumPhotos,
  );
}

function textStyle(fontSize: number, color: string): PhaserModule.Types.GameObjects.Text.TextStyle {
  return { color, fontFamily: 'Nunito, system-ui, sans-serif', fontSize: `${fontSize}px` };
}

export const guirlandaDasLembrancasGameModule: GameModule<typeof PhaserModule, HTMLElement> = {
  definition: guirlandaDasLembrancasDefinition,
  create: createGuirlandaDasLembrancasGame,
};
