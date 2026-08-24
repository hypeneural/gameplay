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
import { puzzleAudio, puzzleSfxKeyByCue } from './audioAssets.js';

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
const puzzleNight = 0x09143b;
const puzzlePine = 0x0f493a;
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
    private readonly ambientSnow: Phaser.GameObjects.Text[] = [];
    private progressText?: Phaser.GameObjects.Text;
    private timerText?: Phaser.GameObjects.Text;
    private pauseBounds?: TouchBounds;
    private hintBounds?: TouchBounds;
    private audioBounds?: TouchBounds;
    private pauseOverlay?: Phaser.GameObjects.Container;
    private winOverlay?: Phaser.GameObjects.Container;
    private winDurationText?: Phaser.GameObjects.Text;
    private winScrim?: Phaser.GameObjects.Rectangle;
    private boardFrame?: Phaser.GameObjects.Rectangle;
    private sourcePreview?: Phaser.GameObjects.Image;
    private feedback?: FeedbackDirector<Phaser.GameObjects.Rectangle>;
    private music: Phaser.Sound.BaseSound | undefined;
    private lastDisplayedSecond = -1;
    private interactive = false;
    private movingPieces = false;
    private introPlayed = false;
    private audioEnabled = true;
    private awaitingMusicUnlock = false;

    constructor() {
      super('PuzzleSwapScene');
    }

    preload(): void {
      this.load.image(textureKey, context.selectedPhoto.variants.game);
      for (const asset of Object.values(puzzleAudio)) {
        this.load.audio(asset.key, [...asset.urls], { instances: 4 });
      }
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
      this.createBoardPresentation();
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
      this.createHudButton('puzzle-audio-button', '♪', 'Som');
      this.createPauseOverlay();
      this.createWinOverlay();
      this.createFeedbackDirector();
      this.createAmbientSnow();

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
      this.startMusicAfterGesture();
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

    private readonly handlePointerUp = (pointer: Phaser.Input.Pointer): void => {
      if (!this.interactive || this.movingPieces) return;
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
        this.applySwap({ firstIndex: pressedIndex, secondIndex: releasedIndex });
        return;
      }

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
        if (target && this.selectedIndex !== null) this.feedback?.select(target);
        else if (target && selectedBeforeTap === releasedIndex) this.feedback?.wrong(target);
      }
    };

    private applySwap(swap: { firstIndex: number; secondIndex: number }): void {
      if (this.movingPieces || this.completed) return;
      const progressBefore = getPuzzleProgress(this.board);
      const firstPiece = this.pieces[swap.firstIndex];
      const secondPiece = this.pieces[swap.secondIndex];
      if (!firstPiece || !secondPiece) return;

      this.board = swapPuzzlePieces(this.board, swap);
      this.selectedIndex = null;
      this.hintIndex = null;
      this.idleAssist = recordSuccessfulPuzzleMove(context.clock);
      this.pieces[swap.firstIndex] = secondPiece;
      this.pieces[swap.secondIndex] = firstPiece;
      this.updateSelectionBorders();
      this.updateProgress();

      const newlyCorrect = [swap.firstIndex, swap.secondIndex].filter(
        (cellIndex) =>
          this.board.pieces[cellIndex] === cellIndex &&
          progressBefore.correctPieces < getPuzzleProgress(this.board).correctPieces,
      );
      this.movingPieces = true;
      const finishMove = (): void => {
        this.movingPieces = false;
        for (const cellIndex of newlyCorrect) {
          const feedbackTarget = this.borders[cellIndex];
          if (feedbackTarget) this.feedback?.correct(feedbackTarget);
        }
        if (isPuzzleSolved(this.board)) this.completePuzzle();
      };
      this.tweenPiecesToCells([swap.firstIndex, swap.secondIndex], finishMove);
    }

    private createChristmasBackdrop(): void {
      this.add
        .rectangle(0, 0, 1, 1, puzzleNight)
        .setOrigin(0)
        .setName('puzzle-backdrop')
        .setDepth(0);
      this.add.circle(0, 0, 1, puzzleGold, 0.18).setName('puzzle-moon-glow').setDepth(0);
      this.add.circle(0, 0, 1, 0xffe7a7, 0.92).setName('puzzle-moon').setDepth(0);
      this.add
        .rectangle(0, 0, 1, 1, puzzlePine, 0.78)
        .setOrigin(0)
        .setName('puzzle-pine-horizon')
        .setDepth(0);
      this.add
        .rectangle(0, 0, 1, 1, puzzleCranberry, 0.34)
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

    private createBoardPresentation(): void {
      this.boardFrame = this.add
        .rectangle(0, 0, 1, 1, 0x020813, 0.38)
        .setStrokeStyle(3, puzzleGold, 0.94)
        .setDepth(0.8)
        .setName('puzzle-board-frame');
      this.sourcePreview = this.add
        .image(0, 0, textureKey)
        .setOrigin(0.5)
        .setDepth(2.5)
        .setVisible(false)
        .setName('puzzle-photo-reveal');
    }

    private createAmbientSnow(): void {
      if (context.quality === 'LOW') return;
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const count = puzzleSwapTuning.ambientSnowflakes[context.quality];
      for (let index = 0; index < count; index += 1) {
        const flake = this.add
          .text(0, 0, index % 3 === 0 ? '✦' : '·', {
            color: index % 3 === 0 ? christmasTheme.color.gold : christmasTheme.color.snow,
            fontFamily: 'system-ui, sans-serif',
            fontSize: index % 2 === 0 ? '14px' : '10px',
          })
          .setOrigin(0.5)
          .setDepth(0.5)
          .setAlpha(0.28 + (index % 4) * 0.12)
          .setName(`puzzle-snow-${index}`);
        this.ambientSnow.push(flake);
        this.scope.resource(
          this.tweens.add({
            targets: flake,
            y: '+=72',
            x: index % 2 === 0 ? '+=12' : '-=12',
            angle: index % 2 === 0 ? 18 : -18,
            duration: 4200 + index * 260,
            delay: index * 170,
            ease: 'Sine.easeInOut',
            yoyo: true,
            repeat: -1,
          }),
        );
      }
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
      this.winScrim = this.add
        .rectangle(0, 0, 1, 1, 0x020713, 0)
        .setOrigin(0)
        .setDepth(10)
        .setVisible(false)
        .setName('puzzle-win-scrim');
      const panel = this.add
        .rectangle(0, 0, 304, 192, puzzlePineDark, 0.98)
        .setStrokeStyle(3, puzzleGold, 0.98);
      const eyebrow = this.add
        .text(0, -58, 'MISSÃO CONCLUÍDA', {
          color: christmasTheme.color.gold,
          fontFamily: 'system-ui, sans-serif',
          fontSize: '13px',
          fontStyle: 'bold',
        })
        .setOrigin(0.5);
      const title = this.add
        .text(0, -24, 'Feliz Natal! ✦', {
          color: christmasTheme.color.snow,
          fontFamily: 'system-ui, sans-serif',
          fontSize: '27px',
          fontStyle: 'bold',
        })
        .setOrigin(0.5);
      const message = this.add
        .text(0, 19, 'Você montou essa lembrança\nem ' + '00:00', {
          color: christmasTheme.color.snow,
          fontFamily: 'system-ui, sans-serif',
          fontSize: '15px',
          align: 'center',
        })
        .setOrigin(0.5)
        .setName('puzzle-win-duration');
      this.winDurationText = message;
      const continueLabel = this.add
        .text(0, 68, 'Use “Sair do jogo” para escolher outra foto.', {
          color: christmasTheme.color.gold,
          fontFamily: 'system-ui, sans-serif',
          fontSize: '11px',
          align: 'center',
        })
        .setOrigin(0.5);
      this.winOverlay = this.add
        .container(0, 0, [panel, eyebrow, title, message, continueLabel])
        .setDepth(11)
        .setVisible(false)
        .setName('puzzle-win-overlay');
    }

    private createFeedbackDirector(): void {
      const motion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'reduced'
        : 'full';
      const haptics = new HapticFeedback(context.haptics);
      this.feedback = createChristmasEffects(
        { quality: context.quality, motion, soundEnabled: true },
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
          playSound: (cue) => this.playFeedbackSound(cue),
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

    private startMusicAfterGesture(): void {
      if (!this.audioEnabled || this.music?.isPlaying || this.awaitingMusicUnlock) return;
      const start = (): void => {
        this.awaitingMusicUnlock = false;
        if (!this.audioEnabled || this.music?.isPlaying) return;
        this.music = this.sound.add(puzzleAudio.music.key, { loop: true, volume: 0.13 });
        this.scope.resource(this.music);
        this.music.play();
      };
      if (this.sound.locked) {
        this.awaitingMusicUnlock = true;
        this.sound.once(Phaser.Sound.Events.UNLOCKED, start);
        this.scope.add(() => {
          this.awaitingMusicUnlock = false;
          this.sound.off(Phaser.Sound.Events.UNLOCKED, start);
        });
        return;
      }
      start();
    }

    private playFeedbackSound(cue: string): void {
      if (!this.audioEnabled) return;
      const key = puzzleSfxKeyByCue[cue];
      if (!key) return;
      const volume = cue === 'christmas.win' ? 0.36 : cue === 'feedback.correct' ? 0.3 : 0.2;
      this.sound.play(key, { volume });
    }

    private toggleAudio(): void {
      this.audioEnabled = !this.audioEnabled;
      const glyph = this.children.getByName('puzzle-audio-button') as Phaser.GameObjects.Text;
      const label = this.children.getByName('puzzle-audio-button-label') as Phaser.GameObjects.Text;
      glyph.setText(this.audioEnabled ? '♪' : '×');
      label.setText(this.audioEnabled ? 'Som' : 'Mudo');
      if (!this.audioEnabled) {
        this.awaitingMusicUnlock = false;
        this.music?.stop();
        this.music?.destroy();
        this.music = undefined;
      } else {
        this.startMusicAfterGesture();
      }
    }

    private playEntrance(): void {
      if (this.introPlayed) return;
      this.introPlayed = true;
      const preview = this.sourcePreview;
      if (!preview) {
        this.beginInteractivePlay();
        return;
      }
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      preview.setVisible(true).setAlpha(1).setScale(1);
      this.pieces.forEach((piece) => piece.setAlpha(reducedMotion ? 1 : 0).setScale(0.985));
      this.borders.forEach((border) => border.setAlpha(reducedMotion ? 1 : 0));
      if (reducedMotion) {
        preview.setVisible(false);
        this.beginInteractivePlay();
        return;
      }
      this.scope.resource(
        this.tweens.add({
          targets: preview,
          alpha: 0,
          scaleX: 1.018,
          scaleY: 1.018,
          duration: Math.round(puzzleSwapTuning.revealDurationMs * 0.62),
          ease: 'Sine.easeInOut',
          onComplete: () => preview.setVisible(false).setScale(1),
        }),
      );
      this.scope.resource(
        this.tweens.add({
          targets: [...this.pieces, ...this.borders],
          alpha: 1,
          scaleX: 1,
          scaleY: 1,
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
              if (remaining === 0) onComplete();
            },
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
      if (this.paused) this.music?.pause();
      else this.music?.resume();
    }

    private completePuzzle(): void {
      if (this.completed) return;
      this.completed = true;
      this.interactive = false;
      const elapsedMs = context.run.complete();
      this.winDurationText?.setText(`Você montou essa lembrança\nem ${formatDuration(elapsedMs)}.`);
      this.sourcePreview?.setVisible(true).setAlpha(0).setScale(0.98);
      this.winScrim?.setVisible(true).setAlpha(0);
      this.winOverlay?.setVisible(true).setAlpha(0).setScale(0.88);
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
            scaleX: 1,
            scaleY: 1,
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

    private positionHudButton(name: string, x: number, y: number): void {
      const surface = this.children.getByName(`${name}-surface`) as Phaser.GameObjects.Rectangle;
      const glyph = this.children.getByName(name) as Phaser.GameObjects.Text;
      const label = this.children.getByName(`${name}-label`) as Phaser.GameObjects.Text;
      surface.setPosition(x, y);
      glyph.setPosition(x, y - 6);
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
      const hudPanel = this.children.getByName('puzzle-hud-panel') as Phaser.GameObjects.Rectangle;
      const backdrop = this.children.getByName('puzzle-backdrop') as Phaser.GameObjects.Rectangle;
      const ribbon = this.children.getByName('puzzle-ribbon') as Phaser.GameObjects.Rectangle;
      const moonGlow = this.children.getByName('puzzle-moon-glow') as Phaser.GameObjects.Arc;
      const moon = this.children.getByName('puzzle-moon') as Phaser.GameObjects.Arc;
      const pineHorizon = this.children.getByName(
        'puzzle-pine-horizon',
      ) as Phaser.GameObjects.Rectangle;
      const leftStar = this.children.getByName('puzzle-star-left') as Phaser.GameObjects.Text;
      const rightStar = this.children.getByName('puzzle-star-right') as Phaser.GameObjects.Text;
      const hudHeight = 74;
      backdrop.setSize(viewport.width, viewport.height);
      moonGlow.setPosition(viewport.width * 0.78, viewport.safeTop + 124).setRadius(86);
      moon.setPosition(viewport.width * 0.78, viewport.safeTop + 124).setRadius(25);
      pineHorizon
        .setPosition(0, viewport.height - viewport.safeBottom - 72)
        .setSize(viewport.width, 72)
        .setOrigin(0);
      ribbon.setPosition(0, viewport.safeTop + 82).setSize(viewport.width, 8);
      leftStar.setPosition(28, viewport.safeTop + 118);
      rightStar.setPosition(viewport.width - 26, viewport.height - viewport.safeBottom - 82);
      this.ambientSnow.forEach((flake, index) => {
        const horizontalStep = ((index * 43 + 29) % 100) / 100;
        const verticalStep = ((index * 79 + 16) % 100) / 100;
        flake.setPosition(
          viewport.width * horizontalStep,
          viewport.safeTop + 96 + (viewport.contentHeight - 170) * verticalStep,
        );
      });
      hudPanel
        .setPosition(viewport.width / 2, viewport.safeTop + hudHeight / 2 + 6)
        .setSize(Math.max(1, viewport.width - 16), hudHeight);
      title.setPosition(22, viewport.safeTop + 22);
      this.progressText?.setPosition(22, viewport.safeTop + 49);
      this.timerText?.setPosition(viewport.width - 48, viewport.safeTop + 22);
      this.positionHudButton('puzzle-audio-button', viewport.width - 128, viewport.safeTop + 56);
      this.positionHudButton('puzzle-hint-button', viewport.width - 78, viewport.safeTop + 56);
      this.positionHudButton('puzzle-pause-button', viewport.width - 28, viewport.safeTop + 56);
      instructions.setPosition(viewport.width / 2, viewport.height - viewport.safeBottom - 34);

      const headerHeight = 98;
      const footerHeight = 74;
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
      this.boardFrame
        ?.setPosition(viewport.width / 2, boardY + plan.boardHeight / 2)
        .setSize(plan.boardWidth + 12, plan.boardHeight + 12);
      this.sourcePreview
        ?.setPosition(viewport.width / 2, boardY + plan.boardHeight / 2)
        .setDisplaySize(plan.boardWidth, plan.boardHeight);
      this.winScrim?.setSize(viewport.width, viewport.height);
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
      this.updateProgress();
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
