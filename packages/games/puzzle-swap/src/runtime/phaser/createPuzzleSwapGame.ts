import { SceneScope, createViewportLayout } from '@christmas-games/platform';
import type {
  GameContext,
  GameController,
  GameModule,
  GameViewport,
} from '@christmas-games/platform';
import { christmasTheme } from '@christmas-games/theme';
import type * as PhaserModule from 'phaser';
import { planPuzzleGrid, type PuzzleGridPlan } from '../../domain/GridPlanner.js';
import {
  createSolvedPuzzleBoard,
  isPuzzleSolved,
  swapPuzzlePieces,
} from '../../domain/PuzzleBoard.js';
import { getPuzzleProgress } from '../../domain/PuzzleProgress.js';
import { shufflePuzzleBoard } from '../../domain/PuzzleShuffle.js';
import { selectPuzzleCell } from '../../domain/Swap.js';
import { puzzleSwapDefinition } from '../../definition.js';
import { puzzleSwapTuning } from '../../tuning.js';

interface BoardBounds {
  readonly x: number;
  readonly y: number;
  readonly plan: PuzzleGridPlan;
}

const puzzleGold = 0xf8dfa0;

/**
 * A single authorized source texture is cropped into display pieces. Each
 * piece has a separate visual Game Object, but no per-piece network image.
 */
export function createPuzzleSwapGame(
  Phaser: typeof PhaserModule,
  parent: HTMLElement,
  context: GameContext,
): GameController {
  const textureKey = `puzzle-source-${context.run.runId}`;

  class PuzzleScene extends Phaser.Scene {
    private readonly scope = new SceneScope();
    private board = shufflePuzzleBoard(createSolvedPuzzleBoard(3, 4), context.random);
    private bounds?: BoardBounds;
    private selectedIndex: number | null = null;
    private pointerDownIndex: number | null = null;
    private sourceWidth = 0;
    private sourceHeight = 0;
    private readonly pieces: Phaser.GameObjects.Image[] = [];
    private readonly borders: Phaser.GameObjects.Rectangle[] = [];
    private progressText?: Phaser.GameObjects.Text;

    constructor() {
      super('PuzzleSwapScene');
    }

    preload(): void {
      this.load.image(textureKey, context.selectedPhoto.variants.game);
    }

    create(): void {
      const sourceFrame = this.textures.get(textureKey).get();
      this.sourceWidth = sourceFrame.width;
      this.sourceHeight = sourceFrame.height;
      if (this.sourceWidth <= 0 || this.sourceHeight <= 0) {
        throw new Error('Puzzle source texture has invalid dimensions.');
      }

      this.scope.texture(this.textures, textureKey);
      this.add
        .text(0, 0, 'Monte sua foto', {
          color: christmasTheme.color.snow,
          fontFamily: 'system-ui, sans-serif',
          fontSize: '20px',
          fontStyle: 'bold',
        })
        .setName('puzzle-title')
        .setOrigin(0.5);
      this.progressText = this.add
        .text(0, 0, '', {
          color: christmasTheme.color.gold,
          fontFamily: 'system-ui, sans-serif',
          fontSize: '15px',
          align: 'center',
        })
        .setName('puzzle-progress')
        .setOrigin(0.5);
      this.add
        .text(0, 0, 'Toque em duas peças ou arraste uma até outra.', {
          color: christmasTheme.color.snow,
          fontFamily: 'system-ui, sans-serif',
          fontSize: '13px',
          align: 'center',
          wordWrap: { width: 280 },
        })
        .setName('puzzle-instructions')
        .setOrigin(0.5);

      this.input.dragDistanceThreshold = puzzleSwapTuning.dragDistanceThresholdPx;
      this.scope.add(() =>
        this.input.off(Phaser.Input.Events.POINTER_DOWN, this.handlePointerDown, this),
      );
      this.scope.add(() =>
        this.input.off(Phaser.Input.Events.POINTER_UP, this.handlePointerUp, this),
      );
      this.input.on(Phaser.Input.Events.POINTER_DOWN, this.handlePointerDown, this);
      this.input.on(Phaser.Input.Events.POINTER_UP, this.handlePointerUp, this);

      const resize = (gameSize: { width: number; height: number }): void =>
        this.layout(createViewportLayout(gameSize.width, gameSize.height));
      this.scope.on(this.scale, Phaser.Scale.Events.RESIZE, resize);
      this.layout(createViewportLayout(this.scale.gameSize.width, this.scale.gameSize.height));
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scope.dispose());

      context.run.open();
      context.run.ready();
      context.run.start();
    }

    private readonly handlePointerDown = (pointer: Phaser.Input.Pointer): void => {
      this.pointerDownIndex = this.cellIndexAt(pointer.x, pointer.y);
    };

    private readonly handlePointerUp = (pointer: Phaser.Input.Pointer): void => {
      const releasedIndex = this.cellIndexAt(pointer.x, pointer.y);
      const pressedIndex = this.pointerDownIndex;
      this.pointerDownIndex = null;
      if (pressedIndex === null || releasedIndex === null || context.run.state !== 'started')
        return;

      if (
        pressedIndex !== releasedIndex &&
        pointer.getDistance() >= puzzleSwapTuning.dragDistanceThresholdPx
      ) {
        this.applySwap({ firstIndex: pressedIndex, secondIndex: releasedIndex });
        return;
      }

      const selectionResult = selectPuzzleCell(
        this.board,
        { selectedIndex: this.selectedIndex },
        releasedIndex,
      );
      this.selectedIndex = selectionResult.selection.selectedIndex;
      if (selectionResult.swap) this.applySwap(selectionResult.swap);
      else this.updateSelectionBorders();
    };

    private applySwap(swap: { firstIndex: number; secondIndex: number }): void {
      this.board = swapPuzzlePieces(this.board, swap);
      this.selectedIndex = null;
      this.renderBoard();
      if (isPuzzleSolved(this.board)) context.run.complete();
    }

    private layout(viewport: GameViewport): void {
      const title = this.children.getByName('puzzle-title') as Phaser.GameObjects.Text;
      const instructions = this.children.getByName(
        'puzzle-instructions',
      ) as Phaser.GameObjects.Text;
      title.setPosition(viewport.width / 2, viewport.safeTop + 20);
      instructions.setPosition(viewport.width / 2, viewport.height - viewport.safeBottom - 18);

      const headerHeight = 78;
      const footerHeight = 58;
      const availableHeight = Math.max(1, viewport.contentHeight - headerHeight - footerHeight);
      const availableWidth = Math.max(1, viewport.width - puzzleSwapTuning.boardInsetCssPx * 2);
      const plan = planPuzzleGrid({
        photoAspectRatio: context.selectedPhoto.aspectRatio,
        availableWidth,
        availableHeight,
        preferredPieceCount: puzzleSwapTuning.preferredPieceCount,
        minimumCellSizeCssPx: puzzleSwapTuning.minimumCellSizeCssPx,
      });
      const boardX = (viewport.width - plan.boardWidth) / 2;
      const boardY = viewport.safeTop + headerHeight + (availableHeight - plan.boardHeight) / 2;
      this.bounds = { x: boardX, y: boardY, plan };
      this.progressText?.setPosition(viewport.width / 2, viewport.safeTop + 48);
      this.renderBoard();
    }

    private renderBoard(): void {
      const bounds = this.bounds;
      if (!bounds) return;
      this.pieces.splice(0).forEach((piece) => piece.destroy());
      this.borders.splice(0).forEach((border) => border.destroy());

      const { columns, rows, boardWidth, boardHeight, cellWidth, cellHeight } = bounds.plan;
      for (let cellIndex = 0; cellIndex < this.board.pieces.length; cellIndex += 1) {
        const pieceId = this.board.pieces[cellIndex];
        if (pieceId === undefined) continue;
        const sourceColumn = pieceId % columns;
        const sourceRow = Math.floor(pieceId / columns);
        const sourceLeft = Math.floor((sourceColumn * this.sourceWidth) / columns);
        const sourceTop = Math.floor((sourceRow * this.sourceHeight) / rows);
        const sourceRight = Math.floor(((sourceColumn + 1) * this.sourceWidth) / columns);
        const sourceBottom = Math.floor(((sourceRow + 1) * this.sourceHeight) / rows);
        const image = this.add
          .image(
            bounds.x - (sourceLeft * boardWidth) / this.sourceWidth,
            bounds.y - (sourceTop * boardHeight) / this.sourceHeight,
            textureKey,
          )
          .setOrigin(0, 0)
          .setDisplaySize(boardWidth, boardHeight)
          .setCrop(sourceLeft, sourceTop, sourceRight - sourceLeft, sourceBottom - sourceTop)
          .setDepth(1);
        this.pieces.push(image);

        const column = cellIndex % columns;
        const row = Math.floor(cellIndex / columns);
        const border = this.add
          .rectangle(
            bounds.x + column * cellWidth + cellWidth / 2,
            bounds.y + row * cellHeight + cellHeight / 2,
            cellWidth,
            cellHeight,
            0xffffff,
            0,
          )
          .setStrokeStyle(2, puzzleGold, 0.86)
          .setDepth(2);
        this.borders.push(border);
      }
      this.updateSelectionBorders();
      this.progressText?.setText(getPuzzleProgress(this.board).readableLabel);
    }

    private updateSelectionBorders(): void {
      this.borders.forEach((border, index) =>
        border.setStrokeStyle(
          index === this.selectedIndex ? 4 : 2,
          index === this.selectedIndex ? 0xffffff : puzzleGold,
          0.9,
        ),
      );
    }

    private cellIndexAt(x: number, y: number): number | null {
      const bounds = this.bounds;
      if (!bounds) return null;
      const { plan } = bounds;
      const column = Math.floor((x - bounds.x) / plan.cellWidth);
      const row = Math.floor((y - bounds.y) / plan.cellHeight);
      if (column < 0 || row < 0 || column >= plan.columns || row >= plan.rows) return null;
      return row * plan.columns + column;
    }
  }

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: christmasTheme.color.pineDark,
    pixelArt: false,
    antialias: true,
    scale: { mode: Phaser.Scale.RESIZE, parent, width: '100%', height: '100%' },
    scene: PuzzleScene,
  });

  const pauseRun = (): void => context.run.pause();
  const resumeRun = (): void => context.run.resume();
  game.events.on(Phaser.Core.Events.HIDDEN, pauseRun);
  game.events.on(Phaser.Core.Events.BLUR, pauseRun);
  game.events.on(Phaser.Core.Events.VISIBLE, resumeRun);
  game.events.on(Phaser.Core.Events.FOCUS, resumeRun);

  let destroyPromise: Promise<void> | undefined;
  return {
    destroy(): Promise<void> {
      if (destroyPromise) return destroyPromise;
      destroyPromise = new Promise<void>((resolve, reject) => {
        const complete = (): void => {
          game.events.off(Phaser.Core.Events.HIDDEN, pauseRun);
          game.events.off(Phaser.Core.Events.BLUR, pauseRun);
          game.events.off(Phaser.Core.Events.VISIBLE, resumeRun);
          game.events.off(Phaser.Core.Events.FOCUS, resumeRun);
          context.run.exit();
          resolve();
        };
        game.events.once(Phaser.Core.Events.DESTROY, complete);
        try {
          game.destroy(true, false);
        } catch (error) {
          game.events.off(Phaser.Core.Events.DESTROY, complete);
          reject(error);
        }
      });
      return destroyPromise;
    },
  };
}

export const puzzleSwapGameModule: GameModule<typeof PhaserModule, HTMLElement> = {
  definition: puzzleSwapDefinition,
  create: createPuzzleSwapGame,
};
