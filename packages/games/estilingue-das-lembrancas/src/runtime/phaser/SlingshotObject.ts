import type * as PhaserModule from 'phaser';
import type { SceneScope } from '@christmas-games/platform';
import type { SlingshotAssembly } from '../SlingshotLayoutManager.js';
import { SlingshotBand } from './SlingshotBand.js';
import { PouchPhysics } from './PouchPhysics.js';
import { SnowballObject } from './SnowballObject.js';
import { TrajectoryPredictor } from './TrajectoryPredictor.js';
import { TrajectoryRenderer } from './TrajectoryRenderer.js';
import type { SlingshotStateMachine } from '../../domain/SlingshotStateMachine.js';
import { calculatePull } from '../../domain/ShotModel.js';
import { estilingueDasLembrancasTuning as tuning } from '../../tuning.js';

export class SlingshotObject {
  private forkGraphics: PhaserModule.GameObjects.Graphics;
  private forkImage?: PhaserModule.GameObjects.Image;
  private bandGraphics: PhaserModule.GameObjects.Graphics;
  private pouchImage?: PhaserModule.GameObjects.Image;
  private pouchSprite?: PhaserModule.GameObjects.Rectangle;
  private pouchSnowflake?: PhaserModule.GameObjects.Text;
  private grabZone: PhaserModule.GameObjects.Zone;

  public readonly leftBand: SlingshotBand;
  public readonly rightBand: SlingshotBand;
  public readonly pouchPhysics: PouchPhysics;
  public readonly snowball: SnowballObject;
  public readonly predictor: TrajectoryPredictor;
  public readonly trajectoryRenderer: TrajectoryRenderer;

  private isAiming = false;
  private activePointerId: number | null = null;

  constructor(
    private readonly scene: PhaserModule.Scene,
    private readonly scope: SceneScope,
    public readonly layout: SlingshotAssembly,
    public readonly sm: SlingshotStateMachine,
    private readonly onLaunch: (vx: number, vy: number) => void,
    private readonly onTensionStep?: (ratio: number) => void,
  ) {
    const { anchorLeft, anchorRight, restPosition, forkCenter, forkWidth, forkHeight } = layout;

    // 1. Verlet Elastic Bands
    this.leftBand = new SlingshotBand(anchorLeft.x, anchorLeft.y, restPosition.x, restPosition.y);
    this.rightBand = new SlingshotBand(
      anchorRight.x,
      anchorRight.y,
      restPosition.x,
      restPosition.y,
    );
    this.rightBand.setVariationSeed(0.42);

    // 2. Pouch Physics
    this.pouchPhysics = new PouchPhysics(restPosition.x, restPosition.y);

    // 3. Snowball Object (Depth 23)
    this.snowball = new SnowballObject(scene, scope, restPosition.x, restPosition.y);

    // 4. Trajectory Predictor & Renderer (Depth 25)
    this.predictor = new TrajectoryPredictor({
      x: tuning.gravityX,
      y: tuning.gravityY,
      scale: tuning.gravityScale,
    });
    this.trajectoryRenderer = new TrajectoryRenderer(scene, 25);

    // 5. Visual graphics for bands (Depth 21) and fork (Depth 20)
    this.bandGraphics = scene.add.graphics().setDepth(21);
    this.forkGraphics = scene.add.graphics().setDepth(20);

    if (scene.textures.exists('garfo-estilingue')) {
      this.forkImage = scene.add
        .image(forkCenter.x, forkCenter.y - forkHeight * 0.04, 'garfo-estilingue')
        .setDisplaySize(forkWidth * 1.06, forkHeight * 1.06)
        .setDepth(20);
    } else {
      this.renderFork();
    }

    // 6. Leather pouch visual (Depth 22)
    if (scene.textures.exists('bolsa-couro')) {
      this.pouchImage = scene.add
        .image(restPosition.x, restPosition.y, 'bolsa-couro')
        .setDisplaySize(44, 44)
        .setDepth(22);
    } else {
      this.pouchSprite = scene.add
        .rectangle(restPosition.x, restPosition.y, 36, 26, 0x4a2e1b)
        .setStrokeStyle(2, 0x2d1a0e)
        .setDepth(22);

      this.pouchSnowflake = scene.add
        .text(restPosition.x, restPosition.y, '❄', {
          fontSize: '12px',
          color: '#ffffff',
        })
        .setOrigin(0.5)
        .setDepth(22.5);
    }

    // 7. Interactive touch grab zone (Depth 28)
    this.grabZone = scene.add
      .zone(
        layout.touchGrabArea.x + layout.touchGrabArea.width / 2,
        layout.touchGrabArea.y + layout.touchGrabArea.height / 2,
        layout.touchGrabArea.width,
        layout.touchGrabArea.height,
      )
      .setInteractive({ useHandCursor: true })
      .setDepth(28);

    this.setupInput();

    this.scope.add(() => this.destroy());
  }

  private renderFork(): void {
    const { forkCenter, forkWidth, forkHeight, anchorLeft, anchorRight } = this.layout;

    this.forkGraphics.clear();

    // Sturdy carved wooden fork stem
    this.forkGraphics.fillStyle(0x5c3a21, 1.0);
    this.forkGraphics.fillRoundedRect(
      forkCenter.x - forkWidth * 0.18,
      anchorLeft.y + 16,
      forkWidth * 0.36,
      forkHeight * 0.72,
      12,
    );

    // Left and Right fork prongs
    this.forkGraphics.lineStyle(forkWidth * 0.16, 0x6e472a, 1.0);
    this.forkGraphics.beginPath();
    this.forkGraphics.moveTo(forkCenter.x, anchorLeft.y + forkHeight * 0.28);
    this.forkGraphics.lineTo(anchorLeft.x, anchorLeft.y);
    this.forkGraphics.strokePath();

    this.forkGraphics.beginPath();
    this.forkGraphics.moveTo(forkCenter.x, anchorRight.y + forkHeight * 0.28);
    this.forkGraphics.lineTo(anchorRight.x, anchorRight.y);
    this.forkGraphics.strokePath();

    // Brass collar rings at prong tips
    this.forkGraphics.fillStyle(0xd4af37, 1.0);
    this.forkGraphics.fillCircle(anchorLeft.x, anchorLeft.y, 9);
    this.forkGraphics.fillCircle(anchorRight.x, anchorRight.y, 9);
    this.forkGraphics.fillStyle(0x8b6508, 1.0);
    this.forkGraphics.fillCircle(anchorLeft.x, anchorLeft.y, 4);
    this.forkGraphics.fillCircle(anchorRight.x, anchorRight.y, 4);
  }

  private setupInput(): void {
    this.grabZone.on('pointerdown', (pointer: PhaserModule.Input.Pointer) => {
      if (this.isAiming || this.snowball.isInFlight) return;
      if (this.sm.state !== 'READY' && this.sm.state !== 'FREE_PLAY') {
        if (!this.snowball.isInFlight) {
          this.sm.forceRecoverReady();
        } else {
          return;
        }
      }

      this.pouchPhysics.setPosition(this.layout.restPosition.x, this.layout.restPosition.y);
      this.isAiming = true;
      this.activePointerId = pointer.id;
      this.sm.startAiming();
      this.trajectoryRenderer.setVisible(true);
      pointer.event.stopPropagation();
    });

    this.scene.input.on('pointermove', (pointer: PhaserModule.Input.Pointer) => {
      if (!this.isAiming || pointer.id !== this.activePointerId) return;

      const pull = calculatePull(
        this.layout.restPosition,
        { x: pointer.x, y: pointer.y },
        tuning.maxPullDistance,
        tuning.minPullDistance,
        tuning.velocityMultiplier,
        tuning.pullConeAngleRad,
      );

      // Update pouch and snowball position along clamped vector
      this.pouchPhysics.setPosition(pull.clampedPouchPosition.x, pull.clampedPouchPosition.y);
      this.snowball.setPosition(pull.clampedPouchPosition.x, pull.clampedPouchPosition.y);

      // Stretch Verlet bands in taut mode
      this.leftBand.setEndPoint(pull.clampedPouchPosition.x, pull.clampedPouchPosition.y, true);
      this.rightBand.setEndPoint(pull.clampedPouchPosition.x, pull.clampedPouchPosition.y, true);

      // Notify tension step for creak sounds
      this.onTensionStep?.(pull.powerRatio);

      // Trajectory simulation
      if (pull.isValidPull) {
        const points = this.predictor.simulate(
          pull.clampedPouchPosition.x,
          pull.clampedPouchPosition.y,
          pull.launchVelocity.x,
          pull.launchVelocity.y,
          {
            radius: tuning.snowballRadius,
            mass: tuning.snowballMass,
            frictionAir: tuning.snowballFrictionAir,
            totalSteps: tuning.trajectoryTotalSteps,
            framesPerDot: tuning.trajectoryFramesPerDot,
            deltaMs: tuning.trajectorySimDeltaMs,
          },
        );
        this.trajectoryRenderer.render(points, pull.powerRatio);
      } else {
        this.trajectoryRenderer.render([], 0);
      }
    });

    const onPointerUp = (pointer: PhaserModule.Input.Pointer) => {
      if (!this.isAiming || pointer.id !== this.activePointerId) return;

      this.isAiming = false;
      this.activePointerId = null;
      this.trajectoryRenderer.setVisible(false);

      const pull = calculatePull(
        this.layout.restPosition,
        { x: pointer.x, y: pointer.y },
        tuning.maxPullDistance,
        tuning.minPullDistance,
        tuning.velocityMultiplier,
        tuning.pullConeAngleRad,
      );

      if (pull.isValidPull) {
        // Valid launch
        this.sm.releaseShot();
        this.pouchPhysics.startWhip(
          pull.clampedPouchPosition.x,
          pull.clampedPouchPosition.y,
          pull.powerRatio,
        );

        // Impart wave impulses to Verlet bands
        this.leftBand.applyWaveImpulse(pull.powerRatio);
        this.rightBand.applyWaveImpulse(pull.powerRatio);

        // Launch projectile
        this.sm.launchProjectile();
        this.snowball.launch(pull.launchVelocity.x, pull.launchVelocity.y);
        this.onLaunch(pull.launchVelocity.x, pull.launchVelocity.y);
      } else {
        // Cancelled pull: return smoothly to rest
        this.sm.cancelAiming();
        this.pouchPhysics.startWhip(pull.clampedPouchPosition.x, pull.clampedPouchPosition.y, 0.3);
      }
    };

    this.scene.input.on('pointerup', onPointerUp);
    this.scene.input.on('pointerupoutside', onPointerUp);
  }

  update(delta = 16.666): void {
    // 1. Update Pouch whip physics
    this.pouchPhysics.update(1);
    const px = this.pouchPhysics.x;
    const py = this.pouchPhysics.y;

    this.pouchImage?.setPosition(px, py);
    this.pouchSprite?.setPosition(px, py);
    this.pouchSnowflake?.setPosition(px, py);

    if (!this.snowball.isInFlight) {
      this.snowball.setPosition(px, py);
    }

    // 2. Update Verlet bands
    this.leftBand.setEndPoint(px, py, this.isAiming);
    this.rightBand.setEndPoint(px, py, this.isAiming);
    this.leftBand.update();
    this.rightBand.update();

    // 3. Render dynamic rubber bands
    this.renderBands();

    // 4. Update snowball physics & scale
    this.snowball.update(delta);
  }

  private renderBands(): void {
    this.bandGraphics.clear();

    const drawBand = (band: SlingshotBand) => {
      const points = band.getPoints();
      if (points.length < 2) return;

      // Dark brown rubber with shadow thickness
      this.bandGraphics.lineStyle(5.5, 0x3d2010, 0.95);
      this.bandGraphics.beginPath();
      this.bandGraphics.moveTo(points[0]!.x, points[0]!.y);
      for (let i = 1; i < points.length; i++) {
        this.bandGraphics.lineTo(points[i]!.x, points[i]!.y);
      }
      this.bandGraphics.strokePath();

      // Golden amber rubber core highlight
      this.bandGraphics.lineStyle(2.5, 0x8b4513, 0.9);
      this.bandGraphics.beginPath();
      this.bandGraphics.moveTo(points[0]!.x, points[0]!.y);
      for (let i = 1; i < points.length; i++) {
        this.bandGraphics.lineTo(points[i]!.x, points[i]!.y);
      }
      this.bandGraphics.strokePath();
    };

    drawBand(this.leftBand);
    drawBand(this.rightBand);
  }

  reloadSnowball(): void {
    const { restPosition } = this.layout;
    this.pouchPhysics.reset();
    this.snowball.reset(restPosition.x, restPosition.y);
  }

  destroy(): void {
    this.forkImage?.destroy();
    this.forkGraphics.destroy();
    this.bandGraphics.destroy();
    this.pouchImage?.destroy();
    this.pouchSprite?.destroy();
    this.pouchSnowflake?.destroy();
    this.grabZone.destroy();
    this.trajectoryRenderer.destroy();
    this.predictor.destroy();
  }
}
