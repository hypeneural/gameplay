import { attachCrystalControl } from '@christmas-games/theme';
import type { CrystalIcon } from '@christmas-games/theme';
import type { SceneScope } from '@christmas-games/platform';
import type * as Phaser from 'phaser';

export function rudolphText(scene: Phaser.Scene, value: string, size: number, depth: number) {
  return scene.add
    .text(0, 0, value, {
      fontFamily: 'Nunito, system-ui, sans-serif',
      fontSize: `${size}px`,
      color: '#fff3d9',
      align: 'center',
      lineSpacing: 8,
      resolution: 2,
    })
    .setOrigin(0.5)
    .setDepth(depth);
}

export function rudolphButton(
  scene: Phaser.Scene,
  scope: SceneScope,
  label: string,
  width: number,
  depth: number,
  reduced: boolean,
  unlock: () => void,
  action: () => void,
) {
  const target = scene.add.rectangle(0, 0, width, 52, 0x124536).setDepth(depth).setInteractive();
  const text = rudolphText(scene, label, 14, depth + 2);
  const graphics = scene.add.graphics().setDepth(depth + 1);
  const icons: Record<string, CrystalIcon> = {
    Som: 'sound',
    Mudo: 'muted',
    Pausa: 'pause',
    Seguir: 'play',
    Voltar: 'back',
    Anterior: 'left',
    Próxima: 'right',
  };
  const hasIcon = label !== 'Álbum';
  attachCrystalControl({
    target,
    graphics,
    events: scene.events,
    scope,
    label: text,
    ...(hasIcon
      ? {
          icon: () => icons[text.text] ?? 'hint',
          iconSize: 22,
          labelLayout: width < 80 ? ('below' as const) : ('inline' as const),
        }
      : {}),
    reducedMotion: reduced,
  });
  let pressed: number | undefined;
  const cancel = () => {
    pressed = undefined;
  };
  target.on(
    'pointerdown',
    (
      pointer: Phaser.Input.Pointer,
      _x: number,
      _y: number,
      event: Phaser.Types.Input.EventData,
    ) => {
      event.stopPropagation();
      pressed = pointer.id;
      unlock();
    },
  );
  target.on('pointerout', cancel);
  target.on(
    'pointerup',
    (
      pointer: Phaser.Input.Pointer,
      _x: number,
      _y: number,
      event: Phaser.Types.Input.EventData,
    ) => {
      event.stopPropagation();
      const accepted = pressed === pointer.id && pointer.getDistance() <= 16;
      cancel();
      if (accepted) action();
    },
  );
  scope.on(scene.input, 'pointerupoutside', cancel);
  scene.game.canvas.addEventListener('touchcancel', cancel);
  scope.add(() => {
    scene.game.canvas.removeEventListener('touchcancel', cancel);
    target.destroy();
    text.destroy();
  });
  return {
    target,
    text,
    cancel,
    move: (x: number, y: number) => {
      target.setPosition(x, y);
      text.setPosition(x, y);
    },
    show: (value: boolean) => {
      target.setVisible(value);
      text.setVisible(value);
      if (!value) cancel();
    },
  };
}
export type RudolphButton = ReturnType<typeof rudolphButton>;
