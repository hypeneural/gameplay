import { SceneScope, SeededRandom } from '@christmas-games/platform';
import type {
  GameBridge,
  GameContext,
  GameController,
  GameModule,
  Photo,
} from '@christmas-games/platform';
import type * as PhaserModule from 'phaser';
import { renaDasLembrancasDefinition } from '../../definition.js';
import { renaDasLembrancasTuning as tuning } from '../../tuning.js';
import { selectRudolphPhotos } from '../../domain/PhotoSelection.js';
import { RudolphRound } from '../../domain/RudolphRound.js';
import type { RudolphEvent } from '../../domain/RudolphRound.js';
import { rudolphLayout } from '../RudolphLayout.js';
import type { RudolphLayout } from '../RudolphLayout.js';
import { MemoryFrameView, rudolphFrames } from './MemoryFrameView.js';
import { ReindeerView, rudolphCharacterAssets } from './ReindeerView.js';
import { RudolphAudioDirector, rudolphAudio } from './RudolphAudioDirector.js';
import type { RudolphCue } from './RudolphAudioDirector.js';
import { rudolphButton, rudolphText } from './RudolphControls.js';
import type { RudolphButton } from './RudolphControls.js';
import { RudolphWorld, rudolphWorldAssets } from './RudolphWorld.js';

type CatchEvent = Extract<RudolphEvent, { type: 'caught' }>;

export function createRenaDasLembrancasGame(
  Phaser: typeof PhaserModule,
  parent: HTMLElement,
  context: GameContext,
  _bridge: GameBridge,
): GameController {
  const ids = selectRudolphPhotos(
    context.session.photos.map((photo) => photo.id),
    context.selectedPhoto.id,
    context.random,
  );
  const photos = ids.map((id) => context.session.photos.find((photo) => photo.id === id)!);
  const key = (id: string, variant = 'card') => `rudolph-photo-${ids.indexOf(id)}-${variant}`;
  const reduced = context.preferences?.reducedMotion ?? false;
  const review = context.development?.scenario === 'rudolph-review';
  const round = new RudolphRound(ids, review ? new SeededRandom(42) : context.random);
  let onVisibility: ((kind: 'hidden' | 'blurred', value: boolean) => void) | undefined;

  class RudolphScene extends Phaser.Scene {
    private readonly scope = new SceneScope();
    private readonly views = new Map<number, MemoryFrameView>();
    private readonly catches: CatchEvent[] = [];
    private hero: { view: MemoryFrameView; event: CatchEvent; elapsed: number } | undefined;
    private plan!: RudolphLayout;
    private reindeer!: ReindeerView;
    private world!: RudolphWorld;
    private snow!: PhaserModule.GameObjects.Graphics;
    private progress!: PhaserModule.GameObjects.Text;
    private readonly thumbnails: PhaserModule.GameObjects.Image[] = [];
    private thumbnailRims!: PhaserModule.GameObjects.Graphics;
    private coach!: PhaserModule.GameObjects.Text;
    private status!: PhaserModule.GameObjects.Text;
    private pauseShade!: PhaserModule.GameObjects.Rectangle;
    private pauseText!: PhaserModule.GameObjects.Text;
    private pauseButton!: RudolphButton;
    private soundButton!: RudolphButton;
    private magicButton!: RudolphButton;
    private albumButton!: RudolphButton;
    private viewerShade!: PhaserModule.GameObjects.Rectangle;
    private viewerCaption!: PhaserModule.GameObjects.Text;
    private viewerFrame: MemoryFrameView | undefined;
    private viewerClose!: RudolphButton;
    private viewerPrev!: RudolphButton;
    private viewerNext!: RudolphButton;
    private viewerIndex = 0;
    private viewerOpen = false;
    private readonly requestedGamePhotos = new Set<string>();
    private readonly loadedGamePhotos = new Set<string>();
    private readonly gameRetries = new Map<string, number>();
    private soundEnabled = context.preferences?.soundEnabled ?? true;
    private audio!: RudolphAudioDirector;
    private manualPaused = false;
    private hidden = false;
    private blurred = false;
    private accumulator = 0;
    private activeTime = 0;
    private lastGesture = 0;
    private caughtFlash = 0;
    private activePointer: number | undefined;
    private nosePointer: number | undefined;
    private albumPointer: number | undefined;
    private cursors: PhaserModule.Types.Input.Keyboard.CursorKeys | undefined;
    private ready = false;
    private complete = false;

    constructor() {
      super('RudolphScene');
    }
    init(): void {
      onVisibility = (kind, value) => this.visibility(kind, value);
      context.run.open();
      const dispose = () => {
        this.ready = false;
        onVisibility = undefined;
        this.scope.dispose();
      };
      // Game.destroy calls Scene DESTROY directly, without requiring SHUTDOWN.
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, dispose);
      this.events.once(Phaser.Scenes.Events.DESTROY, dispose);
      this.scope.add(() => {
        this.events.off(Phaser.Scenes.Events.SHUTDOWN, dispose);
        this.events.off(Phaser.Scenes.Events.DESTROY, dispose);
      });
      const mouse = this.input.mouse;
      if (mouse)
        this.scope.add(() => {
          // Phaser 4.2.1 MouseManager.stopListeners omits its wheel listener.
          this.game.canvas.removeEventListener('wheel', mouse.onMouseWheel as EventListener);
        });
      const touch = this.input.manager.touch;
      if (touch) {
        const canvas = this.game.canvas;
        const originalCancel = touch.onTouchCancel as (event: TouchEvent) => void;
        // Keep capture for normal touches, preventing synthetic mouse double taps.
        // Phaser 4.2.1 otherwise calls preventDefault on uncancelable touchcancel.
        const onCancel = (event: TouchEvent) => {
          const capture = touch.capture;
          if (!event.cancelable) touch.capture = false;
          try {
            originalCancel(event);
          } finally {
            touch.capture = capture;
          }
        };
        canvas.removeEventListener('touchcancel', originalCancel);
        canvas.addEventListener('touchcancel', onCancel, { passive: false });
        this.scope.add(() => canvas.removeEventListener('touchcancel', onCancel));
      }
      for (const photo of photos)
        for (const variant of ['card', 'game'])
          this.scope.texture(this.textures, key(photo.id, variant));
      for (const asset of [
        ...Object.values(rudolphFrames),
        ...rudolphCharacterAssets,
        ...rudolphWorldAssets,
      ])
        this.scope.texture(this.textures, asset.key);
      this.scope.add(() => {
        for (const asset of rudolphAudio) this.cache.audio.remove(asset.key);
      });
    }
    preload(): void {
      for (const asset of [
        ...Object.values(rudolphFrames),
        ...rudolphCharacterAssets,
        ...rudolphWorldAssets,
      ])
        this.load.image(asset.key, asset.url);
      for (const asset of rudolphAudio) this.load.audio(asset.key, asset.urls, { instances: 1 });
      for (const photo of photos) this.load.image(key(photo.id), photo.variants.card);
      this.load.image(key(ids[0]!, 'game'), photos[0]!.variants.game);
    }
    create(): void {
      if (
        [
          ...photos.map((photo) => key(photo.id)),
          ...Object.values(rudolphFrames).map((asset) => asset.key),
          ...rudolphCharacterAssets.map((asset) => asset.key),
          ...rudolphWorldAssets.map((asset) => asset.key),
        ].some((texture) => !this.textures.exists(texture))
      ) {
        context.run.assetFailed('rudolph-required-media-unavailable');
        return;
      }
      if (this.textures.exists(key(ids[0]!, 'game'))) this.loadedGamePhotos.add(ids[0]!);
      this.audio = new RudolphAudioDirector(this, this.soundEnabled);
      this.scope.add(() => this.audio.destroy());
      this.sound.pauseOnBlur = false;
      this.world = new RudolphWorld(this);
      this.scope.add(() => this.world.destroy());
      this.snow = this.add.graphics().setDepth(-15);
      this.reindeer = new ReindeerView(this);
      this.scope.add(() => this.reindeer.destroy());
      this.progress = rudolphText(this, '', 18, 40);
      this.thumbnailRims = this.add.graphics().setDepth(40);
      for (const photo of photos)
        this.thumbnails.push(this.add.image(0, 0, key(photo.id)).setDepth(41).setVisible(false));
      this.scope.add(() => {
        this.thumbnailRims.destroy();
        for (const thumbnail of this.thumbnails) thumbnail.destroy();
      });
      this.coach = rudolphText(this, '', 15, 40);
      this.status = rudolphText(this, '', 15, 40);
      this.pauseShade = this.add
        .rectangle(0, 0, 1, 1, 0x061722, 0.86)
        .setOrigin(0)
        .setDepth(70)
        .setInteractive()
        .setVisible(false);
      this.pauseText = rudolphText(this, 'Uma pausa na neve\nToque em Seguir', 22, 75).setVisible(
        false,
      );
      this.albumButton = this.button('Álbum', 94, () => this.openAlbum(), 'paper');
      this.soundButton = this.button(
        this.soundEnabled ? 'Som' : 'Mudo',
        52,
        () => {
          this.soundEnabled = !this.soundEnabled;
          this.audio.setEnabled(this.soundEnabled);
          this.soundButton.text.setText(this.soundEnabled ? 'Som' : 'Mudo');
          context.run.soundChanged?.(this.soundEnabled);
        },
        true,
        115,
      );
      this.pauseButton = this.button('Pausa', 60, () => {
        if (this.complete) return;
        this.manualPaused = !this.manualPaused;
        this.syncPause();
      });
      this.magicButton = this.button(
        'Magia 0/3',
        124,
        () => {
          if (this.suspended || this.complete || !round.activateMagic()) return;
          this.audio.play('magic');
          context.run.milestone?.('rudolph-magic');
        },
        false,
      );
      this.viewerShade = this.add
        .rectangle(0, 0, 1, 1, 0x0c2029, 1)
        .setOrigin(0)
        .setDepth(90)
        .setInteractive()
        .setVisible(false);
      this.viewerCaption = rudolphText(this, '', 18, 104).setVisible(false);
      this.viewerClose = this.button('Voltar', 88, () => this.closeAlbum(), 'paper', 110);
      this.viewerPrev = this.button('Anterior', 108, () => this.browse(-1), 'paper', 110);
      this.viewerNext = this.button('Próxima', 108, () => this.browse(1), 'paper', 110);
      for (const button of [this.viewerClose, this.viewerPrev, this.viewerNext]) button.show(false);
      this.scope.on(this.scale, Phaser.Scale.Events.RESIZE, () => this.layout());
      this.bindInput();
      this.scope.on(this.load, 'filecomplete', () => this.onGamePhotoLoaded());
      this.scope.on(this.load, 'loaderror', (file: PhaserModule.Loader.File) => {
        const photo = photos.find((item) => key(item.id, 'game') === file.key);
        if (photo) this.requestedGamePhotos.delete(photo.id);
      });
      this.scope.add(() => {
        this.viewerFrame?.destroy();
        this.hero?.view.destroy();
        for (const view of this.views.values()) view.destroy();
        this.views.clear();
        this.catches.length = 0;
        this.game.canvas.removeAttribute('data-rudolph-target');
        this.game.canvas.removeAttribute('data-rudolph-golden');
        this.game.canvas.removeAttribute('data-rudolph-state');
      });
      this.layout();
      round.start();
      this.ready = true;
      context.run.ready();
      context.run.start();
      this.syncPause();
      this.renderState(0);
    }

    private button(
      label: string,
      width: number,
      action: () => void,
      cue: boolean | RudolphCue = true,
      depth = 80,
    ): RudolphButton {
      return rudolphButton(
        this,
        this.scope,
        label,
        width,
        depth,
        reduced,
        () => this.audio.unlock(),
        () => {
          action();
          if (cue) this.audio.play(cue === true ? 'tap' : cue);
        },
      );
    }
    private bindInput(): void {
      this.cursors = this.input.keyboard?.createCursorKeys();
      this.input.topOnly = true;
      this.scope.on(this.input, 'pointerdown', (pointer: PhaserModule.Input.Pointer) => {
        this.audio.unlock();
        if (
          this.suspended ||
          this.complete ||
          this.activePointer !== undefined ||
          this.nosePointer !== undefined ||
          this.albumPointer !== undefined ||
          pointer.y < 90
        )
          return;
        if (pointer.y < 136) {
          this.albumPointer = pointer.id;
          return;
        }
        if (this.reindeer.nearNose(pointer.x, pointer.y)) {
          this.nosePointer = pointer.id;
          return;
        }
        this.activePointer = pointer.id;
        this.aim(pointer.x);
      });
      this.scope.on(this.input, 'pointermove', (pointer: PhaserModule.Input.Pointer) => {
        if (this.suspended || !pointer.isDown) return;
        if (pointer.id === this.nosePointer && pointer.getDistance() > 16) {
          this.nosePointer = undefined;
          this.activePointer = pointer.id;
        }
        if (pointer.id === this.activePointer) this.aim(pointer.x);
      });
      this.scope.on(this.input, 'pointerup', (pointer: PhaserModule.Input.Pointer) => {
        if (pointer.id === this.albumPointer) {
          this.albumPointer = undefined;
          if (
            !this.suspended &&
            !this.complete &&
            pointer.y >= 90 &&
            pointer.y < 136 &&
            pointer.getDistance() <= 16 &&
            round.savedPhotoIds.length
          ) {
            this.audio.play('paper');
            this.openAlbum();
          }
          return;
        }
        if (pointer.id === this.nosePointer) {
          this.nosePointer = undefined;
          if (
            !this.suspended &&
            !this.complete &&
            pointer.getDistance() <= 16 &&
            this.reindeer.nearNose(pointer.x, pointer.y)
          ) {
            this.caughtFlash = 1;
            this.lastGesture = this.activeTime;
            this.audio.play(round.activateMagic() ? 'magic' : 'tap');
          }
          return;
        }
        if (
          !this.suspended &&
          !this.complete &&
          pointer.getDistance() <= 16 &&
          (pointer.id === this.activePointer || (pointer.y >= 60 && pointer.y < 78))
        )
          this.audio.play(this.world.tap(pointer.x, pointer.y, this.plan));
        if (pointer.id === this.activePointer) this.activePointer = undefined;
      });
      this.scope.on(this.input, 'pointerupoutside', () => this.cancelInput());
      this.scope.on(this.input, 'gameout', () => this.cancelInput());
      const cancel = () => this.cancelInput();
      this.game.canvas.addEventListener('touchcancel', cancel);
      this.scope.add(() => this.game.canvas.removeEventListener('touchcancel', cancel));
    }
    private layout(): void {
      this.cancelInput();
      this.plan = rudolphLayout(this.scale.width, this.scale.height);
      const p = this.plan;
      this.albumButton.move(125, 32);
      this.soundButton.move(p.width - 104, 32);
      this.pauseButton.move(p.width - 38, 32);
      this.magicButton.move(p.width - 80, p.height - 34);
      this.progress.setPosition(p.width / 2, 88);
      this.coach
        .setPosition((p.width - 164) / 2, p.height - 35)
        .setFontSize(13)
        .setWordWrapWidth(p.width - 180);
      this.status
        .setPosition(p.hero.x, p.fieldX > 0 ? p.hero.y + p.hero.height / 2 + 18 : 136)
        .setFontSize(13);
      this.thumbnailRims.clear();
      this.thumbnails.forEach((thumbnail, index) => {
        const x = p.width / 2 + (index - (photos.length - 1) / 2) * 28;
        this.thumbnailRims.lineStyle(1, 0xd4b97d, 0.65).strokeRoundedRect(x - 11, 102, 22, 20, 3);
        const ratio = photos[index]!.aspectRatio;
        const w = Math.min(18, 16 * ratio);
        thumbnail.setPosition(x, 112).setDisplaySize(w, w / ratio);
      });
      this.pauseShade.setSize(p.width, p.height);
      this.pauseText.setPosition(p.width / 2, p.height / 2);
      this.viewerShade.setSize(p.width, p.height);
      this.viewerClose.move(p.width / 2, 38);
      const finalLandscape = this.complete && p.fieldX > 0;
      const viewerX = finalLandscape ? p.width * 0.755 : p.width / 2;
      this.viewerCaption.setPosition(viewerX, 96);
      this.viewerPrev.move(
        viewerX - 68,
        finalLandscape ? 159 : this.complete ? p.height - 206 : p.height - 62,
      );
      this.viewerNext.move(
        viewerX + 68,
        finalLandscape ? 159 : this.complete ? p.height - 206 : p.height - 62,
      );
      this.world.layout(p);
      if (this.viewerOpen || this.complete) this.renderViewer();
      this.renderState(0);
    }
    private aim(x: number): void {
      round.aim((x - this.plan.fieldX) / this.plan.fieldWidth);
      this.lastGesture = this.activeTime;
    }
    private cancelInput(): void {
      this.activePointer = undefined;
      this.nosePointer = undefined;
      this.albumPointer = undefined;
      round.stopMovement();
      this.accumulator = 0;
    }
    private get suspended(): boolean {
      return this.manualPaused || this.hidden || this.blurred || this.viewerOpen;
    }
    visibility(kind: 'hidden' | 'blurred', value: boolean): void {
      this[kind] = value;
      if (this.ready) this.syncPause();
    }
    private syncPause(): void {
      this.cancelInput();
      const gamePause = this.manualPaused || this.viewerOpen;
      if (gamePause) context.run.pause('game');
      else context.run.resume('game');
      if (this.hidden || this.blurred) context.run.pause('visibility');
      else context.run.resume('visibility');
      this.audio?.setPaused(this.suspended);
      this.pauseShade?.setVisible(this.manualPaused && !this.viewerOpen);
      this.pauseText?.setVisible(this.manualPaused && !this.viewerOpen);
      this.pauseButton?.text.setText(this.manualPaused ? 'Seguir' : 'Pausa');
      if (this.ready) this.renderState(0);
    }

    override update(_time: number, delta: number): void {
      if (!this.ready || this.suspended || this.complete) return;
      const dt = Math.min(delta, 80) / 1000;
      this.audio.tick(dt);
      this.activeTime += dt;
      if (this.cursors?.left.isDown)
        this.aim(this.plan.fieldX + (round.playerX - 0.16) * this.plan.fieldWidth);
      else if (this.cursors?.right.isDown)
        this.aim(this.plan.fieldX + (round.playerX + 0.16) * this.plan.fieldWidth);
      if (this.cursors && Phaser.Input.Keyboard.JustDown(this.cursors.space)) {
        this.audio.unlock();
        if (round.activateMagic()) this.audio.play('magic');
      }
      this.accumulator = Math.min(0.08, this.accumulator + dt);
      while (this.accumulator >= tuning.fixedStepSeconds) {
        // First slice keeps a single readable falling photograph on short viewports.
        const enoughRoom = this.plan.catchY - this.plan.spawnY > 230;
        const spawnAllowed =
          this.activeTime - this.lastGesture < 7 &&
          (enoughRoom || (round.falling.length === 0 && !this.hero && this.catches.length === 0));
        for (const event of round.step(
          tuning.fixedStepSeconds,
          this.catches.length + (this.hero ? 1 : 0),
          spawnAllowed,
          Math.min(0.17, 56 / this.plan.fieldWidth),
        ))
          this.onRoundEvent(event);
        this.accumulator -= tuning.fixedStepSeconds;
      }
      this.updateHero(dt);
      this.caughtFlash = Math.max(0, this.caughtFlash - dt * 2);
      this.renderState(dt);
      if (round.phase === 'finishing' && !this.hero && this.catches.length === 0) this.showFinal();
    }
    private onRoundEvent(event: RudolphEvent): void {
      if (event.type === 'spawned') {
        this.views.set(
          event.memory.instanceId,
          new MemoryFrameView(
            this,
            this.photo(event.memory.photoId),
            key(event.memory.photoId),
            10,
            event.memory.golden,
          ),
        );
        if (event.memory.golden) {
          this.world.deliver();
          this.audio.play('bells');
        }
      } else {
        this.views.get(event.memory.instanceId)?.destroy();
        this.views.delete(event.memory.instanceId);
        if (event.type === 'caught') {
          this.catches.push(event);
          this.audio.play('catch');
          this.caughtFlash = 1;
          void context.haptics.impact('light').catch(() => undefined);
          context.run.milestone?.('rudolph-first-rescue');
          context.run.interactionSettled();
        } else this.audio.play('miss');
      }
      if (round.phase === 'finishing') {
        for (const view of this.views.values()) view.destroy();
        this.views.clear();
      }
    }
    private updateHero(dt: number): void {
      if (!this.hero) {
        const event = this.catches.shift();
        if (event)
          this.hero = {
            event,
            elapsed: 0,
            view: new MemoryFrameView(
              this,
              this.photo(event.memory.photoId),
              event.memory.photoId === ids[0] &&
                this.textures.exists(key(event.memory.photoId, 'game'))
                ? key(event.memory.photoId, 'game')
                : key(event.memory.photoId),
              45,
              event.memory.golden,
              true,
            ),
          };
      }
      if (!this.hero) return;
      this.hero.elapsed += dt;
      const duration = this.hero.event.first ? tuning.heroSeconds : tuning.repeatHeroSeconds;
      if (this.hero.elapsed > duration + tuning.heroTravelSeconds) {
        this.hero.view.destroy();
        this.hero = undefined;
      }
    }
    private renderState(dt: number): void {
      if (!this.plan || !this.reindeer) return;
      const p = this.plan;
      this.world.render(dt, p, reduced || context.quality === 'LOW');
      this.progress.setText(`Álbum ${round.savedPhotoIds.length} de ${ids.length}`);
      this.thumbnails.forEach((thumbnail, index) =>
        thumbnail.setVisible(round.savedPhotoIds.includes(ids[index]!)),
      );
      this.magicButton.text.setText(
        round.magicSeconds > 0
          ? 'Magia acesa!'
          : round.noseCharge === 3
            ? 'Usar magia'
            : `Magia ${round.noseCharge}/3`,
      );
      this.coach.setText(
        this.activeTime - this.lastGesture > 7
          ? 'Toque na neve para continuar'
          : round.totalRescues === 0
            ? 'Toque ou deslize para guiar Rudolph'
            : '',
      );
      this.reindeer.render(
        p.fieldX + round.playerX * p.fieldWidth,
        p.ground,
        round.velocityX,
        dt,
        reduced,
        round.magicSeconds > 0,
        round.noseCharge === 3,
        this.caughtFlash,
      );
      for (const memory of round.falling) {
        const view = this.views.get(memory.instanceId);
        if (!view) continue;
        const size =
          p.frameMax * (memory.size === 'small' ? 0.8 : memory.size === 'large' ? 1.15 : 1);
        const y = p.spawnY + memory.y * (p.catchY - p.spawnY);
        view.layout(p.fieldX + memory.x * p.fieldWidth, y - size * 0.28, size * 1.1, size);
        view.container.setAngle(reduced ? 0 : Math.sin(memory.y * 4 + memory.phase) * 3);
      }
      if (this.hero) {
        const duration = this.hero.event.first ? tuning.heroSeconds : tuning.repeatHeroSeconds;
        const travel = Math.max(
          0,
          Math.min(1, (this.hero.elapsed - duration) / tuning.heroTravelSeconds),
        );
        const t = reduced ? 0 : travel * travel;
        this.hero.view.layout(
          p.hero.x + (125 - p.hero.x) * t,
          p.hero.y + (32 - p.hero.y) * t,
          p.hero.width * (1 - t * 0.85),
          p.hero.height * (1 - t * 0.85),
        );
        this.status.setText(
          this.hero.event.memory.golden
            ? 'Uma lembrança dourada de Natal!'
            : this.hero.event.first
              ? 'Uma lembrança salva!'
              : 'Mais um resgate, mais magia!',
        );
      } else this.status.setText('');
      this.snow.clear();
      if (!reduced && context.quality !== 'LOW')
        for (let index = 0; index < 16; index++) {
          const x = index % 2 ? 8 + (index % 3) * 7 : p.width - 9 - (index % 3) * 8;
          const y = 112 + ((index * 51 + this.activeTime * 16) % Math.max(1, p.height - 130));
          this.snow.fillStyle(0xe5f0e8, 0.45).fillCircle(x, y, 1.6);
        }
      this.game.canvas.setAttribute(
        'aria-label',
        this.complete
          ? 'Álbum de Natal completo'
          : this.suspended
            ? 'Rudolph em pausa'
            : `Rudolph na neve. Álbum ${round.savedPhotoIds.length} de ${ids.length}. ${round.noseCharge === 3 ? 'Magia pronta.' : ''}`,
      );
      this.updateReviewState();
    }

    private updateReviewState(): void {
      if (review && this.reindeer) {
        const current = round.savedPhotoIds[this.viewerIndex];
        const showingAlbum = this.viewerOpen || this.complete;
        this.game.canvas.setAttribute(
          'data-rudolph-state',
          JSON.stringify({
            playerX: round.playerX,
            velocity: round.velocityX,
            charge: round.noseCharge,
            magic: round.magicSeconds,
            nose: this.reindeer.nosePosition,
            albumPage: showingAlbum && current ? this.viewerIndex + 1 : null,
            albumPhotoHighResolution: Boolean(
              showingAlbum &&
              current &&
              this.viewerFrame?.photo.texture.key === key(current, 'game'),
            ),
            loadedGamePhotoCount: ids.filter((id) => this.textures.exists(key(id, 'game'))).length,
          }),
        );
        this.game.canvas.setAttribute('data-rudolph-target', String(round.falling[0]?.x ?? 0.5));
        this.game.canvas.setAttribute(
          'data-rudolph-golden',
          String(round.falling.some((memory) => memory.golden)),
        );
      }
    }

    private photo(id: string): Photo {
      return photos[ids.indexOf(id)]!;
    }
    private openAlbum(): void {
      if (!round.savedPhotoIds.length || this.complete) return;
      this.viewerOpen = true;
      this.viewerIndex = Math.min(this.viewerIndex, round.savedPhotoIds.length - 1);
      this.syncPause();
      this.renderViewer();
    }
    private closeAlbum(): void {
      if (this.complete) return;
      this.viewerOpen = false;
      this.viewerShade.setVisible(false);
      this.viewerCaption.setVisible(false);
      for (const button of [this.viewerClose, this.viewerNext, this.viewerPrev]) button.show(false);
      this.viewerFrame?.destroy();
      this.viewerFrame = undefined;
      this.syncPause();
    }
    private browse(direction: number): void {
      this.viewerIndex =
        (this.viewerIndex + direction + round.savedPhotoIds.length) % round.savedPhotoIds.length;
      this.renderViewer();
    }
    private renderViewer(): void {
      const id = round.savedPhotoIds[this.viewerIndex];
      if (!id) return;
      this.viewerFrame?.destroy();
      this.viewerFrame = new MemoryFrameView(
        this,
        this.photo(id),
        this.textures.exists(key(id, 'game')) ? key(id, 'game') : key(id),
        100,
        false,
        true,
      );
      const p = this.plan;
      const bounds = this.complete
        ? p.final
        : { x: p.width / 2, y: p.height / 2 + 10, width: p.width - 22, height: p.height - 220 };
      this.viewerFrame.layout(bounds.x, bounds.y, bounds.width, bounds.height);
      this.viewerFrame.photo
        .setInteractive()
        .on(
          'pointerup',
          (
            pointer: PhaserModule.Input.Pointer,
            _x: number,
            _y: number,
            event: PhaserModule.Types.Input.EventData,
          ) => {
            event.stopPropagation();
            if (pointer.getDistance() <= 16) {
              this.browse(1);
              this.audio.play('paper');
            }
          },
        );
      this.viewerShade.setVisible(true);
      this.viewerCaption
        .setText(
          this.complete
            ? `Você salvou as lembranças de Natal!\n${this.viewerIndex + 1} de ${ids.length} · ${round.totalRescues} resgates`
            : `Seu Álbum de Natal\n${this.viewerIndex + 1} de ${round.savedPhotoIds.length} lembranças salvas`,
        )
        .setFontSize(p.width < 400 ? 16 : 18)
        .setWordWrapWidth(this.complete && p.fieldX > 0 ? p.width * 0.46 : p.width - 24)
        .setVisible(true);
      this.viewerClose.show(!this.complete);
      this.viewerPrev.show(true);
      this.viewerNext.show(true);
      this.requestGamePhoto(id);
      this.updateReviewState();
    }
    private requestGamePhoto(id: string): void {
      if (
        this.textures.exists(key(id, 'game')) ||
        this.requestedGamePhotos.has(id) ||
        (this.gameRetries.get(id) ?? 0) >= 2
      )
        return;
      this.requestedGamePhotos.add(id);
      this.gameRetries.set(id, (this.gameRetries.get(id) ?? 0) + 1);
      this.load.image(key(id, 'game'), this.photo(id).variants.game);
      if (!this.load.isLoading()) this.load.start();
    }
    private onGamePhotoLoaded(): void {
      for (const id of this.requestedGamePhotos)
        if (this.textures.exists(key(id, 'game'))) {
          this.requestedGamePhotos.delete(id);
          this.loadedGamePhotos.add(id);
          this.gameRetries.delete(id);
        }
      const current = round.savedPhotoIds[this.viewerIndex];
      if (
        (this.viewerOpen || this.complete) &&
        current &&
        this.textures.exists(key(current, 'game')) &&
        this.viewerFrame
      ) {
        const image = this.viewerFrame.photo;
        const width = image.displayWidth;
        const height = image.displayHeight;
        image.setTexture(key(current, 'game')).setDisplaySize(width, height);
      }
      for (const id of this.loadedGamePhotos) {
        if (id === ids[0] || id === current) continue;
        this.textures.remove(key(id, 'game'));
        this.loadedGamePhotos.delete(id);
      }
      this.updateReviewState();
    }
    private showFinal(): void {
      if (!round.finish()) return;
      this.complete = true;
      this.viewerIndex = Math.max(0, round.savedPhotoIds.indexOf(ids[0]!));
      this.magicButton.show(false);
      this.coach.setVisible(false);
      this.status.setVisible(false);
      this.albumButton.show(false);
      this.pauseButton.show(false);
      this.layout();
      this.audio.play('finish');
      context.run.complete();
      this.game.canvas.setAttribute('aria-label', 'Álbum de Natal completo');
    }
  }
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    antialias: true,
    backgroundColor: 0x0b2639,
    input: { activePointers: 2 },
    loader: { timeout: 12_000, maxRetries: 1 },
    scale: { mode: Phaser.Scale.RESIZE, parent, width: '100%', height: '100%' },
    scene: RudolphScene,
  });
  const visibilityEvents = [
    [Phaser.Core.Events.HIDDEN, () => onVisibility?.('hidden', true)],
    [Phaser.Core.Events.VISIBLE, () => onVisibility?.('hidden', false)],
    [Phaser.Core.Events.BLUR, () => onVisibility?.('blurred', true)],
    [Phaser.Core.Events.FOCUS, () => onVisibility?.('blurred', false)],
  ] as const;
  for (const [event, listener] of visibilityEvents) game.events.on(event, listener);
  let destruction: Promise<void> | undefined;
  return {
    destroy(): Promise<void> {
      if (destruction) return destruction;
      destruction = new Promise<void>((resolve, reject) => {
        game.events.once(Phaser.Core.Events.DESTROY, () => {
          for (const [event, listener] of visibilityEvents) game.events.off(event, listener);
          context.run.exit();
          resolve();
        });
        try {
          game.destroy(true, false);
        } catch (error) {
          reject(error);
        }
      });
      return destruction;
    },
  };
}
export const renaDasLembrancasGameModule: GameModule<typeof PhaserModule, HTMLElement> = {
  definition: renaDasLembrancasDefinition,
  create: createRenaDasLembrancasGame,
};
