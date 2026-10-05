import * as Phaser from 'phaser';
import { SceneScope } from '@christmas-games/platform';
import type { GameBridge, GameContext } from '@christmas-games/platform';
import { SlingshotStateMachine } from '../../domain/SlingshotStateMachine.js';
import { SlingshotLayoutManager } from '../SlingshotLayoutManager.js';
import type { TargetId } from '../../domain/TargetProgress.js';
import { createEstilingueProceduralArt, estilingueArtKey } from './EstilingueProceduralArt.js';
import { EstilingueAudioDirector, estilingueAudioFiles } from './EstilingueAudioDirector.js';
import type { EstilingueCue } from './EstilingueAudioDirector.js';
import { SlingshotObject } from './SlingshotObject.js';
import { HangingTargetObject } from './HangingTargetObject.js';
import { MagicalFrameObject } from './MagicalFrameObject.js';
import { MagicButtonPanel } from './MagicButtonPanel.js';
import {
  estilingueButton,
  estilingueText,
  createEstilinguePauseOverlay,
  type EstilingueButton,
} from './EstilingueControls.js';
import { estilingueDasLembrancasTuning as tuning } from '../../tuning.js';
import { calculateRelativeSpeed, classifyImpact } from '../../domain/ShotModel.js';

export class EstilingueScene extends Phaser.Scene {
  private readonly scope = new SceneScope();
  private sm!: SlingshotStateMachine;
  private layoutMgr!: SlingshotLayoutManager;
  private audioDir!: EstilingueAudioDirector;

  // Visual layers & Game Objects
  private bgImage?: Phaser.GameObjects.Image;
  private bgFallback!: Phaser.GameObjects.Graphics;
  private magicalFrame!: MagicalFrameObject;
  private slingshot!: SlingshotObject;
  private targets = new Map<TargetId, HangingTargetObject>();
  private buttonPanel!: MagicButtonPanel;
  private snowEmitter?: Phaser.GameObjects.Particles.ParticleEmitter;

  // UI elements
  private coachText!: Phaser.GameObjects.Text;
  private soundButton!: EstilingueButton;
  private pauseButton!: EstilingueButton;
  private pauseOverlay!: ReturnType<typeof createEstilinguePauseOverlay>;

  // State flags
  private soundEnabled = true;
  private manualPaused = false;
  private visibilityPaused = false;
  private completedCelebration = false;
  private collectedTargets = new Set<TargetId>();
  private readonly photoTextureKey = 'estilingue-session-photo';

  constructor(
    private readonly context: GameContext,
    private readonly _bridge: GameBridge,
  ) {
    super('EstilingueScene');
  }

  preload(): void {
    // 1. Audio files
    for (const audio of estilingueAudioFiles) {
      this.load.audio(audio.key, audio.urls);
    }

    // 2. Background image
    this.load.image(
      'estilingue-bg',
      '/assets/estilingue-das-lembrancas/backgrounds/sala-natal-estilingue-v1.webp',
    );

    // 3. High-definition Christmas art assets
    this.load.image('moldura-ouro', '/assets/estilingue-das-lembrancas/art/moldura-ouro-v1.webp');
    this.load.image(
      'garfo-estilingue',
      '/assets/estilingue-das-lembrancas/art/garfo-estilingue-v1.webp',
    );
    this.load.image('bolsa-couro', '/assets/estilingue-das-lembrancas/art/bolsa-couro-v1.webp');
    this.load.image(
      'alvo-wood-square',
      '/assets/estilingue-das-lembrancas/art/alvo-madeira-quadrado-v1.webp',
    );
    this.load.image(
      'alvo-gingerbread',
      '/assets/estilingue-das-lembrancas/art/alvo-gingerbread-v1.webp',
    );
    this.load.image(
      'alvo-gold-star',
      '/assets/estilingue-das-lembrancas/art/alvo-estrela-ouro-v1.webp',
    );
    this.load.image(
      'alvo-round-bauble',
      '/assets/estilingue-das-lembrancas/art/alvo-bola-natal-v1.webp',
    );
    this.load.image(
      'botao-medallion-music',
      '/assets/estilingue-das-lembrancas/art/botao-medalhao-musica-v1.webp',
    );
    this.load.image(
      'botao-medallion-tree',
      '/assets/estilingue-das-lembrancas/art/botao-medalhao-arvore-v1.webp',
    );
    this.load.image(
      'botao-medallion-snow',
      '/assets/estilingue-das-lembrancas/art/botao-medalhao-neve-v1.webp',
    );
    this.load.image(
      'botao-medallion-bell',
      '/assets/estilingue-das-lembrancas/art/botao-medalhao-sino-v1.webp',
    );

    // 4. User photo
    const photoUrl =
      this.context.selectedPhoto.variants.game ||
      this.context.selectedPhoto.variants.card ||
      this.context.selectedPhoto.variants.thumb;
    if (photoUrl) {
      this.load.image(this.photoTextureKey, photoUrl);
    }
  }

  create(): void {
    const width = this.scale.width;
    const height = this.scale.height;

    // 1. Procedural art fallback textures
    createEstilingueProceduralArt(this, this.scope);

    // 2. Domain state machine & layout manager
    this.sm = new SlingshotStateMachine('READY');
    this.layoutMgr = new SlingshotLayoutManager(width, height, this.context.selectedPhoto);

    // 3. Audio Director
    this.soundEnabled = this.context.preferences?.soundEnabled ?? true;
    this.audioDir = new EstilingueAudioDirector(this, this.soundEnabled);
    this.scope.add(() => this.audioDir.destroy());

    // 4. Background
    this.bgFallback = this.add.graphics().setDepth(0);
    this.renderFallbackBackground(width, height);

    if (this.textures.exists('estilingue-bg')) {
      this.bgImage = this.add.image(width / 2, height / 2, 'estilingue-bg');
      this.bgImage.setDepth(1);
      this.layoutBackground(width, height);
    }

    // 5. Gentle falling ambient snow particles
    this.setupSnowfall(width, height);

    // 6. Victorian Photo Frame (Hero element)
    const frameAssembly = this.layoutMgr.frame;
    this.magicalFrame = new MagicalFrameObject(
      this,
      this.scope,
      this.photoTextureKey,
      frameAssembly.frameRect,
      frameAssembly.photoSurface.photo,
      frameAssembly.sockets.map((s) => ({ targetId: s.targetId, x: s.x, y: s.y })),
      frameAssembly.bannerRect,
      frameAssembly.apertureRect,
    );

    // 7. Hanging Targets
    for (const t of this.layoutMgr.targets) {
      const targetObj = new HangingTargetObject(
        this,
        this.scope,
        t.id,
        t.anchor.x,
        t.anchor.y,
        t.center.x,
        t.center.y,
        t.radius,
      );
      this.targets.set(t.id, targetObj);
    }

    // 8. Slingshot Assembly
    this.slingshot = new SlingshotObject(
      this,
      this.scope,
      this.layoutMgr.slingshot,
      this.sm,
      (vx, vy) => this.handleSnowballLaunch(vx, vy),
      () => {
        this.audioDir.play('pull', { pitchVariation: true });
      },
    );

    // 9. Bottom Magic Buttons Panel
    this.buttonPanel = new MagicButtonPanel(
      this,
      this.scope,
      this.layoutMgr.shelf.shelfRect,
      this.layoutMgr.shelf.buttons,
      (buttonId: 'note' | 'tree' | 'snowflake' | 'bell') => this.handleMagicButtonPress(buttonId),
    );

    // 10. Header HUD (Title, Coach Mark, Sound & Pause Buttons)
    this.setupHeaderHUD(width);

    // 11. Matter Collision Event Listener
    this.setupCollisionHandling();

    // 12. First gesture unlock for audio
    const unlockListener = (): void => {
      this.audioDir.unlock();
      this.input.off('pointerdown', unlockListener);
    };
    this.input.on('pointerdown', unlockListener);

    // Start lifecycle runs
    this.context.run.open();
    this.context.run.ready();
    this.context.run.start();
  }

  private renderFallbackBackground(width: number, height: number): void {
    this.bgFallback.clear();
    // Warm rich Christmas interior gradient
    this.bgFallback.fillGradientStyle(0x1a0f0a, 0x1a0f0a, 0x0a0604, 0x0a0604, 1);
    this.bgFallback.fillRect(0, 0, width, height);

    // Subtle golden bokeh orbs
    this.bgFallback.fillStyle(0xffd700, 0.04);
    for (let i = 0; i < 16; i++) {
      const bx = (width * ((i * 37) % 100)) / 100;
      const by = (height * ((i * 53) % 100)) / 100;
      this.bgFallback.fillCircle(bx, by, 30 + (i % 5) * 15);
    }
  }

  private layoutBackground(width: number, height: number): void {
    if (!this.bgImage) return;
    this.bgImage.setPosition(width / 2, height / 2);
    const scaleX = width / this.bgImage.width;
    const scaleY = height / this.bgImage.height;
    const maxScale = Math.max(scaleX, scaleY);
    this.bgImage.setScale(maxScale);
    this.bgImage.setAlpha(0.92);
  }

  private setupSnowfall(width: number, _height: number): void {
    if (!this.textures.exists(estilingueArtKey('snow-particle'))) return;

    this.snowEmitter = this.add.particles(0, 0, estilingueArtKey('snow-particle'), {
      x: { min: 0, max: width },
      y: -20,
      lifespan: 5000,
      speedY: { min: 35, max: 75 },
      speedX: { min: -15, max: 15 },
      scale: { start: 0.25, end: 0.55 },
      alpha: { start: 0.6, end: 0.1 },
      quantity: 1,
      frequency: 250,
      blendMode: 'ADD',
    });
    this.snowEmitter.setDepth(2);
    this.scope.add(() => this.snowEmitter?.destroy());
  }

  private setupHeaderHUD(width: number): void {
    const reduced = this.context.preferences?.reducedMotion ?? false;

    // Coach mark prompt (positioned right below the golden photo frame)
    this.coachText = estilingueText(
      this,
      '✨ Puxe a bola de neve para mirar! ✨',
      14,
      50,
      '#ffe2a6',
    );
    const frameRect = this.layoutMgr.frame.frameRect;
    this.coachText.setPosition(width / 2, frameRect.y + frameRect.height + 22);
    this.coachText.setShadow(0, 2, '#000000', 4, true, true);

    // Sound toggle button
    this.soundButton = estilingueButton(
      this,
      this.scope,
      this.soundEnabled ? 'Som' : 'Mudo',
      56,
      50,
      reduced,
      () => this.audioDir.unlock(),
      () => this.toggleSound(),
    );
    this.soundButton.setPosition(width - 106, 38);

    // Pause toggle button
    this.pauseButton = estilingueButton(
      this,
      this.scope,
      'Pausa',
      56,
      50,
      reduced,
      () => this.audioDir.unlock(),
      () => this.togglePause(),
    );
    this.pauseButton.setPosition(width - 38, 38);

    // Pause overlay
    this.pauseOverlay = createEstilinguePauseOverlay(this, this.scope, () => {
      this.togglePause();
    });
    this.pauseOverlay.layout(width, this.scale.height);
  }

  private toggleSound(): void {
    this.soundEnabled = !this.soundEnabled;
    this.audioDir.setEnabled(this.soundEnabled);
    this.soundButton.setText(this.soundEnabled ? 'Som' : 'Mudo');
    this.context.run.soundChanged?.(this.soundEnabled);
  }

  private togglePause(): void {
    this.manualPaused = !this.manualPaused;
    this.updatePauseState();
  }

  public setVisibilityPaused(paused: boolean): void {
    this.visibilityPaused = paused;
    this.updatePauseState();
  }

  private updatePauseState(): void {
    const isPaused = this.manualPaused || this.visibilityPaused;
    const reason = this.manualPaused ? 'game' : 'visibility';

    if (isPaused) {
      this.context.run.pause(reason);
      this.audioDir.setPaused(true);
      this.pauseOverlay.setVisible(true);
      this.pauseButton.setText('Seguir');
      this.matter.world.pause();
    } else {
      this.context.run.resume(reason);
      this.audioDir.setPaused(false);
      this.pauseOverlay.setVisible(false);
      this.pauseButton.setText('Pausa');
      this.matter.world.resume();
    }
  }

  private handleSnowballLaunch(_vx: number, _vy: number): void {
    this.audioDir.play('snap');
    this.audioDir.play('whoosh');
    this.coachText.setText('🎯 Acerte os 4 enfeites mágicos!');
  }

  private handleSnowballMiss(): void {
    if (!this.slingshot.snowball.isInFlight) return;

    this.sm.registerMiss();
    const bx = Math.max(30, Math.min(this.scale.width - 30, this.slingshot.snowball.x));
    const by = Math.max(60, Math.min(this.scale.height - 80, this.slingshot.snowball.y));

    this.slingshot.snowball.explode();
    this.createSnowPuff(bx, by);
    this.audioDir.play('whoosh');

    this.coachText.setText('❄️ Quase lá! Puxe a mira e tente de novo!');

    // Clean, guaranteed reload without any soft-lock
    this.time.delayedCall(tuning.reloadDelayMs, () => {
      if (!this.completedCelebration) {
        this.slingshot.reloadSnowball();
        this.sm.reloadSnowball();
        this.sm.becomeReady();
      }
    });
  }

  private handleMagicButtonPress(buttonId: 'note' | 'tree' | 'snowflake' | 'bell'): void {
    this.audioDir.play('button-press', { pitchVariation: true });

    // Delightful, rich interactive tactile reactions for each toy medallion
    if (buttonId === 'note') {
      this.audioDir.play('bell', { pitchVariation: true });
      const btn = this.layoutMgr.shelf.buttons.find((b) => b.id === 'note');
      if (btn) this.spawnFloatingNotes(btn.x, btn.y);
    } else if (buttonId === 'tree') {
      this.audioDir.play('fragment-fly');
      this.magicalFrame.pulseGarland();
      this.spawnTreeTwinkles();
    } else if (buttonId === 'snowflake') {
      this.audioDir.play('whoosh');
      this.spawnSnowFlurry();
    } else if (buttonId === 'bell') {
      this.audioDir.play('celebrate');
      const btn = this.layoutMgr.shelf.buttons.find((b) => b.id === 'bell');
      if (btn) this.spawnBellRipples(btn.x, btn.y);
    }
  }

  private spawnFloatingNotes(originX: number, originY: number): void {
    const notes = ['♪', '♫', '♬', '♩'];
    for (let i = 0; i < 5; i++) {
      this.time.delayedCall(i * 90, () => {
        const symbol = notes[i % notes.length]!;
        const noteText = this.add
          .text(originX + (Math.random() - 0.5) * 36, originY - 18, symbol, {
            fontFamily: 'Nunito, system-ui, sans-serif',
            fontSize: `${18 + (i % 3) * 4}px`,
            color: '#ffd700',
            stroke: '#5c3a21',
            strokeThickness: 2,
          })
          .setOrigin(0.5)
          .setDepth(45);

        this.tweens.add({
          targets: noteText,
          y: originY - 140 - Math.random() * 50,
          x: noteText.x + (Math.random() - 0.5) * 60,
          alpha: { from: 1.0, to: 0 },
          scale: { from: 0.8, to: 1.3 },
          duration: 1100,
          ease: 'Sine.easeOut',
          onComplete: () => noteText.destroy(),
        });
      });
    }
  }

  private spawnTreeTwinkles(): void {
    if (!this.textures.exists(estilingueArtKey('sparkle'))) return;
    const w = this.scale.width;
    const colors = [0xffd700, 0x00ff88, 0xff3355, 0xffffff];

    for (let i = 0; i < 16; i++) {
      this.time.delayedCall(i * 45, () => {
        const tx = (Math.random() > 0.5 ? 0.12 : 0.88) * w + (Math.random() - 0.5) * 60;
        const ty = this.scale.height * 0.35 + (Math.random() - 0.5) * 180;
        const col = colors[i % colors.length]!;

        const p = this.add.particles(tx, ty, estilingueArtKey('sparkle'), {
          speed: { min: 20, max: 70 },
          scale: { start: 0.5, end: 0 },
          alpha: { start: 1.0, end: 0 },
          lifespan: 500,
          maxParticles: 4,
          tint: col,
          blendMode: 'ADD',
        });
        p.setDepth(35);
      });
    }
  }

  private spawnSnowFlurry(): void {
    if (!this.textures.exists(estilingueArtKey('snow-particle'))) return;
    const w = this.scale.width;
    const h = this.scale.height;

    for (let i = 0; i < 28; i++) {
      const rx = Math.random() * w;
      const ry = Math.random() * (h * 0.6) + h * 0.2;
      const speedX = 60 + Math.random() * 120;

      const p = this.add.particles(rx, ry, estilingueArtKey('snow-particle'), {
        speedX: { min: speedX * 0.7, max: speedX * 1.3 },
        speedY: { min: -20, max: 40 },
        scale: { start: 0.45, end: 0.1 },
        alpha: { start: 0.9, end: 0 },
        lifespan: 750,
        maxParticles: 2,
        blendMode: 'ADD',
      });
      p.setDepth(32);
    }
  }

  private spawnBellRipples(originX: number, originY: number): void {
    for (let i = 0; i < 3; i++) {
      this.time.delayedCall(i * 140, () => {
        const ripple = this.add
          .circle(originX, originY, 18, 0xffd700, 0)
          .setStrokeStyle(3, 0xfff0aa, 0.9)
          .setDepth(41);

        this.tweens.add({
          targets: ripple,
          radius: 65,
          alpha: 0,
          duration: 600,
          ease: 'Cubic.easeOut',
          onComplete: () => ripple.destroy(),
        });
      });
    }
  }

  private setupCollisionHandling(): void {
    if (!this.matter) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (this.matter.world as any).on('collisionstart', (event: any) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const pair of event.pairs as any[]) {
        const bodyA = pair.bodyA;
        const bodyB = pair.bodyB;

        let ballBody = null;
        let otherBody = null;

        if (bodyA.label === 'snowball') {
          ballBody = bodyA;
          otherBody = bodyB;
        } else if (bodyB.label === 'snowball') {
          ballBody = bodyB;
          otherBody = bodyA;
        }

        if (ballBody && otherBody) {
          this.handleSnowballImpact(ballBody, otherBody);
        }
      }
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private handleSnowballImpact(ballBody: any, targetBody: any): void {
    const label: string = targetBody.label ?? '';
    if (!label.startsWith('target-')) return;

    const targetId = label.replace('target-', '') as TargetId;
    const targetObj = this.targets.get(targetId);
    if (!targetObj) return;

    // Transition state machine to IMPACT
    this.sm.registerImpact();

    // Calculate relative velocity
    const speed = calculateRelativeSpeed(
      { x: ballBody.velocity.x, y: ballBody.velocity.y },
      { x: targetBody.velocity.x, y: targetBody.velocity.y },
    );

    const impactClass = classifyImpact(
      speed,
      tuning.softImpactThreshold,
      tuning.validHitThreshold,
      tuning.hardHitThreshold,
    );

    // 1. Snowball explodes into fluffy snow particles and vanishes
    this.slingshot.snowball.explode();

    // 2. Physical pendulum reaction on target
    targetObj.applyImpactImpulse(ballBody.velocity.x * 0.45, ballBody.velocity.y * 0.45);
    this.createSnowPuff(targetBody.position.x, targetBody.position.y);

    // Subtle tactile camera micro-shake (like in Angry Aliens)
    const shakeIntensity = impactClass === 'hard' ? 0.008 : 0.004;
    this.cameras.main.shake(120, shakeIntensity);

    // 3. Valid hit collection & talisman flight (unconditional on physical target contact)
    this.handleTargetHit(targetId, targetObj, targetBody.position.x, targetBody.position.y);

    // 4. Guaranteed reload back into pouch
    this.time.delayedCall(tuning.reloadDelayMs, () => {
      if (!this.completedCelebration) {
        this.slingshot.reloadSnowball();
        this.sm.startResolving();
        this.sm.reloadSnowball();
        this.sm.becomeReady();
      }
    });
  }

  private createSnowPuff(x: number, y: number): void {
    if (!this.textures.exists(estilingueArtKey('snow-particle'))) return;
    const count = this.context.preferences?.reducedMotion ? 6 : 18;
    this.add.particles(x, y, estilingueArtKey('snow-particle'), {
      speed: { min: 30, max: 120 },
      scale: { start: 0.4, end: 0.1 },
      alpha: { start: 0.9, end: 0 },
      lifespan: 450,
      maxParticles: count,
      blendMode: 'ADD',
    });
  }

  private handleTargetHit(
    targetId: TargetId,
    targetObj: HangingTargetObject,
    impactX: number,
    impactY: number,
  ): void {
    const soundCueMap: Record<TargetId, EstilingueCue> = {
      'wood-square': 'wood',
      gingerbread: 'gingerbread',
      'gold-star': 'bell',
      'round-bauble': 'bauble',
    };
    this.audioDir.play(soundCueMap[targetId], { pitchVariation: true });

    if (this.collectedTargets.has(targetId)) {
      // Already collected, just wobbles
      return;
    }

    // New collection!
    this.collectedTargets.add(targetId);
    targetObj.markCompleted();

    // Talisman flying animation from target to frame socket
    this.audioDir.play('fragment-fly');
    this.magicalFrame.slotFragment(targetId, impactX, impactY, () => {
      this.audioDir.play('frame-slot');
      this.checkGameCompletion();
    });

    // Update prompt
    const remaining = 4 - this.collectedTargets.size;
    if (remaining > 0) {
      this.coachText.setText(
        `🌟 Lindo arremesso! Faltam ${remaining} ${remaining === 1 ? 'enfeite' : 'enfeites'}!`,
      );
    } else {
      this.coachText.setText('🎉 Moldura mágica das lembranças completa!');
    }
  }

  private checkGameCompletion(): void {
    if (this.collectedTargets.size < 4 || this.completedCelebration) return;

    this.completedCelebration = true;
    this.coachText.setText('🌟 Parabéns! Moldura Mágica Completa! 🌟');

    // 1. Victory fanfare audio
    this.audioDir.play('celebrate');

    // 2. Frame illumination
    this.magicalFrame.triggerCelebration();

    // 3. Golden victory sparkle bursts
    this.triggerCelebrationSparkles();

    // 4. Camera gentle zoom onto the Hero Photo Frame
    this.tweens.add({
      targets: this.cameras.main,
      zoom: 1.15,
      scrollY: -40,
      duration: tuning.celebrationHeroZoomDurationMs,
      ease: 'Sine.easeInOut',
    });

    // 5. Complete game run and notify platform
    this.time.delayedCall(1200, () => {
      this.context.run.complete();
    });
  }

  private triggerCelebrationSparkles(): void {
    if (!this.textures.exists(estilingueArtKey('sparkle'))) return;
    const frameRect = this.layoutMgr.frame.frameRect;
    const cx = frameRect.x + frameRect.width / 2;
    const cy = frameRect.y + frameRect.height / 2;

    for (let i = 0; i < 5; i++) {
      this.time.delayedCall(i * 350, () => {
        const ox = (Math.random() - 0.5) * frameRect.width;
        const oy = (Math.random() - 0.5) * frameRect.height;
        this.add.particles(cx + ox, cy + oy, estilingueArtKey('sparkle'), {
          speed: { min: 60, max: 200 },
          scale: { start: 0.6, end: 0.1 },
          alpha: { start: 1.0, end: 0 },
          lifespan: 800,
          maxParticles: 20,
          blendMode: 'ADD',
        });
      });
    }
  }

  override update(_time: number, delta: number): void {
    const dt = delta / 1000;
    this.audioDir.tick(dt);

    if (this.manualPaused || this.visibilityPaused) return;

    this.slingshot.update(delta);
    this.magicalFrame.update(delta);

    for (const target of this.targets.values()) {
      target.update();
    }

    // Active flight watchdog: handles misses when ball lands or exits playfield
    if (this.slingshot.snowball.isInFlight) {
      const sb = this.slingshot.snowball;
      const w = this.scale.width;
      const h = this.scale.height;

      const isOffSides = (sb.x < -140 || sb.x > w + 140) && sb.flightTimeMs > 400;
      const isOffTop = sb.y < -350 || (sb.y < -100 && sb.flightTimeMs > 2500);
      const isLandedFloor = sb.y > h - 50 && sb.flightTimeMs > 500;
      const isTimedOut = sb.flightTimeMs > 3200;

      if (isOffSides || isOffTop || isLandedFloor || isTimedOut) {
        this.handleSnowballMiss();
      }
    }
  }
}
