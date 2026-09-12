import { SceneScope } from '@christmas-games/platform';
import type { GameContext, GameController, GameModule } from '@christmas-games/platform';
import { attachCrystalControl, attachCrystalPause } from '@christmas-games/theme';
import type * as PhaserModule from 'phaser';
import { magicPhotoDefinition } from '../../definition.js';
import { MagicPhotoStateMachine } from '../../domain/MagicPhotoStateMachine.js';
import type { MagicEvent, MagicState } from '../../domain/MagicPhotoStateMachine.js';
import type { Point } from '../../domain/PhotoGeometry.js';
import { PhotoLayoutManager } from '../PhotoLayoutManager.js';
import { MagicEventBus } from '../MagicEventBus.js';
import { artKey, createProceduralArt } from './ProceduralArt.js';
import { GiftController } from './GiftController.js';
import { IceController } from './IceController.js';
import { FXManager } from './FXManager.js';
import { HintManager } from './HintManager.js';
import { AudioManager, audioAssets } from './AudioManager.js';
import type { MagicCue } from './AudioManager.js';
import { visualAssets, visualKey } from './visualAssets.js';
import { WinterEnvironment } from './WinterEnvironment.js';
import { DiscoveryStars, InstructionPanel } from './MagicPhotoHud.js';

const photoKey = 'magic-photo-session';
const instructions: Partial<Record<MagicState, string>> = {
  INTRO: 'Uma surpresa do Papai Noel…',
  GIFT_IDLE: 'Toque no presente!',
  GIFT_TOUCH_1: 'Olha só! Toque de novo…',
  GIFT_TOUCH_2: 'Mais um toque!',
  GIFT_READY: 'Puxe o laço para cima!',
  RIBBON_DRAG: 'Isso! Continue puxando…',
  MAGIC_INTRO: 'Seu dedo virou uma varinha!',
  MAGIC_HUNT: 'Passe o dedo e encontre a magia!',
  MAGIC_COMPLETE: 'Cinco estrelas de Natal!',
  FROST_TRANSITION: 'Um gelinho do Polo Norte…',
  ICE_INTERACTION: 'Passe o dedo para descongelar!',
  ICE_CRACK_1: 'O gelo está se soltando!',
  ICE_CRACK_2: 'Mais um pouquinho de carinho…',
};

function createMagicPhotoGame(
  Phaser: typeof PhaserModule,
  parent: HTMLElement,
  context: GameContext,
): GameController {
  let visibility: ((paused: boolean) => void) | undefined;
  const reduced = context.preferences?.reducedMotion ?? false;
  class MagicPhotoScene extends Phaser.Scene {
    private readonly scope = new SceneScope();
    private readonly bus = new MagicEventBus();
    private model!: MagicPhotoStateMachine;
    private layout!: PhotoLayoutManager;
    private gift!: GiftController;
    private winter!: WinterEnvironment;
    private ice!: IceController;
    private fx!: FXManager;
    private hint!: HintManager;
    private audio!: AudioManager;
    private photo!: PhaserModule.GameObjects.Image;
    private photoRoot!: PhaserModule.GameObjects.Container;
    private frame!: PhaserModule.GameObjects.Graphics;
    private backdrop!: PhaserModule.GameObjects.Graphics;
    private cracks!: PhaserModule.GameObjects.Graphics;
    private photoGlow!: PhaserModule.GameObjects.Image;
    private instruction!: InstructionPanel;
    private progress!: DiscoveryStars;
    private starHintUntil = 0;
    private lastStarTouch = -1000;
    private soundButton!: PhaserModule.GameObjects.Rectangle;
    private pauseButton!: PhaserModule.GameObjects.Rectangle;
    private pauseVeil!: PhaserModule.GameObjects.Rectangle;
    private pauseCard!: PhaserModule.GameObjects.Rectangle;
    private pauseTitle!: PhaserModule.GameObjects.Text;
    private pausePrompt!: PhaserModule.GameObjects.Text;
    private soundEnabled = context.preferences?.soundEnabled ?? true;
    private manualPaused = false;
    private visibilityPaused = false;
    private paused = false;
    private pointerId: number | undefined;
    private lastPoint: Point | undefined;
    private ribbonStartY = 0;
    private tapAlternative = false;
    private freeTapCount = 0;
    private lastFreeTap = 0;
    private openingBurst = false;
    private breakBurst = false;
    private started = false;
    private loaded = false;
    private consumedControl = false;

    constructor() {
      super('MagicPhotoScene');
    }
    init(): void {
      context.run.open();
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scope.dispose());
      this.scope.add(() => this.bus.clear());
      this.scope.add(() => {
        visibility = undefined;
      });
    }
    preload(): void {
      this.load.image(photoKey, context.selectedPhoto.variants.game);
      for (const asset of visualAssets)
        this.load.image(visualKey(asset), `/assets/magic-photo/art/${asset}.webp`);
      for (const asset of audioAssets) {
        if (asset === 'music' && context.quality === 'LOW') continue;
        this.load.audio(`magic-photo-audio-${asset}`, [
          `/assets/magic-photo/audio/${asset}.m4a`,
          `/assets/magic-photo/audio/${asset}.mp3`,
        ]);
      }
    }
    create(): void {
      this.scope.texture(this.textures, photoKey);
      for (const asset of visualAssets) this.scope.texture(this.textures, visualKey(asset));
      if (!this.textures.exists(photoKey)) {
        context.run.assetFailed('magic-photo-required-photo-unavailable');
        return;
      }
      if (visualAssets.some((asset) => !this.textures.exists(visualKey(asset)))) {
        context.run.assetFailed('magic-photo-winter-art-unavailable');
        return;
      }
      createProceduralArt(this, this.scope);
      const source = this.textures.getFrame(photoKey);
      const aspect = source.realWidth / source.realHeight;
      const focal = context.selectedPhoto.focalPoint;
      const safeZone =
        context.selectedPhoto.faceSafeZone ??
        context.selectedPhoto.subjectBounds ??
        (focal
          ? {
              x: Math.max(0, focal.x - 0.15),
              y: Math.max(0, focal.y - 0.17),
              width: 0.3,
              height: 0.34,
            }
          : undefined);
      this.model = new MagicPhotoStateMachine(aspect, context.runSeed, safeZone);
      this.audio = new AudioManager(this, this.soundEnabled, context.quality !== 'LOW');
      this.scope.add(() => {
        this.audio.destroy();
        for (const asset of audioAssets) this.cache.audio.remove(`magic-photo-audio-${asset}`);
      });
      this.backdrop = this.add.graphics().setDepth(-10);
      this.winter = new WinterEnvironment(this, context.quality, reduced);
      this.photoGlow = this.add.image(0, 0, artKey('glow')).setDepth(1).setAlpha(0.35);
      this.photoRoot = this.add.container(0, 0).setDepth(6).setVisible(false);
      this.frame = this.add.graphics();
      this.photo = this.add.image(0, 0, photoKey);
      this.photoRoot.add([this.frame, this.photo]);
      this.gift = new GiftController(this, reduced);
      this.ice = new IceController(this, this.scope, aspect, this.model.ice);
      this.cracks = this.add.graphics().setDepth(9);
      this.fx = new FXManager(this, context.quality, reduced);
      this.hint = new HintManager(this, reduced);
      this.instruction = new InstructionPanel(this, this.scope, reduced);
      this.progress = new DiscoveryStars(this, this.scope, reduced);
      this.createControls();
      this.scope.add(this.bus.subscribe((event) => this.onGameplayEvent(event)));
      this.scope.on(this.input, 'pointerdown', (pointer: PhaserModule.Input.Pointer) =>
        this.pointerDown(pointer),
      );
      this.scope.on(this.input, 'pointermove', (pointer: PhaserModule.Input.Pointer) =>
        this.pointerMove(pointer),
      );
      this.scope.on(this.input, 'pointerup', (pointer: PhaserModule.Input.Pointer) =>
        this.pointerUp(pointer),
      );
      this.scope.on(this.input, 'pointerupoutside', () => this.cancelPointer());
      const cancel = (): void => this.cancelPointer();
      this.game.canvas.addEventListener('pointercancel', cancel);
      this.game.canvas.addEventListener('touchcancel', cancel);
      this.scope.add(() => {
        this.game.canvas.removeEventListener('pointercancel', cancel);
        this.game.canvas.removeEventListener('touchcancel', cancel);
      });
      this.scope.on(this.scale, Phaser.Scale.Events.RESIZE, () => {
        this.cancelPointer();
        this.relayout();
      });
      if (this.game.renderer)
        this.scope.on(this.game.renderer, 'restorewebgl', () => this.ice.restore());
      visibility = (paused) => {
        this.visibilityPaused = paused;
        this.syncPause();
      };
      this.loaded = true;
      this.scope.add(() => {
        this.model.finish();
        this.pump();
      });
      this.relayout();
      context.run.ready();
      this.model.ready();
      this.pump();
      this.renderPresentation();
    }

    private createControls(): void {
      const control = (
        icon: () => 'pause' | 'play' | 'sound' | 'muted',
        action: () => void,
      ): PhaserModule.GameObjects.Rectangle => {
        const target = this.add
          .rectangle(0, 34, 48, 48, 0)
          .setDepth(31)
          .setInteractive({ useHandCursor: true });
        attachCrystalControl({
          target,
          graphics: this.add.graphics().setDepth(30),
          events: this.events,
          scope: this.scope,
          icon,
          reducedMotion: reduced,
        });
        this.scope.on(target, 'pointerdown', () => {
          this.consumedControl = true;
          this.audio.gesture();
          action();
        });
        return target;
      };
      this.soundButton = control(
        () => (this.soundEnabled ? 'sound' : 'muted'),
        () => {
          this.soundEnabled = !this.soundEnabled;
          this.audio.setEnabled(this.soundEnabled);
          context.run.soundChanged?.(this.soundEnabled);
          if (this.soundEnabled) this.audio.play('tap');
        },
      );
      this.pauseButton = control(
        () => (this.paused ? 'play' : 'pause'),
        () => {
          this.manualPaused = !this.manualPaused;
          if (this.manualPaused) this.audio.play('tap');
          this.syncPause();
          if (!this.manualPaused) this.audio.play('tap');
        },
      );
      this.pauseVeil = this.add
        .rectangle(0, 0, 1, 1, 0x030c15, 0.86)
        .setOrigin(0)
        .setDepth(25)
        .setVisible(false);
      this.pauseCard = this.add
        .rectangle(0, 0, 280, 238, 0, 0)
        .setDepth(29)
        .setVisible(false)
        .setInteractive({ useHandCursor: true });
      this.pauseTitle = this.add
        .text(0, 0, 'Uma pausa na magia', {
          fontFamily: 'Nunito, sans-serif',
          fontSize: '21px',
          color: '#fff2d2',
        })
        .setOrigin(0.5)
        .setDepth(28)
        .setVisible(false);
      this.pausePrompt = this.add
        .text(0, 0, 'Toque para continuar', {
          fontFamily: 'Nunito, sans-serif',
          fontSize: '16px',
          color: '#f8dba5',
        })
        .setOrigin(0.5)
        .setDepth(28)
        .setVisible(false);
      attachCrystalPause({
        backdrop: this.pauseVeil,
        graphics: this.add.graphics().setDepth(27),
        events: this.events,
        scope: this.scope,
      });
      this.scope.on(this.pauseCard, 'pointerdown', () => {
        if (!this.manualPaused) return;
        this.consumedControl = true;
        this.manualPaused = false;
        this.audio.gesture();
        this.syncPause();
        this.audio.play('tap');
      });
    }

    private relayout(): void {
      this.layout = new PhotoLayoutManager(
        this.scale.width,
        this.scale.height,
        this.model.aspect,
        this.model.state === 'FREE_PLAY',
      );
      const l = this.layout;
      const p = l.photo;
      this.photo.setDisplaySize(p.width, p.height);
      this.frame
        .clear()
        .fillStyle(0x020913, 0.45)
        .fillRoundedRect(-p.width / 2 - 5, -p.height / 2 + 3, p.width + 16, p.height + 16, 7);
      this.frame
        .fillStyle(0xffefce)
        .fillRoundedRect(-p.width / 2 - 6, -p.height / 2 - 6, p.width + 12, p.height + 12, 6);
      this.frame
        .lineStyle(1.5, 0xd7af69)
        .strokeRoundedRect(-p.width / 2 - 8, -p.height / 2 - 8, p.width + 16, p.height + 16, 8);
      this.photoGlow
        .setPosition(p.x + p.width / 2, p.y + p.height / 2)
        .setDisplaySize(p.width * 1.6, p.height * 1.35);
      this.ice.layout(l);
      this.winter.layout(l);
      this.soundButton.setX(l.width - 94);
      this.pauseButton.setX(l.width - 36);
      this.pauseVeil.setSize(l.width, l.height);
      this.pauseCard
        .setPosition(l.width / 2, l.height / 2)
        .setSize(Math.min(320, l.width - 32), 238);
      this.pauseTitle.setPosition(l.width / 2, l.height / 2 - 52);
      this.pausePrompt.setPosition(l.width / 2, l.height / 2 - 3);
      this.drawBackdrop();
      this.drawCracks();
      this.renderPresentation();
    }

    private drawBackdrop(): void {
      const { width: w, height: h } = this.layout;
      const g = this.backdrop.clear();
      g.fillGradientStyle(0x0a1a29, 0x071222, 0x092a24, 0x10231e).fillRect(0, 0, w, h);
      // Pine boughs and practical warm bulbs leave the center quiet.
      for (const side of [0, 1]) {
        const sign = side ? -1 : 1;
        const edge = side ? w + 8 : -8;
        g.lineStyle(2, 0x705b38, 0.36).lineBetween(edge, 74, edge + sign * 90, 115);
        for (let i = 0; i < 28; i++) {
          const x = edge + sign * i * 3.1;
          const y = 74 + i * 1.43;
          const length = 14 + Math.sin(i * 0.81) * 6;
          g.lineStyle(1.2, i % 3 ? 0x245044 : 0x447064, 0.55);
          g.lineBetween(x, y, x + sign * 8, y - length);
          g.lineBetween(x, y, x - sign * 10, y + length * 0.8);
        }
      }
      for (let i = 0; i < 18; i++) {
        const x = (w * (i + 0.5)) / 18;
        const y = 15 + Math.sin((i / 17) * Math.PI) * 8;
        g.fillStyle(0xe6af55, 0.055).fillCircle(x, y, 16);
        g.fillStyle(0xffc878, 0.12).fillCircle(x, y, 7);
        g.fillStyle(0xffe5aa, 0.8).fillEllipse(x, y, 3, 5);
      }
      for (let i = 0; i < 12; i++) {
        const x = i % 2 ? w - 9 - ((i * 7) % 22) : 9 + ((i * 7) % 22);
        g.fillStyle(0xf2bb65, 0.045).fillCircle(
          x,
          120 + ((i * 83) % Math.max(1, h - 170)),
          10 + (i % 4) * 4,
        );
      }
    }

    override update(_time: number, delta: number): void {
      if (!this.loaded || this.paused) return;
      this.model.update(Math.min(delta, 80));
      this.pump();
      this.audio.update();
      this.renderPresentation();
      this.ice.flush();
    }

    private renderPresentation(): void {
      if (!this.layout) return;
      const m = this.model;
      const l = this.layout;
      const p = l.photo;
      this.gift.render(m, l);
      const giftOnly = [
        'PRELOAD',
        'INTRO',
        'GIFT_IDLE',
        'GIFT_TOUCH_1',
        'GIFT_TOUCH_2',
        'GIFT_READY',
        'RIBBON_DRAG',
        'GIFT_OPENING',
      ].includes(m.state);
      this.photoRoot.setVisible(!giftOnly);
      this.photoGlow.setVisible(!giftOnly);
      const fraction =
        m.state === 'PHOTO_REVEAL' ? Math.min(1, m.stateElapsedMs / (reduced ? 180 : 850)) : 1;
      const eased = 1 - Math.pow(1 - fraction, 3);
      this.photoRoot
        .setPosition(p.x + p.width / 2, l.gift.y * (1 - eased) + (p.y + p.height / 2) * eased)
        .setScale(reduced ? 1 : 0.34 + eased * 0.66)
        .setAlpha(fraction)
        .setAngle(reduced ? 0 : -5 * (1 - eased));
      const frostVisible =
        m.state === 'FROST_TRANSITION' || m.acceptsIce || m.state === 'ICE_BREAK';
      this.ice.surface
        .setVisible(frostVisible)
        .setAlpha(
          m.state === 'FROST_TRANSITION'
            ? Math.min(1, m.stateElapsedMs / 900)
            : m.state === 'ICE_BREAK'
              ? Math.max(0, 1 - Math.max(0, m.stateElapsedMs - 450) / 600)
              : 1,
        );
      this.ice.crown
        .setVisible(frostVisible)
        .setAlpha(this.ice.surface.alpha * (1 - Math.min(0.85, m.ice.progress)));
      this.cracks
        .setVisible(m.acceptsIce || m.state === 'ICE_BREAK')
        .setAlpha(m.state === 'ICE_BREAK' ? this.ice.surface.alpha : 1);
      const hero = m.state === 'PHOTO_HERO';
      this.winter.update(m.elapsedMs, l, frostVisible, hero || m.state === 'FREE_PLAY');
      const message =
        this.tapAlternative && m.state === 'GIFT_READY'
          ? 'Toque na estrelinha lá em cima!'
          : m.state === 'MAGIC_HUNT' && m.elapsedMs < this.starHintUntil
            ? 'Olhe onde a estrelinha está brilhando!'
            : (instructions[m.state] ?? '');
      this.instruction.render(
        message,
        l,
        m.elapsedMs,
        giftOnly ? Math.min(l.height - 64, l.gift.y + 200 * l.gift.scale) : l.instructionY,
        !hero,
      );
      this.progress.render(m, l);
      const description =
        m.state === 'MAGIC_HUNT'
          ? `${m.found} de 5 descobertas. ${message} Toque nas estrelas para pedir uma dica.`
          : message;
      if (this.game.canvas.getAttribute('aria-description') !== description)
        this.game.canvas.setAttribute('aria-description', description);
      this.soundButton.setVisible(!hero);
      this.pauseButton.setVisible(!hero);
      this.fx.update(
        m.elapsedMs,
        l,
        m.state === 'FINALE' ? m.stateElapsedMs : undefined,
        hero || m.state === 'FREE_PLAY',
      );
      if (hero || this.paused) this.hint.hide();
      else this.hint.update(m, l, this.pointerId !== undefined, this.tapAlternative);
      if (m.state === 'GIFT_OPENING' && m.stateElapsedMs >= 620 && !this.openingBurst) {
        this.openingBurst = true;
        this.fx.sparkleBurst({ x: l.gift.x, y: l.gift.y - 80 * l.gift.scale }, 32);
      }
      if (m.state === 'ICE_BREAK' && m.stateElapsedMs >= 450 && !this.breakBurst) {
        this.breakBurst = true;
        this.fx.iceExplosion(l);
        this.audio.play('break');
        this.haptic('heavy');
      }
    }

    private pointerDown(pointer: PhaserModule.Input.Pointer): void {
      if (this.consumedControl) {
        this.consumedControl = false;
        return;
      }
      if (!this.loaded || this.paused || this.pointerId !== undefined) return;
      this.audio.gesture();
      const m = this.model;
      const l = this.layout;
      const star = this.progress.hitIndex(pointer.x, pointer.y);
      if (star !== undefined && m.state === 'MAGIC_HUNT') {
        if (m.elapsedMs - this.lastStarTouch < 420) return;
        this.lastStarTouch = m.elapsedMs;
        this.progress.touch(star, m.elapsedMs);
        this.audio.play('star');
        if (star < m.found) this.fx.sparkleBurst(this.progress.position(star), 9);
        else {
          const target = m.hotspots.filter((point) => !point.discovered)[star - m.found];
          if (target) {
            this.hint.request(target.id, m.elapsedMs);
            this.starHintUntil = m.elapsedMs + 2600;
          }
        }
        this.renderPresentation();
        return;
      }
      if (this.winter.touch(pointer.x, pointer.y, m.elapsedMs, l)) {
        this.audio.play('snow');
        return;
      }
      if (pointer.y < 62) return;
      if (m.state === 'GIFT_READY') {
        const bowY = l.gift.y - 146 * l.gift.scale;
        if (
          this.tapAlternative &&
          Math.abs(pointer.x - l.gift.x) < 64 &&
          Math.abs(pointer.y - (bowY - l.gift.pullDistance)) < 48
        ) {
          m.startRibbon();
          m.pullRibbon(1);
          this.tapAlternative = false;
          this.pump();
          return;
        }
        if (this.gift.bowContains(pointer.x, pointer.y, l) && m.startRibbon()) {
          this.pointerId = pointer.id;
          this.ribbonStartY = pointer.y;
          this.audio.play('ribbon');
          this.pump();
        }
        return;
      }
      if (this.gift.contains(pointer.x, pointer.y, l) && m.tapGift()) {
        if (!this.started) {
          this.started = true;
          context.run.start();
        }
        this.pump();
        this.renderPresentation();
        return;
      }
      if (m.state === 'MAGIC_HUNT' || m.acceptsIce || m.state === 'FREE_PLAY') {
        const point = l.toNormalized(pointer);
        if (!point) return;
        this.pointerId = pointer.id;
        this.lastPoint = point;
        if (m.state === 'FREE_PLAY') {
          this.freeTapCount = m.elapsedMs - this.lastFreeTap < 550 ? this.freeTapCount + 1 : 1;
          this.lastFreeTap = m.elapsedMs;
          const egg = this.freeTapCount % 5 === 0;
          if (egg) this.fx.found('santa', l.toWorld({ x: 0.88, y: 0.1 }), m.elapsedMs);
          else this.fx.sparkleBurst(pointer, this.freeTapCount >= 3 ? 15 : 6);
          this.audio.play(egg ? 'santa' : 'trail');
        } else this.paint(point, point, pointer);
      }
    }

    private pointerMove(pointer: PhaserModule.Input.Pointer): void {
      if (this.paused || this.pointerId !== pointer.id || !pointer.isDown) return;
      if (this.model.state === 'RIBBON_DRAG') {
        this.model.pullRibbon((this.ribbonStartY - pointer.y) / this.layout.gift.pullDistance);
        this.pump();
        this.renderPresentation();
        return;
      }
      const point = this.layout.toNormalized(pointer);
      if (!point) {
        this.lastPoint = undefined;
        this.fx.resetTrail();
        return;
      }
      this.paint(this.lastPoint ?? point, point, pointer);
      this.lastPoint = point;
    }

    private paint(from: Point, to: Point, pointer: PhaserModule.Input.Pointer): void {
      if (this.model.state === 'MAGIC_HUNT') {
        this.model.hunt(from, to);
        this.fx.magicTrail(pointer, Math.hypot(pointer.velocity.x, pointer.velocity.y));
        this.audio.play('trail');
      } else if (this.model.acceptsIce) {
        this.ice.erase(from, to);
        this.ice.flush();
        if (this.model.scratch(from, to)) {
          this.fx.iceDust(pointer);
          this.audio.play('scrape');
        }
      } else if (this.model.state === 'FREE_PLAY') this.fx.magicTrail(pointer, 40);
      this.pump();
      this.renderPresentation();
    }

    private pointerUp(pointer: PhaserModule.Input.Pointer): void {
      if (this.pointerId !== pointer.id) return;
      if (this.model.state === 'RIBBON_DRAG') {
        const wasTap =
          this.model.ribbonProgress < 0.08 && Math.abs(pointer.y - this.ribbonStartY) < 14;
        this.model.releaseRibbon();
        this.tapAlternative = wasTap;
        this.pump();
      }
      this.pointerId = undefined;
      this.lastPoint = undefined;
      this.fx.resetTrail();
      this.renderPresentation();
    }
    private cancelPointer(): void {
      if (!this.loaded) return;
      this.model.releaseRibbon(true);
      this.pointerId = undefined;
      this.lastPoint = undefined;
      this.tapAlternative = false;
      this.fx.resetTrail();
      this.pump();
    }
    private pump(): void {
      this.bus.publish(this.model.drainEvents());
    }

    private onGameplayEvent(event: MagicEvent): void {
      if (event.type === 'RIBBON_PROGRESS') {
        this.audio.play('ribbon');
        this.haptic('light');
        return;
      }
      if (event.type === 'MAGIC_POINT_FOUND') {
        const point = this.layout.toWorld(event.hotspot);
        this.fx.found(event.hotspot.effect, point, this.model.elapsedMs);
        this.audio.play(event.hotspot.effect);
        this.haptic('light');
        context.run.interactionSettled();
        context.run.milestone?.(`magic-point-${event.hotspot.id + 1}`);
        return;
      }
      if (event.type !== 'STATE_ENTERED') return;
      const state = event.state;
      const description =
        instructions[state] ??
        (
          {
            GIFT_OPENING: 'O presente está se abrindo',
            PHOTO_REVEAL: 'Sua fotografia de Natal',
            ICE_BREAK: 'O gelo se quebrou',
            FINALE: 'A magia ilumina sua foto',
            PHOTO_HERO: 'Sua fotografia pronta para admirar',
            FREE_PLAY: 'Toque na foto para brincar com a magia',
          } as Partial<Record<MagicState, string>>
        )[state] ??
        'A Magia da Minha Foto de Natal';
      this.game.canvas.setAttribute('aria-label', description);
      const cue: Partial<Record<MagicState, MagicCue>> = {
        GIFT_TOUCH_1: 'tap',
        GIFT_TOUCH_2: 'tap2',
        GIFT_READY: 'ready',
        GIFT_OPENING: 'open',
        PHOTO_REVEAL: 'reveal',
        MAGIC_COMPLETE: 'wonder',
        FROST_TRANSITION: 'frost',
        ICE_CRACK_1: 'crack1',
        ICE_CRACK_2: 'crack2',
        ICE_BREAK: 'crack2',
        FINALE: 'finale',
      };
      if (cue[state]) this.audio.play(cue[state]);
      if (['GIFT_TOUCH_1', 'GIFT_TOUCH_2', 'GIFT_READY'].includes(state)) {
        const level = state === 'GIFT_TOUCH_1' ? 1 : state === 'GIFT_TOUCH_2' ? 2 : 3;
        this.fx.sparkleBurst(
          { x: this.layout.gift.x - 128 * this.layout.gift.scale, y: this.layout.gift.y },
          4 + level * 3,
        );
        this.fx.sparkleBurst(
          { x: this.layout.gift.x + 128 * this.layout.gift.scale, y: this.layout.gift.y },
          4 + level * 3,
        );
        this.haptic('light');
        context.run.interactionSettled();
      }
      if (state === 'ICE_CRACK_1' || state === 'ICE_CRACK_2') {
        this.drawCracks();
        this.haptic('medium');
      }
      if (state === 'PHOTO_HERO') this.fx.clear();
      if (state === 'FREE_PLAY') {
        this.relayout();
        context.run.complete();
      }
      context.run.milestone?.(state.toLowerCase().replaceAll('_', '-'));
    }

    private drawCracks(): void {
      this.cracks.clear();
      const level = this.model.ice.progress >= 0.45 ? 2 : this.model.ice.progress >= 0.25 ? 1 : 0;
      for (let i = 0; i < level * 4; i++) {
        const side = i % 2 === 0 ? 0 : 1;
        const y = 0.12 + i * 0.11;
        const a = this.layout.toWorld({ x: side, y });
        const b = this.layout.toWorld({ x: side ? 0.89 : 0.11, y: y + 0.055 });
        const c = this.layout.toWorld({ x: side ? 0.79 : 0.21, y: y + 0.025 });
        this.cracks
          .lineStyle(1.5, 0xeefbff, 0.78)
          .beginPath()
          .moveTo(a.x, a.y)
          .lineTo(b.x, b.y)
          .lineTo(c.x, c.y)
          .strokePath();
      }
    }
    private haptic(style: 'light' | 'medium' | 'heavy'): void {
      void context.haptics.impact(style).catch(() => undefined);
    }
    private syncPause(): void {
      if (!this.loaded) return;
      const paused = this.manualPaused || this.visibilityPaused;
      if (paused === this.paused) return;
      this.paused = paused;
      this.winter.setPaused(paused);
      this.fx.setPaused(paused);
      this.cancelPointer();
      this.fx.clear();
      this.hint.hide();
      this.time.paused = paused;
      for (const item of [this.pauseVeil, this.pauseCard, this.pauseTitle, this.pausePrompt])
        item.setVisible(paused);
      if (paused) {
        this.audio.pause();
        this.tweens.pauseAll();
      } else {
        this.audio.resume();
        this.tweens.resumeAll();
      }
      if (this.manualPaused) context.run.pause('game');
      else context.run.resume('game');
      if (this.visibilityPaused) context.run.pause('visibility');
      else context.run.resume('visibility');
    }
  }
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: 0x071222,
    antialias: true,
    input: { activePointers: 1 },
    scale: { mode: Phaser.Scale.RESIZE, parent, width: '100%', height: '100%' },
    scene: MagicPhotoScene,
  });
  const hide = (): void => visibility?.(true);
  const show = (): void => visibility?.(document.hidden);
  game.events.on(Phaser.Core.Events.HIDDEN, hide);
  game.events.on(Phaser.Core.Events.BLUR, hide);
  game.events.on(Phaser.Core.Events.VISIBLE, show);
  game.events.on(Phaser.Core.Events.FOCUS, show);
  let destruction: Promise<void> | undefined;
  return {
    destroy(): Promise<void> {
      destruction ??= new Promise<void>((resolve) => {
        game.events.once(Phaser.Core.Events.DESTROY, () => {
          game.events.off(Phaser.Core.Events.HIDDEN, hide);
          game.events.off(Phaser.Core.Events.BLUR, hide);
          game.events.off(Phaser.Core.Events.VISIBLE, show);
          game.events.off(Phaser.Core.Events.FOCUS, show);
          context.run.exit();
          resolve();
        });
        game.destroy(true, false);
      });
      return destruction;
    },
  };
}

export const magicPhotoGameModule: GameModule<typeof PhaserModule, HTMLElement> = {
  definition: magicPhotoDefinition,
  create: createMagicPhotoGame,
};
