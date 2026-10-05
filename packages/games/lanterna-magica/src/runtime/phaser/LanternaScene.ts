import { SceneScope } from '@christmas-games/platform';
import type { GameBridge, GameContext } from '@christmas-games/platform';
import { attachCrystalControl } from '@christmas-games/theme';
import * as Phaser from 'phaser';
import {
  type BonusStarConfig,
  type LightSourceConfig,
  type MirrorConfig,
  type RaySegment,
  type TargetLensConfig,
  type Vector2D,
  degreesToRadians,
  radiansToDegrees,
  simulateOptics,
  snapAngle,
} from '../../domain/OpticalModel.js';
import { LanternStateMachine } from '../../domain/LanternStateMachine.js';
import { PhotonChargeModel } from '../../domain/PhotonChargeModel.js';
import {
  findNextMisalignedMirror,
  getLevelById,
  type PuzzleLevel,
} from '../../domain/LanternPuzzleLevels.js';
import { LanternaLayoutManager, type LanternaLayout } from '../LanternaLayoutManager.js';
import { createLanternaProceduralArt, lanternaArtKey } from './LanternaProceduralArt.js';
import { LanternaAudioDirector, lanternaAudioFiles } from './LanternaAudioDirector.js';

interface MirrorVisualElement {
  container: Phaser.GameObjects.Container;
  dial: Phaser.GameObjects.Sprite;
  shadow: Phaser.GameObjects.Sprite;
  ao: Phaser.GameObjects.Sprite;
  touchZone: Phaser.GameObjects.Arc;
  baseX: number;
  baseY: number;
  shadowDirX: number;
  shadowDirY: number;
}

interface FairyLightElement {
  sprite: Phaser.GameObjects.Sprite;
  glow: Phaser.GameObjects.Sprite;
  baseX: number;
  baseY: number;
  phase: number;
  speed: number;
}

interface SnowflakeElement {
  sprite: Phaser.GameObjects.Sprite;
  x: number;
  y: number;
  vx: number;
  vy: number;
  phase: number;
  scale: number;
}

interface VictorySparkle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  size: number;
  life: number;
  maxLife: number;
}

interface ConfettiParticle {
  sprite: Phaser.GameObjects.Sprite;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotationZ: number;
  angularVelZ: number;
  roll: number;
  rollSpeed: number;
  pitch: number;
  pitchSpeed: number;
  swayPhase: number;
  swaySpeed: number;
  baseScale: number;
  isFoil: boolean;
  life: number;
  maxLife: number;
}

export class LanternaScene extends Phaser.Scene {
  private readonly scope = new SceneScope();
  private readonly photoTextureKey = 'lanterna-client-photo';

  private sm!: LanternStateMachine;
  private audioDir!: LanternaAudioDirector;
  private photonCharge!: PhotonChargeModel;
  private currentLevel!: PuzzleLevel;
  private layout!: LanternaLayout;

  // Visual display objects
  private bgGraphics!: Phaser.GameObjects.Graphics;
  private tableTileSprite?: Phaser.GameObjects.TileSprite;
  private tableMaskGraphics?: Phaser.GameObjects.Graphics;
  private causticGraphics!: Phaser.GameObjects.Graphics;
  private beamGraphics!: Phaser.GameObjects.Graphics;
  private godRaysGraphics!: Phaser.GameObjects.Graphics;
  private dustGraphics!: Phaser.GameObjects.Graphics;
  private chargeGaugeGraphics!: Phaser.GameObjects.Graphics;
  private flashGraphics!: Phaser.GameObjects.Graphics;

  // Selected mirror & Mobile fine-tune tabs (+15° / -15°)
  private selectedMirrorId: string | null = null;
  private fineTuneContainer!: Phaser.GameObjects.Container;
  private fineTuneBtnCcw!: Phaser.GameObjects.Sprite;
  private fineTuneBtnCw!: Phaser.GameObjects.Sprite;

  // Magic Hint Button & Optical Guidance
  private hintButtonTarget!: Phaser.GameObjects.Rectangle;
  private hintButtonGraphics!: Phaser.GameObjects.Graphics;
  private hintButtonLabel!: Phaser.GameObjects.Text;
  private hintGraphics!: Phaser.GameObjects.Graphics;
  private hintCooldown = false;

  private projectionContainer!: Phaser.GameObjects.Container;
  private photoImage?: Phaser.GameObjects.Image;
  private photoFrameGraphics!: Phaser.GameObjects.Graphics;
  private lampSprite!: Phaser.GameObjects.Sprite;
  private lampFlameSprite!: Phaser.GameObjects.Sprite;
  private lampAoSprite!: Phaser.GameObjects.Sprite;
  private lensSprite!: Phaser.GameObjects.Sprite;
  private lensAoSprite!: Phaser.GameObjects.Sprite;
  private lensGlow!: Phaser.GameObjects.Sprite;
  private lensBasePos = { x: 0, y: 0 };
  private instructionText!: Phaser.GameObjects.Text;

  // Overcharge Countdown UI
  private countdownContainer!: Phaser.GameObjects.Container;
  private countdownText!: Phaser.GameObjects.Text;
  private countdownSubText!: Phaser.GameObjects.Text;
  private lastCountdownDigit: number | null = null;

  // Christmas atmosphere elements
  private fairyLights: FairyLightElement[] = [];
  private fairyWireGraphics!: Phaser.GameObjects.Graphics;
  private decorSprites: Phaser.GameObjects.Sprite[] = [];
  private ribbonBowSprite?: Phaser.GameObjects.Sprite;
  private fireplaceGlowSprite?: Phaser.GameObjects.Sprite;
  private snowflakes: SnowflakeElement[] = [];
  private victorySparkles: VictorySparkle[] = [];
  private confettiParticles: ConfettiParticle[] = [];
  private celebrationShowerActive = false;
  private celebrationTimer = 0;
  private nextShowerSpawnTime = 0;

  private mirrorAngles = new Map<string, number>();
  private mirrorAngularVelocities = new Map<string, number>();
  private mirrorElements = new Map<string, MirrorVisualElement>();
  private starSprites = new Map<string, Phaser.GameObjects.Sprite>();
  private collectedStars = new Set<string>();

  // Atmospheric convective dust motes
  private dustMotes: Array<{
    x: number;
    y: number;
    vx: number;
    vy: number;
    seed: number;
    baseAlpha: number;
    alpha: number;
    size: number;
  }> = [];

  // Drag & Inertia state
  private isDragging = false;
  private activeDragMirrorId: string | null = null;
  private dragStartPos = { x: 0, y: 0 };
  private lastDragAngle = 0;
  private lastDragTimestamp = 0;
  private hasMovedSignificantly = false;

  // Photon wave animation offset along rays
  private photonWaveOffset = 0;

  private godRayProgress = 0;
  private projectionRevealed = false;
  private visibilityPaused = false;

  // Active ray segments for dust Tyndall check and caustics
  private currentRaySegments: readonly RaySegment[] = [];

  constructor(
    private readonly context: GameContext,
    private readonly bridge: GameBridge,
  ) {
    super('LanternaMagicaScene');
  }

  preload(): void {
    for (const audio of lanternaAudioFiles) {
      if (!this.cache.audio.exists(audio.key)) {
        this.load.audio(audio.key, audio.urls);
      }
    }

    const photo = this.context.selectedPhoto;
    const photoUrl = photo?.variants?.game || photo?.variants?.card || photo?.variants?.thumb;
    if (photoUrl) {
      this.load.image(this.photoTextureKey, photoUrl);
    }
  }

  create(): void {
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.dispose());

    const width = this.scale.width;
    const height = this.scale.height;

    // 1. Procedural art generator
    createLanternaProceduralArt(this, this.scope);

    // 2. State machine & level setup
    this.sm = new LanternStateMachine('READY');
    const levelId = this.context.difficulty === 'desafio' ? 2 : 1;
    this.currentLevel = getLevelById(levelId);

    // 3. Audio director with optical drone & Christmas music box loop
    const soundEnabled = this.context.preferences?.soundEnabled ?? true;
    this.audioDir = new LanternaAudioDirector(this, soundEnabled);
    this.scope.add(() => this.audioDir.destroy());

    // 4. Initial layout
    this.layout = LanternaLayoutManager.calculateLayout(
      width,
      height,
      this.currentLevel,
      this.context.selectedPhoto,
    );

    for (const mirror of this.layout.mirrors) {
      this.mirrorAngles.set(mirror.id, mirror.initialAngleDeg);
      this.mirrorAngularVelocities.set(mirror.id, 0);
    }

    // 5. Build visual layers
    this.createBackgroundLayer(width, height);
    this.createProjectionScreen();

    // Table caustics graphics layer (under mirrors, above wood)
    this.causticGraphics = this.add.graphics().setDepth(8);
    this.causticGraphics.setBlendMode(Phaser.BlendModes.ADD);

    this.createOpticalElements();
    this.createInstructionText();
    this.createDustParticles();

    // Christmas Atmosphere: Fairy Lights, Pine Garlands, Snowfall & Fireplace
    this.createChristmasAtmosphere(width, height);

    // Fine-tune rotation tabs (+15° / -15°) for mobile
    this.createFineTuneTabs();

    // Magic Hint Button & Optical Guidance
    this.hintGraphics = this.add.graphics().setDepth(23);
    this.hintGraphics.setBlendMode(Phaser.BlendModes.ADD);
    this.createHintButton();

    if (this.layout.mirrors.length > 0) {
      this.selectMirror(this.layout.mirrors[0]!.id);
    }

    // Volumetric graphics layers with additive blend modes
    this.godRaysGraphics = this.add.graphics().setDepth(20);
    this.beamGraphics = this.add.graphics().setDepth(25);
    this.dustGraphics = this.add.graphics().setDepth(26);

    this.beamGraphics.setBlendMode(Phaser.BlendModes.ADD);
    this.godRaysGraphics.setBlendMode(Phaser.BlendModes.ADD);
    this.dustGraphics.setBlendMode(Phaser.BlendModes.ADD);

    // Overcharge Photon Mechanics & Countdown UI
    this.photonCharge = new PhotonChargeModel({
      totalDurationSec: 5.0,
      decayRatePerSec: 0.25,
    });
    this.lensBasePos = {
      x: this.layout.targetLens.center.x,
      y: this.layout.targetLens.center.y,
    };
    this.chargeGaugeGraphics = this.add.graphics().setDepth(18);
    this.chargeGaugeGraphics.setBlendMode(Phaser.BlendModes.ADD);
    this.flashGraphics = this.add.graphics().setDepth(100);
    this.createCountdownUI();

    // 6. Input listeners
    this.input.on(Phaser.Input.Events.POINTER_DOWN, () => {
      this.audioDir.unlock();
    });

    this.input.on(Phaser.Input.Events.POINTER_MOVE, (p: Phaser.Input.Pointer) => {
      this.handlePointerMove(p);
    });

    this.input.on(Phaser.Input.Events.POINTER_UP, () => {
      this.handlePointerUp();
    });

    // 7. Handle resize
    this.scale.on(Phaser.Scale.Events.RESIZE, this.handleResize, this);

    // 8. Inform platform
    this.context.run.open();
    this.context.run.ready();
    this.context.run.start();
  }

  private createCountdownUI(): void {
    const lens = this.layout.targetLens.center;
    this.countdownContainer = this.add.container(lens.x, lens.y - 54);
    this.countdownContainer.setDepth(32);
    this.countdownContainer.setAlpha(0);

    const badgeBg = this.add.graphics();
    // Dark mahogany velvet pill badge with ornate gold border
    badgeBg.fillStyle(0x22130c, 0.88);
    badgeBg.fillRoundedRect(-32, -18, 64, 36, 18);
    badgeBg.lineStyle(2, 0xd4af37, 0.9);
    badgeBg.strokeRoundedRect(-32, -18, 64, 36, 18);
    badgeBg.lineStyle(1, 0xffe57f, 0.5);
    badgeBg.strokeRoundedRect(-30, -16, 60, 32, 16);
    this.countdownContainer.add(badgeBg);

    this.countdownText = this.add.text(0, -1, '5', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '24px',
      fontStyle: 'bold',
      color: '#fff6c2',
      stroke: '#3a1e05',
      strokeThickness: 4,
      align: 'center',
    });
    this.countdownText.setOrigin(0.5);
    this.countdownContainer.add(this.countdownText);

    this.countdownSubText = this.add.text(0, 26, 'CARREGANDO...', {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '10px',
      fontStyle: 'bold',
      color: '#ffd700',
      stroke: '#1a0b02',
      strokeThickness: 3,
      align: 'center',
    });
    this.countdownSubText.setOrigin(0.5);
    this.countdownContainer.add(this.countdownSubText);
  }

  private createBackgroundLayer(width: number, height: number): void {
    this.bgGraphics = this.add.graphics().setDepth(0);
    this.renderBackground(width, height);
  }

  private renderBackground(width: number, height: number): void {
    this.bgGraphics.clear();

    // Ambient room vignette (warm dark study with deep holiday warmth)
    this.bgGraphics.fillStyle(0x130b07, 1);
    this.bgGraphics.fillRect(0, 0, width, height);

    // Mahogany workshop table
    const tb = this.layout.tableBounds;
    this.bgGraphics.fillStyle(0x22130c, 1);
    this.bgGraphics.fillRoundedRect(tb.x, tb.y, tb.width, tb.height, 16);

    // Procedural mahogany wood planks tile surface
    if (!this.tableTileSprite) {
      this.tableTileSprite = this.add.tileSprite(
        tb.x + tb.width / 2,
        tb.y + tb.height / 2,
        tb.width,
        tb.height,
        lanternaArtKey('tabletop-wood-planks'),
      );
      this.tableTileSprite.setDepth(1);
    } else {
      this.tableTileSprite.setPosition(tb.x + tb.width / 2, tb.y + tb.height / 2);
      this.tableTileSprite.setSize(tb.width, tb.height);
    }

    if (this.tableMaskGraphics) {
      this.tableMaskGraphics.destroy();
    }
    this.tableMaskGraphics = this.make.graphics();
    this.tableMaskGraphics.fillStyle(0xffffff);
    this.tableMaskGraphics.fillRoundedRect(tb.x, tb.y, tb.width, tb.height, 16);
    this.tableTileSprite.setMask(this.tableMaskGraphics.createGeometryMask());

    // Chamfer highlight on wood rim
    this.bgGraphics.lineStyle(1.5, 0x4a2a16, 0.6);
    this.bgGraphics.strokeRoundedRect(tb.x + 2, tb.y + 2, tb.width - 4, tb.height - 4, 14);

    // Brass filigree border around table
    this.bgGraphics.lineStyle(2, 0xd4af37, 0.5);
    this.bgGraphics.strokeRoundedRect(tb.x, tb.y, tb.width, tb.height, 16);

    // Corner baroque bronze brackets
    const bracketSize = 22;
    this.bgGraphics.lineStyle(3, 0xffd700, 0.8);
    // Top-left
    this.bgGraphics.strokeLineShape(
      new Phaser.Geom.Line(tb.x + 8, tb.y + 8, tb.x + 8 + bracketSize, tb.y + 8),
    );
    this.bgGraphics.strokeLineShape(
      new Phaser.Geom.Line(tb.x + 8, tb.y + 8, tb.x + 8, tb.y + 8 + bracketSize),
    );
    // Top-right
    this.bgGraphics.strokeLineShape(
      new Phaser.Geom.Line(
        tb.x + tb.width - 8,
        tb.y + 8,
        tb.x + tb.width - 8 - bracketSize,
        tb.y + 8,
      ),
    );
    this.bgGraphics.strokeLineShape(
      new Phaser.Geom.Line(
        tb.x + tb.width - 8,
        tb.y + 8,
        tb.x + tb.width - 8,
        tb.y + 8 + bracketSize,
      ),
    );
    // Bottom-left
    this.bgGraphics.strokeLineShape(
      new Phaser.Geom.Line(
        tb.x + 8,
        tb.y + tb.height - 8,
        tb.x + 8 + bracketSize,
        tb.y + tb.height - 8,
      ),
    );
    this.bgGraphics.strokeLineShape(
      new Phaser.Geom.Line(
        tb.x + 8,
        tb.y + tb.height - 8,
        tb.x + 8,
        tb.y + tb.height - 8 - bracketSize,
      ),
    );
    // Bottom-right
    this.bgGraphics.strokeLineShape(
      new Phaser.Geom.Line(
        tb.x + tb.width - 8,
        tb.y + tb.height - 8,
        tb.x + tb.width - 8 - bracketSize,
        tb.y + tb.height - 8,
      ),
    );
    this.bgGraphics.strokeLineShape(
      new Phaser.Geom.Line(
        tb.x + tb.width - 8,
        tb.y + tb.height - 8,
        tb.x + tb.width - 8,
        tb.y + tb.height - 8 - bracketSize,
      ),
    );

    // Fastening rivets in brackets
    this.bgGraphics.fillStyle(0xffe57f, 0.9);
    this.bgGraphics.fillCircle(tb.x + 10, tb.y + 10, 2);
    this.bgGraphics.fillCircle(tb.x + tb.width - 10, tb.y + 10, 2);
    this.bgGraphics.fillCircle(tb.x + 10, tb.y + tb.height - 10, 2);
    this.bgGraphics.fillCircle(tb.x + tb.width - 10, tb.y + tb.height - 10, 2);
  }

  private createProjectionScreen(): void {
    const sb = this.layout.projectionScreenBounds;
    this.projectionContainer = this.add.container(sb.x + sb.width / 2, sb.y + sb.height / 2);
    this.projectionContainer.setDepth(10);

    this.photoFrameGraphics = this.add.graphics();
    this.projectionContainer.add(this.photoFrameGraphics);

    const hw = sb.width / 2;
    const hh = sb.height / 2;
    this.photoFrameGraphics.fillStyle(0x380b10, 1);
    this.photoFrameGraphics.fillRoundedRect(-hw, -hh, sb.width, sb.height, 12);
    this.photoFrameGraphics.lineStyle(3, 0xd4af37, 0.9);
    this.photoFrameGraphics.strokeRoundedRect(-hw, -hh, sb.width, sb.height, 12);
    this.photoFrameGraphics.lineStyle(1, 0xffd700, 0.4);
    this.photoFrameGraphics.strokeRoundedRect(-hw + 4, -hh + 4, sb.width - 8, sb.height - 8, 8);

    if (this.textures.exists(this.photoTextureKey) && this.layout.photoSurface) {
      const ps = this.layout.photoSurface.photo;
      const relX = ps.x + ps.width / 2 - (sb.x + sb.width / 2);
      const relY = ps.y + ps.height / 2 - (sb.y + sb.height / 2);

      this.photoImage = this.add.image(relX, relY, this.photoTextureKey);
      this.photoImage.setDisplaySize(ps.width, ps.height);
      this.photoImage.setAlpha(0.28);
      this.photoImage.setTint(0xc2b59b);
      this.projectionContainer.add(this.photoImage);

      const maskShape = this.make.graphics();
      maskShape.fillStyle(0xffffff);
      maskShape.fillRoundedRect(sb.x + 6, sb.y + 6, sb.width - 12, sb.height - 12, 10);
      const mask = maskShape.createGeometryMask();
      this.photoImage.setMask(mask);
    } else {
      const placeholder = this.add.text(0, 0, 'Sua Lembrança de Natal', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '18px',
        color: '#d4af37',
      });
      placeholder.setOrigin(0.5);
      placeholder.setAlpha(0.4);
      this.projectionContainer.add(placeholder);
    }
  }

  private createOpticalElements(): void {
    const em = this.layout.emitter;

    // 1. Lamp Contact AO & Base Emitter
    this.lampAoSprite = this.add.sprite(em.center.x, em.center.y, lanternaArtKey('contact-ao'));
    this.lampAoSprite.setDepth(2);
    this.lampAoSprite.setScale(0.95);
    this.lampAoSprite.setAlpha(0.7);

    this.lampSprite = this.add.sprite(em.center.x, em.center.y, lanternaArtKey('lamp-emitter'));
    this.lampSprite.setDepth(15);
    this.lampSprite.setRotation(degreesToRadians(em.directionDeg));
    this.lampSprite.setInteractive({ useHandCursor: true });
    this.lampSprite.on(Phaser.Input.Events.POINTER_DOWN, () => {
      this.audioDir.unlock();
      this.audioDir.play('beam');
      this.tweens.add({
        targets: this.lampFlameSprite,
        scaleX: 1.45,
        scaleY: 1.45,
        alpha: 1,
        duration: 150,
        yoyo: true,
        ease: 'Quad.easeOut',
      });
    });

    this.lampFlameSprite = this.add.sprite(em.center.x, em.center.y, lanternaArtKey('lamp-flame'));
    this.lampFlameSprite.setDepth(16);
    this.lampFlameSprite.setBlendMode(Phaser.BlendModes.ADD);

    // 2. Projector Target Lens Apparatus & Contact AO
    const lens = this.layout.targetLens;
    this.lensAoSprite = this.add.sprite(lens.center.x, lens.center.y, lanternaArtKey('contact-ao'));
    this.lensAoSprite.setDepth(2);
    this.lensAoSprite.setScale(1.1);
    this.lensAoSprite.setAlpha(0.75);

    this.lensSprite = this.add.sprite(
      lens.center.x,
      lens.center.y,
      lanternaArtKey('projector-lens'),
    );
    this.lensSprite.setDepth(15);

    this.lensGlow = this.add.sprite(lens.center.x, lens.center.y, lanternaArtKey('lens-glow'));
    this.lensGlow.setDepth(17);
    this.lensGlow.setBlendMode(Phaser.BlendModes.ADD);
    this.lensGlow.setAlpha(0);

    // 3. Mirror Dials with 2.5D Directional Shadows
    for (const mirror of this.layout.mirrors) {
      const dirX = mirror.center.x - em.center.x;
      const dirY = mirror.center.y - em.center.y;
      const len = Math.hypot(dirX, dirY) || 1;
      const shadowDirX = dirX / len;
      const shadowDirY = dirY / len;
      const shadowAngle = Math.atan2(shadowDirY, shadowDirX);

      // Depth 2: Contact AO
      const ao = this.add.sprite(mirror.center.x, mirror.center.y, lanternaArtKey('contact-ao'));
      ao.setDepth(2);
      ao.setScale(0.95);
      ao.setAlpha(0.6);

      // Depth 4: Directional Cast Drop Shadow with Penumbra
      const shadow = this.add.sprite(
        mirror.center.x + shadowDirX * 8,
        mirror.center.y + shadowDirY * 8,
        lanternaArtKey('directional-shadow'),
      );
      shadow.setDepth(4);
      shadow.setRotation(shadowAngle);
      shadow.setScale(1.0);
      shadow.setAlpha(0.45);

      // Depth 15: Physical Brass Dial Container
      const container = this.add.container(mirror.center.x, mirror.center.y);
      container.setDepth(15);

      const dial = this.add.sprite(0, 0, lanternaArtKey('mirror-dial'));
      dial.setRotation(degreesToRadians(mirror.initialAngleDeg));
      container.add(dial);

      // Invisible generous circular hit area for mobile fingertips
      const touchRadius = Math.max(44, mirror.touchRadius);
      const touchZone = this.add.circle(0, 0, touchRadius, 0xffffff, 0);
      touchZone.setInteractive({ useHandCursor: true });
      container.add(touchZone);

      touchZone.on(Phaser.Input.Events.POINTER_DOWN, (p: Phaser.Input.Pointer) => {
        this.handlePointerDownMirror(mirror.id, p);
      });

      this.mirrorElements.set(mirror.id, {
        container,
        dial,
        shadow,
        ao,
        touchZone,
        baseX: mirror.center.x,
        baseY: mirror.center.y,
        shadowDirX,
        shadowDirY,
      });
    }

    // 4. Bonus Stars
    for (const star of this.layout.stars) {
      const starSprite = this.add.sprite(
        star.center.x,
        star.center.y,
        lanternaArtKey('star-bonus'),
      );
      starSprite.setDepth(14);
      this.starSprites.set(star.id, starSprite);

      this.tweens.add({
        targets: starSprite,
        y: star.center.y - 4,
        duration: 1200 + Math.random() * 400,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }

  private createChristmasAtmosphere(width: number, height: number): void {
    const sb = this.layout.projectionScreenBounds;
    const tb = this.layout.tableBounds;

    // 1. Fireplace Hearth Ambient Glow (bottom-left table edge)
    this.fireplaceGlowSprite = this.add.sprite(
      tb.x + 30,
      tb.y + tb.height - 20,
      lanternaArtKey('fireplace-glow'),
    );
    this.fireplaceGlowSprite.setDepth(3);
    this.fireplaceGlowSprite.setScale(2.4);
    this.fireplaceGlowSprite.setAlpha(0.42);
    this.fireplaceGlowSprite.setBlendMode(Phaser.BlendModes.ADD);
    this.fireplaceGlowSprite.setInteractive({ useHandCursor: true });
    this.fireplaceGlowSprite.on(Phaser.Input.Events.POINTER_DOWN, () => {
      this.audioDir.unlock();
      this.audioDir.playFireplaceTouch();
      this.tweens.add({
        targets: this.fireplaceGlowSprite,
        scaleX: 2.9,
        scaleY: 2.9,
        alpha: 0.75,
        duration: 150,
        yoyo: true,
        ease: 'Quad.easeOut',
      });

      const originX = this.fireplaceGlowSprite?.x ?? tb.x + 30;
      const originY = this.fireplaceGlowSprite?.y ?? tb.y + tb.height - 20;
      for (let k = 0; k < 8; k++) {
        const ember = this.add.sprite(
          originX + (Math.random() - 0.5) * 36,
          originY + (Math.random() - 0.5) * 20,
          lanternaArtKey('fireplace-ember'),
        );
        ember.setDepth(28);
        ember.setBlendMode(Phaser.BlendModes.ADD);
        ember.setScale(0.8 + Math.random() * 0.6);
        this.tweens.add({
          targets: ember,
          x: ember.x + (Math.random() - 0.5) * 60,
          y: ember.y - (45 + Math.random() * 65),
          alpha: 0,
          scale: 0.15,
          duration: 600 + Math.random() * 400,
          ease: 'Sine.easeOut',
          onComplete: () => ember.destroy(),
        });
      }
    });

    // 2. Velvet Crimson Ribbon Bow atop the Photo Frame
    this.ribbonBowSprite = this.add.sprite(
      sb.x + sb.width / 2,
      sb.y - 2,
      lanternaArtKey('ribbon-bow'),
    );
    this.ribbonBowSprite.setDepth(18);
    this.ribbonBowSprite.setScale(1.1);
    this.ribbonBowSprite.setInteractive({ useHandCursor: true });
    this.ribbonBowSprite.on(Phaser.Input.Events.POINTER_DOWN, () => {
      this.audioDir.unlock();
      this.audioDir.playHollyRustle();
      this.tweens.add({
        targets: this.ribbonBowSprite,
        scaleX: 1.25,
        scaleY: 0.92,
        duration: 140,
        yoyo: true,
        ease: 'Back.easeOut',
      });
    });

    // 3. Pine Garlands and Holly Sprigs at key corners
    // Top-left and Top-right photo frame corners
    const tlHolly = this.add.sprite(sb.x - 2, sb.y + 4, lanternaArtKey('christmas-holly'));
    tlHolly.setDepth(17);
    tlHolly.setRotation(-0.35);
    tlHolly.setScale(0.9);
    tlHolly.setInteractive({ useHandCursor: true });
    tlHolly.on(Phaser.Input.Events.POINTER_DOWN, () => {
      this.audioDir.unlock();
      this.audioDir.playHollyRustle();
      this.tweens.add({
        targets: tlHolly,
        rotation: -0.55,
        duration: 120,
        yoyo: true,
        ease: 'Sine.easeInOut',
      });
    });
    this.decorSprites.push(tlHolly);

    const trHolly = this.add.sprite(
      sb.x + sb.width + 2,
      sb.y + 4,
      lanternaArtKey('christmas-holly'),
    );
    trHolly.setDepth(17);
    trHolly.setRotation(0.35);
    trHolly.setScale(0.9);
    trHolly.setInteractive({ useHandCursor: true });
    trHolly.on(Phaser.Input.Events.POINTER_DOWN, () => {
      this.audioDir.unlock();
      this.audioDir.playHollyRustle();
      this.tweens.add({
        targets: trHolly,
        rotation: 0.55,
        duration: 120,
        yoyo: true,
        ease: 'Sine.easeInOut',
      });
    });
    this.decorSprites.push(trHolly);

    // Table upper corners with pine garlands
    const tlGarland = this.add.sprite(tb.x + 24, tb.y + 8, lanternaArtKey('pine-garland'));
    tlGarland.setDepth(6);
    tlGarland.setScale(0.85);
    this.decorSprites.push(tlGarland);

    const trGarland = this.add.sprite(
      tb.x + tb.width - 24,
      tb.y + 8,
      lanternaArtKey('pine-garland'),
    );
    trGarland.setDepth(6);
    trGarland.setScale(0.85);
    trGarland.setFlipX(true);
    this.decorSprites.push(trGarland);

    // 4. Fairy Light String (12 bulbs draped festively along the table upper margin)
    this.fairyWireGraphics = this.add.graphics().setDepth(11);
    const lightColors = ['gold', 'red', 'green'] as const;
    const bulbCount = 12;
    const startX = tb.x + 16;
    const endX = tb.x + tb.width - 16;
    const wireY = tb.y + 12;

    for (let i = 0; i < bulbCount; i++) {
      const frac = i / (bulbCount - 1);
      const bx = startX + (endX - startX) * frac;
      // Catenary drape droop
      const droop = Math.sin(frac * Math.PI) * 10;
      const by = wireY + droop;

      const colorType = lightColors[i % lightColors.length]!;
      const texKey = lanternaArtKey(`fairy-light-${colorType}`);

      const glow = this.add.sprite(bx, by + 12, lanternaArtKey('fairy-light-glow'));
      glow.setDepth(11);
      glow.setBlendMode(Phaser.BlendModes.ADD);
      glow.setScale(0.75);

      const sprite = this.add.sprite(bx, by + 10, texKey);
      sprite.setDepth(12);
      sprite.setScale(0.9);
      sprite.setInteractive({ useHandCursor: true });
      sprite.on(Phaser.Input.Events.POINTER_DOWN, () => {
        this.audioDir.unlock();
        this.audioDir.playBulbChime(i);

        glow.setAlpha(1.0);
        glow.setScale(1.25);
        this.tweens.add({
          targets: glow,
          alpha: 0.6,
          scaleX: 0.75,
          scaleY: 0.75,
          duration: 350,
        });

        this.tweens.killTweensOf(sprite);
        sprite.rotation = 0;
        this.tweens.chain({
          targets: sprite,
          tweens: [
            { rotation: 0.32, duration: 120, ease: 'Sine.easeOut' },
            { rotation: -0.22, duration: 160, ease: 'Sine.easeInOut' },
            { rotation: 0.14, duration: 140, ease: 'Sine.easeInOut' },
            { rotation: -0.07, duration: 120, ease: 'Sine.easeInOut' },
            { rotation: 0, duration: 100, ease: 'Sine.easeIn' },
          ],
        });
      });

      this.fairyLights.push({
        sprite,
        glow,
        baseX: bx,
        baseY: by + 10,
        phase: (i * Math.PI * 2) / bulbCount,
        speed: 2.5 + (i % 3) * 0.8,
      });
    }

    // 5. Gentle Falling Winter Snowflakes (24 particles)
    for (let i = 0; i < 24; i++) {
      const sx = Math.random() * width;
      const sy = Math.random() * height;
      const scale = 0.45 + Math.random() * 0.55;
      const sprite = this.add.sprite(sx, sy, lanternaArtKey('snowflake'));
      sprite.setDepth(24);
      sprite.setScale(scale);
      sprite.setAlpha(0.35 + Math.random() * 0.45);

      this.snowflakes.push({
        sprite,
        x: sx,
        y: sy,
        vx: 0,
        vy: 18 + Math.random() * 18,
        phase: Math.random() * Math.PI * 2,
        scale,
      });
    }
  }

  private createInstructionText(): void {
    const width = this.scale.width;
    const hud = this.layout.hud;

    this.instructionText = this.add.text(
      width / 2 - 30,
      hud.instructionY,
      'Gire os espelhos para projetar a luz na foto de Natal',
      {
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: '13px',
        color: '#f3e5ab',
        stroke: '#1b0f07',
        strokeThickness: 3,
        align: 'center',
        wordWrap: { width: Math.max(160, width - 115) },
      },
    );
    this.instructionText.setOrigin(0.5);
    this.instructionText.setDepth(30);
  }

  private createFineTuneTabs(): void {
    this.fineTuneContainer = this.add.container(0, 0);
    this.fineTuneContainer.setDepth(25);
    this.fineTuneContainer.setVisible(false);

    this.fineTuneBtnCcw = this.add.sprite(-28, 42, lanternaArtKey('mirror-btn-ccw'));
    this.fineTuneBtnCcw.setInteractive({ useHandCursor: true });
    this.fineTuneBtnCcw.on(
      'pointerdown',
      (
        _pointer: Phaser.Input.Pointer,
        _x: number,
        _y: number,
        event: Phaser.Types.Input.EventData,
      ) => {
        event?.stopPropagation?.();
        this.audioDir.unlock();
        this.rotateSelectedMirror(-15);
      },
    );

    this.fineTuneBtnCw = this.add.sprite(28, 42, lanternaArtKey('mirror-btn-cw'));
    this.fineTuneBtnCw.setInteractive({ useHandCursor: true });
    this.fineTuneBtnCw.on(
      'pointerdown',
      (
        _pointer: Phaser.Input.Pointer,
        _x: number,
        _y: number,
        event: Phaser.Types.Input.EventData,
      ) => {
        event?.stopPropagation?.();
        this.audioDir.unlock();
        this.rotateSelectedMirror(15);
      },
    );

    this.fineTuneContainer.add([this.fineTuneBtnCcw, this.fineTuneBtnCw]);
  }

  private selectMirror(mirrorId: string): void {
    this.selectedMirrorId = mirrorId;
    const el = this.mirrorElements.get(mirrorId);
    if (!el) return;

    this.fineTuneContainer.setVisible(true);
    this.tweens.killTweensOf(this.fineTuneContainer);
    this.tweens.add({
      targets: this.fineTuneContainer,
      x: el.baseX,
      y: el.baseY,
      duration: 160,
      ease: 'Quad.easeOut',
    });
  }

  private rotateSelectedMirror(deltaDeg: number): void {
    if (!this.selectedMirrorId) return;
    const el = this.mirrorElements.get(this.selectedMirrorId);
    if (!el) return;

    const cur = this.mirrorAngles.get(this.selectedMirrorId) ?? 0;
    const next = (cur + deltaDeg + 360) % 360;
    this.mirrorAngles.set(this.selectedMirrorId, next);

    this.audioDir.playRatchet();

    const btn = deltaDeg < 0 ? this.fineTuneBtnCcw : this.fineTuneBtnCw;
    this.tweens.add({
      targets: btn,
      scaleX: 0.85,
      scaleY: 0.85,
      duration: 80,
      yoyo: true,
      ease: 'Quad.easeOut',
    });

    this.tweens.killTweensOf(el.dial);
    this.tweens.add({
      targets: el.dial,
      rotation: degreesToRadians(next),
      duration: 140,
      ease: 'Quad.easeOut',
      onComplete: () => {
        this.audioDir.play('snap');
      },
    });
  }

  private createHintButton(): void {
    const width = this.scale.width;
    const hud = this.layout.hud;
    const btnX = width - 46;
    const btnY = hud.instructionY;

    this.hintButtonTarget = this.add
      .rectangle(btnX, btnY, 68, 34, 0x0f2b22)
      .setDepth(31)
      .setInteractive({ useHandCursor: true });

    this.hintButtonLabel = this.add
      .text(btnX, btnY, 'Dica', {
        fontFamily: 'Nunito, system-ui, -apple-system, sans-serif',
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#fff3d9',
      })
      .setOrigin(0.5)
      .setDepth(33);

    this.hintButtonGraphics = this.add.graphics().setDepth(32);

    attachCrystalControl({
      target: this.hintButtonTarget,
      graphics: this.hintButtonGraphics,
      events: this.events,
      scope: this.scope,
      label: this.hintButtonLabel,
      icon: 'hint',
      iconSize: 16,
      labelLayout: 'inline',
      reducedMotion: Boolean(this.context.preferences?.reducedMotion),
    });

    this.hintButtonTarget.on(
      'pointerdown',
      (_p: Phaser.Input.Pointer, _x: number, _y: number, ev: Phaser.Types.Input.EventData) => {
        ev?.stopPropagation?.();
        this.audioDir.unlock();
        this.triggerHint();
      },
    );
  }

  private triggerHint(): void {
    if (this.hintCooldown || this.projectionRevealed) return;
    this.hintCooldown = true;

    this.audioDir.playHintMagic();

    const hint = findNextMisalignedMirror(this.currentLevel, this.mirrorAngles);
    if (hint) {
      this.selectMirror(hint.mirrorId);
      const el = this.mirrorElements.get(hint.mirrorId);

      if (el) {
        // 1. Spurt magic sparkle motes towards the target mirror
        const em = this.layout.emitter.center;
        for (let k = 0; k < 8; k++) {
          const spark = this.add.sprite(em.x, em.y, lanternaArtKey('crystal-hint-spark'));
          spark.setDepth(30);
          spark.setBlendMode(Phaser.BlendModes.ADD);
          spark.setScale(0.4);
          this.tweens.add({
            targets: spark,
            x: el.baseX + (Math.random() - 0.5) * 24,
            y: el.baseY + (Math.random() - 0.5) * 24,
            scale: 1.1,
            alpha: { from: 1, to: 0 },
            duration: 480 + k * 60,
            delay: k * 40,
            ease: 'Cubic.easeOut',
            onComplete: () => spark.destroy(),
          });
        }

        // 2. Pulsing golden guide ring and angle indicator
        this.hintGraphics.clear();
        this.hintGraphics.setAlpha(1);
        this.hintGraphics.lineStyle(3, 0xffd700, 0.9);
        this.hintGraphics.strokeCircle(el.baseX, el.baseY, 44);
        this.hintGraphics.lineStyle(2, 0xffffff, 0.95);

        const targetRad = degreesToRadians(hint.targetAngle);
        const nx1 = el.baseX + Math.cos(targetRad) * 26;
        const ny1 = el.baseY + Math.sin(targetRad) * 26;
        const nx2 = el.baseX + Math.cos(targetRad) * 48;
        const ny2 = el.baseY + Math.sin(targetRad) * 48;
        this.hintGraphics.strokeLineShape(new Phaser.Geom.Line(nx1, ny1, nx2, ny2));

        this.tweens.add({
          targets: this.hintGraphics,
          alpha: 0,
          duration: 2400,
          ease: 'Sine.easeIn',
          onComplete: () => this.hintGraphics.clear(),
        });

        // 3. Instruction guidance
        this.instructionText.setText(`💡 Dica: Gire este espelho para ~${hint.targetAngle}°!`);
        this.time.delayedCall(2800, () => {
          if (!this.projectionRevealed) {
            this.instructionText.setText('Gire os espelhos para projetar a luz na foto de Natal');
          }
        });
      }
    } else {
      this.instructionText.setText('✨ O caminho está alinhado! Segure o feixe!');
      this.time.delayedCall(2500, () => {
        if (!this.projectionRevealed) {
          this.instructionText.setText('Gire os espelhos para projetar a luz na foto de Natal');
        }
      });
    }

    this.time.delayedCall(2200, () => {
      this.hintCooldown = false;
    });
  }

  private createDustParticles(): void {
    const count = 36;
    const tb = this.layout.tableBounds;

    for (let i = 0; i < count; i++) {
      this.dustMotes.push({
        x: tb.x + Math.random() * tb.width,
        y: tb.y + Math.random() * tb.height,
        vx: (Math.random() - 0.5) * 6,
        vy: -4 - Math.random() * 8, // Gentle natural upward drift
        seed: Math.random() * 100,
        baseAlpha: 0.12 + Math.random() * 0.16,
        alpha: 0.15,
        size: 1.0 + Math.random() * 2.2,
      });
    }
  }

  private handlePointerDownMirror(mirrorId: string, pointer: Phaser.Input.Pointer): void {
    this.isDragging = true;
    this.activeDragMirrorId = mirrorId;
    this.hasMovedSignificantly = false;

    this.selectMirror(mirrorId);

    const el = this.mirrorElements.get(mirrorId);
    if (!el) return;

    this.dragStartPos = { x: pointer.x, y: pointer.y };
    this.lastDragAngle = radiansToDegrees(Math.atan2(pointer.y - el.baseY, pointer.x - el.baseX));
    this.lastDragTimestamp = this.time.now;
    this.mirrorAngularVelocities.set(mirrorId, 0);

    // Tactile lift effect
    this.tweens.add({
      targets: el.container,
      scaleX: 1.08,
      scaleY: 1.08,
      duration: 100,
      ease: 'Quad.easeOut',
    });
    this.tweens.add({
      targets: el.shadow,
      scaleX: 1.15,
      scaleY: 1.15,
      alpha: 0.6,
      duration: 100,
      ease: 'Quad.easeOut',
    });

    this.sm.startAiming(mirrorId);
  }

  private handlePointerMove(pointer: Phaser.Input.Pointer): void {
    if (!this.isDragging || !this.activeDragMirrorId) return;

    const el = this.mirrorElements.get(this.activeDragMirrorId);
    if (!el) return;

    const distFromStart = Math.hypot(
      pointer.x - this.dragStartPos.x,
      pointer.y - this.dragStartPos.y,
    );
    if (distFromStart > 6) {
      this.hasMovedSignificantly = true;
    }

    const currentPointerAngle = radiansToDegrees(
      Math.atan2(pointer.y - el.baseY, pointer.x - el.baseX),
    );
    let deltaAngle = currentPointerAngle - this.lastDragAngle;
    while (deltaAngle > 180) deltaAngle -= 360;
    while (deltaAngle < -180) deltaAngle += 360;

    const now = this.time.now;
    const dt = Math.max(0.001, (now - this.lastDragTimestamp) / 1000);
    const instantaneousOmega = deltaAngle / dt;

    const prevOmega = this.mirrorAngularVelocities.get(this.activeDragMirrorId) ?? 0;
    this.mirrorAngularVelocities.set(
      this.activeDragMirrorId,
      prevOmega * 0.4 + instantaneousOmega * 0.6,
    );

    const prevAngle = this.mirrorAngles.get(this.activeDragMirrorId) ?? 0;
    const nextAngle = (prevAngle + deltaAngle + 360) % 360;

    // Haptic ratchet audio feedback on crossing 15-degree steps
    if (Math.floor(nextAngle / 15) !== Math.floor(prevAngle / 15)) {
      this.audioDir.play('ratchet');
    }

    this.mirrorAngles.set(this.activeDragMirrorId, nextAngle);
    el.dial.setRotation(degreesToRadians(nextAngle));

    this.lastDragAngle = currentPointerAngle;
    this.lastDragTimestamp = now;
  }

  private handlePointerUp(): void {
    if (!this.isDragging || !this.activeDragMirrorId) return;

    const el = this.mirrorElements.get(this.activeDragMirrorId);
    if (el) {
      this.tweens.add({
        targets: el.container,
        scaleX: 1.0,
        scaleY: 1.0,
        duration: 120,
        ease: 'Quad.easeOut',
      });
      this.tweens.add({
        targets: el.shadow,
        scaleX: 1.0,
        scaleY: 1.0,
        alpha: 0.45,
        duration: 120,
        ease: 'Quad.easeOut',
      });

      // Quick tap without drag rotates by +45 degrees
      if (!this.hasMovedSignificantly) {
        const currentAngle = this.mirrorAngles.get(this.activeDragMirrorId) ?? 0;
        const targetAngle = snapAngle((currentAngle + 45) % 360, 15);
        this.tweens.add({
          targets: el.dial,
          rotation: degreesToRadians(targetAngle),
          duration: 180,
          ease: 'Back.easeOut',
          onComplete: () => {
            this.mirrorAngles.set(this.activeDragMirrorId!, targetAngle);
            this.audioDir.play('snap');
          },
        });
      } else {
        // Snap to nearest 15-degree notch on release
        const currentAngle = this.mirrorAngles.get(this.activeDragMirrorId) ?? 0;
        const snapped = snapAngle(currentAngle, 15);
        if (Math.abs(snapped - currentAngle) < 7.5) {
          this.mirrorAngles.set(this.activeDragMirrorId, snapped);
          el.dial.setRotation(degreesToRadians(snapped));
          this.audioDir.play('snap');
        }
      }
    }

    this.isDragging = false;
    this.activeDragMirrorId = null;
    this.sm.finishAiming();
  }

  override update(_time: number, deltaMs: number): void {
    if (this.visibilityPaused) return;

    const dt = deltaMs / 1000;
    const t = _time * 0.001;

    // 1. Audio director update (music loop, ducking, soundscapes)
    this.audioDir.tick(dt);

    // 2. Living flame bi-harmonic sinusoidal flicker
    if (this.lampFlameSprite) {
      const flameScale =
        1.0 + Math.sin(t * 3.2 * 2 * Math.PI) * 0.05 + Math.sin(t * 7.1 * 2 * Math.PI) * 0.03;
      const flameAlpha = 0.88 + Math.sin(t * 5.4 * 2 * Math.PI) * 0.12;
      this.lampFlameSprite.setScale(flameScale);
      this.lampFlameSprite.setAlpha(flameAlpha);
    }

    // 3. Rotational Inertia Coasting for mirrors
    this.updateMirrorInertia(dt);

    // 4. Photon wave animation offset (360 px/sec)
    this.photonWaveOffset = (this.photonWaveOffset + dt * 360) % 60;

    // 5. Optical raycasting with photon wave pulses & overcharge mechanics
    this.performOpticalRaycast(dt);

    // 6. Celebration confetti explosion physics
    this.updateConfetti(dt);

    // 7. Convective thermal dust particles with Tyndall scattering
    this.updateDustParticles(dt, _time);

    // 7. Christmas Atmosphere (Fairy lights twinkle, snowflakes, hearth glow)
    this.updateChristmasAtmosphere(dt, t);

    // 8. Dynamic Sweeping Volumetric God Rays on victory
    if (this.projectionRevealed) {
      this.updateGodRays(dt);
    }
  }

  private updateChristmasAtmosphere(dt: number, t: number): void {
    // 1. Fairy lights catenary wire & individual twinkling
    this.fairyWireGraphics.clear();
    const tb = this.layout.tableBounds;
    const startX = tb.x + 16;
    const endX = tb.x + tb.width - 16;
    const wireY = tb.y + 12;

    this.fairyWireGraphics.lineStyle(1.5, 0x1a4314, 0.75);
    this.fairyWireGraphics.beginPath();
    this.fairyWireGraphics.moveTo(startX, wireY);
    for (let x = startX; x <= endX; x += 6) {
      const frac = (x - startX) / (endX - startX);
      const droop = Math.sin(frac * Math.PI) * 10;
      this.fairyWireGraphics.lineTo(x, wireY + droop);
    }
    this.fairyWireGraphics.strokePath();

    for (const light of this.fairyLights) {
      const pulse = Math.sin(t * light.speed + light.phase);
      const alpha = 0.35 + Math.pow((pulse + 1) * 0.5, 2) * 0.65;
      light.sprite.setAlpha(alpha);
      light.glow.setAlpha(alpha * 0.75);
      light.glow.setScale(0.65 + alpha * 0.25);
    }

    // 2. Fireplace Hearth breathing warmth
    if (this.fireplaceGlowSprite) {
      const hearthAlpha = 0.36 + Math.sin(t * 1.8) * 0.12 + Math.sin(t * 3.4) * 0.04;
      this.fireplaceGlowSprite.setAlpha(hearthAlpha);
    }

    // 3. Falling snowflakes with gentle swaying draft
    const width = this.scale.width;
    const height = this.scale.height;

    for (const flake of this.snowflakes) {
      flake.y += flake.vy * dt;
      flake.x += Math.sin(t * 1.4 + flake.phase) * 12 * dt;

      if (flake.y > height + 12) {
        flake.y = -10;
        flake.x = Math.random() * width;
      }
      flake.sprite.setPosition(flake.x, flake.y);
    }
  }

  private updateMirrorInertia(dt: number): void {
    if (this.isDragging) return;

    for (const [mirrorId, omega] of this.mirrorAngularVelocities) {
      if (Math.abs(omega) < 10) continue;

      const currentAngle = this.mirrorAngles.get(mirrorId) ?? 0;
      const nextAngle = (currentAngle + omega * dt + 360) % 360;

      // Friction decay
      const nextOmega = omega * Math.pow(0.82, dt * 60);
      this.mirrorAngularVelocities.set(mirrorId, Math.abs(nextOmega) < 10 ? 0 : nextOmega);

      // Ratchet sound per 15 deg crossed
      if (Math.floor(nextAngle / 15) !== Math.floor(currentAngle / 15)) {
        this.audioDir.play('ratchet');
      }

      this.mirrorAngles.set(mirrorId, nextAngle);
      const el = this.mirrorElements.get(mirrorId);
      if (el) {
        el.dial.setRotation(degreesToRadians(nextAngle));
      }

      // Snap on settling to a stop
      if (Math.abs(nextOmega) < 10) {
        const snapped = snapAngle(nextAngle, 15);
        this.mirrorAngles.set(mirrorId, snapped);
        if (el) {
          el.dial.setRotation(degreesToRadians(snapped));
        }
        this.audioDir.play('snap');
      }
    }
  }

  private performOpticalRaycast(dt: number): void {
    const emitter = this.layout.emitter;
    const rayAngleRad = degreesToRadians(emitter.directionDeg);
    const rayDir: Vector2D = {
      x: Math.cos(rayAngleRad),
      y: Math.sin(rayAngleRad),
    };

    const mirrors: MirrorConfig[] = this.layout.mirrors.map((m) => {
      const angleDeg = this.mirrorAngles.get(m.id) ?? m.initialAngleDeg;
      return {
        id: m.id,
        center: m.center,
        length: m.radius * 2,
        angleRad: degreesToRadians(angleDeg),
        isRotatable: true,
      };
    });

    const targetLens: TargetLensConfig = {
      center: this.layout.targetLens.center,
      radius: this.layout.targetLens.radius,
      normalAngleRad: degreesToRadians(this.layout.targetLens.normalDeg),
      acceptanceConeRad: degreesToRadians(90),
    };

    const stars: BonusStarConfig[] = this.layout.stars.map((s) => ({
      id: s.id,
      center: s.center,
      radius: s.radius,
    }));

    const source: LightSourceConfig = {
      origin: emitter.center,
      direction: rayDir,
      color: '#ffd700',
    };

    const result = simulateOptics(source, mirrors, targetLens, stars, 8, 1200);
    this.currentRaySegments = result.segments;

    // Modulate continuous optical light drone in audio director
    this.audioDir.setBeamPresence(result.segments.length);

    // Render realistic light beam & caustics
    this.renderLightBeam(result.segments);

    // Star collection triggers
    for (const starId of result.collectedStarIds) {
      if (!this.collectedStars.has(starId)) {
        this.collectedStars.add(starId);
        this.animateStarCollection(starId);
      }
    }

    // Target Overcharge & Countdown Mechanics
    const isHitting = result.targetHit && !this.projectionRevealed;
    this.photonCharge.update(dt, isHitting);

    if (isHitting) {
      if (this.sm.state === 'READY' || this.sm.state === 'AIMING') {
        this.sm.startCharging();
      }
    } else if (this.sm.state === 'CHARGING' && this.photonCharge.chargeProgress === 0) {
      this.sm.interruptCharging();
    }

    // Modulate audio drone frequency with charge progress
    this.audioDir.setChargeDrone(this.photonCharge.chargeProgress);

    // Render radial charge gauge and floating countdown badge
    this.updateChargeGaugeAndCountdown(dt);

    // Zero reached! Trigger the festive celebration explosion!
    if (this.photonCharge.isOvercharged && !this.projectionRevealed) {
      this.triggerBigExplosion();
    }
  }

  private renderLightBeam(segments: readonly RaySegment[]): void {
    this.beamGraphics.clear();
    this.causticGraphics.clear();
    if (segments.length === 0) return;

    // 1. Table Surface Caustics (soft amber light bounce on polished mahogany)
    this.causticGraphics.lineStyle(32, 0xff9900, 0.1);
    for (const seg of segments) {
      this.causticGraphics.strokeLineShape(
        new Phaser.Geom.Line(seg.start.x, seg.start.y, seg.end.x, seg.end.y),
      );
    }

    // 2. Layer 1: Atmospheric Dispersion Halo (Warm Amber)
    this.beamGraphics.lineStyle(22, 0xff9900, 0.2);
    for (const seg of segments) {
      this.beamGraphics.strokeLineShape(
        new Phaser.Geom.Line(seg.start.x, seg.start.y, seg.end.x, seg.end.y),
      );
    }

    // 3. Layer 2: Core Golden Plasma Beam
    this.beamGraphics.lineStyle(7, 0xffd700, 0.75);
    for (const seg of segments) {
      this.beamGraphics.strokeLineShape(
        new Phaser.Geom.Line(seg.start.x, seg.start.y, seg.end.x, seg.end.y),
      );
    }

    // 4. Layer 3: Blinding White Incandescent Center Filament
    this.beamGraphics.lineStyle(2.5, 0xffffff, 0.95);
    for (const seg of segments) {
      this.beamGraphics.strokeLineShape(
        new Phaser.Geom.Line(seg.start.x, seg.start.y, seg.end.x, seg.end.y),
      );
    }

    // 5. Traveling Photon Wave Pulses along each segment
    for (const seg of segments) {
      const segLen = Math.hypot(seg.end.x - seg.start.x, seg.end.y - seg.start.y);
      if (segLen <= 10) continue;

      const step = 50; // Pulse every 50px
      for (let s = this.photonWaveOffset; s < segLen; s += step) {
        const t = s / segLen;
        const px = seg.start.x + (seg.end.x - seg.start.x) * t;
        const py = seg.start.y + (seg.end.y - seg.start.y) * t;

        // Outer pulse glow
        this.beamGraphics.fillStyle(0xfff0a0, 0.45);
        this.beamGraphics.fillCircle(px, py, 6);
        // Bright pulse bead
        this.beamGraphics.fillStyle(0xffffff, 0.85);
        this.beamGraphics.fillCircle(px, py, 3);
      }
    }

    // 6. Specular Impact Flares at reflection vertices
    for (const seg of segments) {
      this.beamGraphics.fillStyle(0xffaa00, 0.45);
      this.beamGraphics.fillCircle(seg.end.x, seg.end.y, 9);
      this.beamGraphics.fillStyle(0xffffff, 0.95);
      this.beamGraphics.fillCircle(seg.end.x, seg.end.y, 4);

      this.beamGraphics.lineStyle(1.5, 0xffffff, 0.8);
      this.beamGraphics.strokeLineShape(
        new Phaser.Geom.Line(seg.end.x - 7, seg.end.y, seg.end.x + 7, seg.end.y),
      );
      this.beamGraphics.strokeLineShape(
        new Phaser.Geom.Line(seg.end.x, seg.end.y - 7, seg.end.x, seg.end.y + 7),
      );
    }
  }

  private animateStarCollection(starId: string): void {
    const sprite = this.starSprites.get(starId);
    if (!sprite) return;

    this.audioDir.play('star');
    sprite.setTexture(lanternaArtKey('star-bonus-active'));

    this.tweens.add({
      targets: sprite,
      scaleX: 1.5,
      scaleY: 1.5,
      duration: 180,
      yoyo: true,
      ease: 'Back.easeOut',
    });
  }

  private updateChargeGaugeAndCountdown(dt: number): void {
    if (this.projectionRevealed) return;

    const progress = this.photonCharge.chargeProgress;

    if (progress > 0) {
      // 1. Smoothly fade in countdown container
      this.countdownContainer.setAlpha(Math.min(1, this.countdownContainer.alpha + dt * 6));

      // 2. Micro-jitter lens vibration proportional to photon energy
      const jitter = this.photonCharge.jitterIntensity * 3.6;
      const jx = (Math.random() - 0.5) * jitter;
      const jy = (Math.random() - 0.5) * jitter;

      this.lensSprite.setPosition(this.lensBasePos.x + jx, this.lensBasePos.y + jy);
      this.lensGlow.setPosition(this.lensSprite.x, this.lensSprite.y);
      this.lensGlow.setAlpha(0.25 + progress * 0.75);
      this.lensGlow.setScale(1.0 + progress * 0.45);

      // 3. Countdown digit display (5, 4, 3, 2, 1)
      const digit = Math.max(1, Math.min(5, Math.ceil(this.photonCharge.remainingSeconds)));
      if (digit !== this.lastCountdownDigit) {
        this.lastCountdownDigit = digit;
        this.countdownText.setText(String(digit));
        this.audioDir.playChargeTick(digit);

        // Bouncy pulse tween on countdown container
        this.tweens.add({
          targets: this.countdownContainer,
          scaleX: 1.35,
          scaleY: 1.35,
          duration: 110,
          yoyo: true,
          ease: 'Back.easeOut',
        });
      }

      // 4. Radial circular energy gauge around lens bezel
      this.chargeGaugeGraphics.clear();
      const radius = 33;
      const startAngle = -Math.PI / 2;
      const endAngle = startAngle + progress * Math.PI * 2;

      // Outer bezel background track
      this.chargeGaugeGraphics.lineStyle(4, 0x4a2a12, 0.4);
      this.chargeGaugeGraphics.strokeCircle(this.lensSprite.x, this.lensSprite.y, radius);

      // Additive golden energy arc
      this.chargeGaugeGraphics.lineStyle(8, 0xff9900, 0.35 * progress);
      this.chargeGaugeGraphics.beginPath();
      this.chargeGaugeGraphics.arc(
        this.lensSprite.x,
        this.lensSprite.y,
        radius,
        startAngle,
        endAngle,
      );
      this.chargeGaugeGraphics.strokePath();

      this.chargeGaugeGraphics.lineStyle(3.5, 0xffe680, 0.95);
      this.chargeGaugeGraphics.beginPath();
      this.chargeGaugeGraphics.arc(
        this.lensSprite.x,
        this.lensSprite.y,
        radius,
        startAngle,
        endAngle,
      );
      this.chargeGaugeGraphics.strokePath();

      // Leading photon spark bead at the tip of the charge arc
      const sparkX = this.lensSprite.x + Math.cos(endAngle) * radius;
      const sparkY = this.lensSprite.y + Math.sin(endAngle) * radius;
      this.chargeGaugeGraphics.fillStyle(0xffffff, 1);
      this.chargeGaugeGraphics.fillCircle(sparkX, sparkY, 3);
      this.chargeGaugeGraphics.fillStyle(0xffd700, 0.7);
      this.chargeGaugeGraphics.fillCircle(sparkX, sparkY, 6);
    } else {
      // Smoothly fade out when not charging
      if (this.countdownContainer.alpha > 0) {
        this.countdownContainer.setAlpha(Math.max(0, this.countdownContainer.alpha - dt * 4));
      }
      this.chargeGaugeGraphics.clear();
      this.lensSprite.setPosition(this.lensBasePos.x, this.lensBasePos.y);
      this.lensGlow.setPosition(this.lensBasePos.x, this.lensBasePos.y);
      this.lensGlow.setAlpha(0);
      this.lastCountdownDigit = null;
    }
  }

  private triggerBigExplosion(): void {
    this.projectionRevealed = true;
    this.sm.illuminateTarget();

    // 1. Hide countdown container and clear gauge
    this.countdownContainer.setVisible(false);
    this.chargeGaugeGraphics.clear();

    const lensCenter = this.layout.targetLens.center;
    this.lensSprite.setPosition(lensCenter.x, lensCenter.y);
    this.lensGlow.setPosition(lensCenter.x, lensCenter.y);

    // 2. Fullscreen Photographic Flash Overlay
    const width = this.scale.width;
    const height = this.scale.height;
    this.flashGraphics.clear();
    this.flashGraphics.fillStyle(0xffffff, 0.85);
    this.flashGraphics.fillRect(0, 0, width, height);
    this.tweens.add({
      targets: this.flashGraphics,
      alpha: 0,
      duration: 320,
      ease: 'Quad.easeOut',
      onComplete: () => {
        this.flashGraphics.clear();
        this.flashGraphics.setAlpha(1);
      },
    });

    // 3. Impactful Camera Shake
    this.cameras.main.shake(380, 0.015);

    // 4. Expanding Additive Shockwave Ring
    const shockwave = this.add.sprite(lensCenter.x, lensCenter.y, lanternaArtKey('shockwave-ring'));
    shockwave.setDepth(29);
    shockwave.setBlendMode(Phaser.BlendModes.ADD);
    shockwave.setScale(0.2);
    shockwave.setAlpha(1);
    this.tweens.add({
      targets: shockwave,
      scaleX: 4.2,
      scaleY: 4.2,
      alpha: 0,
      duration: 520,
      ease: 'Quad.easeOut',
      onComplete: () => {
        shockwave.destroy();
      },
    });

    // 5. Explosive Confetti Eruption (60 festive metallic & emerald particles)
    this.spawnCelebrationConfetti(lensCenter.x, lensCenter.y);

    // 6. Audio Explosion, Pop, and Celebration Chimes
    this.audioDir.playExplosion();
    this.time.delayedCall(90, () => {
      this.audioDir.playConfettiPop();
    });
    this.audioDir.play('celebrate');

    // 7. Projector Lens grand flare & glow
    this.lensGlow.setAlpha(1);
    this.tweens.add({
      targets: this.lensGlow,
      scaleX: 2.2,
      scaleY: 2.2,
      alpha: 0.8,
      duration: 380,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // 8. State Machine & HUD Text
    this.sm.startProjection();
    this.instructionText.setText('🌟 A Lanterna Mágica revelou a sua lembrança! 🌟');
    this.instructionText.setColor('#fff4a3');

    // 9. Photo grand illumination & festive zoom
    if (this.photoImage) {
      this.photoImage.clearTint();
      const baseScaleX = this.photoImage.scaleX;
      const baseScaleY = this.photoImage.scaleY;
      this.tweens.add({
        targets: this.photoImage,
        alpha: 1.0,
        scaleX: baseScaleX * 1.05,
        scaleY: baseScaleY * 1.05,
        duration: 800,
        ease: 'Cubic.easeOut',
      });
    }

    // 10. Gold frame celebration pulse
    this.tweens.add({
      targets: this.projectionContainer,
      scaleX: 1.04,
      scaleY: 1.04,
      duration: 600,
      yoyo: true,
      ease: 'Back.easeOut',
    });

    // 11. Complete run with generous celebration delay
    this.time.delayedCall(1500, () => {
      this.sm.celebrateVictory();
      this.context.run.complete();
    });
  }

  private spawnCelebrationConfetti(originX: number, originY: number): void {
    this.celebrationShowerActive = true;
    this.celebrationTimer = 0;
    this.nextShowerSpawnTime = 0;

    const confettiKeys = [
      lanternaArtKey('confetti-gold'),
      lanternaArtKey('confetti-red'),
      lanternaArtKey('confetti-green'),
      lanternaArtKey('confetti-silver'),
      lanternaArtKey('confetti-sapphire'),
      lanternaArtKey('confetti-star'),
      lanternaArtKey('confetti-diamond'),
      lanternaArtKey('confetti-disc'),
    ];

    // High-power parabolic cannon fountain (100 particles)
    const particleCount = 100;
    for (let i = 0; i < particleCount; i++) {
      const key = confettiKeys[i % confettiKeys.length]!;
      const sprite = this.add.sprite(originX, originY, key);
      sprite.setDepth(28);

      const angle = (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5) * 0.45;
      const speed = 190 + Math.random() * 340;
      const vx = Math.cos(angle) * speed;
      const vy = -200 - Math.random() * 420 - Math.abs(Math.sin(angle)) * 160;

      const isFoil = !key.includes('star') && !key.includes('diamond');
      const baseScale =
        key.includes('star') || key.includes('diamond')
          ? 1.1 + Math.random() * 0.45
          : 1.15 + Math.random() * 0.6;
      sprite.setScale(baseScale);

      this.confettiParticles.push({
        sprite,
        x: originX,
        y: originY,
        vx,
        vy,
        rotationZ: Math.random() * Math.PI * 2,
        angularVelZ: (Math.random() - 0.5) * 8,
        roll: Math.random() * Math.PI * 2,
        rollSpeed: 4 + Math.random() * 8,
        pitch: Math.random() * Math.PI * 2,
        pitchSpeed: 3 + Math.random() * 6,
        swayPhase: Math.random() * Math.PI * 2,
        swaySpeed: 2.2 + Math.random() * 3.5,
        baseScale,
        isFoil,
        life: 0,
        maxLife: 6.0 + Math.random() * 3.0,
      });
    }
  }

  private updateConfetti(dt: number): void {
    const width = this.scale.width;
    const lens = this.layout.targetLens.center;

    // Continuous cascading celebration shower during victory
    if (this.celebrationShowerActive && this.sm.state === 'CELEBRATING') {
      this.celebrationTimer += dt;
      this.nextShowerSpawnTime -= dt;
      if (this.nextShowerSpawnTime <= 0 && this.confettiParticles.length < 75) {
        this.nextShowerSpawnTime = 0.15 + Math.random() * 0.12;
        const confettiKeys = [
          lanternaArtKey('confetti-gold'),
          lanternaArtKey('confetti-red'),
          lanternaArtKey('confetti-green'),
          lanternaArtKey('confetti-silver'),
          lanternaArtKey('confetti-sapphire'),
          lanternaArtKey('confetti-star'),
          lanternaArtKey('confetti-diamond'),
          lanternaArtKey('confetti-disc'),
        ];
        const spawnCount = Math.random() < 0.6 ? 1 : 2;
        for (let k = 0; k < spawnCount; k++) {
          const spawnX = Math.random() * width;
          const spawnY = -20 - Math.random() * 25;
          const key = confettiKeys[Math.floor(Math.random() * confettiKeys.length)]!;
          const sprite = this.add.sprite(spawnX, spawnY, key);
          sprite.setDepth(28);

          const isFoil = !key.includes('star') && !key.includes('diamond');
          const baseScale =
            key.includes('star') || key.includes('diamond')
              ? 1.05 + Math.random() * 0.45
              : 1.1 + Math.random() * 0.55;

          this.confettiParticles.push({
            sprite,
            x: spawnX,
            y: spawnY,
            vx: (Math.random() - 0.5) * 45,
            vy: 65 + Math.random() * 95,
            rotationZ: Math.random() * Math.PI * 2,
            angularVelZ: (Math.random() - 0.5) * 5,
            roll: Math.random() * Math.PI * 2,
            rollSpeed: 3 + Math.random() * 6,
            pitch: Math.random() * Math.PI * 2,
            pitchSpeed: 2 + Math.random() * 5,
            swayPhase: Math.random() * Math.PI * 2,
            swaySpeed: 1.8 + Math.random() * 3,
            baseScale,
            isFoil,
            life: 0,
            maxLife: 6.0 + Math.random() * 3.0,
          });
        }
      }
    }

    if (this.confettiParticles.length === 0) return;

    for (let i = this.confettiParticles.length - 1; i >= 0; i--) {
      const p = this.confettiParticles[i]!;
      p.life += dt;

      // Screen bounds check & recycle during celebration
      if (p.y > this.scale.height + 30) {
        if (this.sm.state === 'CELEBRATING') {
          p.x = Math.random() * width;
          p.y = -20 - Math.random() * 30;
          p.vy = 65 + Math.random() * 95;
          p.vx = (Math.random() - 0.5) * 45;
          p.life = 0;
          p.sprite.setAlpha(1);
          continue;
        } else {
          p.sprite.destroy();
          this.confettiParticles.splice(i, 1);
          continue;
        }
      }

      if (p.life >= p.maxLife) {
        if (this.sm.state === 'CELEBRATING') {
          p.life = 0;
          p.y = -20 - Math.random() * 30;
          p.x = Math.random() * width;
          p.vy = 65 + Math.random() * 95;
          p.sprite.setAlpha(1);
          continue;
        } else {
          p.sprite.destroy();
          this.confettiParticles.splice(i, 1);
          continue;
        }
      }

      // Physics: gravity + air drag
      p.vy += 190 * dt;
      p.vx *= Math.pow(0.96, dt * 60);
      p.vy *= Math.pow(0.985, dt * 60);

      // Aerodynamic horizontal sway
      p.swayPhase += p.swaySpeed * dt;
      const swayX = Math.sin(p.swayPhase) * 26;

      p.x += (p.vx + swayX) * dt;
      p.y += p.vy * dt;

      // 3D rotation update
      p.rotationZ += p.angularVelZ * dt;
      p.roll += p.rollSpeed * dt;
      p.pitch += p.pitchSpeed * dt;

      // 3D perspective tumbling (biaxial roll & pitch with edge thickness clamp)
      const cosRoll = Math.cos(p.roll);
      const cosPitch = Math.cos(p.pitch);
      const flipX = Math.sign(cosRoll) || 1;
      const sx = p.baseScale * (flipX * Math.max(0.18, Math.abs(cosRoll)));
      const sy = p.baseScale * (0.72 + 0.28 * cosPitch);

      p.sprite.setPosition(p.x, p.y);
      p.sprite.setRotation(p.rotationZ);
      p.sprite.setScale(sx, sy);

      // Metallic Specular Glint when edge-on (Additive optical flash)
      if (p.isFoil && Math.abs(cosRoll) < 0.24) {
        p.sprite.setBlendMode(Phaser.BlendModes.ADD);
      } else {
        p.sprite.setBlendMode(Phaser.BlendModes.NORMAL);
      }

      // Light beam proximity illumination boost
      const distToLens = Math.hypot(p.x - lens.x, p.y - lens.y);
      if (distToLens < 200 && this.projectionRevealed) {
        p.sprite.setAlpha(1.0);
      } else {
        const remaining = p.maxLife - p.life;
        if (remaining < 0.8 && this.sm.state !== 'CELEBRATING') {
          p.sprite.setAlpha(remaining / 0.8);
        } else {
          p.sprite.setAlpha(1);
        }
      }
    }
  }

  /**
   * Continuous Dynamic Sweeping Volumetric God Rays
   * Projects from the lens apparatus upward, enveloping the entire photograph
   * and spreading across the entire screen and ceiling with zero horizontal cutoffs.
   */
  private updateGodRays(dt: number): void {
    this.godRayProgress = Math.min(1, this.godRayProgress + dt * 1.5);
    this.godRaysGraphics.clear();

    const lens = this.layout.targetLens.center;
    const sb = this.layout.projectionScreenBounds;
    const width = this.scale.width;
    const tNow = this.time.now * 0.001;

    // Extend top coordinate well past the top of the canvas so there is ZERO horizontal line!
    const topY = -80;
    const leftX = -80;
    const rightX = width + 80;

    // 1. Broad Volumetric Projection Cone covering the whole screen
    this.godRaysGraphics.fillStyle(0xffe590, 0.08 * this.godRayProgress);
    this.godRaysGraphics.beginPath();
    this.godRaysGraphics.moveTo(lens.x - 24, lens.y);
    this.godRaysGraphics.lineTo(leftX, topY);
    this.godRaysGraphics.lineTo(rightX, topY);
    this.godRaysGraphics.lineTo(lens.x + 24, lens.y);
    this.godRaysGraphics.closePath();
    this.godRaysGraphics.fill();

    // 2. Concentric Ambient Light Bloom expanding from the lens across the whole room
    const bloomR = 180 + this.godRayProgress * 260;
    this.godRaysGraphics.fillStyle(0xfff0a0, 0.065 * this.godRayProgress);
    this.godRaysGraphics.fillCircle(lens.x, lens.y, bloomR);
    this.godRaysGraphics.fillStyle(0xffe070, 0.035 * this.godRayProgress);
    this.godRaysGraphics.fillCircle(lens.x, lens.y, bloomR * 1.6);

    // 3. 12 Dynamic Sweeping Crepuscular God Rays fanning smoothly across the entire width
    const rayCount = 12;
    for (let i = 0; i < rayCount; i++) {
      const u = i / (rayCount - 1);
      const waveSweep =
        Math.sin(tNow * (1.4 + i * 0.22) + i * 1.1) * 0.06 + Math.sin(tNow * 0.7) * 0.03;
      const effectiveU = Phaser.Math.Clamp(u + waveSweep, -0.05, 1.05);

      const targetX = leftX + (rightX - leftX) * effectiveU;
      const rayHalfWidth = 26 + Math.sin(tNow * 2.8 + i) * 8;

      const lensX1 = lens.x + (u - 0.5) * 20 - 4;
      const lensX2 = lensX1 + 8;

      // Traveling photon pulse wave along ray
      const pulse = 0.5 + 0.5 * Math.sin(tNow * 3.5 - i * 0.8);
      const rayAlpha = (0.12 + pulse * 0.12) * this.godRayProgress;

      this.godRaysGraphics.fillStyle(0xfff5aa, rayAlpha);
      this.godRaysGraphics.beginPath();
      this.godRaysGraphics.moveTo(lensX1, lens.y);
      this.godRaysGraphics.lineTo(targetX - rayHalfWidth, topY);
      this.godRaysGraphics.lineTo(targetX + rayHalfWidth, topY);
      this.godRaysGraphics.lineTo(lensX2, lens.y);
      this.godRaysGraphics.closePath();
      this.godRaysGraphics.fill();
    }

    // 4. Photo Radiance Bloom Overlay & Backplate Aura (Bathes the photograph in golden light)
    const bloomAlpha = (0.24 + Math.sin(tNow * 2.8) * 0.06) * this.godRayProgress;
    this.godRaysGraphics.fillStyle(0xfffae0, bloomAlpha);
    this.godRaysGraphics.fillRoundedRect(sb.x - 6, sb.y - 6, sb.width + 12, sb.height + 12, 14);

    // Diffuse ambient aura around the photo frame
    this.godRaysGraphics.fillStyle(0xffe890, bloomAlpha * 0.4);
    this.godRaysGraphics.fillRoundedRect(sb.x - 20, sb.y - 20, sb.width + 40, sb.height + 40, 22);

    // 5. Optical Refraction Rings at Projector Lens
    const ringRadius = 18 + ((this.time.now * 0.04) % 36);
    const ringAlpha = (1 - (ringRadius - 18) / 36) * 0.45 * this.godRayProgress;
    this.godRaysGraphics.lineStyle(2, 0xffe57f, ringAlpha);
    this.godRaysGraphics.strokeCircle(lens.x, lens.y, ringRadius);

    const ringRadius2 = 18 + ((this.time.now * 0.04 + 18) % 36);
    const ringAlpha2 = (1 - (ringRadius2 - 18) / 36) * 0.45 * this.godRayProgress;
    this.godRaysGraphics.lineStyle(1.5, 0xffd700, ringAlpha2);
    this.godRaysGraphics.strokeCircle(lens.x, lens.y, ringRadius2);

    // 6. Floating Victory Sparkles ascending within the light beam
    if (this.victorySparkles.length < 20 && Math.random() < 0.3) {
      this.victorySparkles.push({
        x: lens.x + (Math.random() - 0.5) * 36,
        y: lens.y - 10,
        vx: (Math.random() - 0.5) * 20,
        vy: -70 - Math.random() * 90,
        alpha: 0.95,
        size: 1.5 + Math.random() * 2.2,
        life: 0,
        maxLife: 1.4 + Math.random() * 0.8,
      });
    }

    for (let j = this.victorySparkles.length - 1; j >= 0; j--) {
      const sp = this.victorySparkles[j]!;
      sp.life += dt;
      if (sp.life >= sp.maxLife || sp.y < -30) {
        this.victorySparkles.splice(j, 1);
        continue;
      }

      sp.x += (sp.vx + Math.sin(tNow * 4 + j) * 8) * dt;
      sp.y += sp.vy * dt;
      const progress = sp.life / sp.maxLife;
      const sparkleAlpha = Math.sin(progress * Math.PI) * sp.alpha * this.godRayProgress;

      this.godRaysGraphics.fillStyle(0xffffff, sparkleAlpha);
      this.godRaysGraphics.fillCircle(sp.x, sp.y, sp.size);
      this.godRaysGraphics.fillStyle(0xffe57f, sparkleAlpha * 0.5);
      this.godRaysGraphics.fillCircle(sp.x, sp.y, sp.size * 2);
    }
  }

  private updateDustParticles(dt: number, timeMs: number): void {
    this.dustGraphics.clear();
    const tb = this.layout.tableBounds;
    const t = timeMs * 0.001;

    for (const mote of this.dustMotes) {
      // Thermal convection: buoyant rising draft near the lamp
      const distToLamp = Math.hypot(
        mote.x - this.layout.emitter.center.x,
        mote.y - this.layout.emitter.center.y,
      );
      const thermalBoost = distToLamp < 240 ? (1 - distToLamp / 240) * 12 : 0;

      // Gentle ambient sine draft
      const waveX = Math.sin(t * 2.0 + mote.seed) * 5;

      mote.x += (mote.vx + waveX) * dt;
      mote.y += (mote.vy - thermalBoost) * dt;

      // Wrap around table bounds
      if (mote.x < tb.x) mote.x = tb.x + tb.width;
      if (mote.x > tb.x + tb.width) mote.x = tb.x;
      if (mote.y < tb.y) mote.y = tb.y + tb.height;
      if (mote.y > tb.y + tb.height) mote.y = tb.y;

      // Tyndall Scattering: check proximity to active light beam
      let minDist = 9999;
      for (const seg of this.currentRaySegments) {
        const dist = this.distToSegment(mote, seg.start, seg.end);
        if (dist < minDist) {
          minDist = dist;
        }
      }

      // Three optical illumination zones
      let targetAlpha = mote.baseAlpha;
      let targetScale = 1.0;
      let isLit = false;

      if (minDist < 12) {
        // Core beam: brilliant golden Tyndall flare
        targetAlpha = 0.95;
        targetScale = 1.7;
        isLit = true;
      } else if (minDist < 28) {
        // Penumbra / Halo
        targetAlpha = 0.38;
        targetScale = 1.25;
        isLit = true;
      }

      mote.alpha += (targetAlpha - mote.alpha) * 0.2;

      const curSize = mote.size * targetScale;
      if (isLit) {
        this.dustGraphics.fillStyle(0xffe580, mote.alpha * 0.4);
        this.dustGraphics.fillCircle(mote.x, mote.y, curSize * 1.8);
        this.dustGraphics.fillStyle(0xffffff, mote.alpha * 0.95);
        this.dustGraphics.fillCircle(mote.x, mote.y, curSize);
      } else {
        this.dustGraphics.fillStyle(0xbaaa98, mote.alpha);
        this.dustGraphics.fillCircle(mote.x, mote.y, curSize);
      }
    }
  }

  private distToSegment(p: { x: number; y: number }, v: Vector2D, w: Vector2D): number {
    const l2 = (v.x - w.x) ** 2 + (v.y - w.y) ** 2;
    if (l2 === 0) return Math.hypot(p.x - v.x, p.y - v.y);
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(p.x - (v.x + t * (w.x - v.x)), p.y - (v.y + t * (w.y - v.y)));
  }

  private handleResize(gameSize: Phaser.Structs.Size): void {
    const width = gameSize.width;
    const height = gameSize.height;

    this.layout = LanternaLayoutManager.calculateLayout(
      width,
      height,
      this.currentLevel,
      this.context.selectedPhoto,
    );

    this.renderBackground(width, height);

    const sb = this.layout.projectionScreenBounds;
    this.projectionContainer.setPosition(sb.x + sb.width / 2, sb.y + sb.height / 2);

    const em = this.layout.emitter;
    this.lampAoSprite.setPosition(em.center.x, em.center.y);
    this.lampSprite.setPosition(em.center.x, em.center.y);
    this.lampFlameSprite.setPosition(em.center.x, em.center.y);

    const lens = this.layout.targetLens;
    this.lensBasePos = { x: lens.center.x, y: lens.center.y };
    this.lensAoSprite.setPosition(lens.center.x, lens.center.y);
    this.lensSprite.setPosition(lens.center.x, lens.center.y);
    this.lensGlow.setPosition(lens.center.x, lens.center.y);
    this.countdownContainer.setPosition(lens.center.x, lens.center.y - 54);

    for (const mirror of this.layout.mirrors) {
      const el = this.mirrorElements.get(mirror.id);
      if (el) {
        el.baseX = mirror.center.x;
        el.baseY = mirror.center.y;

        const dirX = mirror.center.x - em.center.x;
        const dirY = mirror.center.y - em.center.y;
        const len = Math.hypot(dirX, dirY) || 1;
        el.shadowDirX = dirX / len;
        el.shadowDirY = dirY / len;

        el.container.setPosition(mirror.center.x, mirror.center.y);
        el.ao.setPosition(mirror.center.x, mirror.center.y);
        el.shadow.setPosition(
          mirror.center.x + el.shadowDirX * 8,
          mirror.center.y + el.shadowDirY * 8,
        );
        el.shadow.setRotation(Math.atan2(el.shadowDirY, el.shadowDirX));
        el.touchZone.setRadius(Math.max(44, mirror.touchRadius));
      }
    }

    for (const star of this.layout.stars) {
      const sprite = this.starSprites.get(star.id);
      if (sprite) {
        sprite.setPosition(star.center.x, star.center.y);
      }
    }

    if (this.selectedMirrorId) {
      const el = this.mirrorElements.get(this.selectedMirrorId);
      if (el) {
        this.fineTuneContainer.setPosition(el.baseX, el.baseY);
      }
    }

    if (this.hintButtonTarget) {
      const btnX = width - 46;
      const btnY = this.layout.hud.instructionY;
      this.hintButtonTarget.setPosition(btnX, btnY);
      this.hintButtonLabel.setPosition(btnX, btnY);
    }

    this.instructionText.setPosition(width / 2 - 30, this.layout.hud.instructionY);

    if (this.ribbonBowSprite) {
      this.ribbonBowSprite.setPosition(sb.x + sb.width / 2, sb.y - 2);
    }
  }

  setVisibilityPaused(paused: boolean): void {
    this.visibilityPaused = paused;
    this.audioDir.setPaused(paused);
    if (paused) {
      this.sm.pause();
    } else {
      this.sm.resume();
    }
  }

  private dispose(): void {
    this.scale.off(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    for (const p of this.confettiParticles) {
      p.sprite.destroy();
    }
    this.confettiParticles = [];
    if (this.tableMaskGraphics) {
      this.tableMaskGraphics.destroy();
    }
    this.scope.dispose();
  }
}
