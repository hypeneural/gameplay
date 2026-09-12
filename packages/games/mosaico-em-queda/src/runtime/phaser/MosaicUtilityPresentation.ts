import type { SceneScope } from '@christmas-games/platform';
import { attachCrystalControl, attachCrystalPause } from '@christmas-games/theme';
import type * as Phaser from 'phaser';
import type { MosaicExperienceLayout } from '../MosaicExperienceLayout.js';

/** Pause and mute sit beside the dock, outside the photo and movement targets. */
export class MosaicUtilityPresentation {
  private readonly sound: Phaser.GameObjects.Rectangle;
  private readonly pause: Phaser.GameObjects.Rectangle;
  private readonly backdrop: Phaser.GameObjects.Rectangle;
  private readonly title: Phaser.GameObjects.Text;
  private readonly prompt: Phaser.GameObjects.Text;

  constructor(input: {
    scene: Phaser.Scene;
    scope: SceneScope;
    reducedMotion: boolean;
    soundEnabled(): boolean;
    toggleSound(): void;
    togglePause(): void;
  }) {
    const { scene, scope } = input;
    const make = (label: string, action: () => void): Phaser.GameObjects.Rectangle => {
      const target = scope.resource(
        scene.add.rectangle(0, 0, 48, 48).setDepth(20).setInteractive({ useHandCursor: true }),
      );
      const text = scope.resource(
        scene.add
          .text(0, 0, label, { color: '#fff0c9', fontFamily: 'system-ui', fontStyle: 'bold' })
          .setOrigin(0.5)
          .setDepth(21),
      );
      attachCrystalControl({
        target,
        label: text,
        icon: () => (label === 'Som' ? (input.soundEnabled() ? 'sound' : 'muted') : 'pause'),
        graphics: scope.resource(scene.add.graphics().setDepth(20.5)),
        events: scene.events,
        scope,
        reducedMotion: input.reducedMotion,
      });
      target.on(
        'pointerdown',
        (_pointer: unknown, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
          event.stopPropagation();
          action();
          if (label === 'Som') text.setText(input.soundEnabled() ? 'Som' : 'Mudo');
        },
      );
      return target;
    };
    this.sound = make('Som', input.toggleSound);
    this.pause = make('Pausar', input.togglePause);
    this.backdrop = scope.resource(
      scene.add
        .rectangle(0, 0, 1, 1, 0x06251f, 0.84)
        .setOrigin(0)
        .setDepth(50)
        .setVisible(false)
        .setInteractive({ useHandCursor: true }),
    );
    this.backdrop.on(
      'pointerdown',
      (_pointer: unknown, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
        event.stopPropagation();
        input.togglePause();
      },
    );
    attachCrystalPause({
      backdrop: this.backdrop,
      graphics: scope.resource(scene.add.graphics().setDepth(50.5)),
      events: scene.events,
      scope,
    });
    this.title = scope.resource(
      scene.add
        .text(0, 0, 'Pausa de Natal', {
          fontFamily: 'system-ui',
          fontSize: '24px',
          fontStyle: 'bold',
          color: '#ffebbc',
        })
        .setOrigin(0.5)
        .setDepth(51)
        .setVisible(false),
    );
    this.prompt = scope.resource(
      scene.add
        .text(0, 0, 'Toque para continuar', {
          fontFamily: 'system-ui',
          fontSize: '15px',
          color: '#fff6df',
        })
        .setOrigin(0.5)
        .setDepth(51)
        .setVisible(false),
    );
  }

  layout(width: number, height: number, layout: MosaicExperienceLayout): void {
    const { left, right, down } = layout.controls;
    if (layout.portrait) {
      this.sound.setPosition(left.x + left.width / 2, down.y + down.height / 2);
      this.pause.setPosition(right.x + right.width / 2, down.y + down.height / 2);
    } else {
      this.sound.setPosition(left.x - 34, left.y + 26);
      this.pause.setPosition(left.x - 34, down.y + 26);
    }
    this.backdrop.setSize(width, height);
    this.title.setPosition(width / 2, height / 2 - 44);
    this.prompt.setPosition(width / 2, height / 2 + 2);
  }

  setPaused(paused: boolean): void {
    this.backdrop.setVisible(paused);
    this.title.setVisible(paused);
    this.prompt.setVisible(paused);
  }
}
