import { SceneScope, createViewportLayout } from '@christmas-games/platform';
import type {
  GameContext,
  GameController,
  GameModule,
  GameViewport,
} from '@christmas-games/platform';
import { christmasTheme } from '@christmas-games/theme';
import type * as PhaserModule from 'phaser';
import type { PuzzleGridPlan } from '../../domain/GridPlanner.js';
import {
  createSolvedPuzzleBoard,
  isPuzzleSolved,
  swapPuzzlePieces,
  type PuzzleSwap,
} from '../../domain/PuzzleBoard.js';
import { findPuzzleHintSwap } from '../../domain/PuzzleHint.js';
import { selectPuzzleTopology } from '../../domain/PuzzleTopology.js';
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
import { puzzleAudio } from './audioAssets.js';
import { planPuzzleBoardLayout, puzzleSwapChromeMetrics } from './PuzzleBoardLayout.js';
import { PuzzleAudioDirector } from './presentation/PuzzleAudioDirector.js';
import { createPuzzleFeedbackDirector, emitPuzzleSparkles } from './presentation/PuzzleFeedback.js';
import { createPuzzleScenePresentation } from './presentation/PuzzleScenePresentation.js';
import { puzzleUiTextureKeys, puzzleVisualAssets } from './visualAssets.js';
import type { PuzzlePerformanceScenario } from '../../lab/PuzzlePerformanceScenario.js';

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

interface ActivePieceMove {
  readonly pieces: readonly PhaserModule.GameObjects.Image[];
  readonly complete: () => void;
}

const puzzleGold = 0xf8dfa0;

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
  const topology = selectPuzzleTopology(
    context.selectedPhoto.aspectRatio,
    context.difficulty === 'desafio' ? 'desafio' : 'normal',
  );

  class PuzzleScene extends Phaser.Scene {
    private readonly scope = new SceneScope();
    private board = shufflePuzzleBoard(
      createSolvedPuzzleBoard(topology.columns, topology.rows),
      context.random,
    );
    private bounds?: BoardBounds;
    private selectedIndex: number | null = null;
    /**
     * A child can begin the next tap while the two prior pieces are settling.
     * Preserve at most two intended next pairs and replay them after the
     * tween, rather than silently throwing away a valid gesture on a slow
     * renderer.
     */
    private readonly queuedTapIndexes: number[] = [];
    private hintIndexes: readonly number[] = [];
    private pointerDownIndex: number | null = null;
    private dragFeedbackStarted = false;
    private idleAssist = createIdleAssistState(context.clock);
    private completed = false;
    private paused = false;
    private sourceWidth = 0;
    private sourceHeight = 0;
    private readonly pieces: Phaser.GameObjects.Image[] = [];
    private readonly borders: Phaser.GameObjects.Rectangle[] = [];
    private progressText?: Phaser.GameObjects.Text;
    private timerText?: Phaser.GameObjects.Text;
    private instructionsText?: Phaser.GameObjects.Text;
    private instructionsPanel?: Phaser.GameObjects.Rectangle;
    private hintTimer: Phaser.Time.TimerEvent | undefined;
    private hintStageTimer: Phaser.Time.TimerEvent | undefined;
    private nextHintAvailableAt = 0;
    private pauseBounds?: TouchBounds;
    private hintBounds?: TouchBounds;
    private audioBounds?: TouchBounds;
    private pauseOverlay?: Phaser.GameObjects.Container;
    private winOverlay?: Phaser.GameObjects.Container;
    private winDurationText?: Phaser.GameObjects.Text;
    private winScrim?: Phaser.GameObjects.Rectangle;
    private boardFrame?: Phaser.GameObjects.Rectangle;
    private sourcePreview?: Phaser.GameObjects.Image;
    private snowSpawnZone?: Phaser.Geom.Rectangle;
    private feedback?: ReturnType<typeof createPuzzleFeedbackDirector>;
    private audio?: PuzzleAudioDirector;
    private lastDisplayedSecond = -1;
    private interactive = false;
    private movingPieces = false;
    private activePieceMove: ActivePieceMove | undefined;
    private introPlayed = false;
    private developmentScenarioStarted = false;
    private assetFailure = false;
    private readonly requiredTextureKeys = new Set([
      textureKey,
      puzzleVisualAssets.background.key,
      puzzleVisualAssets.snow.key,
      ...puzzleUiTextureKeys,
    ]);
    private readonly reducedMotion =
      context.preferences?.reducedMotion ??
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    constructor() {
      super('PuzzleSwapScene');
    }

    init(): void {
      context.run.open();
      this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, this.handleAssetFailure, this);
      this.scope.add(() =>
        this.load.off(Phaser.Loader.Events.FILE_LOAD_ERROR, this.handleAssetFailure, this),
      );
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scope.dispose());
    }

    preload(): void {
      this.load.image(textureKey, context.selectedPhoto.variants.game);
      this.load.image(puzzleVisualAssets.background.key, puzzleVisualAssets.background.url);
      this.load.svg(puzzleVisualAssets.snow.key, puzzleVisualAssets.snow.url, {
        width: 48,
        height: 48,
      });
      this.load.svg(puzzleVisualAssets.hint.key, puzzleVisualAssets.hint.url, {
        width: 96,
        height: 96,
      });
      this.load.svg(puzzleVisualAssets.pause.key, puzzleVisualAssets.pause.url, {
        width: 96,
        height: 96,
      });
      this.load.svg(puzzleVisualAssets.play.key, puzzleVisualAssets.play.url, {
        width: 96,
        height: 96,
      });
      this.load.svg(puzzleVisualAssets.soundOn.key, puzzleVisualAssets.soundOn.url, {
        width: 96,
        height: 96,
      });
      this.load.svg(puzzleVisualAssets.soundOff.key, puzzleVisualAssets.soundOff.url, {
        width: 96,
        height: 96,
      });
      for (const asset of Object.values(puzzleAudio)) {
        this.load.audio(asset.key, [...asset.urls], { instances: 4 });
      }
    }

    create(): void {
      if (this.assetFailure) return;
      const sourceFrame = this.textures.get(textureKey).get();
      this.sourceWidth = sourceFrame.width;
      this.sourceHeight = sourceFrame.height;
      if (this.sourceWidth <= 0 || this.sourceHeight <= 0) {
        throw new Error('Puzzle source texture has invalid dimensions.');
      }

      this.scope.texture(this.textures, textureKey);
      this.scope.texture(this.textures, puzzleVisualAssets.background.key);
      this.scope.texture(this.textures, puzzleVisualAssets.snow.key);
      puzzleUiTextureKeys.forEach((key) => this.scope.texture(this.textures, key));
      this.audio = new PuzzleAudioDirector({
        Phaser,
        scene: this,
        scope: this.scope,
        initiallyEnabled: context.preferences?.soundEnabled ?? true,
      });
      const presentation = createPuzzleScenePresentation({
        Phaser,
        scene: this,
        scope: this.scope,
        textureKey,
        quality: context.quality,
        reducedMotion: this.reducedMotion,
        random: context.random,
        audioEnabled: this.audio.soundEnabled,
      });
      this.boardFrame = presentation.boardFrame;
      this.sourcePreview = presentation.sourcePreview;
      this.progressText = presentation.progressText;
      this.timerText = presentation.timerText;
      this.instructionsPanel = presentation.instructionsPanel;
      this.instructionsText = presentation.instructionsText;
      this.pauseOverlay = presentation.pauseOverlay;
      this.winOverlay = presentation.winOverlay;
      this.winDurationText = presentation.winDurationText;
      this.winScrim = presentation.winScrim;
      if (presentation.snowSpawnZone) this.snowSpawnZone = presentation.snowSpawnZone;
      this.feedback = createPuzzleFeedbackDirector({
        scene: this,
        scope: this.scope,
        random: context.random,
        haptics: context.haptics,
        quality: context.quality,
        reducedMotion: this.reducedMotion,
        playSound: (cue) => this.audio?.playFeedbackSound(cue),
      });

      this.input.dragDistanceThreshold = puzzleSwapTuning.dragDistanceThresholdPx;
      this.scope.add(() =>
        this.input.off(Phaser.Input.Events.POINTER_DOWN, this.handlePointerDown, this),
      );
      this.scope.add(() =>
        this.input.off(Phaser.Input.Events.POINTER_UP, this.handlePointerUp, this),
      );
      this.scope.add(() =>
        this.input.off(Phaser.Input.Events.POINTER_MOVE, this.handlePointerMove, this),
      );
      this.input.on(Phaser.Input.Events.POINTER_DOWN, this.handlePointerDown, this);
      this.input.on(Phaser.Input.Events.POINTER_UP, this.handlePointerUp, this);
      this.input.on(Phaser.Input.Events.POINTER_MOVE, this.handlePointerMove, this);

      const resize = (gameSize: { width: number; height: number }): void =>
        this.layout(createViewportLayout(gameSize.width, gameSize.height));
      this.scope.on(this.scale, Phaser.Scale.Events.RESIZE, resize);
      this.layout(createViewportLayout(this.scale.gameSize.width, this.scale.gameSize.height));
      context.run.ready();
      this.playEntrance();
    }

    override update(): void {
      if (context.run.state !== 'started') return;
      const elapsedMs = context.run.elapsedMs();
      const displayedSecond = Math.floor(elapsedMs / 1000);
      if (displayedSecond !== this.lastDisplayedSecond) {
        this.lastDisplayedSecond = displayedSecond;
        this.timerText?.setText(formatDuration(elapsedMs));
      }

      // A gentle idle hint must never take control away from a child who has
      // already chosen a piece, nor compete with the settling animation of a
      // real swap. Both states are active play, not inactivity.
      if (this.selectedIndex !== null || this.movingPieces) return;

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
      this.audio?.startMusicAfterGesture();
      this.dragFeedbackStarted = false;
      if (!this.interactive || this.movingPieces) {
        this.pointerDownIndex = null;
        return;
      }
      if (this.paused) {
        this.pointerDownIndex = null;
        return;
      }
      if (
        this.isInside(pointer.x, pointer.y, this.pauseBounds) ||
        this.isInside(pointer.x, pointer.y, this.hintBounds) ||
        this.isInside(pointer.x, pointer.y, this.audioBounds)
      ) {
        const buttonName = this.isInside(pointer.x, pointer.y, this.pauseBounds)
          ? 'puzzle-pause-button-surface'
          : this.isInside(pointer.x, pointer.y, this.hintBounds)
            ? 'puzzle-hint-button-surface'
            : 'puzzle-audio-button-surface';
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

    private readonly handlePointerMove = (pointer: Phaser.Input.Pointer): void => {
      const pressedIndex = this.pointerDownIndex;
      if (
        pressedIndex === null ||
        this.dragFeedbackStarted ||
        !pointer.isDown ||
        !this.interactive ||
        this.movingPieces ||
        this.paused ||
        pointer.getDistance() < puzzleSwapTuning.dragDistanceThresholdPx
      ) {
        return;
      }

      this.dragFeedbackStarted = true;
      const pressedBorder = this.borders[pressedIndex];
      if (pressedBorder) this.feedback?.tap(pressedBorder);
      emitPuzzleSparkles(this, this.scope, context.random, pointer.x, pointer.y, 3, 260);
    };

    private readonly handlePointerUp = (pointer: Phaser.Input.Pointer): void => {
      const wasDragging = this.dragFeedbackStarted;
      this.dragFeedbackStarted = false;
      if (!this.interactive) {
        this.pointerDownIndex = null;
        return;
      }
      if (this.movingPieces) {
        this.pointerDownIndex = null;
        this.queueTapWhilePiecesSettle(pointer);
        return;
      }
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
      if (this.isInside(pointer.x, pointer.y, this.audioBounds)) {
        this.toggleAudio();
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
        if (wasDragging)
          emitPuzzleSparkles(this, this.scope, context.random, pointer.x, pointer.y, 4, 300);
        this.applySwap({ firstIndex: pressedIndex, secondIndex: releasedIndex });
        return;
      }

      this.applyCellTap(releasedIndex);
    };

    private queueTapWhilePiecesSettle(pointer: Phaser.Input.Pointer): void {
      if (
        this.paused ||
        pointer.getDistance() >= puzzleSwapTuning.dragDistanceThresholdPx ||
        this.isInside(pointer.x, pointer.y, this.pauseBounds) ||
        this.isInside(pointer.x, pointer.y, this.hintBounds) ||
        this.isInside(pointer.x, pointer.y, this.audioBounds)
      ) {
        return;
      }
      const cellIndex = this.cellIndexAt(pointer.x, pointer.y);
      if (cellIndex === null || this.queuedTapIndexes.length >= 4) return;
      this.queuedTapIndexes.push(cellIndex);
    }

    private applyCellTap(releasedIndex: number): void {
      const selectionResult = selectPuzzleCell(
        this.board,
        { selectedIndex: this.selectedIndex },
        releasedIndex,
      );
      const selectedBeforeTap = this.selectedIndex;
      this.selectedIndex = selectionResult.selection.selectedIndex;
      if (selectionResult.swap) this.applySwap(selectionResult.swap);
      else {
        this.updateSelectionBorders();
        const target = this.borders[releasedIndex];
        if (target && this.selectedIndex !== null) {
          this.showCoachMark('Agora toque em outra peça para trocar.');
          this.feedback?.select(target);
        } else if (target && selectedBeforeTap === releasedIndex) {
          this.showCoachMark('Toque em uma peça para escolher.');
          this.feedback?.wrong(target);
        }
      }
    }

    private replayQueuedTaps(): void {
      if (
        this.movingPieces ||
        this.completed ||
        this.paused ||
        !this.interactive ||
        context.run.state !== 'started'
      ) {
        return;
      }
      const cellIndex = this.queuedTapIndexes.shift();
      if (cellIndex === undefined) return;
      this.applyCellTap(cellIndex);
      // The first queued tap only selects a piece. The second one is the
      // child's matching tap and can be handled immediately; a resulting
      // swap stops this recursion until its own tween has finished.
      if (!this.movingPieces) this.replayQueuedTaps();
    }

    private applySwap(
      swap: { firstIndex: number; secondIndex: number },
      afterMove?: () => void,
    ): void {
      if (this.movingPieces || this.completed) return;
      const progressBefore = getPuzzleProgress(this.board);
      const firstPiece = this.pieces[swap.firstIndex];
      const secondPiece = this.pieces[swap.secondIndex];
      if (!firstPiece || !secondPiece) return;

      this.board = swapPuzzlePieces(this.board, swap);
      this.selectedIndex = null;
      this.clearHint();
      this.idleAssist = recordSuccessfulPuzzleMove(context.clock);
      this.pieces[swap.firstIndex] = secondPiece;
      this.pieces[swap.secondIndex] = firstPiece;
      this.updateSelectionBorders();
      this.updateProgress();

      const progressAfter = getPuzzleProgress(this.board);
      const newlyCorrect = [swap.firstIndex, swap.secondIndex].filter(
        (cellIndex) =>
          this.board.pieces[cellIndex] === cellIndex &&
          progressBefore.correctPieces < progressAfter.correctPieces,
      );
      this.movingPieces = true;
      const finishMove = (): void => {
        this.movingPieces = false;
        for (const cellIndex of newlyCorrect) {
          const feedbackTarget = this.borders[cellIndex];
          if (feedbackTarget) this.feedback?.correct(feedbackTarget);
        }
        if (newlyCorrect.length === 0) {
          const feedbackTarget = this.borders[swap.secondIndex] ?? this.borders[swap.firstIndex];
          if (feedbackTarget) this.feedback?.wrong(feedbackTarget);
        }
        if (isPuzzleSolved(this.board)) this.completePuzzle();
        else {
          context.run.interactionSettled();
          this.replayQueuedTaps();
        }
        afterMove?.();
      };
      this.tweenPiecesToCells([swap.firstIndex, swap.secondIndex], finishMove);
    }

    private toggleAudio(): void {
      const audio = this.audio;
      if (!audio) return;
      const audioEnabled = audio.toggleAfterGesture();
      const icon = this.children.getByName('puzzle-audio-button') as Phaser.GameObjects.Image;
      const label = this.children.getByName('puzzle-audio-button-label') as Phaser.GameObjects.Text;
      icon.setTexture(
        audioEnabled ? puzzleVisualAssets.soundOn.key : puzzleVisualAssets.soundOff.key,
      );
      label.setText(audioEnabled ? 'Som' : 'Mudo');
    }

    private playEntrance(): void {
      if (this.introPlayed) return;
      this.introPlayed = true;
      const preview = this.sourcePreview;
      if (!preview) {
        this.beginInteractivePlay();
        return;
      }
      // `setDisplaySize` establishes the proportional photo geometry. Never
      // reset an Image scale here: `setScale(1)` would restore its native
      // texture size and stretch a small puzzle piece across the viewport.
      preview.setVisible(true).setAlpha(1);
      this.pieces.forEach((piece) => piece.setAlpha(this.reducedMotion ? 1 : 0));
      this.borders.forEach((border) => border.setAlpha(this.reducedMotion ? 1 : 0));
      if (this.reducedMotion) {
        preview.setVisible(false);
        this.beginInteractivePlay();
        return;
      }
      this.scope.resource(
        this.tweens.add({
          targets: preview,
          alpha: 0,
          duration: Math.round(puzzleSwapTuning.revealDurationMs * 0.62),
          ease: 'Sine.easeInOut',
          onComplete: () => preview.setVisible(false),
        }),
      );
      this.scope.resource(
        this.tweens.add({
          targets: [...this.pieces, ...this.borders],
          alpha: 1,
          delay: Math.round(puzzleSwapTuning.revealDurationMs * 0.24),
          duration: Math.round(puzzleSwapTuning.revealDurationMs * 0.76),
          ease: 'Cubic.easeOut',
          onComplete: () => this.beginInteractivePlay(),
        }),
      );
    }

    private beginInteractivePlay(): void {
      if (this.completed) return;
      this.interactive = true;
      context.run.start();
      this.runDevelopmentScenario();
    }

    /**
     * Development scenarios remain inside the Scene so they exercise the
     * production hint, swap, pause, feedback and completion code. React only
     * passes a local label through the typed context; it never reaches a Scene
     * or mutates puzzle state itself.
     */
    private runDevelopmentScenario(): void {
      if (this.developmentScenarioStarted) return;
      const scenario = context.development?.scenario as PuzzlePerformanceScenario | undefined;
      if (!scenario || scenario === 'idle') return;
      this.developmentScenarioStarted = true;

      if (scenario === 'selection') {
        const cellIndex = this.firstIncorrectCellIndex();
        this.selectedIndex = cellIndex;
        this.updateSelectionBorders();
        const border = this.borders[cellIndex];
        if (border) this.feedback?.select(border);
        this.showCoachMark('Agora toque em outra peça para trocar.');
        return;
      }
      if (scenario === 'hint') {
        this.showManualHint();
        return;
      }
      if (scenario === 'correct') {
        const hint = findPuzzleHintSwap(this.board);
        if (hint)
          this.applySwap({ firstIndex: hint.targetCellIndex, secondIndex: hint.sourceCellIndex });
        return;
      }
      if (scenario === 'victory') {
        this.playDevelopmentVictory();
        return;
      }
      if (scenario === 'pause') this.togglePause();
    }

    private firstIncorrectCellIndex(): number {
      const cellIndex = this.board.pieces.findIndex((pieceId, index) => pieceId !== index);
      if (cellIndex < 0) throw new Error('Development scenario needs an unsolved puzzle board.');
      return cellIndex;
    }

    private playDevelopmentVictory(): void {
      const swaps = this.solveCurrentBoard();
      const playNext = (): void => {
        if (this.completed) return;
        const swap = swaps[0];
        if (!swap) return;
        // A timer is not proof that the tween callback has run on a busy
        // mobile frame. Keep the pending swap until the active move reports
        // completion, otherwise a diagnostic run could silently skip a move.
        if (this.movingPieces) {
          this.scope.resource(this.time.delayedCall(16, playNext));
          return;
        }
        swaps.shift();
        this.applySwap(swap, () => {
          if (!this.completed) this.scope.resource(this.time.delayedCall(48, playNext));
        });
      };
      playNext();
    }

    private solveCurrentBoard(): PuzzleSwap[] {
      let board = this.board;
      const swaps: PuzzleSwap[] = [];
      for (let targetCellIndex = 0; targetCellIndex < board.pieces.length; targetCellIndex += 1) {
        if (board.pieces[targetCellIndex] === targetCellIndex) continue;
        const sourceCellIndex = board.pieces.indexOf(targetCellIndex);
        if (sourceCellIndex < 0) throw new Error('Puzzle board lost a required piece.');
        const swap = { firstIndex: targetCellIndex, secondIndex: sourceCellIndex };
        board = swapPuzzlePieces(board, swap);
        swaps.push(swap);
      }
      if (!isPuzzleSolved(board))
        throw new Error('Development victory sequence must solve the board.');
      return swaps;
    }

    private tweenPiecesToCells(cellIndexes: readonly number[], onComplete: () => void): void {
      const bounds = this.bounds;
      if (!bounds) {
        onComplete();
        return;
      }
      const targets = cellIndexes
        .map((cellIndex) => {
          const piece = this.pieces[cellIndex];
          if (!piece) return undefined;
          return { piece, ...this.cellCenter(cellIndex, bounds) };
        })
        .filter((target): target is { piece: Phaser.GameObjects.Image; x: number; y: number } =>
          Boolean(target),
        );
      if (targets.length === 0) {
        onComplete();
        return;
      }
      let remaining = targets.length;
      let completed = false;
      const complete = (): void => {
        if (completed) return;
        completed = true;
        this.activePieceMove = undefined;
        onComplete();
      };
      this.activePieceMove = { pieces: targets.map((target) => target.piece), complete };
      for (const target of targets) {
        target.piece.setDepth(3);
        this.scope.resource(
          this.tweens.add({
            targets: target.piece,
            x: target.x,
            y: target.y,
            duration: puzzleSwapTuning.swapDurationMs,
            ease: 'Sine.easeInOut',
            onComplete: () => {
              target.piece.setDepth(1);
              remaining -= 1;
              if (remaining === 0) complete();
            },
          }),
        );
      }
    }

    /**
     * A resize changes the grid coordinates while a swap tween may still point
     * at the previous coordinates. Complete that short move first, then reflow
     * the same objects into the new geometry.
     */
    private completeActivePieceMoveForLayout(): void {
      const activeMove = this.activePieceMove;
      if (!activeMove) return;
      this.tweens.killTweensOf([...activeMove.pieces]);
      activeMove.pieces.forEach((piece) => piece.setDepth(1));
      activeMove.complete();
    }

    private revealHint(cellIndex: number): void {
      if (context.run.state !== 'started' || this.completed) return;
      if (this.time.now < this.nextHintAvailableAt) return;
      const hint = findPuzzleHintSwap(this.board, cellIndex);
      if (!hint) return;
      this.clearHint();
      this.nextHintAvailableAt = this.time.now + puzzleSwapTuning.hintCooldownMs;
      this.selectedIndex = null;
      this.hintIndexes = [hint.targetCellIndex];
      this.showCoachMark('Primeiro, encontre a borda verde.');
      this.updateSelectionBorders();
      const target = this.borders[hint.targetCellIndex];
      if (target) this.feedback?.hint(target);
      this.pulseHintBorder(target);
      this.hintStageTimer = this.scope.resource(
        this.time.delayedCall(puzzleSwapTuning.hintFirstStepDelayMs, () => {
          this.hintStageTimer = undefined;
          if (this.hintIndexes[0] !== hint.targetCellIndex || this.completed) return;
          this.hintIndexes = [hint.targetCellIndex, hint.sourceCellIndex];
          this.showCoachMark('Agora, troque a peça verde com a dourada.');
          this.updateSelectionBorders();
          this.pulseHintBorder(this.borders[hint.sourceCellIndex]);
          this.hintTimer = this.scope.resource(
            this.time.delayedCall(
              puzzleSwapTuning.hintTotalDurationMs - puzzleSwapTuning.hintFirstStepDelayMs,
              () => {
                if (
                  this.hintIndexes[0] === hint.targetCellIndex &&
                  this.hintIndexes[1] === hint.sourceCellIndex
                ) {
                  this.clearHint();
                }
              },
            ),
          );
        }),
      );
    }

    private showManualHint(): void {
      if (context.run.state !== 'started' || this.completed) return;
      const cellIndex = this.board.pieces.findIndex((pieceId, index) => pieceId !== index);
      if (cellIndex >= 0) this.revealHint(cellIndex);
    }

    private clearHint(): void {
      this.hintIndexes = [];
      this.hintStageTimer?.remove();
      this.hintStageTimer = undefined;
      this.hintTimer?.remove();
      this.hintTimer = undefined;
      this.updateSelectionBorders();
      this.hideCoachMark();
    }

    private pulseHintBorder(border: Phaser.GameObjects.Rectangle | undefined): void {
      if (this.reducedMotion || !border) return;
      this.scope.resource(
        this.tweens.add({
          targets: border,
          alpha: 0.34,
          duration: 180,
          ease: 'Sine.easeInOut',
          yoyo: true,
          repeat: 1,
        }),
      );
    }

    private showCoachMark(instruction: string): void {
      const panel = this.instructionsPanel;
      const text = this.instructionsText;
      if (!panel || !text) return;
      this.tweens.killTweensOf([panel, text]);
      panel.setVisible(true).setAlpha(1);
      text.setText(instruction).setVisible(true).setAlpha(1);
    }

    private hideCoachMark(): void {
      const panel = this.instructionsPanel;
      const text = this.instructionsText;
      if (!panel || !text || !panel.visible) return;
      if (this.reducedMotion) {
        panel.setVisible(false);
        text.setVisible(false);
        return;
      }
      this.tweens.killTweensOf([panel, text]);
      this.scope.resource(
        this.tweens.add({
          targets: [panel, text],
          alpha: 0,
          duration: 140,
          ease: 'Sine.easeOut',
          onComplete: () => {
            panel.setVisible(false);
            text.setVisible(false);
          },
        }),
      );
    }

    private togglePause(): void {
      if (this.completed) return;
      this.paused = !this.paused;
      if (this.paused) this.queuedTapIndexes.length = 0;
      this.pauseOverlay?.setVisible(this.paused);
      const pauseButton = this.children.getByName(
        'puzzle-pause-button',
      ) as Phaser.GameObjects.Image;
      const pauseLabel = this.children.getByName(
        'puzzle-pause-button-label',
      ) as Phaser.GameObjects.Text;
      pauseButton.setTexture(
        this.paused ? puzzleVisualAssets.play.key : puzzleVisualAssets.pause.key,
      );
      pauseLabel.setText(this.paused ? 'Jogar' : 'Pausar');
      if (this.paused) this.clearHint();
      if (this.paused) context.run.pause();
      else context.run.resume();
      if (this.paused) this.audio?.pause();
      else this.audio?.resume();
    }

    private completePuzzle(): void {
      if (this.completed) return;
      this.completed = true;
      this.interactive = false;
      this.queuedTapIndexes.length = 0;
      this.hideCoachMark();
      const elapsedMs = context.run.complete();
      this.winDurationText?.setText(`Você montou essa lembrança\nem ${formatDuration(elapsedMs)}.`);
      this.sourcePreview?.setVisible(true).setAlpha(0);
      this.winScrim?.setVisible(true).setAlpha(0);
      this.winOverlay?.setVisible(true).setAlpha(0).setScale(0.88);
      if (this.reducedMotion) {
        this.pieces.forEach((piece) => piece.setAlpha(0.16));
        this.borders.forEach((border) => border.setAlpha(0.16));
        this.sourcePreview?.setAlpha(1);
        this.winScrim?.setAlpha(0.58);
        this.winOverlay?.setAlpha(1).setScale(1);
        const celebrationTarget = this.borders[0];
        if (celebrationTarget) this.feedback?.celebrate(celebrationTarget);
        return;
      }
      this.scope.resource(
        this.tweens.add({
          targets: [...this.pieces, ...this.borders],
          alpha: 0.16,
          duration: 160,
          ease: 'Cubic.easeOut',
        }),
      );
      if (this.sourcePreview) {
        this.scope.resource(
          this.tweens.add({
            targets: this.sourcePreview,
            alpha: 1,
            duration: 280,
            ease: 'Cubic.easeOut',
          }),
        );
      }
      if (this.winScrim) {
        this.scope.resource(
          this.tweens.add({
            targets: this.winScrim,
            alpha: 0.58,
            duration: 240,
            ease: 'Cubic.easeOut',
          }),
        );
      }
      if (this.winOverlay) {
        this.scope.resource(
          this.tweens.add({
            targets: this.winOverlay,
            alpha: 1,
            scaleX: 1,
            scaleY: 1,
            delay: 150,
            duration: 300,
            ease: 'Back.easeOut',
          }),
        );
      }
      const celebrationTarget = this.borders[0];
      if (celebrationTarget) this.feedback?.celebrate(celebrationTarget);
    }

    private readonly handleAssetFailure = (file: { key?: unknown }): void => {
      if (
        typeof file.key !== 'string' ||
        !this.requiredTextureKeys.has(file.key) ||
        this.assetFailure
      )
        return;
      this.assetFailure = true;
      this.interactive = false;
      context.run.assetFailed(file.key === textureKey ? 'photo-game-variant' : 'game-visual-asset');
      this.scene.stop();
    };

    private positionHudButton(name: string, x: number, y: number): void {
      const surface = this.children.getByName(`${name}-surface`) as Phaser.GameObjects.Rectangle;
      const icon = this.children.getByName(name) as Phaser.GameObjects.Image;
      const label = this.children.getByName(`${name}-label`) as Phaser.GameObjects.Text;
      surface.setPosition(x, y);
      icon.setPosition(x, y - 6);
      label.setPosition(x, y + 11);
      const bounds = { x: x - 24, y: y - 24, width: 48, height: 48 };
      if (name === 'puzzle-hint-button') this.hintBounds = bounds;
      else if (name === 'puzzle-pause-button') this.pauseBounds = bounds;
      else this.audioBounds = bounds;
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
      const instructionsPanel = this.children.getByName(
        'puzzle-instruction-panel',
      ) as Phaser.GameObjects.Rectangle;
      const hudPanel = this.children.getByName('puzzle-hud-panel') as Phaser.GameObjects.Rectangle;
      const backdrop = this.children.getByName('puzzle-backdrop') as Phaser.GameObjects.Rectangle;
      const backgroundArt = this.children.getByName(
        'puzzle-background-art',
      ) as Phaser.GameObjects.Image;
      const ribbon = this.children.getByName('puzzle-ribbon') as Phaser.GameObjects.Rectangle;
      const pineHorizon = this.children.getByName(
        'puzzle-pine-horizon',
      ) as Phaser.GameObjects.Rectangle;
      const leftStar = this.children.getByName('puzzle-star-left') as Phaser.GameObjects.Text;
      const rightStar = this.children.getByName('puzzle-star-right') as Phaser.GameObjects.Text;
      const hudHeight = puzzleSwapChromeMetrics.hudHeightCssPx;
      const backgroundFrame = this.textures.get(puzzleVisualAssets.background.key).get();
      const backgroundScale = Math.max(
        viewport.width / backgroundFrame.width,
        viewport.height / backgroundFrame.height,
      );
      backgroundArt.setPosition(viewport.width / 2, viewport.height / 2).setScale(backgroundScale);
      backdrop.setSize(viewport.width, viewport.height);
      pineHorizon
        .setPosition(0, viewport.height - viewport.safeBottom - 72)
        .setSize(viewport.width, 72)
        .setOrigin(0);
      ribbon.setPosition(0, viewport.safeTop + 72).setSize(viewport.width, 8);
      leftStar.setPosition(28, viewport.safeTop + 118);
      rightStar.setPosition(viewport.width - 26, viewport.height - viewport.safeBottom - 82);
      if (this.snowSpawnZone) this.snowSpawnZone.width = viewport.width;
      hudPanel
        .setPosition(viewport.width / 2, viewport.safeTop + hudHeight / 2 + 6)
        .setSize(Math.max(1, viewport.width - 16), hudHeight);
      title.setPosition(22, viewport.safeTop + puzzleSwapChromeMetrics.titleOffsetCssPx);
      this.progressText?.setPosition(
        22,
        viewport.safeTop + puzzleSwapChromeMetrics.progressOffsetCssPx,
      );
      this.timerText?.setPosition(
        viewport.width - 48,
        viewport.safeTop + puzzleSwapChromeMetrics.titleOffsetCssPx,
      );
      this.positionHudButton(
        'puzzle-audio-button',
        viewport.width - 128,
        viewport.safeTop + puzzleSwapChromeMetrics.controlOffsetCssPx,
      );
      this.positionHudButton(
        'puzzle-hint-button',
        viewport.width - 78,
        viewport.safeTop + puzzleSwapChromeMetrics.controlOffsetCssPx,
      );
      this.positionHudButton(
        'puzzle-pause-button',
        viewport.width - 28,
        viewport.safeTop + puzzleSwapChromeMetrics.controlOffsetCssPx,
      );
      const instructionWidth = Math.min(330, Math.max(230, viewport.width - 28));
      instructionsPanel
        .setPosition(
          viewport.width / 2,
          viewport.height -
            viewport.safeBottom -
            puzzleSwapChromeMetrics.coachMarkOffsetFromBottomCssPx,
        )
        .setSize(instructionWidth, 50);
      instructions
        .setPosition(
          viewport.width / 2,
          viewport.height -
            viewport.safeBottom -
            puzzleSwapChromeMetrics.coachMarkOffsetFromBottomCssPx,
        )
        .setWordWrapWidth(instructionWidth - 28);

      const boardLayout = planPuzzleBoardLayout({
        viewport,
        photoAspectRatio: context.selectedPhoto.aspectRatio,
        columns: this.board.columns,
        rows: this.board.rows,
        preferredPieceCount: this.board.pieces.length,
        minimumCellSizeCssPx: puzzleSwapTuning.minimumCellSizeCssPx,
        boardInsetCssPx: puzzleSwapTuning.boardInsetCssPx,
      });
      const { plan, x: boardX, y: boardY } = boardLayout;
      this.assertPlanMatchesBoard(plan);
      this.bounds = { x: boardX, y: boardY, plan };
      this.boardFrame
        ?.setPosition(viewport.width / 2, boardY + plan.boardHeight / 2)
        .setSize(plan.boardWidth + 12, plan.boardHeight + 12);
      this.sourcePreview
        ?.setPosition(viewport.width / 2, boardY + plan.boardHeight / 2)
        .setDisplaySize(plan.boardWidth, plan.boardHeight);
      this.winScrim?.setSize(viewport.width, viewport.height);
      this.completeActivePieceMoveForLayout();
      this.layoutBoardObjects();
      this.layoutOverlay(this.pauseOverlay, viewport);
      this.layoutOverlay(this.winOverlay, viewport);
    }

    private assertPlanMatchesBoard(plan: PuzzleGridPlan): void {
      if (
        plan.columns !== this.board.columns ||
        plan.rows !== this.board.rows ||
        plan.pieceCount !== this.board.pieces.length
      ) {
        throw new Error('Puzzle layout topology must match the active board.');
      }
    }

    private layoutBoardObjects(): void {
      const bounds = this.bounds;
      if (!bounds) return;

      this.createBoardObjects();
      if (
        this.pieces.length !== this.board.pieces.length ||
        this.borders.length !== this.board.pieces.length
      ) {
        throw new Error('Puzzle layout objects must match the active board.');
      }

      this.pieces.forEach((piece, cellIndex) => {
        const center = this.cellCenter(cellIndex, bounds);
        piece
          .setPosition(center.x, center.y)
          .setDisplaySize(bounds.plan.cellWidth, bounds.plan.cellHeight);
      });
      this.borders.forEach((border, cellIndex) => {
        const center = this.cellCenter(cellIndex, bounds);
        border
          .setPosition(center.x, center.y)
          .setSize(bounds.plan.cellWidth, bounds.plan.cellHeight);
      });
      this.updateSelectionBorders();
      this.updateProgress();
    }

    /** Creates one object per piece on first layout; later layouts only reflow them. */
    private createBoardObjects(): void {
      if (this.pieces.length > 0 || this.borders.length > 0) return;
      const bounds = this.bounds;
      if (!bounds) return;

      const { columns, cellWidth, cellHeight } = bounds.plan;
      const sourceTexture = this.textures.get(textureKey);
      for (let cellIndex = 0; cellIndex < this.board.pieces.length; cellIndex += 1) {
        const pieceId = this.board.pieces[cellIndex];
        if (pieceId === undefined) continue;
        const sourceColumn = pieceId % this.board.columns;
        const sourceRow = Math.floor(pieceId / this.board.columns);
        const sourceLeft = Math.floor((sourceColumn * this.sourceWidth) / this.board.columns);
        const sourceTop = Math.floor((sourceRow * this.sourceHeight) / this.board.rows);
        const sourceRight = Math.floor(
          ((sourceColumn + 1) * this.sourceWidth) / this.board.columns,
        );
        const sourceBottom = Math.floor(((sourceRow + 1) * this.sourceHeight) / this.board.rows);
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
    }

    private updateProgress(): void {
      const progress = getPuzzleProgress(this.board);
      this.progressText?.setText(
        progress.isSolved
          ? `Completo em ${progress.moves} movimentos.`
          : `${progress.correctPieces}/${progress.totalPieces} no lugar · ${progress.moves} mov.`,
      );
    }

    private cellCenter(cellIndex: number, bounds: BoardBounds): { x: number; y: number } {
      const column = cellIndex % bounds.plan.columns;
      const row = Math.floor(cellIndex / bounds.plan.columns);
      return {
        x: bounds.x + column * bounds.plan.cellWidth + bounds.plan.cellWidth / 2,
        y: bounds.y + row * bounds.plan.cellHeight + bounds.plan.cellHeight / 2,
      };
    }

    private updateSelectionBorders(): void {
      this.borders.forEach((border, index) =>
        border.setStrokeStyle(
          index === this.selectedIndex || this.hintIndexes.includes(index) ? 4 : 2,
          index === this.selectedIndex
            ? 0xffffff
            : index === this.hintIndexes[0]
              ? 0x74e7bc
              : index === this.hintIndexes[1]
                ? 0xffe49b
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
    loader: {
      timeout: puzzleSwapTuning.assetTimeoutMs,
      maxRetries: puzzleSwapTuning.assetMaxRetries,
    },
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
