import { HapticFeedback, SceneScope, createViewportLayout } from '@christmas-games/platform';
import type {
  GameContext,
  GameController,
  GameModule,
  GameViewport,
} from '@christmas-games/platform';
import { createChristmasEffects, christmasTheme } from '@christmas-games/theme';
import type { FeedbackDirector } from '@christmas-games/theme';
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
import {
  createIdleAssistState,
  recordSuccessfulPuzzleMove,
  requestIdleAssist,
} from '../../domain/IdleAssist.js';
import { puzzleSwapDefinition } from '../../definition.js';
import { puzzleSwapTuning } from '../../tuning.js';

interface BoardBounds {
  readonly x: number;
  readonly y: number;
  readonly plan: PuzzleGridPlan;
}

interface TouchBounds {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

const puzzleGold = 0xf8dfa0;
const puzzlePineDark = 0x082821;
const puzzleCranberry = 0x8f1d35;

function formatDuration(durationMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(durationMs / 1000));
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${seconds}`;
}

/**
 * A single authorized source texture defines run-scoped source frames. Each
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
    private hintIndex: number | null = null;
    private pointerDownIndex: number | null = null;
    private idleAssist = createIdleAssistState(context.clock);
    private completed = false;
    private paused = false;
    private sourceWidth = 0;
    private sourceHeight = 0;
    private readonly pieces: Phaser.GameObjects.Image[] = [];
    private readonly borders: Phaser.GameObjects.Rectangle[] = [];
    private progressText?: Phaser.GameObjects.Text;
    private timerText?: Phaser.GameObjects.Text;
    private pauseBounds?: TouchBounds;
    private hintBounds?: TouchBounds;
    private pauseOverlay?: Phaser.GameObjects.Container;
    private winOverlay?: Phaser.GameObjects.Container;
    private feedback?: FeedbackDirector<Phaser.GameObjects.Rectangle>;
    private lastDisplayedSecond = -1;

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
      this.createChristmasBackdrop();
      this.add
        .rectangle(0, 0, 1, 1, 0x082821, 0.92)
        .setStrokeStyle(1, puzzleGold, 0.4)
        .setName('puzzle-hud-panel')
        .setDepth(3);
      this.add
        .text(0, 0, 'PUZZLE DE NATAL', {
          color: christmasTheme.color.snow,
          fontFamily: 'system-ui, sans-serif',
          fontSize: '13px',
          fontStyle: 'bold',
        })
        .setName('puzzle-title')
        .setDepth(4)
        .setOrigin(0, 0.5);
      this.progressText = this.add
        .text(0, 0, '', {
          color: christmasTheme.color.gold,
          fontFamily: 'system-ui, sans-serif',
          fontSize: '11px',
          align: 'center',
        })
        .setName('puzzle-progress')
        .setDepth(4)
        .setOrigin(0, 0.5);
      this.timerText = this.add
        .text(0, 0, '00:00', {
          color: christmasTheme.color.snow,
          fontFamily: 'ui-monospace, SFMono-Regular, monospace',
          fontSize: '13px',
          fontStyle: 'bold',
        })
        .setName('puzzle-timer')
        .setDepth(4)
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
        .setDepth(4)
        .setOrigin(0.5);
      this.createHudButton('puzzle-hint-button', '✦', 'Dica');
      this.createHudButton('puzzle-pause-button', 'Ⅱ', 'Pausar');
      this.createPauseOverlay();
      this.createWinOverlay();
      this.createFeedbackDirector();

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

    override update(): void {
      if (context.run.state !== 'started') return;
      const elapsedMs = context.run.elapsedMs();
      const displayedSecond = Math.floor(elapsedMs / 1000);
      if (displayedSecond !== this.lastDisplayedSecond) {
        this.lastDisplayedSecond = displayedSecond;
        this.timerText?.setText(formatDuration(elapsedMs));
      }

      const result = requestIdleAssist(
        this.board,
        this.idleAssist,
        context.clock,
        puzzleSwapTuning.idleAssistDelayMs,
      );
      this.idleAssist = result.state;
      if (result.hint) this.revealHint(result.hint.cellIndex);
    }

    private readonly handlePointerDown = (pointer: Phaser.Input.Pointer): void => {
      if (this.paused) {
        this.pointerDownIndex = null;
        return;
      }
      if (
        this.isInside(pointer.x, pointer.y, this.pauseBounds) ||
        this.isInside(pointer.x, pointer.y, this.hintBounds)
      ) {
        const buttonName = this.isInside(pointer.x, pointer.y, this.pauseBounds)
          ? 'puzzle-pause-button-surface'
          : 'puzzle-hint-button-surface';
        const button = this.children.getByName(buttonName) as Phaser.GameObjects.Rectangle;
        if (button) this.feedback?.tap(button);
        this.pointerDownIndex = null;
        return;
      }
      this.pointerDownIndex = this.cellIndexAt(pointer.x, pointer.y);
      if (this.pointerDownIndex !== null && context.run.state === 'started') {
        const pressedBorder = this.borders[this.pointerDownIndex];
        if (pressedBorder) this.feedback?.tap(pressedBorder);
      }
    };

    private readonly handlePointerUp = (pointer: Phaser.Input.Pointer): void => {
      if (this.paused) {
        this.togglePause();
        return;
      }
      if (this.isInside(pointer.x, pointer.y, this.pauseBounds)) {
        this.togglePause();
        return;
      }
      if (this.isInside(pointer.x, pointer.y, this.hintBounds)) {
        this.showManualHint();
        return;
      }
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
      this.hintIndex = null;
      this.idleAssist = recordSuccessfulPuzzleMove(context.clock);
      this.renderBoard();
      const feedbackTarget = this.borders[swap.secondIndex] ?? this.borders[0];
      if (feedbackTarget) this.feedback?.correct(feedbackTarget);
      if (isPuzzleSolved(this.board)) this.completePuzzle();
    }

    private createChristmasBackdrop(): void {
      this.add
        .rectangle(0, 0, 1, 1, puzzlePineDark)
        .setOrigin(0)
        .setName('puzzle-backdrop')
        .setDepth(0);
      this.add
        .rectangle(0, 0, 1, 1, puzzleCranberry, 0.2)
        .setOrigin(0)
        .setName('puzzle-ribbon')
        .setDepth(0);
      this.add
        .text(0, 0, '✦', {
          color: christmasTheme.color.gold,
          fontFamily: 'system-ui, sans-serif',
          fontSize: '28px',
        })
        .setName('puzzle-star-left')
        .setDepth(0)
        .setAlpha(0.52)
        .setOrigin(0.5);
      this.add
        .text(0, 0, '✦', {
          color: christmasTheme.color.snow,
          fontFamily: 'system-ui, sans-serif',
          fontSize: '18px',
        })
        .setName('puzzle-star-right')
        .setDepth(0)
        .setAlpha(0.4)
        .setOrigin(0.5);
    }

    private createHudButton(name: string, glyph: string, label: string): void {
      this.add
        .rectangle(0, 0, 42, 38, puzzleCranberry, 0.86)
        .setStrokeStyle(1, puzzleGold, 0.75)
        .setName(`${name}-surface`)
        .setDepth(4);
      this.add
        .text(0, 0, glyph, {
          color: christmasTheme.color.snow,
          fontFamily: 'system-ui, sans-serif',
          fontSize: '16px',
          fontStyle: 'bold',
        })
        .setName(name)
        .setDepth(5)
        .setOrigin(0.5);
      this.add
        .text(0, 0, label, {
          color: christmasTheme.color.snow,
          fontFamily: 'system-ui, sans-serif',
          fontSize: '9px',
          fontStyle: 'bold',
        })
        .setName(`${name}-label`)
        .setDepth(5)
        .setOrigin(0.5);
    }

    private createPauseOverlay(): void {
      const panel = this.add
        .rectangle(0, 0, 286, 156, puzzlePineDark, 0.98)
        .setStrokeStyle(2, puzzleGold, 0.95);
      const title = this.add
        .text(0, -36, 'PAUSA', {
          color: christmasTheme.color.gold,
          fontFamily: 'system-ui, sans-serif',
          fontSize: '22px',
          fontStyle: 'bold',
        })
        .setOrigin(0.5);
      const message = this.add
        .text(0, 8, 'O jogo espera por você.\nToque para continuar.', {
          color: christmasTheme.color.snow,
          fontFamily: 'system-ui, sans-serif',
          fontSize: '15px',
          align: 'center',
        })
        .setOrigin(0.5);
      this.pauseOverlay = this.add
        .container(0, 0, [panel, title, message])
        .setDepth(8)
        .setVisible(false)
        .setName('puzzle-pause-overlay');
    }

    private createWinOverlay(): void {
      const panel = this.add
        .rectangle(0, 0, 300, 176, puzzlePineDark, 0.98)
        .setStrokeStyle(2, puzzleGold, 0.95);
      const eyebrow = this.add
        .text(0, -51, 'MISSÃO CONCLUÍDA', {
          color: christmasTheme.color.gold,
          fontFamily: 'system-ui, sans-serif',
          fontSize: '13px',
          fontStyle: 'bold',
        })
        .setOrigin(0.5);
      const title = this.add
        .text(0, -20, 'Feliz Natal! ✦', {
          color: christmasTheme.color.snow,
          fontFamily: 'system-ui, sans-serif',
          fontSize: '26px',
          fontStyle: 'bold',
        })
        .setOrigin(0.5);
      const message = this.add
        .text(0, 28, 'Você montou essa lembrança\nem ' + '00:00', {
          color: christmasTheme.color.snow,
          fontFamily: 'system-ui, sans-serif',
          fontSize: '15px',
          align: 'center',
        })
        .setOrigin(0.5)
        .setName('puzzle-win-duration');
      this.winOverlay = this.add
        .container(0, 0, [panel, eyebrow, title, message])
        .setDepth(9)
        .setVisible(false)
        .setName('puzzle-win-overlay');
    }

    private createFeedbackDirector(): void {
      const motion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'reduced'
        : 'full';
      const haptics = new HapticFeedback(context.haptics);
      this.feedback = createChristmasEffects(
        { quality: context.quality, motion, soundEnabled: false },
        {
          animate: (target, instruction): void => {
            if (!target.active) return;
            const scale = instruction.motion.scale ?? 1;
            this.scope.resource(
              this.tweens.add({
                targets: target,
                scaleX: scale,
                scaleY: scale,
                duration: instruction.motion.durationMs,
                ease: instruction.motion.easing,
                yoyo: scale !== 1,
              }),
            );
          },
          emitParticles: (target, instruction): void => {
            if (!instruction.particles) return;
            this.emitSparkles(
              target.x,
              target.y,
              instruction.particles.count,
              instruction.particles.lifetimeMs,
            );
          },
          haptic: (cue) => haptics.cue(cue),
        },
      );
    }

    private emitSparkles(x: number, y: number, count: number, lifetimeMs: number): void {
      for (let index = 0; index < count; index += 1) {
        const angle = (Math.PI * 2 * index) / count;
        const distance = 18 + context.random.next() * 28;
        const sparkle = this.add
          .text(x, y, '✦', {
            color: index % 2 === 0 ? christmasTheme.color.gold : christmasTheme.color.snow,
            fontFamily: 'system-ui, sans-serif',
            fontSize: '14px',
          })
          .setOrigin(0.5)
          .setDepth(10);
        this.scope.add(() => sparkle.destroy());
        this.scope.resource(
          this.tweens.add({
            targets: sparkle,
            x: x + Math.cos(angle) * distance,
            y: y + Math.sin(angle) * distance,
            alpha: 0,
            scaleX: 1.45,
            scaleY: 1.45,
            duration: lifetimeMs,
            ease: 'Cubic.easeOut',
            onComplete: () => sparkle.destroy(),
          }),
        );
      }
    }

    private revealHint(cellIndex: number): void {
      if (context.run.state !== 'started' || this.completed) return;
      this.hintIndex = cellIndex;
      this.selectedIndex = null;
      this.updateSelectionBorders();
      const target = this.borders[cellIndex];
      if (target) this.feedback?.hint(target);
      this.scope.resource(
        this.time.delayedCall(1000, () => {
          if (this.hintIndex === cellIndex) {
            this.hintIndex = null;
            this.updateSelectionBorders();
          }
        }),
      );
    }

    private showManualHint(): void {
      if (context.run.state !== 'started' || this.completed) return;
      const cellIndex = this.board.pieces.findIndex((pieceId, index) => pieceId !== index);
      if (cellIndex >= 0) this.revealHint(cellIndex);
    }

    private togglePause(): void {
      if (this.completed) return;
      this.paused = !this.paused;
      this.pauseOverlay?.setVisible(this.paused);
      const pauseButton = this.children.getByName('puzzle-pause-button') as Phaser.GameObjects.Text;
      const pauseLabel = this.children.getByName(
        'puzzle-pause-button-label',
      ) as Phaser.GameObjects.Text;
      pauseButton.setText(this.paused ? '▶' : 'Ⅱ');
      pauseLabel.setText(this.paused ? 'Jogar' : 'Pausar');
      if (this.paused) context.run.pause();
      else context.run.resume();
    }

    private completePuzzle(): void {
      if (this.completed) return;
      this.completed = true;
      const elapsedMs = context.run.complete();
      const duration = this.children.getByName('puzzle-win-duration') as Phaser.GameObjects.Text;
      duration.setText(`Você montou essa lembrança\nem ${formatDuration(elapsedMs)}.`);
      this.winOverlay?.setVisible(true);
      const celebrationTarget = this.borders[0];
      if (celebrationTarget) this.feedback?.celebrate(celebrationTarget);
    }

    private positionHudButton(name: string, x: number, y: number): void {
      const surface = this.children.getByName(`${name}-surface`) as Phaser.GameObjects.Rectangle;
      const glyph = this.children.getByName(name) as Phaser.GameObjects.Text;
      const label = this.children.getByName(`${name}-label`) as Phaser.GameObjects.Text;
      surface.setPosition(x, y);
      glyph.setPosition(x, y - 6);
      label.setPosition(x, y + 11);
      const bounds = { x: x - 23, y: y - 21, width: 46, height: 42 };
      if (name === 'puzzle-hint-button') this.hintBounds = bounds;
      else this.pauseBounds = bounds;
    }

    private layoutOverlay(
      overlay: Phaser.GameObjects.Container | undefined,
      viewport: GameViewport,
    ): void {
      overlay?.setPosition(viewport.width / 2, viewport.safeTop + viewport.contentHeight / 2);
    }

    private isInside(x: number, y: number, bounds: TouchBounds | undefined): boolean {
      return (
        bounds !== undefined &&
        x >= bounds.x &&
        x <= bounds.x + bounds.width &&
        y >= bounds.y &&
        y <= bounds.y + bounds.height
      );
    }

    private layout(viewport: GameViewport): void {
      const title = this.children.getByName('puzzle-title') as Phaser.GameObjects.Text;
      const instructions = this.children.getByName(
        'puzzle-instructions',
      ) as Phaser.GameObjects.Text;
      const hudPanel = this.children.getByName('puzzle-hud-panel') as Phaser.GameObjects.Rectangle;
      const backdrop = this.children.getByName('puzzle-backdrop') as Phaser.GameObjects.Rectangle;
      const ribbon = this.children.getByName('puzzle-ribbon') as Phaser.GameObjects.Rectangle;
      const leftStar = this.children.getByName('puzzle-star-left') as Phaser.GameObjects.Text;
      const rightStar = this.children.getByName('puzzle-star-right') as Phaser.GameObjects.Text;
      const hudHeight = 74;
      backdrop.setSize(viewport.width, viewport.height);
      ribbon.setPosition(0, viewport.safeTop + 82).setSize(viewport.width, 8);
      leftStar.setPosition(28, viewport.safeTop + 118);
      rightStar.setPosition(viewport.width - 26, viewport.height - viewport.safeBottom - 66);
      hudPanel
        .setPosition(viewport.width / 2, viewport.safeTop + hudHeight / 2 + 6)
        .setSize(Math.max(1, viewport.width - 16), hudHeight);
      title.setPosition(22, viewport.safeTop + 22);
      this.progressText?.setPosition(22, viewport.safeTop + 49);
      this.timerText?.setPosition(viewport.width - 116, viewport.safeTop + 22);
      this.positionHudButton('puzzle-hint-button', viewport.width - 78, viewport.safeTop + 49);
      this.positionHudButton('puzzle-pause-button', viewport.width - 28, viewport.safeTop + 49);
      instructions.setPosition(viewport.width / 2, viewport.height - viewport.safeBottom - 18);

      const headerHeight = 98;
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
      this.renderBoard();
      this.layoutOverlay(this.pauseOverlay, viewport);
      this.layoutOverlay(this.winOverlay, viewport);
    }

    private renderBoard(): void {
      const bounds = this.bounds;
      if (!bounds) return;
      this.pieces.splice(0).forEach((piece) => piece.destroy());
      this.borders.splice(0).forEach((border) => border.destroy());

      const { columns, rows, cellWidth, cellHeight } = bounds.plan;
      const sourceTexture = this.textures.get(textureKey);
      for (let cellIndex = 0; cellIndex < this.board.pieces.length; cellIndex += 1) {
        const pieceId = this.board.pieces[cellIndex];
        if (pieceId === undefined) continue;
        const sourceColumn = pieceId % columns;
        const sourceRow = Math.floor(pieceId / columns);
        const sourceLeft = Math.floor((sourceColumn * this.sourceWidth) / columns);
        const sourceTop = Math.floor((sourceRow * this.sourceHeight) / rows);
        const sourceRight = Math.floor(((sourceColumn + 1) * this.sourceWidth) / columns);
        const sourceBottom = Math.floor(((sourceRow + 1) * this.sourceHeight) / rows);
        const column = cellIndex % columns;
        const row = Math.floor(cellIndex / columns);
        const frameKey = `piece-${sourceRow}-${sourceColumn}`;
        if (!sourceTexture.has(frameKey)) {
          const frame = sourceTexture.add(
            frameKey,
            0,
            sourceLeft,
            sourceTop,
            sourceRight - sourceLeft,
            sourceBottom - sourceTop,
          );
          if (!frame) throw new Error(`Puzzle source frame ${frameKey} could not be created.`);
        }
        const image = this.add
          .image(
            bounds.x + column * cellWidth + cellWidth / 2,
            bounds.y + row * cellHeight + cellHeight / 2,
            textureKey,
            frameKey,
          )
          .setOrigin(0.5)
          .setDisplaySize(cellWidth, cellHeight)
          .setDepth(1);
        this.pieces.push(image);

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
      const progress = getPuzzleProgress(this.board);
      this.progressText?.setText(
        progress.isSolved
          ? `Completo em ${progress.moves} movimentos.`
          : `${progress.correctPieces}/${progress.totalPieces} no lugar · ${progress.moves} movimentos`,
      );
    }

    private updateSelectionBorders(): void {
      this.borders.forEach((border, index) =>
        border.setStrokeStyle(
          index === this.selectedIndex || index === this.hintIndex ? 4 : 2,
          index === this.selectedIndex
            ? 0xffffff
            : index === this.hintIndex
              ? 0x55b58a
              : puzzleGold,
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
