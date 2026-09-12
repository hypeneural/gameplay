import { createPhotoSurface } from '@christmas-games/platform';
import type { SceneScope } from '@christmas-games/platform';
import type * as PhaserModule from 'phaser';
import { projectLanding } from '../../domain/MosaicBoard.js';
import {
  MOSAIC_BUFFER_ROWS,
  MOSAIC_COLUMNS,
  MOSAIC_VISIBLE_ROWS,
  type GridPoint,
  type MosaicEngineState,
} from '../../domain/EngineTypes.js';
import { tetrominoCells } from '../../domain/TetrominoStates.js';
import { mosaicPhotoTextureKey, type MosaicRuntimePhotoPlan } from '../MosaicRuntimePhotoPlan.js';
import type { MosaicExperienceEffect } from '../../domain/MosaicExperience.js';

const BOARD_PRESENTER_COUNT = 8 * 14;
const TETROMINO_CELL_COUNT = 4;

interface MosaicBoardBounds {
  readonly height: number;
  readonly left: number;
  readonly top: number;
  readonly width: number;
}

interface MosaicPhotoView {
  readonly border: PhaserModule.GameObjects.Rectangle;
  readonly frame: PhaserModule.GameObjects.Image | undefined;
  readonly image: PhaserModule.GameObjects.Image;
  readonly matte: PhaserModule.GameObjects.Rectangle;
  serial: number | undefined;
}

export interface MosaicBoardPresentationOptions {
  readonly cellFrameTextureKey?: string;
  readonly reducedMotion: boolean;
}

/**
 * Stable renderer-owned pool. Domain state chooses material slots and cells;
 * this class only changes visibility, texture and proportional placement.
 */
export class MosaicBoardPresentation {
  private readonly activeViews: readonly MosaicPhotoView[];
  private readonly boardViews: readonly MosaicPhotoView[];
  private readonly clearGlowViews: readonly PhaserModule.GameObjects.Rectangle[];
  private readonly ghostViews: readonly PhaserModule.GameObjects.Rectangle[];
  private readonly hintViews: readonly PhaserModule.GameObjects.Rectangle[];
  private bounds?: MosaicBoardBounds;
  private pendingFeedback: readonly MosaicExperienceEffect[] = [];

  constructor(
    private readonly scene: PhaserModule.Scene,
    private readonly scope: SceneScope,
    private readonly photos: MosaicRuntimePhotoPlan,
    private readonly materialPhotoIds: readonly string[],
    private readonly options: MosaicBoardPresentationOptions,
  ) {
    this.boardViews = Array.from({ length: BOARD_PRESENTER_COUNT }, () => this.createPhotoView(2));
    this.activeViews = Array.from({ length: TETROMINO_CELL_COUNT }, () => this.createPhotoView(5));
    this.ghostViews = Array.from({ length: TETROMINO_CELL_COUNT }, () =>
      this.scope.resource(
        this.scene.add
          .rectangle(0, 0, 1, 1, 0xb7d2c8, 0)
          .setOrigin(0.5)
          .setStrokeStyle(1, 0xb7d2c8, 0.42)
          .setDepth(4)
          .setVisible(false),
      ),
    );
    // A hint is deliberately not a second ghost: its warm, wider frame maps a
    // domain-provided reachable target and never masks the photo beneath it.
    this.hintViews = Array.from({ length: TETROMINO_CELL_COUNT }, () =>
      this.scope.resource(
        this.scene.add
          .rectangle(0, 0, 1, 1, 0xf8dfa0, 0)
          .setOrigin(0.5)
          .setStrokeStyle(2.5, 0xf8dfa0, 0.96)
          .setDepth(4.6)
          .setVisible(false),
      ),
    );
    this.clearGlowViews = Array.from({ length: MOSAIC_VISIBLE_ROWS }, () =>
      this.scope.resource(
        this.scene.add
          .rectangle(0, 0, 1, 1, 0xf8dfa0, 0)
          .setOrigin(0.5)
          .setStrokeStyle(2, 0xf8dfa0, 0)
          .setDepth(12)
          .setVisible(false),
      ),
    );
    this.scope.add(() => this.scene.tweens.killTweensOf(this.clearGlowViews));
  }

  get presenterCount(): number {
    return (
      this.boardViews.length +
      this.activeViews.length +
      this.ghostViews.length +
      this.hintViews.length +
      this.clearGlowViews.length
    );
  }

  layout(bounds: MosaicBoardBounds): void {
    this.bounds = bounds;
  }

  get cellSize(): number {
    const bounds = this.bounds;
    return bounds === undefined
      ? 1
      : Math.min(bounds.width / MOSAIC_COLUMNS, bounds.height / MOSAIC_VISIBLE_ROWS);
  }

  containsPoint(x: number, y: number): boolean {
    const bounds = this.bounds;
    return (
      bounds !== undefined &&
      x >= bounds.left &&
      x <= bounds.left + bounds.width &&
      y >= bounds.top &&
      y <= bounds.top + bounds.height
    );
  }

  isActivePoint(x: number, y: number): boolean {
    return this.activeViews.some(
      (view) =>
        view.matte.visible &&
        Math.abs(x - view.matte.x) <= view.matte.width / 2 &&
        Math.abs(y - view.matte.y) <= view.matte.height / 2,
    );
  }

  /**
   * The hint owner supplies a reachable tetromino target. This surface merely
   * translates its cells to the current layout; it neither searches nor moves
   * the active piece.
   */
  presentHintCells(cells: readonly GridPoint[]): void {
    this.hintViews.forEach((view, index) => {
      const cell = cells[index];
      if (cell === undefined || !this.isVisible(cell)) {
        view.setVisible(false);
        return;
      }
      const position = this.cellPosition(cell);
      const haloSize = position.size + Math.max(3, position.size * 0.12);
      view.setPosition(position.x, position.y).setSize(haloSize, haloSize).setVisible(true);
    });
  }

  /**
   * Effects are authoritative about causality. The board surface only maps
   * already-known rows and serials to its stable visual pool.
   */
  consume(effects: readonly MosaicExperienceEffect[]): void {
    if (effects.length === 0) return;
    this.pendingFeedback = [...this.pendingFeedback, ...effects];
  }

  present(engine: MosaicEngineState): void {
    if (this.bounds === undefined) return;
    const { board } = engine;
    for (let visibleRow = 0; visibleRow < board.visibleRows; visibleRow += 1) {
      for (let column = 0; column < board.columns; column += 1) {
        const index = visibleRow * board.columns + column;
        const cell = board.cells[(visibleRow + board.bufferRows) * board.columns + column];
        this.presentPhotoView(
          this.boardViews[index]!,
          { column, row: visibleRow + board.bufferRows },
          cell?.materialSlot,
          cell?.pieceSerial,
        );
      }
    }

    const active = engine.active;
    const activeCells =
      active === null
        ? []
        : tetrominoCells(active.kind, active.rotation, active.column, active.row);
    this.presentPhotoCells(this.activeViews, activeCells, active?.materialSlot, active?.serial);
    const landing = active === null ? null : projectLanding(board, active);
    const ghostCells =
      landing === null || landing.row === active?.row
        ? []
        : tetrominoCells(landing.kind, landing.rotation, landing.column, landing.row);
    this.presentGhostCells(ghostCells);
    this.presentPendingFeedback();
  }

  private createPhotoView(depth: number): MosaicPhotoView {
    const anchorTextureKey = mosaicPhotoTextureKey(
      this.photos,
      this.photos.selection.anchorPhotoId,
      'thumb',
    );
    const matte = this.scope.resource(
      this.scene.add
        .rectangle(0, 0, 1, 1, 0xf8dfa0, 0.94)
        .setOrigin(0.5)
        .setDepth(depth)
        .setVisible(false),
    );
    const image = this.scope.resource(
      this.scene.add
        .image(0, 0, anchorTextureKey)
        .setOrigin(0.5)
        .setDepth(depth + 0.1)
        .setVisible(false),
    );
    const border = this.scope.resource(
      this.scene.add
        .rectangle(0, 0, 1, 1, 0x103e35, 0)
        .setOrigin(0.5)
        .setStrokeStyle(2, 0x8f1d35, 0.95)
        .setDepth(depth + 0.2)
        .setVisible(false),
    );
    const frameTextureKey = this.options.cellFrameTextureKey;
    const frame =
      frameTextureKey !== undefined && this.scene.textures.exists(frameTextureKey)
        ? this.scope.resource(
            this.scene.add
              .image(0, 0, frameTextureKey)
              .setOrigin(0.5)
              .setDepth(depth + 0.3)
              .setVisible(false),
          )
        : undefined;
    return { matte, image, border, frame, serial: undefined };
  }

  private presentPhotoCells(
    views: readonly MosaicPhotoView[],
    cells: readonly GridPoint[],
    materialSlot: number | undefined,
    serial: number | undefined,
  ): void {
    views.forEach((view, index) => this.presentPhotoView(view, cells[index], materialSlot, serial));
  }

  private presentPhotoView(
    view: MosaicPhotoView | undefined,
    cell: GridPoint | undefined,
    materialSlot: number | undefined,
    serial: number | undefined,
  ): void {
    if (
      view === undefined ||
      cell === undefined ||
      materialSlot === undefined ||
      !this.isVisible(cell)
    ) {
      this.hidePhotoView(view);
      return;
    }
    const position = this.cellPosition(cell);
    const photoId = this.materialPhotoIds[materialSlot];
    const photo = photoId === undefined ? undefined : this.photos.photosById.get(photoId);
    if (photo === undefined) {
      this.hidePhotoView(view);
      return;
    }
    const cellInset = Math.max(2, position.size * 0.07);
    const photoSurface = createPhotoSurface(
      photo,
      {
        x: position.x - position.size / 2 + cellInset,
        y: position.y - position.size / 2 + cellInset,
        width: position.size - cellInset * 2,
        height: position.size - cellInset * 2,
      },
      'contain',
    );
    view.serial = serial;
    view.matte
      .setPosition(position.x, position.y)
      .setSize(position.size, position.size)
      .setVisible(true);
    view.image
      .setTexture(mosaicPhotoTextureKey(this.photos, photo.id, 'thumb'))
      .setPosition(
        photoSurface.photo.x + photoSurface.photo.width / 2,
        photoSurface.photo.y + photoSurface.photo.height / 2,
      )
      .setDisplaySize(photoSurface.photo.width, photoSurface.photo.height)
      .setVisible(true);
    view.border
      .setPosition(position.x, position.y)
      .setSize(position.size, position.size)
      .setVisible(true);
    view.frame
      ?.setPosition(position.x, position.y)
      .setDisplaySize(position.size, position.size)
      .setVisible(true);
  }

  private presentGhostCells(cells: readonly GridPoint[]): void {
    this.ghostViews.forEach((view, index) => {
      const cell = cells[index];
      if (cell === undefined || !this.isVisible(cell)) {
        view.setVisible(false);
        return;
      }
      const position = this.cellPosition(cell);
      view
        .setPosition(position.x, position.y)
        .setSize(position.size, position.size)
        .setVisible(true);
    });
  }

  private hidePhotoView(view: MosaicPhotoView | undefined): void {
    view?.matte.setVisible(false);
    view?.image.setVisible(false);
    view?.border.setVisible(false);
    view?.frame?.setVisible(false);
    if (view !== undefined) view.serial = undefined;
  }

  private presentPendingFeedback(): void {
    const feedback = this.pendingFeedback;
    this.pendingFeedback = [];
    for (const effect of feedback) {
      if (effect.type === 'piece-rotated')
        this.pulseViews(this.activeViews.filter((view) => view.serial === effect.serial));
      else if (effect.type === 'piece-grounded')
        this.pulseViews(
          this.activeViews.filter((view) => view.serial === effect.serial),
          1.015,
          48,
        );
      else if (effect.type === 'piece-locked')
        this.pulseViews(this.boardViews.filter((view) => view.serial === effect.serial));
      else if (effect.type === 'lines-detected') this.showLineGlow(effect.rows, false);
      else if (effect.type === 'lines-cleared') this.showLineGlow(effect.rows, true);
    }
  }

  private showLineGlow(rows: readonly number[], clear: boolean): void {
    const bounds = this.bounds;
    if (bounds === undefined) return;
    for (const row of rows) {
      const visibleRow = row - MOSAIC_BUFFER_ROWS;
      const glow = this.clearGlowViews[visibleRow];
      if (glow === undefined) continue;
      this.scene.tweens.killTweensOf(glow);
      const height = bounds.height / MOSAIC_VISIBLE_ROWS;
      glow
        .setPosition(bounds.left + bounds.width / 2, bounds.top + (visibleRow + 0.5) * height)
        .setSize(bounds.width, Math.max(2, height - 2))
        .setStrokeStyle(2, 0xf8dfa0, clear ? 1 : 0.88)
        .setAlpha(clear ? 0.68 : 0.42)
        .setVisible(true);
      if (this.options.reducedMotion) {
        if (clear) glow.setVisible(false);
        continue;
      }
      this.scene.tweens.add({
        targets: glow,
        alpha: 0,
        duration: clear ? 150 : 220,
        delay: clear ? 20 : 0,
        ease: 'Sine.Out',
        onComplete: () => glow.setVisible(false),
      });
    }
  }

  private pulseViews(views: readonly MosaicPhotoView[], scale = 1.035, duration = 75): void {
    if (views.length === 0 || this.options.reducedMotion) return;
    for (const view of views) {
      // The SVG frame is display-sized from a cell. Scaling it would restore
      // its native texture dimensions after the tween; pulse only primitives.
      const targets = [view.matte, view.border];
      this.scene.tweens.add({
        targets,
        scaleX: scale,
        scaleY: scale,
        yoyo: true,
        duration,
        ease: 'Sine.Out',
      });
    }
  }

  private isVisible(cell: GridPoint): boolean {
    return (
      this.bounds !== undefined &&
      cell.column >= 0 &&
      cell.column < MOSAIC_COLUMNS &&
      cell.row >= MOSAIC_BUFFER_ROWS &&
      cell.row < MOSAIC_BUFFER_ROWS + MOSAIC_VISIBLE_ROWS
    );
  }

  private cellPosition(cell: GridPoint): {
    readonly size: number;
    readonly x: number;
    readonly y: number;
  } {
    const bounds = this.bounds;
    if (bounds === undefined) throw new Error('Mosaic presentation needs bounds before rendering.');
    const size = Math.min(bounds.width / MOSAIC_COLUMNS, bounds.height / MOSAIC_VISIBLE_ROWS);
    return {
      size,
      x: bounds.left + (cell.column + 0.5) * size,
      y: bounds.top + (cell.row - MOSAIC_BUFFER_ROWS + 0.5) * size,
    };
  }
}
