import type { SceneScope } from '@christmas-games/platform';
import { attachCrystalControl } from '@christmas-games/theme';
import type * as PhaserModule from 'phaser';
import type { MosaicExperienceLayout, MosaicRect } from '../MosaicExperienceLayout.js';
import type { MosaicDockAction } from './MosaicDockInput.js';

export type MosaicDockState = 'idle' | 'pressed' | 'held' | 'disabled' | 'blocked';

interface MosaicDockButton {
  readonly art: PhaserModule.GameObjects.Image | undefined;
  readonly fallback: PhaserModule.GameObjects.Rectangle;
  readonly hitArea: PhaserModule.GameObjects.Rectangle;
  readonly hintRing: PhaserModule.GameObjects.Rectangle;
  readonly shadow: PhaserModule.GameObjects.Rectangle;
  bounds?: MosaicRect;
  state: MosaicDockState;
}

export interface MosaicDockPresentationInput {
  readonly onPress: (
    action: MosaicDockAction,
    pointer: PhaserModule.Input.Pointer,
    event: PhaserModule.Types.Input.EventData,
  ) => boolean;
  readonly panelTextureKey: string;
  readonly reducedMotion: boolean;
  readonly scene: PhaserModule.Scene;
  readonly scope: SceneScope;
  readonly textureKeyByAction: Readonly<Record<MosaicDockAction, string>>;
}

const actions = ['left', 'rotate-cw', 'right', 'down'] as const;

/**
 * A small physical control surface. The transparent hit target keeps its
 * minimum CSS-sized area even when artwork intentionally has rounded edges.
 */
export class MosaicDockPresentation {
  private readonly buttons = new Map<MosaicDockAction, MosaicDockButton>();
  private readonly panel?: PhaserModule.GameObjects.Image;
  private hintedAction: MosaicDockAction | null = null;

  constructor(private readonly input: MosaicDockPresentationInput) {
    if (input.scene.textures.exists(input.panelTextureKey)) {
      this.panel = input.scope.resource(
        input.scene.add.image(0, 0, input.panelTextureKey).setOrigin(0.5).setDepth(8),
      );
    }
    for (const action of actions) this.buttons.set(action, this.createButton(action));
    input.scope.add(() => {
      for (const button of this.buttons.values()) {
        input.scene.tweens.killTweensOf(
          [button.art, button.fallback, button.shadow].filter(
            (
              target,
            ): target is PhaserModule.GameObjects.Image | PhaserModule.GameObjects.Rectangle =>
              target !== undefined,
          ),
        );
        input.scene.tweens.killTweensOf(button.hintRing);
      }
    });
  }

  layout(layout: MosaicExperienceLayout): void {
    const bounds = actions.map((action) => layout.controls[action]);
    this.layoutPanel(bounds);
    for (const action of actions)
      this.layoutButton(this.buttons.get(action)!, layout.controls[action]);
  }

  setState(action: MosaicDockAction, state: MosaicDockState): void {
    const button = this.buttons.get(action);
    if (button === undefined || button.state === state) return;
    button.state = state;
    this.applyState(button, state);
  }

  setEnabled(enabled: boolean): void {
    if (!enabled) this.setHint(null);
    for (const action of actions) this.setState(action, enabled ? 'idle' : 'disabled');
  }

  /** One brief invitation, distinct from pressed/held feedback. */
  setHint(action: MosaicDockAction | null): void {
    if (this.hintedAction === action) return;
    this.hintedAction = action;
    for (const candidate of actions) {
      const button = this.buttons.get(candidate);
      if (button === undefined) continue;
      this.input.scene.tweens.killTweensOf(button.hintRing);
      button.hintRing.setVisible(candidate === action && button.state !== 'disabled');
      if (candidate !== action || button.state === 'disabled') continue;
      button.hintRing.setAlpha(0.96);
      if (this.input.reducedMotion) continue;
      this.input.scene.tweens.add({
        targets: button.hintRing,
        alpha: 0,
        duration: 280,
        ease: 'Sine.Out',
        onComplete: () => button.hintRing.setVisible(false),
      });
    }
  }

  release(pointerId?: number): void {
    // Pointer identity is enforced by MosaicPointerOwnership. The presentation
    // only restores visuals and therefore never changes input authority.
    void pointerId;
    for (const action of actions) {
      const button = this.buttons.get(action);
      if (button?.state === 'pressed' || button?.state === 'held' || button?.state === 'blocked')
        this.setState(action, 'idle');
    }
  }

  pulse(action: MosaicDockAction): void {
    const button = this.buttons.get(action);
    if (button === undefined || button.state !== 'idle') return;
    // Artwork is display-sized by layout. Scaling an Image here would restore
    // its native SVG dimensions, so the short invitation lives on its ring.
    this.input.scene.tweens.killTweensOf(button.hintRing);
    button.hintRing.setAlpha(0.96).setVisible(true);
    if (!this.input.reducedMotion) {
      this.input.scene.tweens.add({
        targets: button.hintRing,
        alpha: 0,
        duration: 220,
        ease: 'Sine.Out',
        onComplete: () => button.hintRing.setVisible(false),
      });
    }
  }

  private createButton(action: MosaicDockAction): MosaicDockButton {
    const scene = this.input.scene;
    const shadow = this.input.scope.resource(
      scene.add.rectangle(0, 2, 1, 1, 0x061b17, 0.42).setOrigin(0.5).setDepth(8.1),
    );
    const fallback = this.input.scope.resource(
      scene.add
        .rectangle(0, 0, 1, 1, 0x8f1d35, 1)
        .setOrigin(0.5)
        .setStrokeStyle(2, 0xf8dfa0, 0.92)
        .setDepth(8.2),
    );
    const textureKey = this.input.textureKeyByAction[action];
    const art = scene.textures.exists(textureKey)
      ? this.input.scope.resource(scene.add.image(0, 0, textureKey).setOrigin(0.5).setDepth(8.3))
      : undefined;
    const hitArea = this.input.scope.resource(
      scene.add
        .rectangle(0, 0, 52, 52, 0xffffff, 0.001)
        .setOrigin(0.5)
        .setDepth(8.4)
        .setInteractive({ useHandCursor: true }),
    );
    const hintRing = this.input.scope.resource(
      scene.add
        .rectangle(0, 0, 1, 1, 0xf8dfa0, 0)
        .setOrigin(0.5)
        .setStrokeStyle(2.5, 0xf8dfa0, 0.98)
        .setDepth(8.35)
        .setVisible(false),
    );
    const onDown = (
      pointer: PhaserModule.Input.Pointer,
      _localX: number,
      _localY: number,
      event: PhaserModule.Types.Input.EventData,
    ): void => {
      event.stopPropagation();
      const accepted = this.input.onPress(action, pointer, event);
      this.setState(action, accepted ? 'pressed' : 'blocked');
      if (!accepted) {
        this.input.scene.time.delayedCall(100, () => this.setState(action, 'idle'));
        return;
      }
      if (accepted && !this.input.reducedMotion) {
        this.input.scene.time.delayedCall(60, () => {
          const current = this.buttons.get(action);
          if (current?.state === 'pressed') this.setState(action, 'held');
        });
      }
    };
    hitArea.on('pointerdown', onDown);
    attachCrystalControl({
      target: art ?? fallback,
      gesture: hitArea,
      graphics: this.input.scope.resource(scene.add.graphics().setDepth(8.32)),
      icon: action === 'rotate-cw' ? 'rotate' : action,
      events: scene.events,
      scope: this.input.scope,
      reducedMotion: this.input.reducedMotion,
      ruby: action === 'down',
    });
    this.input.scope.add(() => hitArea.off('pointerdown', onDown));
    return { art, fallback, hitArea, hintRing, shadow, state: 'idle' };
  }

  private layoutPanel(bounds: readonly MosaicRect[]): void {
    if (this.panel === undefined) return;
    const left = Math.min(...bounds.map((bound) => bound.x)) - 8;
    const top = Math.min(...bounds.map((bound) => bound.y)) - 8;
    const right = Math.max(...bounds.map((bound) => bound.x + bound.width)) + 8;
    const bottom = Math.max(...bounds.map((bound) => bound.y + bound.height)) + 8;
    this.panel
      .setPosition((left + right) / 2, (top + bottom) / 2)
      .setDisplaySize(right - left, bottom - top);
  }

  private layoutButton(button: MosaicDockButton, bounds: MosaicRect): void {
    button.bounds = bounds;
    const x = bounds.x + bounds.width / 2;
    const y = bounds.y + bounds.height / 2;
    button.shadow.setPosition(x, y + 3).setSize(bounds.width, bounds.height);
    button.fallback.setPosition(x, y).setSize(bounds.width, bounds.height);
    button.art?.setPosition(x, y).setDisplaySize(bounds.width, bounds.height);
    button.hintRing.setPosition(x, y).setSize(bounds.width + 7, bounds.height + 7);
    button.hitArea
      .setPosition(x, y)
      .setSize(Math.max(52, bounds.width), Math.max(52, bounds.height));
    this.applyState(button, button.state, true);
  }

  private applyState(button: MosaicDockButton, state: MosaicDockState, immediate = false): void {
    const bounds = button.bounds;
    if (bounds === undefined) return;
    const x = bounds.x + bounds.width / 2;
    const y = bounds.y + bounds.height / 2;
    const target = button.art ?? button.fallback;
    const pressed = state === 'pressed' || state === 'held';
    const offset = pressed ? 2 : 0;
    const alpha = state === 'disabled' ? 0.42 : state === 'blocked' ? 0.64 : 1;
    button.hitArea.disableInteractive();
    if (state !== 'disabled') button.hitArea.setInteractive({ useHandCursor: true });
    button.fallback
      .setAlpha(button.art === undefined ? alpha : 0)
      .setStrokeStyle(state === 'blocked' ? 3 : 2, state === 'blocked' ? 0xf0b7a8 : 0xf8dfa0, 0.92);
    button.shadow.setAlpha(pressed ? 0.16 : 0.42);
    this.applyFaceSize(button, pressed);
    if (immediate || this.input.reducedMotion) {
      target.setPosition(x, y + offset).setAlpha(alpha);
      return;
    }
    this.input.scene.tweens.killTweensOf(target);
    this.input.scene.tweens.add({
      targets: target,
      x,
      y: y + offset,
      alpha,
      duration: 80,
      ease: 'Sine.Out',
    });
  }

  private applyFaceSize(button: MosaicDockButton, pressed: boolean): void {
    const bounds = button.bounds;
    if (bounds === undefined) return;
    const scale = pressed ? 0.98 : 1;
    const width = bounds.width * scale;
    const height = bounds.height * scale;
    if (button.art !== undefined) button.art.setDisplaySize(width, height);
    else button.fallback.setSize(width, height);
  }
}
