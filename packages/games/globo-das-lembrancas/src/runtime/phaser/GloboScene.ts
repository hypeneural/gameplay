import * as Phaser from 'phaser';
import { SceneScope } from '@christmas-games/platform';
import type { GameBridge, GameContext } from '@christmas-games/platform';
import { SnowGlobeStateMachine } from '../../domain/SnowGlobeStateMachine.js';
import type { GloboDomainEvent } from '../../domain/SnowGlobeStateMachine.js';
import { GloboLayoutManager } from '../GloboLayoutManager.js';
import { createGloboProceduralArt, globoArtKey } from './GloboProceduralArt.js';
import { GlobeGlassController } from './GlobeGlassController.js';
import { SnowParticleSystem } from './SnowParticleSystem.js';
import { WindingKeyObject } from './WindingKeyObject.js';
import { MusicalGemsObject } from './MusicalGemsObject.js';
import { GloboPhotoDiorama } from './GloboPhotoDiorama.js';
import { GloboAudioDirector, globoAudioFiles } from './GloboAudioDirector.js';
import {
  globoButton,
  globoText,
  createGloboPauseOverlay,
  type GloboButton,
} from './GloboControls.js';

const NOTE_PITCHES: Record<string, number> = {
  C5: 1.0,
  E5: 1.25,
  G5: 1.5,
  C6: 2.0,
};

export class GloboScene extends Phaser.Scene {
  private readonly scope = new SceneScope();
  private sm!: SnowGlobeStateMachine;
  private layoutMgr!: GloboLayoutManager;
  private glass!: GlobeGlassController;
  private snowSystem!: SnowParticleSystem;
  private keyObj!: WindingKeyObject;
  private gemsObj!: MusicalGemsObject;
  private audioDir!: GloboAudioDirector;

  private roomBg!: Phaser.GameObjects.Image;
  private tableShadow!: Phaser.GameObjects.Graphics;
  private dioramaBg!: Phaser.GameObjects.Image;
  private photoDiorama!: GloboPhotoDiorama;
  private gemWire!: Phaser.GameObjects.Graphics;
  private glassDome!: Phaser.GameObjects.Image;
  private glassFresnel!: Phaser.GameObjects.Graphics;
  private woodBase!: Phaser.GameObjects.Image;
  private shockwave!: Phaser.GameObjects.Image;

  private coachText!: Phaser.GameObjects.Text;
  private soundButton!: GloboButton;
  private pauseButton!: GloboButton;
  private pauseOverlay!: ReturnType<typeof createGloboPauseOverlay>;

  private activeDrag: 'key' | 'button' | 'steam' | 'dome' | undefined;
  private lastTouchNorm = { x: 0.5, y: 0.5 };
  private photoKey = 'globo-photo';
  private manualPaused = false;
  private soundEnabled = true;

  constructor(
    private readonly context: GameContext,
    private readonly _bridge: GameBridge,
  ) {
    super('GloboScene');
  }

  preload(): void {
    // 1. Visual assets
    this.load.image(
      'globo-bg-sala-natal-v1',
      '/assets/globo-das-lembrancas/backgrounds/sala-natal-aconchegante-v1.webp',
    );
    this.load.image(
      'globo-carved-wood-base-v1',
      '/assets/globo-das-lembrancas/art/carved-wood-base-v1.webp',
    );
    this.load.image(
      'globo-glass-dome-specular-v1',
      '/assets/globo-das-lembrancas/art/glass-dome-specular-v1.webp',
    );
    this.load.image(
      'globo-chave-corda-latao-v1',
      '/assets/globo-das-lembrancas/art/chave-corda-latao-v1.webp',
    );
    this.load.image('globo-btn-rubi', '/assets/globo-das-lembrancas/art/botao-natal-1-rubi.webp');
    this.load.image(
      'globo-btn-esmeralda',
      '/assets/globo-das-lembrancas/art/botao-natal-2-esmeralda.webp',
    );
    this.load.image(
      'globo-btn-safira',
      '/assets/globo-das-lembrancas/art/botao-natal-3-safira.webp',
    );
    this.load.image(
      'globo-btn-topazio',
      '/assets/globo-das-lembrancas/art/botao-natal-4-topazio.webp',
    );
    this.load.image(
      'globo-winter-diorama-v1',
      '/assets/globo-das-lembrancas/art/winter-diorama-v1.webp',
    );

    // 2. Client photo (game variant)
    this.load.image(this.photoKey, this.context.selectedPhoto.variants.game);

    // 3. Audio files
    for (const item of globoAudioFiles) {
      this.load.audio(item.key, item.urls);
    }
  }

  create(): void {
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanup());

    const width = this.scale.width;
    const height = this.scale.height;

    // Domain state machine
    const particleCount = this.context.quality === 'LOW' ? 24 : 60;
    this.sm = new SnowGlobeStateMachine({
      aspect: this.context.selectedPhoto.aspectRatio,
      safeZone: this.context.selectedPhoto.faceSafeZone,
      particleCount,
    });

    // Layout manager
    this.layoutMgr = new GloboLayoutManager(width, height, this.context.selectedPhoto);

    // Audio director
    this.soundEnabled = this.context.preferences?.soundEnabled ?? true;
    this.audioDir = new GloboAudioDirector(this, this.soundEnabled);
    this.scope.add(() => this.audioDir.destroy());

    // Expose for testing and visual automation
    if (typeof window !== 'undefined') {
      (window as unknown as { __globoScene?: GloboScene }).__globoScene = this;
    }

    // Procedural textures
    createGloboProceduralArt(this, this.scope);

    // Build scene graph:
    // Layer -100: Cozy Christmas room background (fireplace, tree bokeh, table)
    this.roomBg = this.add.image(0, 0, 'globo-bg-sala-natal-v1').setDepth(-100);

    // Layer -20: Interior diorama sky (disabled to maintain spherical transparency against cozy room)
    this.dioramaBg = this.add
      .image(0, 0, 'globo-winter-diorama-v1')
      .setDepth(-20)
      .setVisible(false);

    // Layer 4-8: 3D Photo Diorama inside dome (pedestal, velvet matte, photo, carved frame)
    this.photoDiorama = new GloboPhotoDiorama(this, this.scope, this.photoKey);
    this.gemWire = this.add.graphics().setDepth(16);

    // Layer 10: Glass controller and snow
    this.glass = new GlobeGlassController(this, this.scope, this.layoutMgr.dome.diameter);
    this.snowSystem = new SnowParticleSystem(this, this.scope, this.sm.snow, particleCount);

    // Layer 20: Table contact shadow under base
    this.tableShadow = this.add.graphics().setDepth(20);

    // Layer 22: Shockwave ring
    this.shockwave = this.add
      .image(0, 0, globoArtKey('refraction-ring'))
      .setDepth(22)
      .setVisible(false);

    // Layer 22: 3D crystal glass dome with specular reflections & ambient Fresnel
    this.glassDome = this.add.image(0, 0, 'globo-glass-dome-specular-v1').setDepth(22);
    this.glassFresnel = this.add.graphics().setDepth(23);

    // Layer 24: 3D carved wood base (collar holds crystal dome snugly)
    this.woodBase = this.add.image(0, 0, 'globo-carved-wood-base-v1').setDepth(24);

    // Layer 26-29: Key and Buttons
    this.keyObj = new WindingKeyObject(this, this.scope);
    this.gemsObj = new MusicalGemsObject(this, this.scope);

    // Coach Text: guides the child warmly and clearly
    this.coachText = globoText(this, '', 16, 30, '#fff3d9').setShadow(
      0,
      2,
      '#06131c',
      4,
      false,
      true,
    );

    // HUD buttons (top right)
    const reduced = this.context.preferences?.reducedMotion ?? false;
    this.soundButton = globoButton(
      this,
      this.scope,
      this.soundEnabled ? 'Som' : 'Mudo',
      56,
      80,
      reduced,
      () => this.audioDir.unlock(),
      () => this.toggleSound(),
    );

    this.pauseButton = globoButton(
      this,
      this.scope,
      'Pausa',
      56,
      80,
      reduced,
      () => this.audioDir.unlock(),
      () => this.togglePause(),
    );

    this.pauseOverlay = createGloboPauseOverlay(this, this.scope, () => this.togglePause());

    this.scope.add(() => {
      this.gemWire.destroy();
      this.coachText.destroy();
      this.pauseOverlay.destroy();
    });

    // Apply layout to all objects
    this.applyLayout();
    this.updateCoachText();

    // Scale resize handler
    this.scale.on(Phaser.Scale.Events.RESIZE, () => {
      this.layoutMgr = new GloboLayoutManager(
        this.scale.width,
        this.scale.height,
        this.context.selectedPhoto,
      );
      this.applyLayout();
    });

    // Setup user input
    this.setupInput();

    // Start lifecycle runs
    this.context.run.open();
    this.context.run.ready();
    this.context.run.start();
    this.sm.ready();
  }

  override update(_time: number, delta: number): void {
    if (this.manualPaused) return;

    const dt = delta / 1000;
    this.sm.update(delta);
    this.audioDir.tick(dt);
    this.snowSystem.update(this.layoutMgr);

    // Drain and dispatch domain events
    const events = this.sm.drainEvents();
    for (const event of events) {
      this.handleDomainEvent(event);
    }
  }

  private applyLayout(): void {
    const width = this.scale.width;
    const height = this.scale.height;
    const l = this.layoutMgr;
    const dome = l.dome;
    const base = l.base;

    // Room background scaling: cover entire mobile canvas
    const bgScale = Math.max(width / this.roomBg.width, height / this.roomBg.height);
    this.roomBg.setPosition(width / 2, height / 2).setScale(bgScale);

    // Diorama background inside globe
    this.dioramaBg.setPosition(dome.x, dome.y).setDisplaySize(dome.diameter, dome.diameter);

    // 3D Photo Diorama inside globe (pedestal, velvet matte, photo, carved frame)
    this.photoDiorama.layout(l);

    // Soft contact shadow of base on the wooden table
    this.tableShadow.clear();
    this.tableShadow.fillStyle(0x04080c, 0.45);
    this.tableShadow.fillEllipse(
      base.x,
      base.y + base.height * 0.44,
      base.width * 0.92,
      base.height * 0.22,
    );

    // Glass and snow
    this.glass.layout(l);
    const domeTextureSize = Math.round(dome.diameter * 1.212);
    this.glassDome.setPosition(dome.x, dome.y).setDisplaySize(domeTextureSize, domeTextureSize);

    // Ambient Fresnel reflections on glass dome (warm golden on left, cool ambient on right)
    this.glassFresnel.clear();
    this.glassFresnel.lineStyle(2.5, 0xfff0c8, 0.42);
    this.glassFresnel.beginPath();
    this.glassFresnel.arc(dome.x, dome.y, dome.radius - 1.5, Math.PI * 0.85, Math.PI * 1.55);
    this.glassFresnel.strokePath();

    this.glassFresnel.lineStyle(1.8, 0xd4ecff, 0.28);
    this.glassFresnel.beginPath();
    this.glassFresnel.arc(dome.x, dome.y, dome.radius - 1.5, Math.PI * 0.05, Math.PI * 0.55);
    this.glassFresnel.strokePath();

    this.woodBase.setPosition(base.x, base.y).setDisplaySize(base.width, base.height);

    // Connecting wire between gems on the mahogany base
    this.renderGemWire();

    // Key and buttons
    this.keyObj.layout(l);
    this.gemsObj.layout(l);

    // HUD controls and Coach Text
    this.soundButton.move(l.hud.sound.x, l.hud.sound.y);
    this.pauseButton.move(l.hud.pause.x, l.hud.pause.y);
    this.coachText.setPosition(l.hud.coach.x, l.hud.coach.y);
    this.coachText.setWordWrapWidth(l.hud.coach.width);
    this.pauseOverlay.layout(this.scale.width, this.scale.height);
  }

  private renderGemWire(): void {
    this.gemWire.clear();
  }

  private updateCoachText(): void {
    const litCount = this.sm.gems.litCount;
    const wound = this.sm.winding.isFullyWound;

    if (
      this.sm.state === 'MUSIC_BOX_STARTING' ||
      this.sm.state === 'CELEBRATING' ||
      this.sm.state === 'PHOTO_HERO' ||
      this.sm.state === 'FREE_PLAY' ||
      this.sm.state === 'COMPLETE'
    ) {
      this.coachText.setText('🌟 O Globo de Neve da Família brilhou!');
      this.keyObj.setHint(false);
    } else if (litCount < 4 && !wound) {
      this.coachText.setText(
        litCount === 0
          ? '✨ Aperte os 4 botões e dê corda na chavinha!'
          : `✨ Botões acesos: ${litCount} de 4`,
      );
      this.keyObj.setHint(!wound);
    } else if (litCount < 4) {
      this.coachText.setText(`✨ Aperte os botões restantes: ${litCount} de 4`);
      this.keyObj.setHint(false);
    } else if (!wound) {
      this.coachText.setText('🔑 Dê corda na chavinha dourada!');
      this.keyObj.setHint(true);
    } else {
      this.coachText.setText('❄️ Passe o dedinho no globo para espalhar a neve!');
      this.keyObj.setHint(false);
    }
    this.renderGemWire();
  }

  private setupInput(): void {
    this.input.on(Phaser.Input.Events.POINTER_DOWN, (pointer: Phaser.Input.Pointer) => {
      this.audioDir.unlock();
      const x = pointer.x;
      const y = pointer.y;

      // 1. Check Winding Key (Both tap and drag supported)
      const keyHit = this.layoutMgr.key.hitArea;
      if (
        x >= keyHit.x &&
        x <= keyHit.x + keyHit.width &&
        y >= keyHit.y &&
        y <= keyHit.y + keyHit.height
      ) {
        this.activeDrag = 'key';
        const keyPos = this.layoutMgr.assembly.keySocket;
        const startAngle = Math.atan2(y - keyPos.y, x - keyPos.x);
        this.sm.winding.rotate(startAngle);
        this.keyObj.pulse();
        this.keyObj.stepClockwise();
        this.audioDir.play('key-ratchet');
        void this.context.haptics.impact('light');
        this.sm.tapKey();
        this.updateCoachText();
        return;
      }

      // 2. Check 4 Musical Christmas Buttons
      for (const gem of this.layoutMgr.gems) {
        const hit = gem.hitArea;
        if (x >= hit.x && x <= hit.x + hit.width && y >= hit.y && y <= hit.y + hit.height) {
          this.activeDrag = 'button';
          this.gemsObj.pressDown(gem.index);
          const res = this.sm.tapGem(gem.index);
          if (res) {
            const pitch = NOTE_PITCHES[res.note] ?? 1.0;
            this.audioDir.play('chime-note', pitch);
            void this.context.haptics.impact('medium');
            this.gemsObj.setLit(res.gemIndex, true);
            this.updateCoachText();
          } else {
            // Replay capability: already lit button plays its instrument again
            const note = (['C5', 'E5', 'G5', 'C6'] as const)[gem.index] ?? 'C5';
            const pitch = NOTE_PITCHES[note] ?? 1.0;
            this.audioDir.play('chime-note', pitch);
            void this.context.haptics.impact('light');
          }
          return;
        }
      }

      // 3. Check Inside Dome
      const dome = this.layoutMgr.dome;
      const distToCenter = Math.hypot(x - dome.x, y - dome.y);
      if (distToCenter <= dome.radius) {
        const normX = (x - (dome.x - dome.radius)) / dome.diameter;
        const normY = (y - (dome.y - dome.radius)) / dome.diameter;
        this.lastTouchNorm = { x: normX, y: normY };

        // Play crystal glass clink and show shockwave
        this.audioDir.play('glass-clink');
        this.showShockwave(x, y);

        // Check if inside photo rect for steam wiping
        const photo = this.layoutMgr.photoSurface.photo;
        if (
          x >= photo.x &&
          x <= photo.x + photo.width &&
          y >= photo.y &&
          y <= photo.y + photo.height
        ) {
          this.activeDrag = 'steam';
        } else {
          this.activeDrag = 'dome';
        }
      }
    });

    this.input.on(Phaser.Input.Events.POINTER_MOVE, (pointer: Phaser.Input.Pointer) => {
      if (!pointer.isDown || !this.activeDrag) return;

      const x = pointer.x;
      const y = pointer.y;
      const dome = this.layoutMgr.dome;

      if (this.activeDrag === 'key') {
        const keyPos = this.layoutMgr.assembly.keySocket;
        const currentAngle = Math.atan2(y - keyPos.y, x - keyPos.x);
        const clicks = this.sm.rotateKey(currentAngle);
        const springCompression = this.sm.winding.progress * 3;
        this.keyObj.setRotation(currentAngle + this.sm.winding.backlash, springCompression);
        if (clicks > 0) {
          this.audioDir.play('key-ratchet');
          void this.context.haptics.impact('light');
          this.updateCoachText();
        }
      } else if (this.activeDrag === 'steam') {
        const photo = this.layoutMgr.photoSurface.photo;
        const normFrom = {
          x:
            (this.lastTouchNorm.x * dome.diameter - (photo.x - (dome.x - dome.radius))) /
            photo.width,
          y:
            (this.lastTouchNorm.y * dome.diameter - (photo.y - (dome.y - dome.radius))) /
            photo.height,
        };
        const currentNormDome = {
          x: (x - (dome.x - dome.radius)) / dome.diameter,
          y: (y - (dome.y - dome.radius)) / dome.diameter,
        };
        const normTo = {
          x: (currentNormDome.x * dome.diameter - (photo.x - (dome.x - dome.radius))) / photo.width,
          y:
            (currentNormDome.y * dome.diameter - (photo.y - (dome.y - dome.radius))) / photo.height,
        };

        this.glass.erase(normFrom, normTo);
        this.sm.wipeSteam(normFrom, normTo);

        // Swirl snow lightly during finger movement
        const dx = currentNormDome.x - this.lastTouchNorm.x;
        const dy = currentNormDome.y - this.lastTouchNorm.y;
        this.snowSystem.swirl(currentNormDome.x, currentNormDome.y, dx * 10, dy * 10);

        this.lastTouchNorm = currentNormDome;
      } else if (this.activeDrag === 'dome') {
        const currentNormDome = {
          x: (x - (dome.x - dome.radius)) / dome.diameter,
          y: (y - (dome.y - dome.radius)) / dome.diameter,
        };
        const dx = currentNormDome.x - this.lastTouchNorm.x;
        const dy = currentNormDome.y - this.lastTouchNorm.y;
        this.snowSystem.swirl(currentNormDome.x, currentNormDome.y, dx * 15, dy * 15);
        this.lastTouchNorm = currentNormDome;
      }
    });

    this.input.on(Phaser.Input.Events.POINTER_UP, () => {
      this.cancelInput();
    });

    this.input.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, () => {
      this.cancelInput();
    });

    this.input.on(Phaser.Input.Events.GAME_OUT, () => {
      this.cancelInput();
    });

    const onTouchCancel = () => this.cancelInput();
    this.game.canvas.addEventListener('touchcancel', onTouchCancel);
    this.scope.add(() => this.game.canvas.removeEventListener('touchcancel', onTouchCancel));
  }

  private cancelInput(): void {
    if (this.activeDrag === 'key') {
      this.keyObj.relax();
      this.sm.winding.resetAngleTracking();
    } else if (this.activeDrag === 'button') {
      this.gemsObj.releaseUp();
    }
    this.activeDrag = undefined;
  }

  private handleDomainEvent(event: GloboDomainEvent): void {
    switch (event.type) {
      case 'RATCHET_CLICK': {
        this.audioDir.play('key-ratchet');
        void this.context.haptics.impact('light');
        this.keyObj.pulse();
        this.updateCoachText();
        break;
      }
      case 'STEAM_PROGRESS': {
        this.audioDir.play('steam-wipe');
        this.glass.flush();
        break;
      }
      case 'GEM_LIT': {
        const pitch = NOTE_PITCHES[event.gem.note] ?? 1.0;
        this.audioDir.play('chime-note', pitch);
        void this.context.haptics.impact('medium');
        this.gemsObj.setLit(event.gem.gemIndex, true);
        this.gemsObj.pulse(event.gem.gemIndex);
        this.updateCoachText();
        break;
      }
      case 'CELEBRATION_TRIGGERED': {
        this.audioDir.play('musicbox-celebrate');
        void this.context.haptics.impact('heavy');
        this.photoDiorama.highlight(1.08, 900);
        this.updateCoachText();
        this.context.run.complete();
        break;
      }
      case 'STATE_ENTERED': {
        this.updateCoachText();
        if (event.state === 'MUSIC_BOX_STARTING') {
          this.sm.swirlSnow(0.5, 0.5, 0.4, -0.6);
        } else if (event.state === 'GEMS_AWAKENING') {
          this.tweens.add({
            targets: this.glass.surface,
            alpha: 0,
            duration: 600,
            onComplete: () => this.glass.setVisible(false),
          });
        }
        break;
      }
    }
  }

  private showShockwave(x: number, y: number): void {
    this.shockwave.setPosition(x, y).setScale(0.2).setAlpha(0.85).setVisible(true);
    this.tweens.add({
      targets: this.shockwave,
      scale: 1.4,
      alpha: 0,
      duration: 400,
      ease: 'Cubic.easeOut',
      onComplete: () => this.shockwave.setVisible(false),
    });
  }

  private togglePause(): void {
    this.manualPaused = !this.manualPaused;
    if (this.manualPaused) {
      this.context.run.pause('game');
      this.audioDir.setPaused(true);
      this.pauseOverlay.setVisible(true);
      this.pauseButton.text.setText('Seguir');
    } else {
      this.context.run.resume('game');
      this.audioDir.setPaused(false);
      this.pauseOverlay.setVisible(false);
      this.pauseButton.text.setText('Pausa');
    }
  }

  private toggleSound(): void {
    this.soundEnabled = !this.soundEnabled;
    this.audioDir.setEnabled(this.soundEnabled);
    this.soundButton.text.setText(this.soundEnabled ? 'Som' : 'Mudo');
    this.context.run.soundChanged?.(this.soundEnabled);
  }

  setVisibilityPaused(paused: boolean): void {
    if (paused) {
      this.context.run.pause('visibility');
      this.audioDir?.setPaused(true);
    } else {
      this.context.run.resume('visibility');
      this.audioDir?.setPaused(false);
    }
  }

  setSoundEnabled(enabled: boolean): void {
    this.soundEnabled = enabled;
    this.audioDir?.setEnabled(enabled);
    this.soundButton?.text.setText(enabled ? 'Som' : 'Mudo');
  }

  private cleanup(): void {
    this.scope.dispose();
    this.textures.remove(this.photoKey);
  }
}
