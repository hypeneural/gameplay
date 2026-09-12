import type { SceneScope } from '@christmas-games/platform';
import { attachCrystalControl } from '@christmas-games/theme';
import type * as Phaser from 'phaser';
import type { MosaicExperienceLayout } from '../MosaicExperienceLayout.js';

interface ViewerPhoto {
  textureKey: string;
  aspectRatio: number;
}
interface ViewerInput {
  scene: Phaser.Scene;
  scope: SceneScope;
  initialTextureKey: string;
  reducedMotion: boolean;
  onOpen(): ViewerPhoto | null;
  onClose(): void;
}

/** Enlarges only an already-authorized texture; it never loads another photo. */
export class MosaicPhotoViewer {
  private readonly target: Phaser.GameObjects.Zone;
  private readonly backdrop: Phaser.GameObjects.Rectangle;
  private readonly frame: Phaser.GameObjects.Rectangle;
  private readonly photo: Phaser.GameObjects.Image;
  private readonly title: Phaser.GameObjects.Text;
  private readonly close: Phaser.GameObjects.Rectangle;
  private readonly label: Phaser.GameObjects.Text;
  private current: ViewerPhoto | null = null;
  private width = 1;
  private height = 1;

  constructor(input: ViewerInput) {
    const { scene, scope } = input;
    this.target = scope.resource(
      scene.add.zone(0, 0, 52, 52).setDepth(25).setInteractive({ useHandCursor: true }),
    );
    this.backdrop = scope.resource(
      scene.add
        .rectangle(0, 0, 1, 1, 0x031b16, 0.94)
        .setOrigin(0)
        .setDepth(80)
        .setInteractive({ useHandCursor: true }),
    );
    this.frame = scope.resource(scene.add.rectangle(0, 0, 1, 1).setDepth(81));
    this.photo = scope.resource(scene.add.image(0, 0, input.initialTextureKey).setDepth(82));
    this.title = scope.resource(
      scene.add
        .text(0, 0, 'Sua lembrança de Natal', {
          fontFamily: 'system-ui',
          fontSize: '20px',
          color: '#ffebbc',
          fontStyle: 'bold',
        })
        .setOrigin(0.5)
        .setDepth(82),
    );
    this.close = scope.resource(
      scene.add.rectangle(0, 0, 232, 52).setDepth(83).setInteractive({ useHandCursor: true }),
    );
    this.label = scope.resource(
      scene.add
        .text(0, 0, 'Voltar ao mosaico', {
          fontFamily: 'system-ui',
          fontSize: '16px',
          fontStyle: 'bold',
          color: '#fff3d8',
        })
        .setOrigin(0.5)
        .setDepth(84),
    );
    for (const [target, depth] of [
      [this.frame, 81.5],
      [this.close, 83.5],
    ] as const) {
      attachCrystalControl({
        target,
        graphics: scope.resource(scene.add.graphics().setDepth(depth)),
        events: scene.events,
        scope,
        reducedMotion: input.reducedMotion,
        panel: target === this.frame,
        ...(target === this.close
          ? { label: this.label, icon: 'back' as const, labelLayout: 'inline' as const }
          : {}),
      });
    }
    const hide = (
      _pointer: unknown,
      _x: number,
      _y: number,
      event: Phaser.Types.Input.EventData,
    ): void => {
      event.stopPropagation();
      if (!this.current) return;
      this.current = null;
      this.setVisible(false);
      input.onClose();
    };
    this.close.on('pointerdown', hide);
    this.backdrop.on('pointerdown', hide);
    this.target.on(
      'pointerdown',
      (_pointer: unknown, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
        event.stopPropagation();
        const current = input.onOpen();
        if (!current) return;
        this.current = current;
        this.photo.setTexture(current.textureKey);
        this.layoutPhoto();
        this.setVisible(true);
      },
    );
    this.setVisible(false);
  }

  layout(width: number, height: number, layout: MosaicExperienceLayout): void {
    this.width = width;
    this.height = height;
    const bounds = layout.memoryFrame;
    this.target
      .setPosition(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2)
      .setSize(Math.max(52, bounds.width), Math.max(52, bounds.height));
    this.layoutPhoto();
  }

  private layoutPhoto(): void {
    this.backdrop.setSize(this.width, this.height);
    this.title.setPosition(this.width / 2, 32).setWordWrapWidth(this.width - 32);
    this.close.setPosition(this.width / 2, this.height - 40);
    this.label.setPosition(this.width / 2, this.height - 40);
    if (!this.current) return;
    const width = Math.max(
      1,
      Math.min(this.width - 64, (this.height - 164) * this.current.aspectRatio),
    );
    const height = width / this.current.aspectRatio;
    this.photo.setPosition(this.width / 2, this.height / 2 - 6).setDisplaySize(width, height);
    this.frame.setPosition(this.width / 2, this.height / 2 - 6).setSize(width + 18, height + 18);
  }

  private setVisible(visible: boolean): void {
    for (const target of [
      this.backdrop,
      this.frame,
      this.photo,
      this.title,
      this.close,
      this.label,
    ])
      target.setVisible(visible);
  }
}
