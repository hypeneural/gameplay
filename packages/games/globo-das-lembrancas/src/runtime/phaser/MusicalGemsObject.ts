import type * as Phaser from 'phaser';
import type { SceneScope } from '@christmas-games/platform';
import type { GloboLayoutManager } from '../GloboLayoutManager.js';
import { globoArtKey } from './GloboProceduralArt.js';

const BUTTON_TEXTURE_KEYS = [
  'globo-btn-rubi',
  'globo-btn-esmeralda',
  'globo-btn-safira',
  'globo-btn-topazio',
] as const;

const HALO_KEYS = [
  'gem-ruby-halo',
  'gem-emerald-halo',
  'gem-sapphire-halo',
  'gem-topaz-halo',
] as const;

export class MusicalGemsObject {
  private readonly sockets: Phaser.GameObjects.Image[] = [];
  private readonly cavityShadows: Phaser.GameObjects.Ellipse[] = [];
  private readonly halos: Phaser.GameObjects.Image[] = [];
  private readonly gemSprites: Phaser.GameObjects.Image[] = [];
  private readonly beams: Phaser.GameObjects.Image[] = [];
  private readonly isLit = [false, false, false, false];
  private readonly baseScales = [1.0, 1.0, 1.0, 1.0];
  private readonly basePositionsY = [0, 0, 0, 0];
  private activePressedIndex: number | undefined;
  private readonly breathTweens: Array<Phaser.Tweens.Tween | undefined> = [
    undefined,
    undefined,
    undefined,
    undefined,
  ];

  constructor(
    private readonly scene: Phaser.Scene,
    scope: SceneScope,
  ) {
    for (let i = 0; i < 4; i++) {
      const btnKey = BUTTON_TEXTURE_KEYS[i]!;
      const haloKey = HALO_KEYS[i]!;

      // 1. Cavity shadow inside the socket bezel (depth 26)
      const cavity = scene.add.ellipse(0, 0, 1, 1, 0x050201, 0.45).setDepth(26);
      this.cavityShadows.push(cavity);

      // 2. Gold Socket rim on Wood (depth 27)
      const socket = scene.add
        .image(0, 0, globoArtKey('gem-socket'))
        .setDepth(27)
        .setOrigin(0.5, 0.5);
      this.sockets.push(socket);

      // 3. Colored Glow Halo behind Button (depth 28)
      const halo = scene.add
        .image(0, 0, globoArtKey(haloKey))
        .setDepth(28)
        .setOrigin(0.5, 0.5)
        .setVisible(false)
        .setAlpha(0);
      this.halos.push(halo);

      // 4. Enamel Button Plunger (depth 29)
      const gem = scene.add.image(0, 0, btnKey).setDepth(29).setOrigin(0.5, 0.5);
      this.gemSprites.push(gem);

      // 5. Ascending Light Beam into Dome (depth 14)
      const beam = scene.add
        .image(0, 0, globoArtKey('light-beam'))
        .setDepth(14)
        .setOrigin(0.5, 1.0)
        .setVisible(false)
        .setAlpha(0);
      this.beams.push(beam);

      scope.add(() => {
        this.breathTweens[i]?.stop();
        cavity.destroy();
        socket.destroy();
        halo.destroy();
        gem.destroy();
        beam.destroy();
      });
    }
  }

  layout(layout: GloboLayoutManager): void {
    for (let i = 0; i < 4; i++) {
      const g = layout.gems[i]!;
      const cavity = this.cavityShadows[i]!;
      const socket = this.sockets[i]!;
      const halo = this.halos[i]!;
      const gem = this.gemSprites[i]!;
      const beam = this.beams[i]!;

      // Cavity shadow sits behind the button inside the carved socket
      cavity.setPosition(g.x, g.y + 2).setSize(g.radius * 1.8, g.radius * 1.8);

      // Socket bezel is already sculpted in the mahogany wood base texture
      socket.setVisible(false);

      // Halo behind button
      const haloSize = g.radius * 3.2;
      halo.setPosition(g.x, g.y).setDisplaySize(haloSize, haloSize);

      // Button size precisely fitted into the wood base circular frame
      const btnSize = g.radius * 1.95;
      gem.setPosition(g.x, g.y).setDisplaySize(btnSize, btnSize);
      this.baseScales[i] = gem.scaleX;
      this.basePositionsY[i] = g.y;

      // Beam positioned at top of button, extending upward into dome
      beam
        .setPosition(g.x, g.y - g.radius)
        .setDisplaySize(g.radius * 2.2, layout.dome.radius * 1.6);
    }

    this.startInvitationBreathing();
  }

  private startInvitationBreathing(): void {
    for (let i = 0; i < 4; i++) {
      if (this.isLit[i]) continue;
      const gem = this.gemSprites[i]!;
      const base = this.baseScales[i] ?? gem.scaleX;
      this.breathTweens[i]?.stop();
      this.breathTweens[i] = this.scene.tweens.add({
        targets: gem,
        alpha: { from: 0.85, to: 1.0 },
        scaleX: { from: base * 0.96, to: base * 1.05 },
        scaleY: { from: base * 0.96, to: base * 1.05 },
        duration: 750 + i * 130,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }

  setLit(index: number, lit: boolean): void {
    this.isLit[index] = lit;
    const halo = this.halos[index];
    const gem = this.gemSprites[index];
    const beam = this.beams[index];
    if (!halo || !gem) return;

    // Stop breathing when lit
    this.breathTweens[index]?.stop();
    const base = this.baseScales[index] ?? gem.scaleX;

    if (lit) {
      halo.setVisible(true).setAlpha(0.95);
      gem.setAlpha(1.0).setScale(base * 1.06);

      // Trigger ascending beam flash
      if (beam) {
        beam.setVisible(true).setAlpha(0.85).setScale(0.8, 1);
        this.scene.tweens.add({
          targets: beam,
          alpha: 0,
          scaleX: 1.5,
          duration: 900,
          ease: 'Cubic.easeOut',
          onComplete: () => beam.setVisible(false),
        });
      }
    } else {
      halo.setVisible(false).setAlpha(0);
      gem.setScale(base);
    }
  }

  /**
   * Tactile 3D depression on pointerdown: button plunges into brass socket.
   */
  pressDown(index: number): void {
    const gem = this.gemSprites[index];
    const cavity = this.cavityShadows[index];
    const halo = this.halos[index];
    if (!gem) return;

    this.activePressedIndex = index;
    const base = this.baseScales[index] ?? gem.scaleX;
    const baseY = this.basePositionsY[index] ?? gem.y;

    this.scene.tweens.killTweensOf(gem);
    gem.y = baseY + 4;
    gem.scaleX = base * 0.94;
    gem.scaleY = base * 0.88;

    if (cavity) cavity.setAlpha(0.85);
    if (halo) halo.setVisible(true).setAlpha(1.0).setScale(1.2);
  }

  /**
   * Snappy mechanical rebound on pointerup.
   */
  releaseUp(index?: number): void {
    const idx = index ?? this.activePressedIndex;
    if (idx === undefined) return;
    this.activePressedIndex = undefined;

    const gem = this.gemSprites[idx];
    const cavity = this.cavityShadows[idx];
    const halo = this.halos[idx];
    if (!gem) return;

    const base = this.baseScales[idx] ?? gem.scaleX;
    const baseY = this.basePositionsY[idx] ?? gem.y;

    this.scene.tweens.killTweensOf(gem);
    this.scene.tweens.add({
      targets: gem,
      y: baseY,
      scaleX: base * (this.isLit[idx] ? 1.06 : 1.0),
      scaleY: base * (this.isLit[idx] ? 1.06 : 1.0),
      duration: 130,
      ease: 'Back.easeOut',
    });

    if (cavity) cavity.setAlpha(0.45);
    if (halo && !this.isLit[idx]) {
      this.scene.tweens.add({
        targets: halo,
        alpha: 0,
        scale: 1.0,
        duration: 250,
        ease: 'Sine.easeOut',
        onComplete: () => halo.setVisible(false),
      });
    }
  }

  pulse(index: number): void {
    this.pressDown(index);
    this.scene.time.delayedCall(90, () => this.releaseUp(index));
  }
}
