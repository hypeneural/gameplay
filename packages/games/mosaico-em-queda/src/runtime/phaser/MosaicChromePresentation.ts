import type { SceneScope } from '@christmas-games/platform';
import { christmasTheme } from '@christmas-games/theme';
import type * as PhaserModule from 'phaser';
import type { MosaicExperienceEffect } from '../../domain/MosaicExperience.js';
import type { MosaicHint } from '../../domain/MosaicHint.js';
import type { MosaicMemoryFrameSlot } from '../../domain/MosaicMemoryFrame.js';
import type { MosaicResolvedFramePhoto } from '../../domain/MosaicPhotoAvailability.js';
import type { TetrominoKind } from '../../domain/EngineTypes.js';
import { tetrominoCells } from '../../domain/TetrominoStates.js';
import type { MosaicExperienceLayout, MosaicRect } from '../MosaicExperienceLayout.js';
import type { MosaicRuntimePhotoPlan } from '../MosaicRuntimePhotoPlan.js';
import { MosaicMemoryFramePresentation } from './MosaicMemoryFramePresentation.js';
import { MosaicVictoryPresentation } from './MosaicVictoryPresentation.js';

const GOLD = 0xf8dfa0;
const RED = 0x8f1d35;

export interface MosaicChromeState {
  readonly framePhoto: MosaicResolvedFramePhoto;
  readonly frameSlot: MosaicMemoryFrameSlot;
  readonly hint: MosaicHint | null;
  readonly next: TetrominoKind;
  readonly terminal: boolean;
}

export interface MosaicChromeVisualAssets {
  readonly memoryFrameTextureKey: string;
  readonly nextPedestalTextureKey: string;
  readonly progressGarlandTextureKey: string;
  readonly victoryRibbonTextureKey: string;
  readonly warmLightTextureKey: string;
}

/** Story surfaces only: the Board owns cells; specialized children own Frame and victory. */
export class MosaicChromePresentation {
  private readonly hintText: PhaserModule.GameObjects.Text;
  private layoutState: MosaicExperienceLayout | undefined;
  private readonly memoryFrame: MosaicMemoryFramePresentation;
  private readonly nextCells: readonly PhaserModule.GameObjects.Rectangle[];
  private readonly nextLabel: PhaserModule.GameObjects.Text;
  private readonly nextPedestal: PhaserModule.GameObjects.Image | undefined;
  private readonly progressGarland: PhaserModule.GameObjects.Image | undefined;
  private readonly victory: MosaicVictoryPresentation;

  constructor(
    private readonly scene: PhaserModule.Scene,
    private readonly scope: SceneScope,
    private readonly photos: MosaicRuntimePhotoPlan,
    assets: MosaicChromeVisualAssets,
    reducedMotion: boolean,
  ) {
    this.memoryFrame = new MosaicMemoryFramePresentation({
      frameTextureKey: assets.memoryFrameTextureKey,
      photos,
      reducedMotion,
      scene,
      scope,
      warmLightTextureKey: assets.warmLightTextureKey,
    });
    this.victory = new MosaicVictoryPresentation({
      photos,
      reducedMotion,
      ribbonTextureKey: assets.victoryRibbonTextureKey,
      scene,
      scope,
    });
    this.hintText = this.text(7, 'Complete uma fileira para revelar uma lembrança.', '14px');
    this.nextLabel = this.text(7, 'DEPOIS', '10px');
    this.nextPedestal = scene.textures.exists(assets.nextPedestalTextureKey)
      ? scope.resource(
          scene.add.image(0, 0, assets.nextPedestalTextureKey).setOrigin(0.5).setDepth(7),
        )
      : undefined;
    this.progressGarland = scene.textures.exists(assets.progressGarlandTextureKey)
      ? scope.resource(
          scene.add.image(0, 0, assets.progressGarlandTextureKey).setOrigin(0.5).setDepth(6.7),
        )
      : undefined;
    this.nextCells = Array.from({ length: 4 }, () =>
      scope.resource(
        scene.add
          .rectangle(0, 0, 1, 1, RED, 1)
          .setOrigin(0.5)
          .setStrokeStyle(1.5, GOLD, 0.9)
          .setDepth(7.1),
      ),
    );
  }

  consume(effects: readonly MosaicExperienceEffect[]): void {
    this.memoryFrame.consume(effects);
    this.victory.consume(effects);
  }

  layout(layout: MosaicExperienceLayout): void {
    this.layoutState = layout;
    this.memoryFrame.layout(layout.memoryFrame);
    this.layoutNext(layout.next);
    this.progressGarland
      ?.setPosition(
        layout.progress.x + layout.progress.width / 2,
        layout.progress.y + layout.progress.height * 0.32,
      )
      .setDisplaySize(layout.progress.width, Math.min(24, layout.progress.height * 0.34));
    this.hintText
      .setPosition(layout.hint.x + layout.hint.width / 2, layout.hint.y + layout.hint.height / 2)
      .setWordWrapWidth(layout.hint.width, true);
    this.victory.layout(layout.board);
  }

  present(state: MosaicChromeState): void {
    if (this.layoutState === undefined) return;
    this.memoryFrame.present(state.framePhoto, state.frameSlot);
    this.presentNext(state.next);
    this.hintText.setText(hintLabel(state.hint));
    this.victory.present(state.terminal);
  }

  private text(depth: number, value: string, fontSize: string): PhaserModule.GameObjects.Text {
    return this.scope.resource(
      this.scene.add
        .text(0, 0, value, {
          align: 'center',
          color: christmasTheme.color.snow,
          fontFamily: 'system-ui, sans-serif',
          fontSize,
          fontStyle: 'bold',
        })
        .setOrigin(0.5)
        .setDepth(depth),
    );
  }

  private layoutNext(bounds: MosaicRect): void {
    this.nextPedestal
      ?.setPosition(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2)
      .setDisplaySize(bounds.width, bounds.height);
    this.nextLabel.setPosition(bounds.x + bounds.width / 2, bounds.y + bounds.height + 8);
  }

  private presentNext(kind: TetrominoKind): void {
    const layout = this.layoutState;
    if (layout === undefined) return;
    const cells = tetrominoCells(kind, 0, 0, 0);
    const minColumn = Math.min(...cells.map((cell) => cell.column));
    const maxColumn = Math.max(...cells.map((cell) => cell.column));
    const minRow = Math.min(...cells.map((cell) => cell.row));
    const maxRow = Math.max(...cells.map((cell) => cell.row));
    const columns = maxColumn - minColumn + 1;
    const rows = maxRow - minRow + 1;
    const size = Math.max(
      4,
      Math.min((layout.next.width - 12) / columns, (layout.next.height - 12) / rows),
    );
    const occupiedWidth = columns * size;
    const occupiedHeight = rows * size;
    const startX = layout.next.x + (layout.next.width - occupiedWidth) / 2 + size / 2;
    const startY = layout.next.y + (layout.next.height - occupiedHeight) / 2 + size / 2;
    this.nextCells.forEach((view, index) => {
      const cell = cells[index];
      if (cell === undefined) {
        view.setVisible(false);
        return;
      }
      view
        .setPosition(startX + (cell.column - minColumn) * size, startY + (cell.row - minRow) * size)
        .setSize(size, size)
        .setVisible(true);
    });
  }
}

function hintLabel(hint: MosaicHint | null): string {
  if (hint === null) return 'Complete uma fileira para revelar uma lembrança.';
  const action =
    hint.intent === 'left'
      ? 'leve a peça para a esquerda'
      : hint.intent === 'right'
        ? 'leve a peça para a direita'
        : hint.intent === 'rotate-cw'
          ? 'gire a peça'
          : 'baixe a peça';
  return `Dica: ${action}.`;
}
