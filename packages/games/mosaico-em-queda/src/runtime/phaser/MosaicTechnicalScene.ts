import { estimateDecodedRgbaTextureBytes, SceneScope } from '@christmas-games/platform';
import type { GameContext } from '@christmas-games/platform';
import { christmasTheme } from '@christmas-games/theme';
import type * as PhaserModule from 'phaser';
import type { MosaicMode } from '../../domain/MosaicProgress.js';
import {
  resolveMosaicPhotoAvailability,
  type MosaicPhotoAvailability,
} from '../../domain/MosaicPhotoAvailability.js';
import { MosaicBoardPresentation } from './MosaicBoardPresentation.js';
import { MosaicChromePresentation } from './MosaicChromePresentation.js';
import { MosaicAudioDirector } from './MosaicAudioDirector.js';
import { MosaicDockInput, type MosaicDockAction } from './MosaicDockInput.js';
import { MosaicDockPresentation } from './MosaicDockPresentation.js';
import { MosaicUtilityPresentation } from './MosaicUtilityPresentation.js';
import { MosaicPhotoViewer } from './MosaicPhotoViewer.js';
import { MosaicFeedbackDirector } from './MosaicFeedbackDirector.js';
import { MosaicGestureInput } from './MosaicGestureInput.js';
import { MosaicInputController } from './MosaicInputController.js';
import { MosaicInputLatch } from './MosaicInputLatch.js';
import { MosaicGameplayRuntime, type MosaicGameplayUpdate } from './MosaicGameplayRuntime.js';
import { MosaicHintPresentation } from './MosaicHintPresentation.js';
import {
  MosaicPointerOwnership,
  type MosaicInteractionCancelReason,
} from './MosaicPointerOwnership.js';
import { MosaicTechnicalProbe } from './MosaicTechnicalProbe.js';
import { teardownMosaicScene } from './MosaicSceneTeardown.js';
import { resolveMosaicViewport } from './MosaicViewportAdapter.js';
import { MosaicPresentationDirector } from './MosaicPresentationDirector.js';
import { MosaicRecoveryPresentation } from './MosaicRecoveryPresentation.js';
import { MosaicVfxDirector } from './MosaicVfxDirector.js';
import { mosaicAudio } from './audioAssets.js';
import {
  mosaicVisualTextureKeys,
  preloadMosaicVisualAssets,
  type MosaicVisualTextureKeys,
} from './visualAssets.js';
import { MosaicAssetLedger } from '../MosaicAssetLedger.js';
import { planMosaicExperienceLayout } from '../MosaicExperienceLayout.js';
import { mosaicPhotoTextureKey, type MosaicRuntimePhotoPlan } from '../MosaicRuntimePhotoPlan.js';

/**
 * D4 technical slice. Lightweight primitives prove the lifecycle, fixed-step
 * bridge and input authority before the product presentation is built.
 */
export function createMosaicTechnicalScene(
  Phaser: typeof PhaserModule,
  context: GameContext,
  hostElement: HTMLElement,
  photoPlan: MosaicRuntimePhotoPlan,
): typeof PhaserModule.Scene {
  class MosaicoEmQuedaScene extends Phaser.Scene {
    private readonly scope = new SceneScope();
    private readonly gesture = new MosaicGestureInput();
    private readonly inputLatch = new MosaicInputLatch();
    private readonly ownership = new MosaicPointerOwnership();
    private readonly inputController = new MosaicInputController(
      this.ownership,
      this.gesture,
      this.inputLatch,
    );
    private readonly dockInput = new MosaicDockInput(this.ownership, this.inputLatch);
    private readonly gameplay = new MosaicGameplayRuntime(
      mosaicMode(context),
      context.runSeed,
      photoPlan.selection.materialPhotoIds.length,
    );
    private readonly assetLedger = new MosaicAssetLedger(new Set(photoPlan.textureKeys.values()));
    private readonly visualTextureKeys: MosaicVisualTextureKeys = mosaicVisualTextureKeys(
      context.run.runId,
    );
    private probe?: MosaicTechnicalProbe;
    private audio?: MosaicAudioDirector;
    private presentationDirector?: MosaicPresentationDirector;
    private recovery?: MosaicRecoveryPresentation;
    private vfx?: MosaicVfxDirector;
    private assetFailure = false;
    private runCompleted = false;
    private runtimePaused = false;
    private skipNextPresentationDelta = false;
    private board?: Phaser.GameObjects.Rectangle;
    private boardSurface?: Phaser.GameObjects.Image;
    private background?: Phaser.GameObjects.Image;
    private chrome?: MosaicChromePresentation;
    private presentation?: MosaicBoardPresentation;
    private resolvedPhotos?: Extract<MosaicPhotoAvailability, { readonly status: 'ready' }>;
    private progressText?: Phaser.GameObjects.Text;
    private hintPresentation?: MosaicHintPresentation;
    private dock?: MosaicDockPresentation;
    private utility?: MosaicUtilityPresentation;
    private manualPaused = false;
    private photoViewing = false;
    private photoViewer?: MosaicPhotoViewer;

    constructor() {
      super('MosaicoEmQuedaScene');
    }

    init(): void {
      context.run.open();
      this.load.on(Phaser.Loader.Events.FILE_COMPLETE, this.handleFileComplete, this);
      this.scope.add(() =>
        this.load.off(Phaser.Loader.Events.FILE_COMPLETE, this.handleFileComplete, this),
      );
      this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, this.handleFileFailure, this);
      this.scope.add(() =>
        this.load.off(Phaser.Loader.Events.FILE_LOAD_ERROR, this.handleFileFailure, this),
      );
      for (const textureKey of photoPlan.textureKeys.values()) {
        this.scope.texture(this.textures, textureKey);
      }
      for (const textureKey of Object.values(this.visualTextureKeys)) {
        this.scope.texture(this.textures, textureKey);
      }
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleShutdown, this);
    }

    preload(): void {
      preloadMosaicVisualAssets(
        this.load,
        this.visualTextureKeys,
        context.quality,
        context.preferences?.reducedMotion ?? false,
      );
      Object.values(mosaicAudio).forEach((asset) => {
        this.load.audio(asset.key, [...asset.urls], { instances: 2 });
        this.scope.add(() => this.cache.audio.remove(asset.key));
      });
      for (const request of photoPlan.loadRequests) {
        const photo = photoPlan.photosById.get(request.photoId);
        if (photo === undefined) {
          this.failAsset('mosaico-photo-outside-session');
          continue;
        }
        this.load.image(
          mosaicPhotoTextureKey(photoPlan, request.photoId, request.variant),
          photo.variants[request.variant],
        );
      }
    }

    create(): void {
      const resolvedPhotos = this.resolveAvailablePhotos();
      if (resolvedPhotos === null) {
        this.showAssetFailure();
        return;
      }
      this.resolvedPhotos = resolvedPhotos;
      this.gameplay.reset(resolvedPhotos.materialPhotoIds.length);
      for (const textureKey of this.requiredTextureKeys()) {
        const frame = this.textures.get(textureKey).get();
        if (frame.width <= 0 || frame.height <= 0) {
          this.failAsset('mosaico-invalid-photo-texture');
          this.showAssetFailure();
          return;
        }
      }
      this.game.canvas.style.touchAction = 'none';
      this.bindVisualViewport();
      this.startTechnicalProbe();
      if (this.textures.exists(this.visualTextureKeys['workshop-background'])) {
        this.background = this.scope.resource(
          this.add
            .image(0, 0, this.visualTextureKeys['workshop-background'])
            .setOrigin(0.5)
            .setDepth(-5),
        );
      }
      this.board = this.add
        .rectangle(0, 0, 1, 1, 0x103e35, 1)
        .setStrokeStyle(2, 0xf8dfa0, 0.75)
        .setOrigin(0.5);
      this.scope.resource(this.board);
      if (this.textures.exists(this.visualTextureKeys['board-surface'])) {
        this.boardSurface = this.scope.resource(
          this.add.image(0, 0, this.visualTextureKeys['board-surface']).setOrigin(0.5).setDepth(1),
        );
        this.board.setVisible(false);
      }
      this.presentation = new MosaicBoardPresentation(
        this,
        this.scope,
        photoPlan,
        resolvedPhotos.materialPhotoIds,
        {
          cellFrameTextureKey: this.visualTextureKeys['photo-cell-frame'],
          reducedMotion: context.preferences?.reducedMotion ?? false,
        },
      );
      this.audio = new MosaicAudioDirector({
        Phaser,
        initiallyEnabled: context.preferences?.soundEnabled ?? true,
        scene: this,
        scope: this.scope,
      });
      this.vfx = new MosaicVfxDirector({
        quality: context.quality,
        reducedMotion: context.preferences?.reducedMotion ?? false,
        scene: this,
        scope: this.scope,
        snowSweepTextureKey: this.visualTextureKeys['snow-sweep'],
        sparkleTextureKey: this.visualTextureKeys.sparkle,
      });
      this.recovery = new MosaicRecoveryPresentation({
        reducedMotion: context.preferences?.reducedMotion ?? false,
        scene: this,
        scope: this.scope,
      });
      this.chrome = new MosaicChromePresentation(
        this,
        this.scope,
        photoPlan,
        {
          memoryFrameTextureKey: this.visualTextureKeys['memory-frame'],
          nextPedestalTextureKey: this.visualTextureKeys['next-pedestal'],
          progressGarlandTextureKey: this.visualTextureKeys['progress-garland'],
          victoryRibbonTextureKey: this.visualTextureKeys['victory-ribbon'],
          warmLightTextureKey: this.visualTextureKeys['warm-light'],
        },
        context.preferences?.reducedMotion ?? false,
      );
      this.presentationDirector = new MosaicPresentationDirector([
        new MosaicFeedbackDirector(this.presentation, context.haptics),
        this.audio,
        this.vfx,
        this.chrome,
        this.recovery,
      ]);
      this.progressText = this.add
        .text(0, 0, '', {
          color: christmasTheme.color.snow,
          fontFamily: 'system-ui, sans-serif',
          fontSize: '16px',
          fontStyle: 'bold',
          align: 'center',
        })
        .setOrigin(0.5)
        .setDepth(6.9);
      this.scope.resource(this.progressText);
      this.createDock();
      this.utility = new MosaicUtilityPresentation({
        scene: this,
        scope: this.scope,
        reducedMotion: context.preferences?.reducedMotion ?? false,
        soundEnabled: () => this.audio?.soundEnabled ?? false,
        toggleSound: () => {
          this.audio?.toggleAfterGesture();
          context.run.soundChanged?.(this.audio?.soundEnabled ?? false);
        },
        togglePause: () => {
          this.manualPaused = !this.manualPaused;
          if (this.manualPaused) this.handleBlur();
          else this.handleFocus();
          this.utility?.setPaused(this.manualPaused);
          this.audio?.unlockAfterGesture();
          this.audio?.play('ui-press');
        },
      });
      this.photoViewer = new MosaicPhotoViewer({
        scene: this,
        scope: this.scope,
        reducedMotion: context.preferences?.reducedMotion ?? false,
        initialTextureKey: mosaicPhotoTextureKey(
          photoPlan,
          photoPlan.selection.anchorPhotoId,
          'game',
        ),
        onOpen: () => {
          if (this.runtimePaused || this.runCompleted || this.gameplay.recoveryPending) return null;
          const framePhoto =
            this.resolvedPhotos?.framePhotoBySlot[this.gameplay.state.memoryFrame.slot];
          const photo = framePhoto && photoPlan.photosById.get(framePhoto.photoId);
          if (!framePhoto || !photo) return null;
          this.photoViewing = true;
          this.handleBlur();
          this.audio?.unlockAfterGesture();
          this.audio?.play('ui-press');
          return {
            textureKey: mosaicPhotoTextureKey(photoPlan, framePhoto.photoId, framePhoto.variant),
            aspectRatio: photo.aspectRatio,
          };
        },
        onClose: () => {
          this.photoViewing = false;
          this.handleFocus();
          this.audio?.play('ui-press');
        },
      });
      if (this.presentation !== undefined && this.dock !== undefined) {
        this.hintPresentation = new MosaicHintPresentation(this.presentation, this.dock);
      }
      this.input.on(Phaser.Input.Events.POINTER_DOWN, this.handleScenePointerDown, this);
      this.scope.add(() =>
        this.input.off(Phaser.Input.Events.POINTER_DOWN, this.handleScenePointerDown, this),
      );
      this.input.on(Phaser.Input.Events.POINTER_UP, this.handlePointerUp, this);
      this.scope.add(() =>
        this.input.off(Phaser.Input.Events.POINTER_UP, this.handlePointerUp, this),
      );
      this.input.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.handlePointerUpOutside, this);
      this.scope.add(() =>
        this.input.off(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.handlePointerUpOutside, this),
      );
      this.input.on(Phaser.Input.Events.POINTER_MOVE, this.handlePointerMove, this);
      this.scope.add(() =>
        this.input.off(Phaser.Input.Events.POINTER_MOVE, this.handlePointerMove, this),
      );
      this.scope.on(this.scale, Phaser.Scale.Events.RESIZE, this.handleResize, this);
      this.scope.on(
        this.scale,
        Phaser.Scale.Events.ORIENTATION_CHANGE,
        this.handleOrientationChange,
        this,
      );
      this.scope.on(this.game.events, Phaser.Core.Events.HIDDEN, this.handleHidden, this);
      this.scope.on(this.game.events, Phaser.Core.Events.BLUR, this.handleBlur, this);
      this.scope.on(this.game.events, Phaser.Core.Events.VISIBLE, this.handleVisible, this);
      this.scope.on(this.game.events, Phaser.Core.Events.FOCUS, this.handleFocus, this);
      this.scope.on(
        this.game.events,
        Phaser.Core.Events.CONTEXT_LOST,
        this.handleContextLost,
        this,
      );
      this.layout(this.scale.gameSize.width, this.scale.gameSize.height);
      this.present();
      context.run.ready();
      context.run.start();
    }

    override update(_time: number, delta: number): void {
      if (this.runtimePaused) return;
      if (this.gameplay.recoveryPending) {
        if (this.recovery?.readyToApply ?? true) this.applyWorkshopRelief();
        return;
      }
      if (this.gameplay.state.progress.phase !== 'playing') {
        this.completeRunIfTerminal();
        return;
      }
      if (this.skipNextPresentationDelta) this.skipNextPresentationDelta = false;
      else this.probe?.recordPresentationDelta(delta);
      this.gameplay.advancePresentation(
        delta,
        () => this.inputLatch.consumeFrame(),
        (update) => this.advanceOneFixedStep(update),
      );
    }

    private bindVisualViewport(): void {
      const visualViewport = hostElement.ownerDocument.defaultView?.visualViewport;
      if (visualViewport === undefined || visualViewport === null) return;
      visualViewport.addEventListener('resize', this.handleVisualViewportResize);
      this.scope.add(() =>
        visualViewport.removeEventListener('resize', this.handleVisualViewportResize),
      );
    }

    private startTechnicalProbe(): void {
      const windowRef = hostElement.ownerDocument.defaultView;
      if (context.development === undefined || windowRef === null) return;
      this.probe = new MosaicTechnicalProbe(
        {
          requestFrame: (callback) => windowRef.requestAnimationFrame(callback),
          cancelFrame: (requestId) => windowRef.cancelAnimationFrame(requestId),
        },
        context.quality,
      );
      this.probe.start();
      this.scope.add(() => this.probe?.stop());
    }

    private createDock(): void {
      this.dock = new MosaicDockPresentation({
        onPress: (action, pointer, event) => this.handleDockDown(action, pointer, event),
        panelTextureKey: this.visualTextureKeys['dock-panel'],
        reducedMotion: context.preferences?.reducedMotion ?? false,
        scene: this,
        scope: this.scope,
        textureKeyByAction: {
          left: this.visualTextureKeys['button-left'],
          'rotate-cw': this.visualTextureKeys['button-rotate'],
          right: this.visualTextureKeys['button-right'],
          down: this.visualTextureKeys['button-down'],
        },
      });
    }

    private handleDockDown(
      action: MosaicDockAction,
      pointer: Phaser.Input.Pointer,
      event: Phaser.Types.Input.EventData,
    ): boolean {
      event.stopPropagation();
      if (
        this.runtimePaused ||
        this.gameplay.recoveryPending ||
        this.gameplay.state.progress.phase !== 'playing'
      )
        return false;
      this.audio?.unlockAfterGesture();
      const accepted = this.dockInput.press(action, pointer);
      if (accepted) {
        this.audio?.play('ui-press');
      } else this.audio?.play('blocked');
      return accepted;
    }

    private handleScenePointerDown(pointer: Phaser.Input.Pointer): void {
      if (
        this.runtimePaused ||
        this.gameplay.recoveryPending ||
        this.gameplay.state.progress.phase !== 'playing'
      )
        return;
      this.audio?.unlockAfterGesture();
      if (!this.presentation?.containsPoint(pointer.x, pointer.y)) return;
      this.inputController.beginMural(
        pointer,
        this.presentation.isActivePoint(pointer.x, pointer.y),
      );
    }

    private handlePointerMove(pointer: Phaser.Input.Pointer): void {
      this.inputController.moveMural(pointer, this.presentation?.cellSize ?? 1);
    }

    private handlePointerUp(pointer: Phaser.Input.Pointer): void {
      const ended = this.inputController.end(pointer);
      if (ended.owned) this.dock?.release(pointer.pointerId);
    }

    private handlePointerUpOutside(pointer: Phaser.Input.Pointer): void {
      if (this.ownership.owns(pointer.pointerId)) this.cancelInteraction('pointer-up-outside');
    }

    private handleResize(gameSize: { width: number; height: number }): void {
      this.cancelInteraction('resize');
      this.layout(gameSize.width, gameSize.height);
    }

    private handleOrientationChange(): void {
      this.cancelInteraction('orientation');
    }

    private handleVisualViewportResize = (): void => {
      this.cancelInteraction('resize');
      this.layout(this.scale.gameSize.width, this.scale.gameSize.height);
    };

    private handleHidden(): void {
      this.tweens.pauseAll();
      this.runtimePaused = true;
      this.pauseTechnicalProbe();
      this.cancelInteraction('hidden');
      this.audio?.pause();
      context.run.pause();
    }

    private handleBlur(): void {
      this.tweens.pauseAll();
      this.runtimePaused = true;
      this.pauseTechnicalProbe();
      this.cancelInteraction('blur');
      this.audio?.pause();
      context.run.pause();
    }

    private handleVisible(): void {
      if (this.manualPaused || this.photoViewing) return;
      this.tweens.resumeAll();
      this.gameplay.resetClock();
      this.resumeTechnicalProbe();
      this.runtimePaused = false;
      this.audio?.resume();
      context.run.resume();
    }

    private handleFocus(): void {
      if (this.manualPaused || this.photoViewing || hostElement.ownerDocument.hidden) return;
      this.tweens.resumeAll();
      this.gameplay.resetClock();
      this.resumeTechnicalProbe();
      this.runtimePaused = false;
      this.audio?.resume();
      context.run.resume();
    }

    private handleContextLost(): void {
      this.tweens.pauseAll();
      this.probe?.recordContextLoss();
      this.runtimePaused = true;
      this.pauseTechnicalProbe();
      this.cancelInteraction('context-lost');
      this.audio?.pause();
      context.run.pause();
    }

    private handleShutdown(): void {
      teardownMosaicScene({
        cancelInteraction: () => this.cancelInteraction('shutdown'),
        probe: this.probe,
        resources: () => ({
          canvasCount: hostElement.querySelectorAll('canvas').length,
          decodedTextureBytes: this.estimateRunDecodedTextureBytes(),
          effectCount: 0,
          presenterCount: this.presentation?.presenterCount ?? 0,
          runTextureCount: photoPlan.textureKeys.size,
          textureCount: this.textures.getTextureKeys().length,
        }),
        scope: this.scope,
      });
    }

    private readonly handleFileComplete = (key: string): void => {
      this.assetLedger.markComplete(key);
    };

    private readonly handleFileFailure = (file: { readonly key?: string }): void => {
      if (file.key === undefined) return;
      if (!this.assetLedger.has(file.key)) return;
      this.assetLedger.markFailed(file.key);
    };

    private resolveAvailablePhotos(): Extract<
      MosaicPhotoAvailability,
      { readonly status: 'ready' }
    > | null {
      if (this.assetFailure || !this.assetLedger.isSettled) {
        this.failAsset('mosaico-required-photo-load-failed');
        return null;
      }
      const failedRequests = this.assetLedger.failures.flatMap((textureKey) => {
        const request = photoPlan.requestByTextureKey.get(textureKey);
        return request === undefined ? [] : [request];
      });
      const resolved = resolveMosaicPhotoAvailability({
        selection: photoPlan.selection,
        failedRequests,
      });
      if (resolved.status === 'blocked') {
        this.failAsset(`mosaico-${resolved.reason}`);
        return null;
      }
      return resolved;
    }

    private requiredTextureKeys(): readonly string[] {
      const resolvedPhotos = this.resolvedPhotos;
      if (resolvedPhotos === undefined) return [];
      const requests = [
        { photoId: photoPlan.selection.anchorPhotoId, variant: 'game' as const },
        ...resolvedPhotos.materialPhotoIds.map((photoId) => ({
          photoId,
          variant: 'thumb' as const,
        })),
        ...Object.values(resolvedPhotos.framePhotoBySlot),
      ];
      return [
        ...new Set(
          requests.map((request) =>
            mosaicPhotoTextureKey(photoPlan, request.photoId, request.variant),
          ),
        ),
      ];
    }

    private failAsset(reason: string): void {
      if (this.assetFailure) return;
      this.assetFailure = true;
      context.run.assetFailed(reason);
    }

    private showAssetFailure(): void {
      const message = this.add
        .text(0, 0, 'Não foi possível preparar as lembranças. Tente novamente.', {
          align: 'center',
          color: christmasTheme.color.snow,
          fontFamily: 'system-ui, sans-serif',
          fontSize: '18px',
          wordWrap: { width: Math.max(220, this.scale.gameSize.width - 48) },
        })
        .setOrigin(0.5)
        .setPosition(this.scale.gameSize.width / 2, this.scale.gameSize.height / 2);
      this.scope.resource(message);
    }

    private estimateRunDecodedTextureBytes(): number {
      let bytes = 0;
      for (const textureKey of photoPlan.textureKeys.values()) {
        if (!this.textures.exists(textureKey)) continue;
        const frame = this.textures.get(textureKey).get();
        if (frame.width > 0 && frame.height > 0) {
          bytes += estimateDecodedRgbaTextureBytes({ width: frame.width, height: frame.height });
        }
      }
      return bytes;
    }

    private cancelInteraction(reason: MosaicInteractionCancelReason): void {
      this.inputController.cancel(reason);
      this.gameplay.resetClock();
      this.dock?.release();
    }

    private pauseTechnicalProbe(): void {
      this.skipNextPresentationDelta = true;
      this.probe?.pause();
    }

    private resumeTechnicalProbe(): void {
      this.skipNextPresentationDelta = true;
      this.probe?.resume();
    }

    private advanceOneFixedStep(update: MosaicGameplayUpdate): void {
      this.presentationDirector?.consume(update.effects);
      if (this.gameplay.recoveryPending) {
        this.cancelInteraction('recovery');
        this.dock?.setEnabled(false);
      }
      if (update.interactionSettled) context.run.interactionSettled();
      this.completeRunIfTerminal();
      this.present();
    }

    private applyWorkshopRelief(): void {
      const update = this.gameplay.applyWorkshopRelief();
      this.presentationDirector?.consume(update.effects);
      this.dock?.setEnabled(true);
      this.present();
    }

    private completeRunIfTerminal(): void {
      if (this.runCompleted) return;
      if (
        this.gameplay.state.progress.phase !== 'completed' &&
        this.gameplay.state.progress.phase !== 'top-out'
      ) {
        return;
      }
      this.runCompleted = true;
      context.run.complete();
    }

    private layout(width: number, height: number): void {
      const visualViewport = hostElement.ownerDocument.defaultView?.visualViewport;
      const viewport =
        visualViewport === undefined || visualViewport === null
          ? resolveMosaicViewport({ scaleWidth: width, scaleHeight: height })
          : resolveMosaicViewport({
              scaleWidth: width,
              scaleHeight: height,
              visualViewportWidth: visualViewport.width,
              visualViewportHeight: visualViewport.height,
            });
      const layout = planMosaicExperienceLayout(viewport);
      this.background
        ?.setPosition(viewport.width / 2, viewport.height / 2)
        .setScale(Math.max(viewport.width / 768, viewport.height / 1536));
      this.board
        ?.setPosition(
          layout.board.x + layout.board.width / 2,
          layout.board.y + layout.board.height / 2,
        )
        .setSize(layout.board.width, layout.board.height);
      this.boardSurface
        ?.setPosition(
          layout.board.x + layout.board.width / 2,
          layout.board.y + layout.board.height / 2,
        )
        .setDisplaySize(layout.board.width, layout.board.height);
      if (this.board !== undefined) {
        this.presentation?.layout({
          left: layout.board.x,
          top: layout.board.y,
          width: layout.board.width,
          height: layout.board.height,
        });
      }
      this.progressText
        ?.setPosition(
          layout.progress.x + layout.progress.width / 2,
          layout.progress.y + layout.progress.height / 2,
        )
        .setWordWrapWidth(layout.progress.width, true);
      this.chrome?.layout(layout);
      this.dock?.layout(layout);
      this.utility?.layout(viewport.width, viewport.height, layout);
      this.photoViewer?.layout(viewport.width, viewport.height, layout);
      this.vfx?.layout({ board: layout.board, memoryFrame: layout.memoryFrame });
      this.recovery?.layout(layout.board);
      this.present();
    }

    private present(): void {
      this.presentation?.present(this.gameplay.state.engine);
      this.hintPresentation?.present(this.gameplay.hint, this.gameplay.state.engine.active);
      const { progress } = this.gameplay.state;
      const progressLabel = `Guirlanda: ${Math.min(progress.clearedLines, progress.targetLines)} de ${progress.targetLines}`;
      this.progressText?.setText(
        progress.phase === 'recovering'
          ? 'Vamos abrir espaço!'
          : progress.phase === 'top-out'
            ? 'Sua lembrança está pronta!'
            : progressLabel,
      );
      const framePhoto =
        this.resolvedPhotos?.framePhotoBySlot[this.gameplay.state.memoryFrame.slot];
      if (framePhoto !== undefined) {
        this.chrome?.present({
          framePhoto,
          frameSlot: this.gameplay.state.memoryFrame.slot,
          hint: this.gameplay.hint,
          next: this.gameplay.state.engine.next,
          terminal: progress.phase === 'completed' || progress.phase === 'top-out',
        });
      }
    }
  }

  return MosaicoEmQuedaScene;
}

function mosaicMode(context: GameContext): MosaicMode {
  return context.difficulty === 'desafio' ? 'desafio' : 'normal';
}
