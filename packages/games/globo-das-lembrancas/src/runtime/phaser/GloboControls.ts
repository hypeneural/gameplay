import { attachCrystalControl, attachCrystalPause } from '@christmas-games/theme';
import type { CrystalIcon } from '@christmas-games/theme';
import type { SceneScope } from '@christmas-games/platform';
import type * as Phaser from 'phaser';

export function globoText(
  scene: Phaser.Scene,
  value: string,
  size: number,
  depth: number,
  color = '#fff3d9',
) {
  return scene.add
    .text(0, 0, value, {
      fontFamily: 'Nunito, system-ui, sans-serif',
      fontSize: `${size}px`,
      color,
      align: 'center',
      lineSpacing: 6,
      resolution: 2,
    })
    .setOrigin(0.5)
    .setDepth(depth);
}

export function globoButton(
  scene: Phaser.Scene,
  scope: SceneScope,
  label: string,
  width: number,
  depth: number,
  reduced: boolean,
  unlock: () => void,
  action: () => void,
) {
  const target = scene.add
    .rectangle(0, 0, width, 52, 0x0f2b22)
    .setDepth(depth)
    .setInteractive({ useHandCursor: true });
  const text = globoText(scene, label, 14, depth + 2);
  const graphics = scene.add.graphics().setDepth(depth + 1);

  const icons: Record<string, CrystalIcon> = {
    Som: 'sound',
    Mudo: 'muted',
    Pausa: 'pause',
    Seguir: 'play',
  };

  attachCrystalControl({
    target,
    graphics,
    events: scene.events,
    scope,
    label: text,
    icon: () => icons[text.text] ?? 'hint',
    iconSize: 20,
    labelLayout: width < 75 ? 'below' : 'inline',
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
  const onTouchCancel = () => cancel();
  scene.game.canvas.addEventListener('touchcancel', onTouchCancel);
  scope.add(() => {
    scene.game.canvas.removeEventListener('touchcancel', onTouchCancel);
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

export type GloboButton = ReturnType<typeof globoButton>;

export function createGloboPauseOverlay(
  scene: Phaser.Scene,
  scope: SceneScope,
  onResume: () => void,
) {
  const backdrop = scene.add
    .rectangle(0, 0, 1, 1, 0x071520, 0.88)
    .setOrigin(0)
    .setDepth(80)
    .setVisible(false)
    .setInteractive();

  const graphics = scene.add.graphics().setDepth(80.5);
  scope.add(() => graphics.destroy());

  attachCrystalPause({
    backdrop,
    graphics,
    events: scene.events,
    scope,
  });

  const title = globoText(scene, 'Pausa na Neve', 24, 82, '#fff5df').setVisible(false);
  const prompt = globoText(scene, 'Toque para continuar', 15, 82, '#ffe2a6').setVisible(false);

  backdrop.on(
    'pointerdown',
    (
      _pointer: Phaser.Input.Pointer,
      _x: number,
      _y: number,
      event: Phaser.Types.Input.EventData,
    ) => {
      event.stopPropagation();
      onResume();
    },
  );

  return {
    layout: (width: number, height: number) => {
      backdrop.setSize(width, height);
      title.setPosition(width / 2, height / 2 - 20);
      prompt.setPosition(width / 2, height / 2 + 18);
    },
    setVisible: (value: boolean) => {
      backdrop.setVisible(value);
      title.setVisible(value);
      prompt.setVisible(value);
    },
    destroy: () => {
      backdrop.destroy();
      title.destroy();
      prompt.destroy();
    },
  };
}
