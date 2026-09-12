import { createPhotoSurface, createViewportLayout, SceneScope } from '@christmas-games/platform';
import type {
  GameContext,
  GameController,
  GameModule,
  GameViewport,
  Photo,
} from '@christmas-games/platform';
import { attachCrystalControl, christmasTheme } from '@christmas-games/theme';
import type * as PhaserModule from 'phaser';
import { ticTacToeDefinition } from '../../definition.js';
import { chooseSantaTicTacToeMove } from '../../domain/TicTacToeAi.js';
import {
  createTicTacToeMatchFromSetup,
  createLocalTicTacToeSetup,
  createSantaTicTacToeSetup,
  type TicTacToeSetup,
} from '../../domain/TicTacToeSetup.js';
import { selectTicTacToePhotoCandidates } from '../../domain/TicTacToePhotoSelection.js';
import {
  playTicTacToeCell,
  startNextTicTacToeRound,
  type TicTacToeMatch,
} from '../../domain/TicTacToeMatch.js';
import type {
  CellIndex,
  PlayerId,
  SantaDifficulty,
  TicTacToePhotoDescriptor,
  WinningLine,
} from '../../domain/TicTacToeTypes.js';
import {
  canPlaceTicTacToeCell,
  type TicTacToePresentationState,
} from '../TicTacToeInputArbiter.js';
import {
  planTicTacToeBoardLayout,
  ticTacToeRectCenter,
  type TicTacToeBoardLayout,
  type TicTacToeRect,
} from '../TicTacToeLayout.js';
import {
  beginTicTacToePointerPress,
  canConfirmTicTacToePointerPress,
  exceedsTicTacToePointerSlop,
  type TicTacToeActivePointerPress,
} from '../TicTacToePointerArbiter.js';

interface ButtonView {
  readonly detail?: PhaserModule.GameObjects.Text | undefined;
  enabled: boolean;
  fill: number;
  readonly glow: PhaserModule.GameObjects.Rectangle;
  readonly inner: PhaserModule.GameObjects.Rectangle;
  readonly label: PhaserModule.GameObjects.Text;
  readonly ornament?: PhaserModule.GameObjects.Text | undefined;
  pressed: boolean;
  readonly shadow: PhaserModule.GameObjects.Rectangle;
  readonly surface: PhaserModule.GameObjects.Rectangle;
  readonly zone: PhaserModule.GameObjects.Zone;
}

interface ButtonOption {
  readonly detail?: string | undefined;
  readonly fill?: number | undefined;
  readonly label: string;
  readonly ornament?: string | undefined;
  readonly onPress: () => void;
}

interface CellView {
  readonly bevel: PhaserModule.GameObjects.Rectangle;
  readonly corners: readonly PhaserModule.GameObjects.Rectangle[];
  readonly frame: PhaserModule.GameObjects.Rectangle;
  readonly inner: PhaserModule.GameObjects.Rectangle;
  readonly shadow: PhaserModule.GameObjects.Rectangle;
  readonly zone: PhaserModule.GameObjects.Zone;
}

interface PieceView {
  readonly cell: CellIndex;
  readonly label?: PhaserModule.GameObjects.Text;
  readonly owner: PlayerId;
  readonly photo?: PhaserModule.GameObjects.Image;
  readonly photoDescriptor?: TicTacToePhotoDescriptor;
  readonly plate: PhaserModule.GameObjects.Rectangle;
}

interface PlacementCardView {
  readonly cell: CellIndex;
  readonly label?: PhaserModule.GameObjects.Text;
  readonly owner: PlayerId;
  readonly photo?: PhaserModule.GameObjects.Image;
  readonly photoDescriptor?: TicTacToePhotoDescriptor;
  readonly plate: PhaserModule.GameObjects.Rectangle;
}

interface PlayerDockView {
  readonly badge: PhaserModule.GameObjects.Text;
  readonly detail: PhaserModule.GameObjects.Text;
  readonly identityFrame: PhaserModule.GameObjects.Rectangle;
  readonly identityMatte: PhaserModule.GameObjects.Rectangle;
  photo?: PhaserModule.GameObjects.Image;
  photoDescriptor?: TicTacToePhotoDescriptor | undefined;
  readonly rim: PhaserModule.GameObjects.Rectangle;
  readonly surface: PhaserModule.GameObjects.Rectangle;
  readonly title: PhaserModule.GameObjects.Text;
}

interface PickerCardView {
  readonly badge: PhaserModule.GameObjects.Text;
  readonly frame: PhaserModule.GameObjects.Rectangle;
  readonly photo?: PhaserModule.GameObjects.Image | undefined;
  readonly photoDescriptor: TicTacToePhotoDescriptor;
  pressed: boolean;
  readonly shadow: PhaserModule.GameObjects.Rectangle;
  readonly surface: PhaserModule.GameObjects.Rectangle;
  readonly zone: PhaserModule.GameObjects.Zone;
}

interface SelectionPhotoFrameView {
  readonly art?: PhaserModule.GameObjects.Image | undefined;
  readonly badge: PhaserModule.GameObjects.Text;
  readonly bevel: PhaserModule.GameObjects.Rectangle;
  readonly contactShadow: PhaserModule.GameObjects.Rectangle;
  readonly frameOuter: PhaserModule.GameObjects.Rectangle;
  readonly innerEdge: PhaserModule.GameObjects.Rectangle;
  readonly label: PhaserModule.GameObjects.Text;
  readonly matte: PhaserModule.GameObjects.Rectangle;
  readonly photo: PhaserModule.GameObjects.Image;
}

interface MatchResultHeroView {
  readonly banner: PhaserModule.GameObjects.Rectangle;
  readonly bannerText: PhaserModule.GameObjects.Text;
  readonly crestBack: PhaserModule.GameObjects.Arc;
  readonly crestMark: PhaserModule.GameObjects.Text;
  readonly crestRing: PhaserModule.GameObjects.Arc;
  readonly frame: PhaserModule.GameObjects.Rectangle;
  readonly innerFrame: PhaserModule.GameObjects.Rectangle;
  readonly label: PhaserModule.GameObjects.Text;
  readonly leftOrnament: PhaserModule.GameObjects.Text;
  readonly matte: PhaserModule.GameObjects.Rectangle;
  readonly photo: PhaserModule.GameObjects.Image;
  photoDescriptor?: TicTacToePhotoDescriptor | undefined;
  readonly rightOrnament: PhaserModule.GameObjects.Text;
  readonly shadow: PhaserModule.GameObjects.Rectangle;
  readonly title: PhaserModule.GameObjects.Text;
}

/**
 * Score is material information, not a second narrative sentence. Keeping its
 * parts independent lets the player read the two sides even when the status
 * band changes from turn to placement or celebration.
 */
interface ScoreboardView {
  readonly aBadge: PhaserModule.GameObjects.Text;
  readonly aScore: PhaserModule.GameObjects.Text;
  readonly bBadge: PhaserModule.GameObjects.Text;
  readonly bScore: PhaserModule.GameObjects.Text;
  readonly divider: PhaserModule.GameObjects.Text;
  readonly draws: PhaserModule.GameObjects.Text;
  readonly rim: PhaserModule.GameObjects.Rectangle;
  readonly round: PhaserModule.GameObjects.Text;
  readonly surface: PhaserModule.GameObjects.Rectangle;
}

const boardColors = {
  cranberry: 0x8f1d35,
  cream: 0xfff4d9,
  gold: 0xf3ce74,
  parchment: 0xf0ddb1,
  pine: 0x0b4b3d,
  pineDark: 0x062b25,
  snow: 0xfff9eb,
  walnut: 0x2a160d,
  walnutLight: 0x5a341b,
} as const;

const textColors = {
  gold: '#f3ce74',
  snow: '#fff9eb',
} as const;

function asDescriptor(photo: Photo): TicTacToePhotoDescriptor {
  return { id: photo.id, orientation: photo.orientation, aspectRatio: photo.aspectRatio };
}

function difficultyLabel(difficulty: SantaDifficulty): string {
  return difficulty === 'easy' ? 'Gentil' : difficulty === 'smart' ? 'Esperto' : 'Mestre';
}

/**
 * T2 Board Lab: one run-scoped canvas, actual authorized card derivatives and
 * no final art or decorative downloads. The domain commits before every visual
 * response, and Zones are the only board input surfaces.
 */
export function createTicTacToeGame(
  Phaser: typeof PhaserModule,
  parent: HTMLElement,
  context: GameContext,
): GameController {
  const photoATextureKey = `ttt:${context.run.runId}:photo-a:card`;
  const photoBTextureKey = `ttt:${context.run.runId}:photo-b:card`;
  const workshopBackgroundTextureKey = `ttt:${context.run.runId}:workshop-background`;
  const memoryFrameTextureKey = `ttt:${context.run.runId}:memory-frame`;
  const lightGarlandTextureKey = `ttt:${context.run.runId}:light-garland`;
  const pickerThumbTextureKeys = Array.from(
    { length: 6 },
    (_, slot) => `ttt:${context.run.runId}:picker:${slot}:thumb`,
  );
  const audioKeys = {
    celebrate: `ttt:${context.run.runId}:celebrate`,
    music: `ttt:${context.run.runId}:music`,
    placement: `ttt:${context.run.runId}:placement`,
    tap: `ttt:${context.run.runId}:tap`,
  } as const;
  type PauseReason = 'blur' | 'hidden' | 'manual';
  let setScenePauseReason: ((reason: PauseReason, paused: boolean) => void) | undefined;

  class TicTacToeScene extends Phaser.Scene {
    private readonly scope = new SceneScope();
    private readonly buttons: ButtonView[] = [];
    private readonly celebrationMarks: PhaserModule.GameObjects.Text[] = [];
    private readonly cells: CellView[] = [];
    private readonly pauseButtons: ButtonView[] = [];
    private readonly pickerCards: PickerCardView[] = [];
    private readonly pieces = new Map<CellIndex, PieceView>();
    private activePress: TicTacToeActivePointerPress | undefined;
    private audioButton: ButtonView | undefined;
    private audioEnabled = context.preferences?.soundEnabled ?? true;
    private assetFailure = false;
    private backButton: ButtonView | undefined;
    private background?: PhaserModule.GameObjects.Rectangle;
    private boardGarland: PhaserModule.GameObjects.Image | undefined;
    private boardInputUnlockAt = 0;
    private readonly winningGarlandBulbs: PhaserModule.GameObjects.Rectangle[] = [];
    private winningGarlandWire: PhaserModule.GameObjects.Rectangle | undefined;
    private workshopFelt?: PhaserModule.GameObjects.Rectangle;
    private workshopRail?: PhaserModule.GameObjects.Rectangle;
    private workshopWood?: PhaserModule.GameObjects.Rectangle;
    private readonly workshopLights: PhaserModule.GameObjects.Rectangle[] = [];
    private workshopBackdrop: PhaserModule.GameObjects.Image | undefined;
    private boardInset?: PhaserModule.GameObjects.Rectangle;
    private boardLayout?: TicTacToeBoardLayout;
    private boardShadow?: PhaserModule.GameObjects.Rectangle;
    private boardSurface?: PhaserModule.GameObjects.Rectangle;
    private coach?: PhaserModule.GameObjects.Text;
    private difficulty: SantaDifficulty = 'smart';
    private dynamicPhotoLoading = false;
    private dynamicPhotoLoadFailed = false;
    private dockActivePlayer: PlayerId | undefined;
    private match: TicTacToeMatch | undefined;
    private matchResultHero: MatchResultHeroView | undefined;
    private music: PhaserModule.Sound.BaseSound | undefined;
    private musicAwaitingUnlock = false;
    private readonly pauseReasons = new Set<PauseReason>();
    private matchComplete = false;
    private pauseCover: PhaserModule.GameObjects.Rectangle | undefined;
    private pauseCoverZone: PhaserModule.GameObjects.Zone | undefined;
    private pauseConfirming = false;
    private pauseLabel: PhaserModule.GameObjects.Text | undefined;
    private pauseMessage: PhaserModule.GameObjects.Text | undefined;
    private pausePanel: PhaserModule.GameObjects.Rectangle | undefined;
    private pauseSurface: PhaserModule.GameObjects.Rectangle | undefined;
    private pauseZone: PhaserModule.GameObjects.Zone | undefined;
    private photoB?: Photo;
    private pickerCandidates: readonly Photo[] = [];
    private pickerLoading = false;
    private pickerPage = 0;
    private readonly pickerTextureSlots = new Set<string>();
    private placementCard: PlacementCardView | undefined;
    private placementFlight: { size: number; x: number; y: number } | undefined;
    private playerADock: PlayerDockView | undefined;
    private playerBDock: PlayerDockView | undefined;
    private presentation: TicTacToePresentationState = 'mode';
    private presentationEpoch = 0;
    private scoreText?: PhaserModule.GameObjects.Text;
    private selectedSetup: TicTacToeSetup | undefined;
    private selectionPhotoFrame: SelectionPhotoFrameView | undefined;
    private scoreboard: ScoreboardView | undefined;
    private statusSurface: PhaserModule.GameObjects.Rectangle | undefined;
    private statusText?: PhaserModule.GameObjects.Text;
    private titleText?: PhaserModule.GameObjects.Text;
    private readonly setPauseReasonFromGame = (reason: PauseReason, paused: boolean): void => {
      if (paused) this.pauseReasons.add(reason);
      else this.pauseReasons.delete(reason);
      this.syncPauseState();
    };

    private readonly handleScenePointerMove = (pointer: PhaserModule.Input.Pointer): void => {
      if (
        this.activePress !== undefined &&
        exceedsTicTacToePointerSlop(this.activePress, pointer)
      ) {
        this.cancelActivePress(pointer.id);
      }
    };

    private readonly handleScenePointerUp = (
      pointer: PhaserModule.Input.Pointer,
      currentlyOver: PhaserModule.GameObjects.GameObject[] = [],
    ): void => {
      const press = this.activePress;
      if (!press || press.pointerId !== pointer.id) return;
      const releasedCellIndex = this.cells.findIndex((view) => currentlyOver.includes(view.zone));
      const releasedOverCell = releasedCellIndex < 0 ? undefined : (releasedCellIndex as CellIndex);
      const canCommit = canConfirmTicTacToePointerPress(
        press,
        pointer,
        this.presentationEpoch,
        releasedOverCell,
      );
      this.cancelActivePress(pointer.id);
      if (canCommit) this.confirmCellPress(press.cell);
    };

    private readonly handleScenePointerUpOutside = (pointer: PhaserModule.Input.Pointer): void => {
      this.cancelActivePress(pointer.id);
    };

    private readonly handleAssetFailure = (file: { key?: unknown }): void => {
      if (this.dynamicPhotoLoading) {
        this.dynamicPhotoLoadFailed = true;
        return;
      }
      if (
        this.pickerLoading &&
        typeof file.key === 'string' &&
        pickerThumbTextureKeys.includes(file.key)
      ) {
        // Candidate thumbs are an enhancement to the picker. A missing thumb
        // simply omits that card; it must never expose a media URL or break the
        // already-authorized choice flow.
        return;
      }
      if (
        typeof file.key === 'string' &&
        [
          workshopBackgroundTextureKey,
          memoryFrameTextureKey,
          lightGarlandTextureKey,
          ...Object.values(audioKeys),
        ].includes(file.key)
      ) {
        return;
      }
      this.failAsset('tic-tac-toe-photo-load-failed');
    };

    constructor() {
      super('TicTacToeScene');
    }

    init(): void {
      setScenePauseReason = this.setPauseReasonFromGame;
      context.run.open();
      this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, this.handleAssetFailure, this);
      this.scope.add(() =>
        this.load.off(Phaser.Loader.Events.FILE_LOAD_ERROR, this.handleAssetFailure, this),
      );
      this.scope.add(() => {
        if (setScenePauseReason === this.setPauseReasonFromGame) {
          setScenePauseReason = undefined;
        }
      });
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scope.dispose());
    }

    preload(): void {
      this.load.image(photoATextureKey, context.selectedPhoto.variants.card);
      this.load.image(
        workshopBackgroundTextureKey,
        '/assets/tic-tac-toe/backgrounds/oficina-vertical-v1.webp',
      );
      this.load.image(memoryFrameTextureKey, '/assets/tic-tac-toe/ui/moldura-lembranca-v1.webp');
      this.load.image(lightGarlandTextureKey, '/assets/tic-tac-toe/vfx/cordao-luzes-v1.webp');
      this.load.audio(audioKeys.tap, [
        '/assets/tic-tac-toe/audio/toque.m4a',
        '/assets/tic-tac-toe/audio/toque.mp3',
      ]);
      this.load.audio(audioKeys.placement, [
        '/assets/tic-tac-toe/audio/encaixe.m4a',
        '/assets/tic-tac-toe/audio/encaixe.mp3',
      ]);
      this.load.audio(audioKeys.celebrate, [
        '/assets/tic-tac-toe/audio/vitoria.m4a',
        '/assets/tic-tac-toe/audio/vitoria.mp3',
      ]);
      this.load.audio(audioKeys.music, [
        '/assets/tic-tac-toe/audio/oficina-loop.m4a',
        '/assets/tic-tac-toe/audio/oficina-loop.mp3',
      ]);
    }

    create(): void {
      if (this.assetFailure) return;
      const frame = this.textures.get(photoATextureKey).get();
      if (frame.width <= 0 || frame.height <= 0) {
        this.failAsset('tic-tac-toe-invalid-photo-texture');
        return;
      }
      this.scope.texture(this.textures, photoATextureKey);
      [workshopBackgroundTextureKey, memoryFrameTextureKey, lightGarlandTextureKey].forEach(
        (key) => {
          if (this.textures.exists(key)) this.scope.texture(this.textures, key);
        },
      );
      this.input.topOnly = true;
      this.scope.on(this.input, Phaser.Input.Events.POINTER_MOVE, this.handleScenePointerMove);
      this.scope.on(this.input, Phaser.Input.Events.POINTER_UP, this.handleScenePointerUp);
      this.scope.on(
        this.input,
        Phaser.Input.Events.POINTER_UP_OUTSIDE,
        this.handleScenePointerUpOutside,
      );
      this.background = this.add
        .rectangle(0, 0, 1, 1, boardColors.pineDark, 1)
        .setOrigin(0)
        .setDepth(-10);
      this.createWorkshopBackdrop();
      this.createBoardSurface();
      this.createPlayerDocks();
      this.statusSurface = this.add
        .rectangle(0, 0, 1, 1, boardColors.pine, 0.76)
        .setStrokeStyle(1, boardColors.gold, 0.48)
        .setDepth(1);
      this.titleText = this.add
        .text(0, 0, 'TRINCA DE NATAL', {
          color: textColors.gold,
          fontFamily: 'system-ui, sans-serif',
          fontSize: '20px',
          fontStyle: 'bold',
        })
        .setOrigin(0.5)
        .setDepth(3);
      this.scoreText = this.add
        .text(0, 0, 'Mural da Oficina do Noel', {
          color: textColors.snow,
          fontFamily: 'system-ui, sans-serif',
          fontSize: '13px',
          fontStyle: 'bold',
        })
        .setOrigin(0.5)
        .setDepth(3);
      this.createScoreboard();
      this.statusText = this.add
        .text(0, 0, '', {
          align: 'center',
          color: textColors.gold,
          fontFamily: 'system-ui, sans-serif',
          fontSize: '14px',
          fontStyle: 'bold',
          wordWrap: { width: 310 },
        })
        .setOrigin(0.5)
        .setDepth(3);
      this.coach = this.add
        .text(0, 0, '', {
          align: 'center',
          color: textColors.snow,
          fontFamily: 'system-ui, sans-serif',
          fontSize: '14px',
          fontStyle: 'bold',
          wordWrap: { width: 312 },
        })
        .setOrigin(0.5)
        .setDepth(3);
      this.createBackControl();
      this.createPauseControls();
      this.createSelectionPhotoFrame();
      this.createMatchResultHero();
      const resize = (gameSize: { width: number; height: number }): void =>
        this.reflowAfterResize(createViewportLayout(gameSize.width, gameSize.height));
      this.scope.on(this.scale, Phaser.Scale.Events.RESIZE, resize);
      this.layout(createViewportLayout(this.scale.gameSize.width, this.scale.gameSize.height));
      context.run.ready();
      this.showMode();
    }

    private createScoreboard(): void {
      const surface = this.add
        .rectangle(0, 0, 1, 1, boardColors.pineDark, 0.82)
        .setRounded(10)
        .setDepth(2)
        .setVisible(false);
      const rim = this.add
        .rectangle(0, 0, 1, 1, boardColors.gold, 0)
        .setRounded(11)
        .setStrokeStyle(1, boardColors.gold, 0.62)
        .setDepth(2.5)
        .setVisible(false);
      const scoreTextStyle = {
        color: textColors.snow,
        fontFamily: 'Georgia, serif',
        fontStyle: 'bold',
      } as const;
      const round = this.add
        .text(0, 0, 'R1/3', { ...scoreTextStyle, color: textColors.gold, fontSize: '9px' })
        .setOrigin(0.5)
        .setDepth(3)
        .setVisible(false);
      const aBadge = this.add
        .text(0, 0, '✦', { ...scoreTextStyle, color: textColors.gold, fontSize: '12px' })
        .setOrigin(0.5)
        .setDepth(3)
        .setVisible(false);
      const aScore = this.add
        .text(0, 0, '0', { ...scoreTextStyle, fontSize: '17px' })
        .setOrigin(0.5)
        .setDepth(3)
        .setVisible(false);
      const divider = this.add
        .text(0, 0, '×', { ...scoreTextStyle, color: textColors.gold, fontSize: '13px' })
        .setOrigin(0.5)
        .setDepth(3)
        .setVisible(false);
      const bScore = this.add
        .text(0, 0, '0', { ...scoreTextStyle, fontSize: '17px' })
        .setOrigin(0.5)
        .setDepth(3)
        .setVisible(false);
      const bBadge = this.add
        .text(0, 0, 'N', { ...scoreTextStyle, color: textColors.gold, fontSize: '11px' })
        .setOrigin(0.5)
        .setDepth(3)
        .setVisible(false);
      const draws = this.add
        .text(0, 0, '', { ...scoreTextStyle, color: textColors.gold, fontSize: '8px' })
        .setOrigin(0.5)
        .setDepth(3)
        .setVisible(false);
      this.scoreboard = { aBadge, aScore, bBadge, bScore, divider, draws, rim, round, surface };
    }

    private setScoreboardVisible(visible: boolean): void {
      const scoreboard = this.scoreboard;
      if (!scoreboard) return;
      [
        scoreboard.surface,
        scoreboard.rim,
        scoreboard.round,
        scoreboard.aBadge,
        scoreboard.aScore,
        scoreboard.divider,
        scoreboard.bScore,
        scoreboard.bBadge,
        scoreboard.draws,
      ].forEach((target) => target.setVisible(visible));
    }

    private updateScoreboard(match: TicTacToeMatch): void {
      const scoreboard = this.scoreboard;
      if (!scoreboard) return;
      scoreboard.round.setText(`R${match.roundIndex + 1}/3`);
      scoreboard.aScore.setText(String(match.score.playerA));
      scoreboard.bScore.setText(String(match.score.playerB));
      scoreboard.bBadge.setText(match.mode === 'local' ? '✧' : 'N');
      scoreboard.draws.setText(match.score.draws > 0 ? `· ${match.score.draws} empate` : '');
    }

    private layoutScoreboard(layout: TicTacToeBoardLayout, visible: boolean): void {
      const scoreboard = this.scoreboard;
      this.setScoreboardVisible(visible);
      if (!scoreboard || !visible) return;
      const center = ticTacToeRectCenter(layout.score);
      const height = Math.min(28, layout.score.height + 6);
      const width = Math.min(250, layout.score.width);
      const left = center[0] - width / 2;
      scoreboard.surface.setPosition(...center).setSize(width, height);
      scoreboard.rim.setPosition(...center).setSize(width + 4, height + 4);
      scoreboard.round.setPosition(left + 31, center[1]).setFontSize('9px');
      scoreboard.aBadge.setPosition(center[0] - 54, center[1]).setFontSize('12px');
      scoreboard.aScore.setPosition(center[0] - 35, center[1] - 1).setFontSize('17px');
      scoreboard.divider.setPosition(center[0], center[1] - 1).setFontSize('13px');
      scoreboard.bScore.setPosition(center[0] + 35, center[1] - 1).setFontSize('17px');
      scoreboard.bBadge.setPosition(center[0] + 54, center[1]).setFontSize('11px');
      scoreboard.draws.setPosition(left + width - 30, center[1]).setFontSize('8px');
    }

    private createBackControl(): void {
      this.backButton = this.createButton(
        '← Voltar',
        () => this.returnToMode(),
        20,
        boardColors.pine,
      );
      this.setButtonVisible(this.backButton, false);
    }

    private createPauseControls(): void {
      this.audioButton = this.createButton(
        'Som',
        () => this.toggleAudioAfterGesture(),
        20,
        boardColors.pine,
      );
      this.setButtonVisible(this.audioButton, false);
      this.pauseSurface = this.add
        .rectangle(0, 0, 72, 44, boardColors.pine, 1)
        .setStrokeStyle(2, boardColors.gold, 0.85)
        .setDepth(20);
      this.pauseLabel = this.add
        .text(0, 0, 'Pausar', {
          color: textColors.snow,
          fontFamily: 'system-ui, sans-serif',
          fontSize: '12px',
          fontStyle: 'bold',
        })
        .setOrigin(0.5)
        .setDepth(21);
      this.pauseZone = this.add
        .zone(0, 0, 72, 44)
        .setDepth(22)
        .setInteractive({ useHandCursor: true });
      this.pauseZone.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => {
        this.pauseSurface?.setScale(0.98);
        this.pauseLabel?.setAlpha(0.9);
      });
      this.pauseZone.on(Phaser.Input.Events.GAMEOBJECT_POINTER_OUT, () => this.resetPauseControl());
      this.pauseZone.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => {
        this.resetPauseControl();
        this.playSound(audioKeys.tap, 0.2);
        this.toggleManualPause();
      });
      attachCrystalControl({
        target: this.pauseSurface,
        label: this.pauseLabel,
        gesture: this.pauseZone,
        graphics: this.scope.resource(this.add.graphics().setDepth(20.7)),
        icon: 'pause',
        events: this.events,
        scope: this.scope,
        reducedMotion: this.prefersReducedMotion(),
      });
      this.pauseCover = this.add
        .rectangle(0, 0, 1, 1, boardColors.pineDark, 0.94)
        .setOrigin(0)
        .setDepth(40)
        .setVisible(false);
      this.pauseCoverZone = this.add
        .zone(0, 0, 1, 1)
        .setOrigin(0)
        .setDepth(41)
        .setVisible(false)
        .setInteractive({ useHandCursor: true });
      this.scope.add(() => this.pauseCoverZone?.destroy());
      this.pausePanel = this.add
        .rectangle(0, 0, 1, 1, boardColors.pine, 1)
        .setStrokeStyle(2, boardColors.gold, 0.9)
        .setDepth(42)
        .setVisible(false);
      attachCrystalControl({
        target: this.pausePanel,
        graphics: this.scope.resource(this.add.graphics().setDepth(42.5)),
        events: this.events,
        scope: this.scope,
        reducedMotion: this.prefersReducedMotion(),
        panel: true,
      });
      this.pauseMessage = this.add
        .text(0, 0, 'Pausa de Natal', {
          align: 'center',
          color: textColors.snow,
          fontFamily: 'system-ui, sans-serif',
          fontSize: '19px',
          fontStyle: 'bold',
          wordWrap: { width: 280 },
        })
        .setOrigin(0.5)
        .setDepth(43)
        .setVisible(false);
      this.pauseButtons.push(
        this.createButton('Continuar', () => this.continueFromPause(), 44, boardColors.pine),
        this.createButton('Voltar ao início', () => this.requestReturnToMode(), 44),
        this.createButton('Sim, voltar', () => this.confirmReturnToMode(), 44),
        this.createButton(
          'Continuar partida',
          () => this.cancelReturnToMode(),
          44,
          boardColors.pine,
        ),
      );
      this.pauseButtons.forEach((button) => this.setButtonVisible(button, false));
      this.scope.add(() => {
        this.pauseCover = undefined;
        this.pauseMessage = undefined;
        this.pausePanel = undefined;
      });
    }

    private createSelectionPhotoFrame(): void {
      const contactShadow = this.add.rectangle(0, 0, 1, 1, boardColors.pineDark, 0.52).setDepth(4);
      const frameOuter = this.add
        .rectangle(0, 0, 1, 1, boardColors.pine, 1)
        .setStrokeStyle(2, boardColors.gold, 0.94)
        .setDepth(5);
      const bevel = this.add.rectangle(0, 0, 1, 1, boardColors.cranberry, 1).setDepth(6);
      const matte = this.add.rectangle(0, 0, 1, 1, boardColors.cream, 1).setDepth(7);
      const photo = this.add.image(0, 0, photoATextureKey).setDepth(8);
      const innerEdge = this.add
        .rectangle(0, 0, 1, 1, boardColors.gold, 0)
        .setStrokeStyle(1, boardColors.gold, 0.8)
        .setDepth(9);
      const art = this.textures.exists(memoryFrameTextureKey)
        ? this.add.image(0, 0, memoryFrameTextureKey).setDepth(10)
        : undefined;
      const label = this.add
        .text(0, 0, 'SUA LEMBRANÇA', {
          color: textColors.gold,
          fontFamily: 'system-ui, sans-serif',
          fontSize: '10px',
          fontStyle: 'bold',
        })
        .setOrigin(0.5)
        .setDepth(11);
      const badge = this.add
        .text(0, 0, '✦', {
          color: textColors.gold,
          fontFamily: 'system-ui, sans-serif',
          fontSize: '18px',
          fontStyle: 'bold',
        })
        .setOrigin(0.5)
        .setDepth(12);
      this.selectionPhotoFrame = {
        art,
        badge,
        bevel,
        contactShadow,
        frameOuter,
        innerEdge,
        label,
        matte,
        photo,
      };
      this.setSelectionPhotoVisible(false);
    }

    private createMatchResultHero(): void {
      const shadow = this.add
        .rectangle(0, 0, 1, 1, boardColors.pineDark, 0.68)
        .setRounded(16)
        .setDepth(27)
        .setVisible(false);
      const frame = this.add
        .rectangle(0, 0, 1, 1, boardColors.pine, 1)
        .setRounded(14)
        .setStrokeStyle(3, boardColors.gold, 0.98)
        .setDepth(28)
        .setVisible(false);
      const innerFrame = this.add
        .rectangle(0, 0, 1, 1, boardColors.cranberry, 1)
        .setRounded(10)
        .setStrokeStyle(1, boardColors.gold, 0.52)
        .setDepth(29)
        .setVisible(false);
      const matte = this.add
        .rectangle(0, 0, 1, 1, boardColors.cream, 1)
        .setRounded(7)
        .setDepth(30)
        .setVisible(false);
      const photo = this.add.image(0, 0, photoATextureKey).setDepth(31).setVisible(false);
      // The result seal is deliberately below the photograph. It turns the
      // winner into a tangible keepsake without covering a face or suggesting
      // a second touch target inside the hero card.
      const crestBack = this.add
        .circle(0, 0, 20, boardColors.pineDark, 1)
        .setStrokeStyle(3, boardColors.gold, 0.94)
        .setDepth(32)
        .setVisible(false);
      const crestRing = this.add
        .circle(0, 0, 15, boardColors.cranberry, 1)
        .setStrokeStyle(1, boardColors.cream, 0.68)
        .setDepth(32.2)
        .setVisible(false);
      const crestMark = this.add
        .text(0, 0, '✦', {
          color: textColors.gold,
          fontFamily: 'Georgia, serif',
          fontSize: '16px',
          fontStyle: 'bold',
        })
        .setOrigin(0.5)
        .setDepth(32.4)
        .setVisible(false);
      const label = this.add
        .text(0, 0, 'NOEL', {
          color: textColors.snow,
          fontFamily: 'Georgia, serif',
          fontSize: '26px',
          fontStyle: 'bold',
        })
        .setOrigin(0.5)
        .setDepth(31)
        .setVisible(false);
      const title = this.add
        .text(0, 0, 'TRINCA DE NATAL!', {
          color: textColors.gold,
          fontFamily: 'Georgia, serif',
          fontSize: '21px',
          fontStyle: 'bold',
        })
        .setOrigin(0.5)
        .setDepth(32)
        .setVisible(false);
      const banner = this.add
        .rectangle(0, 0, 1, 1, boardColors.cranberry, 1)
        .setRounded(7)
        .setStrokeStyle(1, boardColors.gold, 0.76)
        .setDepth(32)
        .setVisible(false);
      const bannerText = this.add
        .text(0, 0, '', {
          align: 'center',
          color: textColors.snow,
          fontFamily: 'Georgia, serif',
          fontSize: '14px',
          fontStyle: 'bold',
        })
        .setOrigin(0.5)
        .setDepth(33)
        .setVisible(false);
      const leftOrnament = this.add
        .text(0, 0, '✦', {
          color: textColors.gold,
          fontFamily: 'Georgia, serif',
          fontSize: '22px',
        })
        .setOrigin(0.5)
        .setDepth(33)
        .setVisible(false);
      const rightOrnament = this.add
        .text(0, 0, '✦', {
          color: textColors.gold,
          fontFamily: 'Georgia, serif',
          fontSize: '22px',
        })
        .setOrigin(0.5)
        .setDepth(33)
        .setVisible(false);
      this.matchResultHero = {
        banner,
        bannerText,
        crestBack,
        crestMark,
        crestRing,
        frame,
        innerFrame,
        label,
        leftOrnament,
        matte,
        photo,
        rightOrnament,
        shadow,
        title,
      };
    }

    private createBoardSurface(): void {
      this.boardShadow = this.add
        .rectangle(0, 0, 1, 1, boardColors.pineDark, 0.72)
        .setRounded(18)
        .setDepth(1)
        .setVisible(false);
      this.boardSurface = this.add
        .rectangle(0, 0, 1, 1, boardColors.walnut, 1)
        .setRounded(16)
        .setStrokeStyle(2, boardColors.gold, 0.8)
        .setDepth(2)
        .setVisible(false);
      this.boardInset = this.add
        .rectangle(0, 0, 1, 1, boardColors.walnutLight, 1)
        .setRounded(12)
        .setStrokeStyle(1, boardColors.gold, 0.28)
        .setDepth(3)
        .setVisible(false);
      this.boardGarland = this.textures.exists(lightGarlandTextureKey)
        ? this.add.image(0, 0, lightGarlandTextureKey).setDepth(13).setVisible(false)
        : undefined;
      this.winningGarlandWire = this.add
        .rectangle(0, 0, 1, 3, boardColors.gold, 0.82)
        .setRounded(2)
        .setDepth(13)
        .setVisible(false);
      const bulbColors = [
        boardColors.gold,
        boardColors.cranberry,
        boardColors.gold,
        boardColors.pine,
        boardColors.gold,
      ];
      bulbColors.forEach((color) => {
        this.winningGarlandBulbs.push(
          this.add
            .rectangle(0, 0, 8, 11, color, 1)
            .setRounded(4)
            .setStrokeStyle(1, boardColors.gold, 0.88)
            .setDepth(14)
            .setVisible(false),
        );
      });
    }

    private createPlayerDocks(): void {
      this.playerADock = this.createPlayerDock(boardColors.cranberry, '✦');
      this.playerBDock = this.createPlayerDock(boardColors.pine, 'N');
      this.setPlayerDocksVisible(false);
    }

    private createPlayerDock(fill: number, badgeText: string): PlayerDockView {
      const surface = this.add
        .rectangle(0, 0, 1, 1, fill, 0.72)
        .setRounded(10)
        .setStrokeStyle(1, boardColors.gold, 0.5)
        .setDepth(14);
      const rim = this.add
        .rectangle(0, 0, 1, 1, boardColors.gold, 0)
        .setRounded(12)
        .setStrokeStyle(2, boardColors.gold, 0)
        .setDepth(15);
      const identityMatte = this.add
        .rectangle(0, 0, 1, 1, boardColors.pineDark, 0.94)
        .setRounded(5)
        .setStrokeStyle(1, boardColors.gold, 0.45)
        .setDepth(16);
      const identityFrame = this.add
        .rectangle(0, 0, 1, 1, boardColors.gold, 0)
        .setRounded(5)
        .setStrokeStyle(2, boardColors.gold, 0.86)
        .setDepth(18);
      const badge = this.add
        .text(0, 0, badgeText, {
          color: textColors.gold,
          fontFamily: 'system-ui, sans-serif',
          fontSize: '18px',
          fontStyle: 'bold',
        })
        .setOrigin(0.5)
        .setDepth(19);
      const title = this.add
        .text(0, 0, '', {
          color: textColors.snow,
          fontFamily: 'system-ui, sans-serif',
          fontSize: '11px',
          fontStyle: 'bold',
        })
        .setOrigin(0, 0.5)
        .setDepth(19);
      const detail = this.add
        .text(0, 0, '', {
          color: textColors.gold,
          fontFamily: 'system-ui, sans-serif',
          fontSize: '10px',
          fontStyle: 'bold',
        })
        .setOrigin(0, 0.5)
        .setDepth(19);
      return { badge, detail, identityFrame, identityMatte, rim, surface, title };
    }

    private createWorkshopBackdrop(): void {
      this.workshopBackdrop = this.textures.exists(workshopBackgroundTextureKey)
        ? this.add.image(0, 0, workshopBackgroundTextureKey).setDepth(-8)
        : undefined;
      this.workshopFelt = this.add
        .rectangle(0, 0, 1, 1, boardColors.pine, this.workshopBackdrop ? 0.2 : 0.74)
        .setDepth(-6);
      this.workshopWood = this.add
        .rectangle(0, 0, 1, 1, boardColors.walnut, this.workshopBackdrop ? 0.26 : 0.96)
        .setDepth(-5);
      this.workshopRail = this.add.rectangle(0, 0, 1, 1, boardColors.gold, 0.68).setDepth(-4);
      for (let index = 0; index < 8; index += 1) {
        this.workshopLights.push(
          this.add.rectangle(0, 0, 7, 11, boardColors.gold, 0.84).setRounded(4).setDepth(-3),
        );
      }
    }

    private showMode(): void {
      this.resetWorkshopLights();
      this.setMatchResultHeroVisible(false);
      this.clearPickerCards();
      this.clearPickerThumbnails();
      this.pickerCandidates = [];
      this.pickerPage = 0;
      this.clearBoard();
      this.match = undefined;
      this.selectedSetup = undefined;
      this.presentation = 'mode';
      this.coach?.setText('Como quer jogar?');
      this.scoreText?.setText('Mural da Oficina do Noel');
      this.statusText?.setText('Faça 3 fotos em linha!');
      const options: ButtonOption[] = [
        {
          label: 'Jogar\ncom o Noel',
          detail: 'Uma aventura na Oficina',
          fill: boardColors.pine,
          ornament: '✦',
          onPress: () => this.showDifficulty(),
        },
      ];
      if (context.session.photos.length >= 2) {
        options.push({
          label: 'Duas\npessoas',
          detail: 'No mesmo celular',
          ornament: '✧',
          onPress: () => this.showPhotoPicker(),
        });
      }
      this.replaceButtons(options);
      this.layout(createViewportLayout(this.scale.gameSize.width, this.scale.gameSize.height));
      this.animateSelectionEntrance();
    }

    private showDifficulty(): void {
      this.presentation = 'difficulty';
      this.coach?.setText('Escolha o jeito do Papai Noel brincar.');
      this.statusText?.setText('Esperto é o padrão da Oficina.');
      this.replaceButtons(
        (['easy', 'smart', 'master'] as const).map((difficulty) => ({
          label: `Noel ${difficultyLabel(difficulty)}`,
          detail:
            difficulty === 'easy'
              ? 'Para brincar sem pressa'
              : difficulty === 'smart'
                ? 'Equilíbrio da Oficina'
                : 'Um desafio de verdade',
          fill: difficulty === 'smart' ? boardColors.pine : undefined,
          ornament: difficulty === 'smart' ? '★' : '✦',
          onPress: () => this.startSantaMatch(difficulty),
        })),
      );
      this.layout(createViewportLayout(this.scale.gameSize.width, this.scale.gameSize.height));
      this.animateSelectionEntrance();
    }

    private showPhotoPicker(notice?: string): void {
      this.presentation = 'photo-picker';
      if (this.pickerCandidates.length === 0) {
        const photosById = new Map(context.session.photos.map((photo) => [photo.id, photo]));
        this.pickerCandidates = selectTicTacToePhotoCandidates({
          anchor: asDescriptor(context.selectedPhoto),
          candidates: context.session.photos.map(asDescriptor),
          random: context.random,
        })
          .map((descriptor) => photosById.get(descriptor.id))
          .filter((photo): photo is Photo => photo !== undefined);
        this.pickerPage = 0;
      }
      this.coach?.setText('');
      this.statusText?.setText(notice ?? 'Ela entra no mural sem trocar ou cortar a foto.');
      this.replacePickerPageButtons();
      this.clearPickerCards();
      this.layout(createViewportLayout(this.scale.gameSize.width, this.scale.gameSize.height));
      this.loadPickerThumbnails();
    }

    private pickerPageCount(): number {
      return Math.max(1, Math.ceil(this.pickerCandidates.length / pickerThumbTextureKeys.length));
    }

    private visiblePickerCandidates(): readonly Photo[] {
      const start = this.pickerPage * pickerThumbTextureKeys.length;
      return this.pickerCandidates.slice(start, start + pickerThumbTextureKeys.length);
    }

    private replacePickerPageButtons(): void {
      if (this.pickerPageCount() <= 1) {
        this.replaceButtons([]);
        return;
      }
      this.replaceButtons([
        {
          label: '‹ Anterior',
          fill: boardColors.pine,
          onPress: () => this.goToPickerPage(this.pickerPage - 1),
        },
        {
          label: 'Mais ›',
          onPress: () => this.goToPickerPage(this.pickerPage + 1),
        },
      ]);
      const [previous, next] = this.buttons;
      if (previous) this.setButtonEnabled(previous, this.pickerPage > 0);
      if (next) this.setButtonEnabled(next, this.pickerPage + 1 < this.pickerPageCount());
    }

    private goToPickerPage(page: number): void {
      if (this.pickerLoading || page < 0 || page >= this.pickerPageCount()) return;
      this.pickerPage = page;
      this.clearPickerCards();
      this.clearPickerThumbnails();
      this.showPhotoPicker();
    }

    private loadLocalPhoto(photo: Photo): void {
      if (this.dynamicPhotoLoading || this.isPaused()) return;
      this.presentation = 'photo-loading';
      this.dynamicPhotoLoading = true;
      this.dynamicPhotoLoadFailed = false;
      this.clearPickerCards();
      this.clearPickerThumbnails();
      this.coach?.setText('');
      this.statusText?.setText('Carregando sua lembrança…');
      this.replaceButtons([]);
      const complete = (): void => {
        this.dynamicPhotoLoading = false;
        if (this.dynamicPhotoLoadFailed || !this.textures.exists(photoBTextureKey)) {
          this.textures.remove(photoBTextureKey);
          this.showPhotoPicker('Essa lembrança não abriu. Escolha outra.');
          return;
        }
        this.scope.texture(this.textures, photoBTextureKey);
        this.photoB = photo;
        this.startLocalMatch();
      };
      this.load.once(Phaser.Loader.Events.COMPLETE, complete);
      this.scope.add(() => this.load.off(Phaser.Loader.Events.COMPLETE, complete));
      this.load.image(photoBTextureKey, photo.variants.card);
      this.load.start();
    }

    private loadPickerThumbnails(): void {
      if (this.pickerLoading) return;
      const visibleCandidates = this.visiblePickerCandidates();
      const pending = visibleCandidates.filter(
        (_, index) => !this.textures.exists(pickerThumbTextureKeys[index] ?? ''),
      );
      const finish = (): void => {
        this.pickerLoading = false;
        if (this.presentation !== 'photo-picker') return;
        this.createPickerCards();
        this.layout(createViewportLayout(this.scale.gameSize.width, this.scale.gameSize.height));
      };
      if (pending.length === 0) {
        finish();
        return;
      }
      this.pickerLoading = true;
      this.statusText?.setText('Preparando as lembranças…');
      this.load.once(Phaser.Loader.Events.COMPLETE, finish);
      this.scope.add(() => this.load.off(Phaser.Loader.Events.COMPLETE, finish));
      visibleCandidates.forEach((photo, index) => {
        const key = pickerThumbTextureKeys[index];
        if (!key || this.textures.exists(key)) return;
        this.load.image(key, photo.variants.thumb);
      });
      this.load.start();
    }

    private createPickerCards(): void {
      this.clearPickerCards();
      this.visiblePickerCandidates().forEach((photo, index) => {
        const textureKey = pickerThumbTextureKeys[index];
        if (!textureKey || !this.textures.exists(textureKey)) return;
        if (!this.pickerTextureSlots.has(textureKey)) {
          this.scope.texture(this.textures, textureKey);
          this.pickerTextureSlots.add(textureKey);
        }
        const shadow = this.add
          .rectangle(0, 0, 1, 1, boardColors.pineDark, 0.62)
          .setRounded(8)
          .setDepth(8);
        const surface = this.add
          .rectangle(0, 0, 1, 1, boardColors.pine, 1)
          .setStrokeStyle(2, boardColors.gold, 0.94)
          .setRounded(8)
          .setDepth(9);
        const frame = this.add
          .rectangle(0, 0, 1, 1, boardColors.cream, 1)
          .setStrokeStyle(1, boardColors.gold, 0.54)
          .setRounded(5)
          .setDepth(10);
        const pickerPhoto = this.add.image(0, 0, textureKey).setDepth(11);
        const badge = this.add
          .text(0, 0, '✦', {
            color: textColors.gold,
            fontFamily: 'system-ui, sans-serif',
            fontSize: '14px',
            fontStyle: 'bold',
          })
          .setOrigin(0.5)
          .setDepth(12);
        const zone = this.add.zone(0, 0, 1, 1).setDepth(13).setInteractive({ useHandCursor: true });
        const card: PickerCardView = {
          badge,
          frame,
          photo: pickerPhoto,
          photoDescriptor: asDescriptor(photo),
          pressed: false,
          shadow,
          surface,
          zone,
        };
        zone.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () =>
          this.setPickerCardPressed(card, true),
        );
        zone.on(Phaser.Input.Events.GAMEOBJECT_POINTER_OUT, () =>
          this.setPickerCardPressed(card, false),
        );
        zone.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => {
          const wasPressed = card.pressed;
          this.setPickerCardPressed(card, false);
          if (!wasPressed) return;
          void context.haptics.impact('light').catch(() => undefined);
          this.startMusicAfterGesture();
          this.playSound(audioKeys.tap, 0.2);
          this.loadLocalPhoto(photo);
        });
        this.pickerCards.push(card);
      });
      if (this.pickerCards.length === 0) {
        this.statusText?.setText(
          'Não conseguimos abrir estas lembranças. Volte e tente novamente.',
        );
      } else {
        this.statusText?.setText('Escolha a segunda lembrança.');
      }
    }

    private clearPickerCards(): void {
      while (this.pickerCards.length > 0) {
        const card = this.pickerCards.pop();
        card?.shadow.destroy();
        card?.surface.destroy();
        card?.frame.destroy();
        card?.photo?.destroy();
        card?.badge.destroy();
        card?.zone.destroy();
      }
    }

    /** Only the six thumbnails visible on the current picker page stay resident. */
    private clearPickerThumbnails(): void {
      pickerThumbTextureKeys.forEach((key) => {
        if (this.textures.exists(key)) this.textures.remove(key);
      });
    }

    private startSantaMatch(difficulty: SantaDifficulty): void {
      this.difficulty = difficulty;
      this.selectedSetup = createSantaTicTacToeSetup(
        asDescriptor(context.selectedPhoto),
        difficulty,
      );
      this.match = createTicTacToeMatchFromSetup(this.selectedSetup);
      this.startBoard();
    }

    private startLocalMatch(): void {
      if (!this.photoB) return;
      this.selectedSetup = createLocalTicTacToeSetup(
        asDescriptor(context.selectedPhoto),
        asDescriptor(this.photoB),
        context.random,
      );
      this.match = createTicTacToeMatchFromSetup(this.selectedSetup);
      this.startBoard();
    }

    private startBoard(): void {
      this.cancelActivePress();
      this.resetWorkshopLights();
      this.clearWinningCelebration();
      this.matchComplete = false;
      this.presentation = 'board';
      // A picker/button can finish on the same pointer-up that creates this
      // board. Do not let that release fall through to a newly created cell.
      this.boardInputUnlockAt = this.time.now + 140;
      this.replaceButtons([]);
      this.ensureCells();
      this.refreshBoard();
      this.layout(createViewportLayout(this.scale.gameSize.width, this.scale.gameSize.height));
      this.updateTurnCopy();
      context.run.start();
      this.syncPauseState();
      if (this.match?.mode === 'santa' && this.match.turn === 'player-b') this.scheduleSantaMove();
    }

    private ensureCells(): void {
      if (this.cells.length > 0) return;
      for (let index = 0; index < 9; index += 1) {
        const cell = index as CellIndex;
        const shadow = this.add
          .rectangle(0, 0, 1, 1, boardColors.pineDark, 0.7)
          .setRounded(8)
          .setDepth(4);
        const frame = this.add
          .rectangle(0, 0, 1, 1, boardColors.walnutLight, 1)
          .setRounded(8)
          .setStrokeStyle(2, boardColors.gold, 0.9)
          .setDepth(5);
        const bevel = this.add
          .rectangle(0, 0, 1, 1, boardColors.cream, 1)
          .setRounded(5)
          .setDepth(6);
        const inner = this.add
          .rectangle(0, 0, 1, 1, boardColors.parchment, 1)
          .setRounded(4)
          .setStrokeStyle(1, boardColors.gold, 0.48)
          .setDepth(7);
        const corners = Array.from({ length: 4 }, () =>
          this.add.rectangle(0, 0, 1, 1, boardColors.gold, 0.62).setRounded(2).setDepth(7.5),
        );
        const zone = this.add.zone(0, 0, 1, 1).setDepth(15).setInteractive({ useHandCursor: true });
        zone.on(Phaser.Input.Events.POINTER_DOWN, (pointer: PhaserModule.Input.Pointer) =>
          this.beginCellPress(cell, pointer),
        );
        this.cells.push({ bevel, corners, frame, inner, shadow, zone });
      }
    }

    private beginCellPress(cell: CellIndex, pointer: PhaserModule.Input.Pointer): void {
      if (this.time.now < this.boardInputUnlockAt) return;
      if (this.activePress) return;
      const match = this.match;
      if (!match) return;
      const player = match.turn;
      if (!canPlaceTicTacToeCell(match, player, this.inputState())) {
        if (!this.isPaused() && this.presentation === 'board') {
          this.statusText?.setText('Espere a vez certa para colocar a lembrança.');
        }
        return;
      }
      this.activePress = beginTicTacToePointerPress(cell, pointer, this.presentationEpoch);
      this.setCellPressed(cell, true);
      void context.haptics.impact('light').catch(() => undefined);
    }

    private confirmCellPress(cell: CellIndex): void {
      const match = this.match;
      if (!match) return;
      const player = match.turn;
      if (!canPlaceTicTacToeCell(match, player, this.inputState())) return;
      this.commitMove(player, cell);
    }

    private commitMove(player: PlayerId, cell: CellIndex): void {
      const match = this.match;
      if (!match) return;
      const result = playTicTacToeCell(match, player, cell);
      if (!result.accepted) {
        this.flashOccupiedCell(cell);
        return;
      }
      this.match = result.state;
      if (player === 'player-a' || match.mode === 'local') {
        void context.haptics.impact('medium').catch(() => undefined);
        this.startMusicAfterGesture();
      }
      this.playSound(audioKeys.placement, 0.28);
      this.presentation = 'placing';
      const newPiece = this.refreshBoard(cell);
      this.layout(createViewportLayout(this.scale.gameSize.width, this.scale.gameSize.height));
      const token = ++this.presentationEpoch;
      if (newPiece) this.animatePlacementCard(newPiece, token);
      else this.settlePlacementCard();
      this.updateTurnCopy();
    }

    private afterPlacement(): void {
      const match = this.match;
      if (!match) return;
      if (match.phase !== 'playing') {
        this.showRoundResult();
        return;
      }
      if (match.mode === 'santa' && match.turn === 'player-b') {
        this.scheduleSantaMove();
        return;
      }
      this.presentation = 'board';
      this.updateTurnCopy();
    }

    private scheduleSantaMove(): void {
      const match = this.match;
      if (!match || match.mode !== 'santa' || match.turn !== 'player-b') return;
      this.presentation = 'thinking';
      this.updateTurnCopy();
      const delay =
        this.difficulty === 'easy'
          ? context.random.int(420, 720)
          : this.difficulty === 'smart'
            ? context.random.int(480, 820)
            : context.random.int(550, 950);
      // Decide once, before the presentation delay. Pause and resize then
      // preserve this move instead of causing a second AI evaluation.
      const plannedMove = chooseSantaTicTacToeMove({
        board: match.board,
        difficulty: this.difficulty,
        random: context.random,
      });
      this.animateSantaThinking(delay);
      const token = ++this.presentationEpoch;
      const timer = this.time.delayedCall(delay, () => {
        if (token !== this.presentationEpoch || this.isPaused()) return;
        this.resetWorkshopLights();
        if (plannedMove !== null) this.commitMove('player-b', plannedMove);
      });
      this.scope.resource(timer);
    }

    private showRoundResult(): void {
      const match = this.match;
      if (!match) return;
      if (match.winningLine) {
        this.showWinningCelebration(match.winningLine);
        this.playSound(audioKeys.celebrate, 0.34);
        void context.haptics.impact('heavy').catch(() => undefined);
      } else {
        this.showDrawCelebration();
        void context.haptics.impact('medium').catch(() => undefined);
      }
      if (match.phase === 'match-complete') {
        this.presentation = 'match-result';
        this.matchComplete = true;
        this.configureMatchResultHero(match);
        this.statusText?.setText(this.matchResultCopy(match));
        this.coach?.setText('');
        this.replaceButtons([
          {
            label: 'Voltar ao início',
            fill: boardColors.pine,
            ornament: '↺',
            onPress: () => this.showMode(),
          },
        ]);
        this.layout(createViewportLayout(this.scale.gameSize.width, this.scale.gameSize.height));
        this.animateMatchResultHeroEntrance();
        context.run.complete();
        return;
      }
      this.presentation = 'round-result';
      this.statusText?.setText(this.roundResultCopy(match));
      this.coach?.setText('');
      this.replaceButtons([{ label: 'Próxima rodada', onPress: () => this.nextRound() }]);
      this.layout(createViewportLayout(this.scale.gameSize.width, this.scale.gameSize.height));
    }

    private nextRound(): void {
      if (!this.match || this.match.phase !== 'round-complete') return;
      this.clearWinningCelebration();
      this.match = startNextTicTacToeRound(this.match);
      this.presentation = 'board';
      this.boardInputUnlockAt = this.time.now + 140;
      this.replaceButtons([]);
      this.refreshBoard();
      this.layout(createViewportLayout(this.scale.gameSize.width, this.scale.gameSize.height));
      this.updateTurnCopy();
      if (this.match.mode === 'santa' && this.match.turn === 'player-b') this.scheduleSantaMove();
    }

    private refreshBoard(newPieceCell?: CellIndex): PieceView | undefined {
      if (!this.match) {
        this.clearPieces();
        return undefined;
      }
      let placed: PieceView | undefined;
      this.match.board.forEach((owner, index) => {
        const cell = index as CellIndex;
        const existing = this.pieces.get(cell);
        if (owner === null) {
          if (existing) this.removePiece(existing);
          this.setCellOccupied(cell, false);
          return;
        }
        this.setCellOccupied(cell, true);
        if (existing?.owner === owner) return;
        if (existing) this.removePiece(existing);
        const piece = this.createPiece(cell, owner);
        this.pieces.set(cell, piece);
        if (cell === newPieceCell) placed = piece;
      });
      this.updateScoreboard(this.match);
      if (this.boardLayout) this.layoutPieces(this.boardLayout);
      return placed;
    }

    private createPiece(cell: CellIndex, owner: PlayerId): PieceView {
      const localPhoto = owner === 'player-a' ? context.selectedPhoto : this.photoB;
      const usePhoto =
        owner === 'player-a' || (this.match?.mode === 'local' && localPhoto !== undefined);
      const isNoelSeal = owner === 'player-b' && this.match?.mode === 'santa';
      const plate = this.add
        .rectangle(
          0,
          0,
          1,
          1,
          isNoelSeal || owner === 'player-a' ? boardColors.cranberry : boardColors.pine,
          1,
        )
        .setStrokeStyle(2, boardColors.gold, 1)
        .setRounded(5)
        .setDepth(8);
      if (usePhoto && localPhoto) {
        const photo = this.add
          .image(0, 0, owner === 'player-a' ? photoATextureKey : photoBTextureKey)
          .setDepth(9);
        const piece: PieceView = {
          cell,
          owner,
          photo,
          photoDescriptor: asDescriptor(localPhoto),
          plate,
        };
        return piece;
      }
      const label = this.add
        .text(0, 0, isNoelSeal ? 'N' : 'NOEL', {
          color: textColors.snow,
          fontFamily: isNoelSeal ? 'Georgia, serif' : 'system-ui, sans-serif',
          fontSize: isNoelSeal ? '22px' : '14px',
          fontStyle: 'bold',
        })
        .setOrigin(0.5)
        .setDepth(9);
      const piece: PieceView = { cell, owner, label, plate };
      return piece;
    }

    private createPlacementCard(piece: PieceView): PlacementCardView {
      const isNoelSeal = piece.owner === 'player-b' && this.match?.mode === 'santa';
      const plate = this.add
        .rectangle(
          0,
          0,
          1,
          1,
          isNoelSeal || piece.owner === 'player-a' ? boardColors.cranberry : boardColors.pine,
          1,
        )
        .setStrokeStyle(2, boardColors.gold, 1)
        .setRounded(5)
        .setDepth(17);
      if (piece.photo && piece.photoDescriptor) {
        return {
          cell: piece.cell,
          owner: piece.owner,
          photo: this.add
            .image(0, 0, piece.owner === 'player-a' ? photoATextureKey : photoBTextureKey)
            .setDepth(18),
          photoDescriptor: piece.photoDescriptor,
          plate,
        };
      }
      return {
        cell: piece.cell,
        label: this.add
          .text(0, 0, isNoelSeal ? 'N' : 'NOEL', {
            color: textColors.snow,
            fontFamily: isNoelSeal ? 'Georgia, serif' : 'system-ui, sans-serif',
            fontSize: isNoelSeal ? '22px' : '14px',
            fontStyle: 'bold',
          })
          .setOrigin(0.5)
          .setDepth(18),
        owner: piece.owner,
        plate,
      };
    }

    private animatePlacementCard(piece: PieceView, token: number): void {
      const layout = this.boardLayout;
      const destination = layout?.cells[piece.cell];
      if (!layout || !destination) {
        context.run.interactionSettled();
        this.afterPlacement();
        return;
      }
      this.clearPlacementCard();
      this.setPieceVisible(piece, false);
      const dock = piece.owner === 'player-a' ? this.playerADock : this.playerBDock;
      const startSize = Math.max(34, Math.min(52, layout.dock.height - 10));
      const finalSize = layout.cellSize - 20;
      const flight = {
        size: startSize,
        x: dock?.identityFrame.x ?? dock?.surface.x ?? destination.x,
        y: dock?.identityFrame.y ?? dock?.surface.y ?? destination.y,
      };
      const card = this.createPlacementCard(piece);
      this.placementCard = card;
      this.placementFlight = flight;
      this.layoutPlacementCard(card, flight);

      const complete = (): void => {
        if (token !== this.presentationEpoch || this.placementCard !== card || this.isPaused())
          return;
        this.completePlacementCard(card);
      };
      const updateCard = (): void => this.layoutPlacementCard(card, flight);
      const reduced = this.prefersReducedMotion() || context.quality === 'LOW';
      if (reduced) {
        this.scope.resource(
          this.tweens.add({
            targets: flight,
            duration: 90,
            ease: 'Cubic.easeOut',
            size: finalSize,
            x: destination.x,
            y: destination.y,
            onComplete: complete,
            onUpdate: updateCard,
          }),
        );
        return;
      }
      const midpoint = {
        size: startSize + (finalSize - startSize) * 0.56,
        x: (flight.x + destination.x) / 2,
        y: Math.max(26, Math.min(flight.y, destination.y) - 28),
      };
      const descend = (): void => {
        if (token !== this.presentationEpoch || this.placementCard !== card || this.isPaused())
          return;
        this.scope.resource(
          this.tweens.add({
            targets: flight,
            duration: 155,
            ease: 'Cubic.easeIn',
            size: finalSize,
            x: destination.x,
            y: destination.y,
            onComplete: complete,
            onUpdate: updateCard,
          }),
        );
      };
      this.scope.resource(
        this.tweens.add({
          targets: flight,
          duration: 135,
          ease: 'Sine.easeOut',
          size: midpoint.size,
          x: midpoint.x,
          y: midpoint.y,
          onComplete: descend,
          onUpdate: updateCard,
        }),
      );
    }

    private layoutPlacementCard(
      card: PlacementCardView,
      flight: { readonly size: number; readonly x: number; readonly y: number },
    ): void {
      card.plate.setPosition(flight.x, flight.y).setSize(flight.size, flight.size);
      if (card.photo && card.photoDescriptor) {
        const surface = createPhotoSurface(card.photoDescriptor, {
          x: flight.x - flight.size * 0.43,
          y: flight.y - flight.size * 0.43,
          width: flight.size * 0.86,
          height: flight.size * 0.86,
        });
        card.photo
          .setPosition(
            surface.photo.x + surface.photo.width / 2,
            surface.photo.y + surface.photo.height / 2,
          )
          .setDisplaySize(surface.photo.width, surface.photo.height);
      }
      card.label?.setPosition(flight.x, flight.y).setFontSize(Math.max(13, flight.size * 0.36));
    }

    private completePlacementCard(card: PlacementCardView): void {
      if (this.placementCard !== card) return;
      this.destroyPlacementCard();
      const piece = this.pieces.get(card.cell);
      if (piece) this.setPieceVisible(piece, true);
      this.burstPlacementSparkles(card.cell);
      context.run.interactionSettled();
      this.afterPlacement();
    }

    private settlePlacementCard(): void {
      const card = this.placementCard;
      if (!card) return;
      this.presentationEpoch += 1;
      this.destroyPlacementCard();
      const piece = this.pieces.get(card.cell);
      if (piece) this.setPieceVisible(piece, true);
      if (this.presentation === 'placing') {
        context.run.interactionSettled();
        this.afterPlacement();
      }
    }

    private clearPlacementCard(): void {
      if (!this.placementCard) return;
      this.presentationEpoch += 1;
      this.destroyPlacementCard();
    }

    private destroyPlacementCard(): void {
      if (this.placementFlight) this.tweens.killTweensOf(this.placementFlight);
      this.placementFlight = undefined;
      const card = this.placementCard;
      this.placementCard = undefined;
      if (!card) return;
      card.plate.destroy();
      card.photo?.destroy();
      card.label?.destroy();
    }

    private layout(viewport: GameViewport): void {
      const layout = planTicTacToeBoardLayout(viewport, this.layoutState());
      this.boardLayout = layout;
      this.background?.setSize(viewport.width, viewport.height);
      this.layoutWorkshopBackdrop(viewport);
      const returnable = this.canReturnToMode();
      // The active board owns the header's right side with the sound and pause
      // controls. Keep the game signature deliberately compact there rather than
      // allowing a long title to slide beneath either control.
      const compactBoardHeader = this.shouldShowPauseControl();
      this.titleText
        ?.setText(returnable || compactBoardHeader ? 'TRINCA' : 'TRINCA DE NATAL')
        .setFontSize(returnable || compactBoardHeader ? '16px' : '20px')
        .setOrigin(compactBoardHeader ? 0 : 0.5);
      this.titleText?.setPosition(
        ...(compactBoardHeader
          ? ([layout.back.x + 4, layout.title.y + layout.title.height / 2] as const)
          : ticTacToeRectCenter(layout.title)),
      );
      const scoreBelongsToMatch =
        this.match !== undefined &&
        (this.presentation === 'board' ||
          this.presentation === 'placing' ||
          this.presentation === 'thinking' ||
          this.presentation === 'round-result' ||
          this.presentation === 'match-result');
      const heroOwnsNarrative = this.presentation === 'match-result';
      this.scoreText
        ?.setPosition(...ticTacToeRectCenter(layout.score))
        .setVisible(!scoreBelongsToMatch);
      this.layoutScoreboard(layout, scoreBelongsToMatch);
      this.statusText
        ?.setPosition(...ticTacToeRectCenter(layout.status))
        .setVisible(!heroOwnsNarrative);
      this.coach?.setPosition(...ticTacToeRectCenter(layout.coach));
      this.statusSurface
        ?.setPosition(...ticTacToeRectCenter(layout.status))
        .setSize(layout.status.width, layout.status.height)
        .setVisible(!heroOwnsNarrative);
      this.pauseSurface
        ?.setPosition(...ticTacToeRectCenter(layout.pause))
        .setSize(layout.pause.width, layout.pause.height);
      this.pauseLabel?.setPosition(...ticTacToeRectCenter(layout.pause));
      this.pauseZone
        ?.setPosition(...ticTacToeRectCenter(layout.pause))
        .setSize(layout.pause.width, layout.pause.height);
      const showPauseControl = this.shouldShowPauseControl();
      this.pauseSurface?.setVisible(showPauseControl);
      this.pauseLabel?.setVisible(showPauseControl);
      this.pauseZone?.setVisible(showPauseControl);
      if (showPauseControl) this.pauseZone?.setInteractive({ useHandCursor: true });
      else this.pauseZone?.disableInteractive();
      if (this.audioButton) {
        this.setButtonBounds(this.audioButton, {
          x: layout.pause.x - 70,
          y: layout.pause.y,
          width: 62,
          height: layout.pause.height,
        });
        this.setButtonVisible(this.audioButton, showPauseControl);
      }
      if (this.backButton) {
        this.setButtonBounds(this.backButton, layout.back);
        this.setButtonVisible(this.backButton, returnable);
      }
      this.layoutSelectionPhoto(layout);
      this.layoutMatchResultHero(layout, viewport);
      this.layoutPickerCards(layout);
      this.pauseCover?.setSize(viewport.width, viewport.height);
      this.pauseCoverZone?.setSize(viewport.width, viewport.height);
      this.layoutPauseOverlay(viewport);
      this.layoutBoardSurface(layout);
      this.layoutCells(layout);
      this.layoutPieces(layout);
      this.layoutPlayerDocks(layout);
      this.layoutButtons(layout, viewport);
    }

    private layoutState(): 'setup' | 'setup-with-back' | 'board' | 'round-result' | 'match-result' {
      if (this.presentation === 'round-result') return 'round-result';
      if (this.presentation === 'match-result') return 'match-result';
      return this.presentation === 'board' ||
        this.presentation === 'placing' ||
        this.presentation === 'thinking'
        ? 'board'
        : this.canReturnToMode()
          ? 'setup-with-back'
          : 'setup';
    }

    private layoutCells(layout: TicTacToeBoardLayout): void {
      const visible = this.presentation !== 'match-result';
      for (const placement of layout.cells) {
        const view = this.cells[placement.cell];
        if (!view) continue;
        view.shadow
          .setPosition(placement.x + 3, placement.y + 5)
          .setSize(layout.cellSize, layout.cellSize);
        view.frame.setPosition(placement.x, placement.y).setSize(layout.cellSize, layout.cellSize);
        view.bevel
          .setPosition(placement.x, placement.y)
          .setSize(layout.cellSize - 6, layout.cellSize - 6);
        view.inner
          .setPosition(placement.x, placement.y)
          .setSize(layout.cellSize - 12, layout.cellSize - 12);
        const inset = Math.max(8, layout.cellSize * 0.18);
        const cornerSize = Math.max(4, Math.round(layout.cellSize * 0.06));
        const offsets = [
          [-1, -1],
          [1, -1],
          [-1, 1],
          [1, 1],
        ] as const;
        view.corners.forEach((corner, index) => {
          const offset = offsets[index];
          if (!offset) return;
          corner
            .setPosition(
              placement.x + offset[0] * (layout.cellSize / 2 - inset),
              placement.y + offset[1] * (layout.cellSize / 2 - inset),
            )
            .setSize(cornerSize, cornerSize);
        });
        view.zone.setPosition(placement.x, placement.y).setSize(layout.cellSize, layout.cellSize);
        [view.shadow, view.frame, view.bevel, view.inner, ...view.corners].forEach((target) =>
          target.setVisible(visible),
        );
        view.zone.setVisible(visible);
        if (visible) view.zone.setInteractive({ useHandCursor: true });
        else view.zone.disableInteractive();
      }
    }

    private layoutBoardSurface(layout: TicTacToeBoardLayout): void {
      const visible = this.cells.length > 0 && this.presentation !== 'match-result';
      const center = ticTacToeRectCenter(layout.board);
      const outerWidth = layout.board.width + 18;
      const outerHeight = layout.board.height + 18;
      this.boardShadow
        ?.setPosition(center[0] + 4, center[1] + 6)
        .setSize(outerWidth, outerHeight)
        .setVisible(visible);
      this.boardSurface
        ?.setPosition(...center)
        .setSize(outerWidth, outerHeight)
        .setVisible(visible);
      this.boardInset
        ?.setPosition(...center)
        .setSize(layout.board.width + 6, layout.board.height + 6)
        .setVisible(visible);
      // The line itself communicates the win. LOW and reduced motion remove
      // the decorative animation, never this static, photo-safe landmark.
      const showGarland = visible && Boolean(this.match?.winningLine);
      const garlandWidth = outerWidth + 14;
      this.boardGarland
        ?.setPosition(center[0], layout.board.y - 8)
        .setDisplaySize(garlandWidth, Math.min(28, Math.max(18, layout.gap * 2.4)))
        .setAlpha(context.quality === 'LOW' || this.prefersReducedMotion() ? 0.58 : 0.78)
        .setVisible(false);
      this.layoutWinningGarland(layout, showGarland);
    }

    /**
     * The win line is a tiny physical cord above the three selected frames.
     * It never lies over a photo; the result still reads in LOW because this
     * is a static landmark rather than an animated post-effect.
     */
    private layoutWinningGarland(layout: TicTacToeBoardLayout, visible: boolean): void {
      const line = this.match?.winningLine;
      const wire = this.winningGarlandWire;
      if (!wire || !visible || !line) {
        wire?.setVisible(false);
        this.winningGarlandBulbs.forEach((bulb) => bulb.setVisible(false));
        return;
      }
      const [firstCell, middleCell, lastCell] = line;
      const first = layout.cells[firstCell];
      const middle = layout.cells[middleCell];
      const last = layout.cells[lastCell];
      if (!first || !middle || !last) return;
      const sameRow = first.y === middle.y && middle.y === last.y;
      const sameColumn = first.x === middle.x && middle.x === last.x;
      if (!sameRow && !sameColumn) {
        // Diagonals retain the gold frame celebration without a straight wire
        // cutting across a face. The full wire is intentionally reserved for
        // the photo-safe horizontal and vertical gutters.
        wire.setVisible(false);
        this.winningGarlandBulbs.forEach((bulb) => bulb.setVisible(false));
        return;
      }
      const inset = layout.cellSize / 2 - 6;
      const start = sameRow
        ? { x: first.x - inset, y: first.y - layout.cellSize / 2 + 6 }
        : { x: first.x - layout.cellSize / 2 + 6, y: first.y - inset };
      const end = sameRow
        ? { x: last.x + inset, y: last.y - layout.cellSize / 2 + 6 }
        : { x: last.x - layout.cellSize / 2 + 6, y: last.y + inset };
      const wireLength = sameRow ? Math.abs(end.x - start.x) : Math.abs(end.y - start.y);
      wire
        .setPosition((start.x + end.x) / 2, (start.y + end.y) / 2)
        .setSize(sameRow ? wireLength : 3, sameRow ? 3 : wireLength)
        .setVisible(true);
      this.winningGarlandBulbs.forEach((bulb, index) => {
        const progress = (index + 0.5) / this.winningGarlandBulbs.length;
        bulb
          .setPosition(
            start.x + (end.x - start.x) * progress,
            start.y + (end.y - start.y) * progress,
          )
          .setVisible(true);
      });
    }

    private layoutWorkshopBackdrop(viewport: GameViewport): void {
      if (this.workshopBackdrop) {
        const backdropFrame = this.textures.get(workshopBackgroundTextureKey).get();
        const backdropScale = Math.max(
          viewport.width / backdropFrame.width,
          viewport.height / backdropFrame.height,
        );
        this.workshopBackdrop
          .setPosition(viewport.width / 2, viewport.height / 2)
          .setScale(backdropScale);
      }
      const railY = Math.max(136, Math.round(viewport.height * 0.2));
      this.workshopFelt?.setPosition(viewport.width / 2, railY / 2).setSize(viewport.width, railY);
      this.workshopWood
        ?.setPosition(viewport.width / 2, railY + (viewport.height - railY) / 2)
        .setSize(viewport.width, viewport.height - railY);
      this.workshopRail?.setPosition(viewport.width / 2, railY).setSize(viewport.width, 3);
      const sideInset = Math.max(10, Math.round(viewport.width * 0.035));
      const positions = [
        [sideInset, railY + 26],
        [viewport.width - sideInset, railY + 58],
        [sideInset, railY + 148],
        [viewport.width - sideInset, railY + 205],
        [sideInset, viewport.height - 174],
        [viewport.width - sideInset, viewport.height - 142],
        [sideInset, viewport.height - 72],
        [viewport.width - sideInset, viewport.height - 50],
      ] as const;
      this.workshopLights.forEach((light, index) => {
        const position = positions[index];
        if (!position) return;
        light.setPosition(position[0], Math.max(railY + 16, position[1]));
      });
    }

    private animateSantaThinking(delay: number): void {
      this.resetWorkshopLights();
      if (context.quality === 'LOW' || this.prefersReducedMotion()) return;
      this.workshopLights.slice(0, 3).forEach((light, index) => {
        this.scope.resource(
          this.tweens.add({
            targets: light,
            alpha: 1,
            delay: index * 110,
            duration: Math.min(160, Math.max(100, delay / 5)),
            ease: 'Sine.easeInOut',
            repeat: 1,
            scale: 1.16,
            yoyo: true,
          }),
        );
      });
    }

    private resetWorkshopLights(): void {
      this.workshopLights.forEach((light) => light.setAlpha(0.84).setScale(1));
    }

    private layoutPieces(layout: TicTacToeBoardLayout): void {
      const visible = this.presentation !== 'match-result';
      for (const piece of this.pieces.values()) {
        const placement = layout.cells[piece.cell];
        if (!placement) continue;
        const frameSize = layout.cellSize - 20;
        piece.plate.setPosition(placement.x, placement.y).setSize(frameSize, frameSize);
        if (piece.photo && piece.photoDescriptor) {
          const surface = createPhotoSurface(piece.photoDescriptor, {
            x: placement.x - frameSize * 0.43,
            y: placement.y - frameSize * 0.43,
            width: frameSize * 0.86,
            height: frameSize * 0.86,
          });
          piece.photo
            .setPosition(
              surface.photo.x + surface.photo.width / 2,
              surface.photo.y + surface.photo.height / 2,
            )
            .setDisplaySize(surface.photo.width, surface.photo.height);
        }
        piece.label
          ?.setPosition(placement.x, placement.y)
          .setFontSize(Math.max(18, frameSize * 0.34));
        this.pieceTargets(piece).forEach((target) => target.setVisible(visible));
      }
    }

    private layoutPlayerDocks(layout: TicTacToeBoardLayout): void {
      const match = this.match;
      const visible =
        match !== undefined &&
        (this.presentation === 'board' ||
          this.presentation === 'placing' ||
          this.presentation === 'thinking');
      this.setPlayerDocksVisible(visible);
      if (!visible || !match || !this.playerADock || !this.playerBDock) return;
      const gap = 8;
      const width = (layout.dock.width - gap) / 2;
      const aActive = match.turn === 'player-a';
      const bActive = !aActive;
      const playerALabel = match.mode === 'santa' ? 'Sua lembrança' : '1ª lembrança';
      const playerBLabel = match.mode === 'santa' ? 'Papai Noel' : '2ª lembrança';
      this.setPlayerDockBounds(
        this.playerADock,
        { x: layout.dock.x, y: layout.dock.y, width, height: layout.dock.height },
        context.selectedPhoto,
        playerALabel,
        aActive ? 'Sua vez' : 'Aguardando',
        aActive,
      );
      this.setPlayerDockBounds(
        this.playerBDock,
        {
          x: layout.dock.x + width + gap,
          y: layout.dock.y,
          width,
          height: layout.dock.height,
        },
        match.mode === 'local' ? this.photoB : undefined,
        playerBLabel,
        bActive ? (match.mode === 'santa' ? 'Vez do Noel' : 'Sua vez') : 'Aguardando',
        bActive,
      );
      if (this.dockActivePlayer !== match.turn) {
        this.dockActivePlayer = match.turn;
        this.pulseActiveDock(aActive ? this.playerADock : this.playerBDock);
      }
    }

    private pulseActiveDock(dock: PlayerDockView): void {
      if (this.prefersReducedMotion()) return;
      dock.rim.setScale(0.94);
      this.scope.resource(
        this.tweens.add({
          targets: dock.rim,
          duration: 180,
          ease: 'Quad.easeOut',
          scale: 1,
        }),
      );
    }

    private setPlayerDockBounds(
      dock: PlayerDockView,
      area: TicTacToeRect,
      photo: Photo | undefined,
      title: string,
      detail: string,
      active: boolean,
    ): void {
      const center = ticTacToeRectCenter(area);
      dock.surface
        .setPosition(...center)
        .setSize(area.width, area.height)
        .setAlpha(active ? 1 : 0.72);
      dock.rim
        .setPosition(...center)
        .setSize(area.width + 4, area.height + 4)
        .setStrokeStyle(2, boardColors.gold, active ? 1 : 0.18);
      const identitySize = Math.max(32, Math.min(42, area.height - 14));
      const identityCenterX = area.x + 8 + identitySize / 2;
      dock.identityMatte
        .setPosition(identityCenterX, center[1])
        .setSize(identitySize, identitySize)
        .setFillStyle(
          photo === undefined && title === 'Papai Noel'
            ? boardColors.cranberry
            : boardColors.pineDark,
        )
        .setAlpha(active ? 1 : 0.82);
      dock.identityFrame
        .setPosition(identityCenterX, center[1])
        .setSize(identitySize + 3, identitySize + 3)
        .setAlpha(active ? 1 : 0.74);
      this.layoutPlayerDockPhoto(dock, photo, identityCenterX, center[1], identitySize);
      dock.photo?.setAlpha(active ? 1 : 0.72);
      dock.badge
        .setPosition(identityCenterX, center[1])
        .setFontSize(Math.max(14, identitySize * 0.46))
        // A photo dock already communicates its owner through the framed
        // memory. Keeping a glyph above it made the real thumbnail resemble a
        // placeholder; the Noel seal remains visible because it has no photo.
        .setVisible(photo === undefined)
        .setAlpha(active ? 1 : 0.7);
      dock.title
        .setPosition(area.x + identitySize + 16, center[1] - 10)
        .setText(title)
        .setAlpha(active ? 1 : 0.7);
      dock.detail
        .setPosition(area.x + identitySize + 16, center[1] + 10)
        .setText(detail)
        .setAlpha(active ? 1 : 0.58);
    }

    private layoutPlayerDockPhoto(
      dock: PlayerDockView,
      photo: Photo | undefined,
      x: number,
      y: number,
      size: number,
    ): void {
      if (!photo) {
        dock.photo?.setVisible(false);
        dock.photoDescriptor = undefined;
        return;
      }
      const textureKey =
        photo.id === context.selectedPhoto.id ? photoATextureKey : photoBTextureKey;
      if (!dock.photo && this.textures.exists(textureKey)) {
        dock.photo = this.add.image(0, 0, textureKey).setDepth(17);
      }
      if (!dock.photo) return;
      dock.photoDescriptor = asDescriptor(photo);
      const surface = createPhotoSurface(dock.photoDescriptor, {
        x: x - size * 0.4,
        y: y - size * 0.4,
        width: size * 0.8,
        height: size * 0.8,
      });
      dock.photo
        .setVisible(true)
        .setPosition(
          surface.photo.x + surface.photo.width / 2,
          surface.photo.y + surface.photo.height / 2,
        )
        .setDisplaySize(surface.photo.width, surface.photo.height);
    }

    private setPlayerDocksVisible(visible: boolean): void {
      [this.playerADock, this.playerBDock].forEach((dock) => {
        dock?.surface.setVisible(visible);
        dock?.rim.setVisible(visible);
        dock?.identityMatte.setVisible(visible);
        dock?.identityFrame.setVisible(visible);
        dock?.photo?.setVisible(visible);
        dock?.badge.setVisible(visible);
        dock?.title.setVisible(visible);
        dock?.detail.setVisible(visible);
      });
    }

    private layoutSelectionPhoto(layout: TicTacToeBoardLayout): void {
      const frame = this.selectionPhotoFrame;
      const isVisible = this.presentation === 'mode' || this.presentation === 'difficulty';
      this.setSelectionPhotoVisible(isVisible);
      if (!frame || !isVisible) return;

      const area = layout.selectionPhoto;
      const center = ticTacToeRectCenter(area);
      const artRatio = 512 / 646;
      const framedWidth = Math.min(area.width, area.height * artRatio);
      const framedHeight = framedWidth / artRatio;
      const framedArea = {
        x: center[0] - framedWidth / 2,
        y: center[1] - framedHeight / 2,
        width: framedWidth,
        height: framedHeight,
      };
      const photoArea = {
        x: framedArea.x + framedArea.width * 0.18,
        y: framedArea.y + framedArea.height * 0.17,
        width: Math.max(1, framedArea.width * 0.64),
        height: Math.max(1, framedArea.height * 0.65),
      };
      const surface = createPhotoSurface(asDescriptor(context.selectedPhoto), photoArea);
      frame.contactShadow
        .setPosition(center[0] + 3, center[1] + 5)
        .setSize(framedArea.width, framedArea.height);
      frame.frameOuter.setPosition(...center).setSize(framedArea.width, framedArea.height);
      frame.bevel.setPosition(...center).setSize(framedArea.width - 8, framedArea.height - 8);
      frame.matte.setPosition(...center).setSize(framedArea.width - 16, framedArea.height - 24);
      frame.photo
        .setPosition(
          surface.photo.x + surface.photo.width / 2,
          surface.photo.y + surface.photo.height / 2,
        )
        .setDisplaySize(surface.photo.width, surface.photo.height);
      frame.innerEdge
        .setPosition(photoArea.x + photoArea.width / 2, photoArea.y + photoArea.height / 2)
        .setSize(photoArea.width, photoArea.height);
      frame.art?.setPosition(...center).setDisplaySize(framedArea.width, framedArea.height);
      frame.label.setPosition(center[0], framedArea.y + framedArea.height - 13);
      frame.badge.setPosition(framedArea.x + framedArea.width - 7, framedArea.y + 9);
    }

    private configureMatchResultHero(match: TicTacToeMatch): void {
      const hero = this.matchResultHero;
      if (!hero) return;
      const winner = match.matchWinner;
      const winnerPhoto =
        winner === 'player-a'
          ? context.selectedPhoto
          : match.mode === 'local' && winner === 'player-b'
            ? this.photoB
            : undefined;
      hero.photoDescriptor = winnerPhoto ? asDescriptor(winnerPhoto) : undefined;
      if (winnerPhoto) {
        hero.photo.setTexture(
          winnerPhoto.id === context.selectedPhoto.id ? photoATextureKey : photoBTextureKey,
        );
      }
      const noelWon = match.mode === 'santa' && winner === 'player-b';
      hero.title.setText(winner === null ? 'EMPATE DE NATAL!' : 'TRINCA DE NATAL!');
      hero.bannerText.setText(
        winner === null
          ? 'Memórias pareadas!'
          : noelWon
            ? 'O Noel venceu desta vez!'
            : winner === 'player-b'
              ? 'A segunda lembrança venceu!'
              : 'Sua lembrança venceu!',
      );
      hero.crestMark.setText(noelWon ? 'N' : winner === null ? '=' : '✦');
      hero.label.setText(winner === null ? (match.mode === 'local' ? 'A  =  B' : '✦') : 'NOEL');
      this.setMatchResultHeroVisible(true);
    }

    private layoutMatchResultHero(layout: TicTacToeBoardLayout, viewport: GameViewport): void {
      const hero = this.matchResultHero;
      const visible = this.presentation === 'match-result';
      this.setMatchResultHeroVisible(visible);
      if (!hero || !visible) return;
      // The finale needs to read as the family's framed memory, not as a
      // status badge floating in a large empty workshop. Reserve the bottom
      // lane for its only action, then let the frame occupy the rest of the
      // mural's quiet area. This still contracts on a short viewport instead
      // of competing with the button.
      const availableHeight = Math.max(150, layout.actionArea.height - 78);
      const height = Math.min(328, Math.max(150, availableHeight));
      const width = Math.min(
        layout.actionArea.width - 24,
        Math.max(236, Math.min(342, height * 1.02)),
      );
      const centerX = viewport.width / 2;
      const centerY = layout.actionArea.y + height / 2 + 6;
      hero.shadow.setPosition(centerX + 4, centerY + 6).setSize(width, height);
      hero.frame.setPosition(centerX, centerY).setSize(width, height);
      hero.innerFrame.setPosition(centerX, centerY).setSize(width - 12, height - 12);
      const compactHero = height < 230;
      const crestRadius = compactHero ? 13 : 20;
      const photoArea = {
        x: centerX - width * 0.36,
        y: centerY - height / 2 + 38,
        width: width * 0.72,
        // Preserve a quiet lane for the seal and result ribbon. The photo
        // still receives the largest continuous surface of the finale.
        height: height - (compactHero ? 102 : 124),
      };
      hero.matte
        .setPosition(photoArea.x + photoArea.width / 2, photoArea.y + photoArea.height / 2)
        .setSize(photoArea.width + 8, photoArea.height + 8);
      if (hero.photoDescriptor) {
        const surface = createPhotoSurface(hero.photoDescriptor, photoArea);
        hero.photo
          .setPosition(
            surface.photo.x + surface.photo.width / 2,
            surface.photo.y + surface.photo.height / 2,
          )
          .setDisplaySize(surface.photo.width, surface.photo.height)
          .setVisible(true);
        hero.label.setVisible(false);
      } else {
        hero.photo.setVisible(false);
        hero.label.setPosition(centerX, centerY - 4).setVisible(true);
      }
      hero.title
        .setPosition(centerX, centerY - height / 2 + 19)
        .setFontSize(height >= 230 ? '21px' : '18px');
      const crestY = photoArea.y + photoArea.height + crestRadius + (compactHero ? 3 : 4);
      hero.crestBack.setPosition(centerX, crestY).setRadius(crestRadius);
      hero.crestRing.setPosition(centerX, crestY).setRadius(Math.max(8, crestRadius - 5));
      hero.crestMark.setPosition(centerX, crestY - 0.5).setFontSize(compactHero ? '11px' : '16px');
      hero.banner
        .setPosition(centerX, centerY + height / 2 - 22)
        .setSize(Math.min(width - 24, 238), 31);
      hero.bannerText
        .setPosition(centerX, centerY + height / 2 - 22)
        .setFontSize(height >= 230 ? '14px' : '12px');
      hero.leftOrnament.setPosition(centerX - width / 2 + 19, centerY - height / 2 + 19);
      hero.rightOrnament.setPosition(centerX + width / 2 - 19, centerY - height / 2 + 19);
    }

    private setMatchResultHeroVisible(visible: boolean): void {
      const hero = this.matchResultHero;
      if (!hero) return;
      [
        hero.banner,
        hero.bannerText,
        hero.crestBack,
        hero.crestMark,
        hero.crestRing,
        hero.frame,
        hero.innerFrame,
        hero.leftOrnament,
        hero.matte,
        hero.rightOrnament,
        hero.shadow,
        hero.title,
      ].forEach((target) => target.setVisible(visible));
      hero.photo.setVisible(visible && hero.photoDescriptor !== undefined);
      hero.label.setVisible(visible && hero.photoDescriptor === undefined);
    }

    private animateMatchResultHeroEntrance(): void {
      const hero = this.matchResultHero;
      if (!hero || this.prefersReducedMotion() || context.quality === 'LOW') return;
      const targets = [
        hero.banner,
        hero.bannerText,
        hero.crestBack,
        hero.crestMark,
        hero.crestRing,
        hero.frame,
        hero.innerFrame,
        hero.label,
        hero.leftOrnament,
        hero.matte,
        hero.rightOrnament,
        hero.shadow,
        hero.title,
      ];
      targets.forEach((target) => target.setAlpha(0).setScale(0.96));
      // `photo` has a proportional `displaySize`; scaling it here would reset
      // that size to the texture's native dimensions. The photo fades in on
      // its own while only the surrounding material gets the entrance scale.
      hero.photo.setAlpha(0);
      this.scope.resource(
        this.tweens.add({
          targets,
          alpha: 1,
          duration: 240,
          ease: 'Quad.easeOut',
          scale: 1,
        }),
      );
      this.scope.resource(
        this.tweens.add({
          targets: hero.photo,
          alpha: 1,
          duration: 200,
          ease: 'Quad.easeOut',
        }),
      );
    }

    private layoutPickerCards(layout: TicTacToeBoardLayout): void {
      if (this.presentation !== 'photo-picker' || this.pickerCards.length === 0) return;
      const columns = 3;
      const gap = 8;
      // Keep these as tangible portrait cards on a wide browser as well as on
      // a phone. Filling all available desktop width would turn a vertical
      // family photo into a tiny stamp inside an overgrown white rectangle.
      const width = Math.min(148, (layout.actionArea.width - gap * (columns - 1)) / columns);
      const rows = Math.ceil(this.pickerCards.length / columns);
      const paginationHeight = this.buttons.length > 0 ? 64 : 0;
      const gridAreaHeight = Math.max(112, layout.actionArea.height - paginationHeight);
      const portraitHeight = Math.min(156, Math.max(104, width * 1.24));
      const availableCardHeight = (gridAreaHeight - gap * (rows - 1)) / rows;
      // The page controls own their 64px lane. On a short display, preserve
      // that lane and shrink the card instead of allowing it to overlap a
      // photo in the second row.
      const height = Math.max(88, Math.min(portraitHeight, availableCardHeight));
      const gridHeight = rows * height + (rows - 1) * gap;
      const startY = layout.actionArea.y + Math.max(8, (gridAreaHeight - gridHeight) * 0.18);
      const gridWidth = columns * width + (columns - 1) * gap;
      const startX = layout.actionArea.x + (layout.actionArea.width - gridWidth) / 2;
      this.pickerCards.forEach((card, index) => {
        const column = index % columns;
        const row = Math.floor(index / columns);
        const x = startX + column * (width + gap);
        const y = startY + row * (height + gap);
        const centerX = x + width / 2;
        const centerY = y + height / 2;
        card.shadow.setPosition(centerX + 2, centerY + 4).setSize(width, height);
        card.surface.setPosition(centerX, centerY).setSize(width, height);
        card.frame.setPosition(centerX, centerY - 3).setSize(width - 12, height - 18);
        const photoFrame = {
          x: x + 10,
          y: y + 8,
          width: width - 20,
          height: height - 28,
        };
        const surface = createPhotoSurface(card.photoDescriptor, photoFrame);
        card.photo
          ?.setPosition(
            surface.photo.x + surface.photo.width / 2,
            surface.photo.y + surface.photo.height / 2,
          )
          .setDisplaySize(surface.photo.width, surface.photo.height);
        card.badge.setPosition(x + width - 11, y + height - 11);
        card.zone.setPosition(centerX, centerY).setSize(width, height);
      });
    }

    private setPickerCardPressed(card: PickerCardView, pressed: boolean): void {
      if (card.pressed === pressed) return;
      card.pressed = pressed;
      const scale = pressed ? 0.97 : 1;
      card.shadow.setScale(scale);
      card.surface.setScale(scale);
      card.frame.setScale(scale);
      card.badge.setScale(scale);
      card.photo?.setAlpha(pressed ? 0.9 : 1);
    }

    private setSelectionPhotoVisible(visible: boolean): void {
      const frame = this.selectionPhotoFrame;
      if (!frame) return;
      frame.contactShadow.setVisible(visible);
      frame.frameOuter.setVisible(visible);
      frame.bevel.setVisible(visible);
      frame.matte.setVisible(visible);
      frame.photo.setVisible(visible);
      frame.innerEdge.setVisible(visible);
      frame.art?.setVisible(visible);
      frame.label.setVisible(visible);
      frame.badge.setVisible(visible);
    }

    private animateSelectionEntrance(): void {
      if (this.prefersReducedMotion()) return;
      const frame = this.selectionPhotoFrame;
      if (frame) {
        const frameTargets = [
          frame.contactShadow,
          frame.frameOuter,
          frame.bevel,
          frame.matte,
          frame.innerEdge,
          frame.label,
          frame.badge,
        ];
        frameTargets.forEach((target) => target.setAlpha(0).setScale(0.96));
        frame.photo.setAlpha(0);
        frame.art?.setAlpha(0);
        this.scope.resource(
          this.tweens.add({
            targets: frameTargets,
            alpha: 1,
            duration: 210,
            ease: 'Quad.easeOut',
            scale: 1,
          }),
        );
        this.scope.resource(
          this.tweens.add({
            targets: [frame.photo, ...(frame.art ? [frame.art] : [])],
            alpha: 1,
            duration: 180,
            ease: 'Quad.easeOut',
          }),
        );
      }
      this.buttons.forEach((button, index) => {
        const targets = this.buttonVisuals(button);
        targets.forEach((target) => target.setAlpha(0).setScale(0.97));
        this.scope.resource(
          this.tweens.add({
            targets,
            alpha: 1,
            delay: 70 + index * 54,
            duration: 170,
            ease: 'Quad.easeOut',
            scale: 1,
          }),
        );
      });
    }

    private layoutButtons(layout: TicTacToeBoardLayout, viewport: GameViewport): void {
      const count = this.buttons.length;
      if (count === 0) return;
      if (this.presentation === 'photo-picker') {
        const gap = 12;
        const width = Math.min(148, (layout.actionArea.width - gap) / 2);
        const centerY = layout.actionArea.y + layout.actionArea.height - 26;
        this.buttons.forEach((button, index) => {
          const centerX =
            viewport.width / 2 + (index === 0 ? -(width + gap) / 2 : (width + gap) / 2);
          this.setButtonBounds(button, {
            x: centerX - width / 2,
            y: centerY - 22,
            width,
            height: 44,
          });
        });
        return;
      }
      if (this.presentation === 'match-result') {
        const width = Math.min(248, viewport.width - 48);
        this.buttons.forEach((button, index) => {
          this.setButtonBounds(button, {
            x: viewport.width / 2 - width / 2,
            y: layout.actionArea.y + layout.actionArea.height - 52 - index * 56,
            width,
            height: 48,
          });
        });
        return;
      }
      const modeCards = this.presentation === 'mode';
      const columns = modeCards && count === 2 ? 2 : count > 3 ? 2 : 1;
      const width =
        columns === 1 ? Math.min(292, viewport.width - 48) : Math.min(154, viewport.width / 2 - 26);
      const gap = 12;
      const rows = Math.ceil(count / columns);
      const hasDetails = this.buttons.some((button) => button.detail !== undefined);
      const buttonHeight = modeCards ? 164 : hasDetails ? 60 : 52;
      const rowStep = buttonHeight + 12;
      const startX = viewport.width / 2 - ((columns - 1) * (width + gap)) / 2;
      const maxBaseY =
        layout.actionArea.y +
        layout.actionArea.height -
        (rows - 1) * rowStep -
        buttonHeight / 2 -
        2;
      const preferredBaseY = hasDetails
        ? Math.max(
            layout.selectionPhoto.y + layout.selectionPhoto.height + 54,
            layout.actionArea.y + layout.actionArea.height * (modeCards ? 0.67 : 0.52),
          )
        : layout.actionArea.y + layout.actionArea.height * 0.62;
      const baseY =
        this.presentation === 'round-result'
          ? layout.dock.y + layout.dock.height / 2
          : Math.min(preferredBaseY, maxBaseY);
      for (const [index, button] of this.buttons.entries()) {
        const column = index % columns;
        const row = Math.floor(index / columns);
        const x = startX + column * (width + gap);
        const y = baseY + row * rowStep;
        this.setButtonBounds(button, {
          x: x - width / 2,
          y: y - buttonHeight / 2,
          width,
          height: buttonHeight,
        });
      }
    }

    private replaceButtons(options: readonly ButtonOption[]): void {
      while (this.buttons.length > 0) {
        const button = this.buttons.pop();
        this.destroyButton(button);
      }
      for (const option of options) {
        this.buttons.push(
          this.createButton(
            option.label,
            option.onPress,
            15,
            option.fill,
            option.detail,
            option.ornament,
          ),
        );
      }
    }

    private createButton(
      label: string,
      onPress: () => void,
      depth: number,
      fill: number = boardColors.cranberry,
      detail?: string,
      ornament?: string,
    ): ButtonView {
      const shadow = this.add
        .rectangle(0, 0, 1, 1, boardColors.pineDark, 0.7)
        .setRounded(10)
        .setDepth(depth - 2);
      const glow = this.add
        .rectangle(0, 0, 1, 1, boardColors.gold, 0)
        .setRounded(12)
        .setDepth(depth - 1);
      const surface = this.add
        .rectangle(0, 0, 1, 1, fill, 1)
        .setRounded(10)
        .setStrokeStyle(2, boardColors.gold, 0.95)
        .setDepth(depth);
      const inner = this.add
        .rectangle(0, 0, 1, 1, fill, 0.36)
        .setRounded(7)
        .setStrokeStyle(1, boardColors.gold, 0.34)
        .setDepth(depth + 0.5);
      const text = this.add
        .text(0, 0, label, {
          align: 'center',
          color: textColors.snow,
          fontFamily: 'system-ui, sans-serif',
          fontSize: '15px',
          fontStyle: 'bold',
          wordWrap: { width: 208 },
        })
        .setOrigin(0.5)
        .setDepth(depth + 1);
      const detailText = detail
        ? this.add
            .text(0, 0, detail, {
              align: 'center',
              color: textColors.gold,
              fontFamily: 'system-ui, sans-serif',
              fontSize: '10px',
              fontStyle: 'bold',
              wordWrap: { width: 208 },
            })
            .setOrigin(0.5)
            .setDepth(depth + 1)
        : undefined;
      const ornamentText = ornament
        ? this.add
            .text(0, 0, ornament, {
              color: textColors.gold,
              fontFamily: 'system-ui, sans-serif',
              fontSize: '17px',
              fontStyle: 'bold',
            })
            .setOrigin(0.5)
            .setDepth(depth + 1)
        : undefined;
      const zone = this.add
        .zone(0, 0, 1, 1)
        .setDepth(depth + 2)
        .setInteractive({ useHandCursor: true });
      const button: ButtonView = {
        detail: detailText,
        enabled: true,
        fill,
        glow,
        inner,
        label: text,
        ornament: ornamentText,
        pressed: false,
        shadow,
        surface,
        zone,
      };
      attachCrystalControl({
        target: surface,
        gesture: zone,
        graphics: this.scope.resource(this.add.graphics().setDepth(depth + 0.7)),
        ...(label === 'Som'
          ? {
              label: text,
              icon: () => (this.audioEnabled ? ('sound' as const) : ('muted' as const)),
            }
          : {}),
        events: this.events,
        scope: this.scope,
        reducedMotion: this.prefersReducedMotion(),
        ruby: fill === boardColors.cranberry,
      });
      zone.on(Phaser.Input.Events.GAMEOBJECT_POINTER_DOWN, () => {
        if (button.enabled) this.setButtonPressed(button, true);
      });
      zone.on(Phaser.Input.Events.GAMEOBJECT_POINTER_OUT, () =>
        this.setButtonPressed(button, false),
      );
      zone.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => {
        const wasPressed = button.enabled && button.pressed;
        this.setButtonPressed(button, false);
        if (wasPressed) {
          void context.haptics.impact('light').catch(() => undefined);
          this.startMusicAfterGesture();
          this.playSound(audioKeys.tap, 0.2);
          onPress();
        }
      });
      return button;
    }

    private setButtonBounds(button: ButtonView, area: TicTacToeRect): void {
      const center = ticTacToeRectCenter(area);
      const isModeCard = area.height >= 120;
      button.shadow.setPosition(center[0], center[1] + 4).setSize(area.width, area.height);
      button.glow.setPosition(...center).setSize(area.width + 6, area.height + 6);
      button.surface.setPosition(...center).setSize(area.width, area.height);
      button.inner.setPosition(...center).setSize(area.width - 10, area.height - 10);
      button.label
        .setPosition(center[0], center[1] + (isModeCard ? -10 : button.detail ? -9 : 0))
        .setFontSize(isModeCard ? '19px' : '15px')
        .setWordWrapWidth(Math.max(64, area.width - 20));
      button.detail
        ?.setPosition(center[0], center[1] + (isModeCard ? 45 : 12))
        .setFontSize(isModeCard ? '11px' : '10px')
        .setWordWrapWidth(Math.max(64, area.width - 20));
      button.ornament
        ?.setPosition(
          isModeCard ? center[0] : area.x + 20,
          isModeCard ? area.y + 27 : center[1] + (button.detail ? -2 : 0),
        )
        .setFontSize(isModeCard ? '24px' : '17px');
      button.zone.setPosition(...center).setSize(area.width, area.height);
    }

    private setButtonEnabled(button: ButtonView, enabled: boolean): void {
      button.enabled = enabled;
      button.shadow.setAlpha(enabled ? 0.7 : 0.28);
      button.glow.setAlpha(0);
      button.surface.setAlpha(enabled ? 1 : 0.45);
      button.inner.setAlpha(enabled ? 0.36 : 0.16);
      button.label.setAlpha(enabled ? 1 : 0.55);
      button.detail?.setAlpha(enabled ? 1 : 0.55);
      button.ornament?.setAlpha(enabled ? 1 : 0.55);
      if (enabled && button.zone.visible) button.zone.setInteractive({ useHandCursor: true });
      else button.zone.disableInteractive();
    }

    private setButtonPressed(button: ButtonView, pressed: boolean): void {
      if (!button.enabled || button.pressed === pressed) return;
      button.pressed = pressed;
      const scale = pressed ? 0.98 : 1;
      button.shadow.setScale(scale);
      button.glow.setAlpha(pressed ? 0.3 : 0).setScale(pressed ? 1.02 : 1);
      button.surface.setScale(scale).setFillStyle(button.fill);
      button.inner.setAlpha(pressed ? 0.58 : 0.36).setScale(scale);
      button.ornament?.setScale(scale).setAlpha(pressed ? 0.9 : 1);
      button.label.setScale(scale);
      button.label.setAlpha(pressed ? 0.9 : 1);
      button.detail?.setScale(scale).setAlpha(pressed ? 0.82 : 1);
    }

    private setButtonVisible(button: ButtonView | undefined, visible: boolean): void {
      if (!button) return;
      button.shadow.setVisible(visible);
      button.glow.setVisible(visible);
      button.surface.setVisible(visible);
      button.inner.setVisible(visible);
      button.label.setVisible(visible);
      button.detail?.setVisible(visible);
      button.ornament?.setVisible(visible);
      button.zone.setVisible(visible);
      if (visible && button.enabled) button.zone.setInteractive({ useHandCursor: true });
      else button.zone.disableInteractive();
      if (!visible) this.setButtonPressed(button, false);
    }

    private destroyButton(button: ButtonView | undefined): void {
      if (!button) return;
      button.shadow.destroy();
      button.glow.destroy();
      button.surface.destroy();
      button.inner.destroy();
      button.label.destroy();
      button.detail?.destroy();
      button.ornament?.destroy();
      button.zone.destroy();
    }

    private buttonVisuals(
      button: ButtonView,
    ): readonly (PhaserModule.GameObjects.Rectangle | PhaserModule.GameObjects.Text)[] {
      return [
        button.shadow,
        button.surface,
        button.inner,
        button.label,
        ...(button.detail ? [button.detail] : []),
        ...(button.ornament ? [button.ornament] : []),
      ];
    }

    private layoutPauseOverlay(viewport: GameViewport): void {
      const paused = this.isPaused();
      const width = Math.min(304, viewport.width - 48);
      const height = 220;
      const centerX = viewport.width / 2;
      const centerY = viewport.height / 2;
      this.pausePanel?.setPosition(centerX, centerY).setSize(width, height).setVisible(paused);
      this.pauseMessage?.setPosition(centerX, centerY - 64).setVisible(paused);
      if (!paused) {
        this.pauseButtons.forEach((button) => this.setButtonVisible(button, false));
        return;
      }

      const confirming = this.pauseConfirming;
      this.pauseMessage?.setText(
        confirming
          ? 'Voltar ao início?\nA rodada atual não será salva.'
          : 'Pausa de Natal\nA partida está guardada aqui.',
      );
      const [continueButton, menuButton, confirmButton, cancelButton] = this.pauseButtons;
      this.setButtonVisible(continueButton, !confirming);
      this.setButtonVisible(menuButton, !confirming);
      this.setButtonVisible(confirmButton, confirming);
      this.setButtonVisible(cancelButton, confirming);
      const first = confirming ? confirmButton : continueButton;
      const second = confirming ? cancelButton : menuButton;
      if (first)
        this.setButtonBounds(first, {
          x: centerX - (width - 40) / 2,
          y: centerY - 10,
          width: width - 40,
          height: 46,
        });
      if (second)
        this.setButtonBounds(second, {
          x: centerX - (width - 40) / 2,
          y: centerY + 48,
          width: width - 40,
          height: 46,
        });
    }

    private canReturnToMode(): boolean {
      return this.presentation === 'difficulty' || this.presentation === 'photo-picker';
    }

    private shouldShowPauseControl(): boolean {
      return (
        this.presentation === 'board' ||
        this.presentation === 'placing' ||
        this.presentation === 'thinking' ||
        this.presentation === 'round-result'
      );
    }

    private returnToMode(): void {
      if (!this.canReturnToMode()) return;
      this.presentationEpoch += 1;
      this.cancelActivePress();
      this.tweens.killAll();
      this.time.removeAllEvents();
      this.showMode();
    }

    private continueFromPause(): void {
      this.pauseConfirming = false;
      this.pauseReasons.delete('manual');
      this.syncPauseState();
    }

    private requestReturnToMode(): void {
      this.pauseConfirming = true;
      this.syncPauseState();
    }

    private cancelReturnToMode(): void {
      this.pauseConfirming = false;
      this.syncPauseState();
    }

    private confirmReturnToMode(): void {
      this.presentationEpoch += 1;
      this.cancelActivePress();
      this.tweens.killAll();
      this.time.removeAllEvents();
      this.pauseConfirming = false;
      this.pauseReasons.delete('manual');
      this.showMode();
      this.syncPauseState();
    }

    private updateTurnCopy(): void {
      const match = this.match;
      if (!match || this.matchComplete) return;
      if (this.presentation === 'thinking') {
        this.statusText?.setText('O Noel está escolhendo…');
        this.coach?.setText('');
        return;
      }
      if (this.presentation === 'placing') {
        this.statusText?.setText('A lembrança encontrou seu lugar no mural.');
        this.coach?.setText('');
        return;
      }
      const playerLabel =
        match.mode === 'santa'
          ? match.turn === 'player-a'
            ? 'Sua vez: toque em uma casa livre.'
            : 'Vez do Papai Noel.'
          : match.turn === 'player-a'
            ? 'Vez da primeira lembrança.'
            : 'Vez da segunda lembrança.';
      this.statusText?.setText(playerLabel);
      this.coach?.setText('');
    }

    private roundResultCopy(match: TicTacToeMatch): string {
      if (match.roundWinner === null) return 'Empate de Natal!\nQue partida apertada!';
      if (match.roundWinner === 'player-a') return 'Trinca de Natal!\nA primeira lembrança venceu.';
      return match.mode === 'santa'
        ? 'O Noel fez uma trinca!\nVamos para a próxima rodada?'
        : 'Trinca de Natal!\nA segunda lembrança venceu.';
    }

    private matchResultCopy(match: TicTacToeMatch): string {
      if (match.matchWinner === null) return 'Empate de Natal!\nOs murais ficaram pareados.';
      if (match.matchWinner === 'player-a') {
        return match.mode === 'santa'
          ? 'Você venceu o Noel!\nQue trinca bonita!'
          : 'A primeira lembrança\nvenceu a partida!';
      }
      return match.mode === 'santa'
        ? 'O Noel fez a trinca final!\nVamos brincar de novo?'
        : 'A segunda lembrança\nvenceu a partida!';
    }

    private showWinningCelebration(line: WinningLine): void {
      this.clearWinningCelebration();
      const cells = line
        .map((cell) => this.cells[cell])
        .filter((view): view is CellView => view !== undefined);
      if (cells.length === 0) return;
      cells.forEach((view) => {
        view.frame.setStrokeStyle(3, boardColors.gold, 1);
        view.bevel.setFillStyle(boardColors.gold, 0.82);
        if (!this.prefersReducedMotion() && context.quality !== 'LOW') {
          this.scope.resource(
            this.tweens.add({
              targets: [view.frame, view.bevel],
              scale: 1.045,
              duration: 220,
              ease: 'Sine.easeInOut',
              yoyo: true,
              repeat: 1,
            }),
          );
        }
      });
      if (this.prefersReducedMotion() || context.quality === 'LOW') return;
      line.forEach((cell, index) => {
        const view = this.cells[cell];
        if (!view) return;
        const radius = view.frame.width * 0.47;
        this.spawnCelebrationSparkle(view.frame.x, view.frame.y - radius, index * 70, '✦', 1);
        (
          [
            [-radius, -radius],
            [radius, -radius],
            [-radius, radius],
            [radius, radius],
          ] as const
        ).forEach((offset, sparkleIndex) => {
          this.spawnCelebrationSparkle(
            view.frame.x + offset[0],
            view.frame.y + offset[1],
            index * 70 + 40 + sparkleIndex * 18,
            sparkleIndex % 2 === 0 ? '✧' : '·',
            sparkleIndex % 2 === 0 ? 0.7 : 0.9,
          );
        });
      });
    }

    private showDrawCelebration(): void {
      this.clearWinningCelebration();
      this.cells.forEach((view, index) => {
        view.frame.setStrokeStyle(2, boardColors.gold, 0.96);
        view.bevel.setFillStyle(boardColors.parchment, 1);
        if (this.prefersReducedMotion() || context.quality === 'LOW') return;
        this.scope.resource(
          this.tweens.add({
            targets: [view.frame, view.bevel],
            alpha: 0.68,
            delay: index * 26,
            duration: 115,
            ease: 'Sine.easeInOut',
            scale: 1.024,
            yoyo: true,
          }),
        );
      });
    }

    private burstPlacementSparkles(cell: CellIndex): void {
      if (this.prefersReducedMotion() || context.quality === 'LOW') return;
      const view = this.cells[cell];
      if (!view) return;
      const radius = view.frame.width * 0.48;
      (
        [
          [-radius, -radius],
          [radius, -radius],
          [-radius, radius],
          [radius, radius],
        ] as const
      ).forEach((offset, index) => {
        this.spawnCelebrationSparkle(
          view.frame.x + offset[0],
          view.frame.y + offset[1],
          index * 18,
          index % 2 === 0 ? '✧' : '·',
          index % 2 === 0 ? 0.58 : 0.76,
          190,
        );
      });
    }

    private spawnCelebrationSparkle(
      x: number,
      y: number,
      delay: number,
      glyph: string,
      scale: number,
      hold = 320,
    ): void {
      const mark = this.add
        .text(x, y, glyph, {
          color: textColors.gold,
          fontFamily: 'system-ui, sans-serif',
          fontSize: '20px',
          fontStyle: 'bold',
        })
        .setOrigin(0.5)
        .setDepth(16)
        .setAlpha(0)
        .setScale(scale * 0.48);
      this.celebrationMarks.push(mark);
      this.scope.resource(
        this.tweens.add({
          targets: mark,
          alpha: 1,
          delay,
          duration: 125,
          ease: 'Quad.easeOut',
          scale,
          y: y - 7,
          yoyo: true,
          hold,
          onComplete: () => {
            const index = this.celebrationMarks.indexOf(mark);
            if (index >= 0) this.celebrationMarks.splice(index, 1);
            mark.destroy();
          },
        }),
      );
    }

    private clearWinningCelebration(): void {
      while (this.celebrationMarks.length > 0) this.celebrationMarks.pop()?.destroy();
      this.boardGarland?.setVisible(false);
      this.winningGarlandWire?.setVisible(false);
      this.winningGarlandBulbs.forEach((bulb) => bulb.setVisible(false));
      this.cells.forEach((view) => {
        view.frame.setStrokeStyle(2, boardColors.gold, 0.9).setScale(1);
        view.bevel.setFillStyle(boardColors.cream, 1).setScale(1);
      });
    }

    private flashOccupiedCell(cell: CellIndex): void {
      const view = this.cells[cell];
      if (!view) return;
      this.statusText?.setText('Essa lembrança já está no mural. Escolha outra casa.');
      this.playSound(audioKeys.tap, 0.1);
      const tween = this.tweens.add({
        targets: view.frame,
        alpha: 0.45,
        duration: 90,
        yoyo: true,
        ease: 'Quad.easeOut',
      });
      this.scope.resource(tween);
    }

    private setCellPressed(cell: CellIndex, pressed: boolean): void {
      const view = this.cells[cell];
      if (!view) return;
      const scale = pressed ? 0.975 : 1;
      view.shadow.setScale(scale);
      view.frame.setScale(scale);
      view.bevel.setScale(scale);
      view.inner.setScale(scale);
      view.corners.forEach((corner) => corner.setScale(scale));
    }

    private setCellOccupied(cell: CellIndex, occupied: boolean): void {
      const view = this.cells[cell];
      if (!view) return;
      view.corners.forEach((corner) => corner.setVisible(!occupied));
    }

    private cancelActivePress(pointerId?: number): void {
      const press = this.activePress;
      if (!press || (pointerId !== undefined && press.pointerId !== pointerId)) return;
      this.activePress = undefined;
      this.setCellPressed(press.cell, false);
    }

    private reflowAfterResize(viewport: GameViewport): void {
      this.cancelActivePress();
      this.settlePlacementCard();
      this.layout(viewport);
    }

    private pieceTargets(
      piece: PieceView,
    ): readonly (
      | PhaserModule.GameObjects.Rectangle
      | PhaserModule.GameObjects.Image
      | PhaserModule.GameObjects.Text
    )[] {
      return [
        piece.plate,
        ...(piece.photo ? [piece.photo] : []),
        ...(piece.label ? [piece.label] : []),
      ];
    }

    private setPieceVisible(piece: PieceView, visible: boolean): void {
      this.pieceTargets(piece).forEach((target) => target.setAlpha(visible ? 1 : 0));
    }

    private clearBoard(): void {
      this.cancelActivePress();
      this.clearPlacementCard();
      this.clearPieces();
      while (this.cells.length > 0) {
        const cell = this.cells.pop();
        cell?.shadow.destroy();
        cell?.frame.destroy();
        cell?.bevel.destroy();
        cell?.inner.destroy();
        cell?.corners.forEach((corner) => corner.destroy());
        cell?.zone.destroy();
      }
    }

    private clearPieces(): void {
      for (const piece of this.pieces.values()) this.removePiece(piece);
    }

    private removePiece(piece: PieceView): void {
      this.pieces.delete(piece.cell);
      piece.plate.destroy();
      piece.photo?.destroy();
      piece.label?.destroy();
    }

    private toggleManualPause(): void {
      if (this.presentation === 'match-result') return;
      if (this.pauseReasons.has('manual')) {
        this.pauseReasons.delete('manual');
      } else {
        this.pauseConfirming = false;
        this.pauseReasons.add('manual');
      }
      this.syncPauseState();
    }

    private resetPauseControl(): void {
      this.pauseSurface?.setScale(1);
      this.pauseLabel?.setAlpha(1);
    }

    private syncPauseState(): void {
      const paused = this.isPaused();
      if (paused) {
        this.cancelActivePress();
        this.settlePlacementCard();
      }
      this.time.paused = paused;
      this.tweens.paused = paused;
      if (paused) this.music?.pause();
      else this.music?.resume();
      this.pauseCover?.setVisible(paused);
      this.pauseCoverZone?.setVisible(paused);
      if (paused) this.pauseCoverZone?.setInteractive({ useHandCursor: true });
      else this.pauseCoverZone?.disableInteractive();
      this.pauseLabel?.setText('Pausar');
      this.resetPauseControl();
      this.layoutPauseOverlay(
        createViewportLayout(this.scale.gameSize.width, this.scale.gameSize.height),
      );
      if (paused) context.run.pause();
      else context.run.resume();
    }

    private inputState(): { paused: boolean; presentation: TicTacToePresentationState } {
      return { paused: this.isPaused(), presentation: this.presentation };
    }

    private isPaused(): boolean {
      return this.pauseReasons.size > 0;
    }

    private prefersReducedMotion(): boolean {
      return context.preferences?.reducedMotion ?? false;
    }

    private startMusicAfterGesture(): void {
      if (
        !this.audioEnabled ||
        this.music?.isPlaying ||
        this.musicAwaitingUnlock ||
        !this.cache.audio.exists(audioKeys.music)
      )
        return;
      const start = (): void => {
        this.musicAwaitingUnlock = false;
        if (
          !this.audioEnabled ||
          this.music?.isPlaying ||
          !this.cache.audio.exists(audioKeys.music)
        )
          return;
        this.music = this.sound.add(audioKeys.music, { loop: true, volume: 0.11 });
        this.scope.resource(this.music);
        this.music.play();
      };
      if (this.sound.locked) {
        this.musicAwaitingUnlock = true;
        this.sound.once(Phaser.Sound.Events.UNLOCKED, start);
        this.scope.add(() => {
          this.musicAwaitingUnlock = false;
          this.sound.off(Phaser.Sound.Events.UNLOCKED, start);
        });
        return;
      }
      start();
    }

    private playSound(key: string, volume: number): void {
      if (!this.audioEnabled || !this.cache.audio.exists(key)) return;
      this.sound.play(key, { volume });
    }

    private toggleAudioAfterGesture(): void {
      this.audioEnabled = !this.audioEnabled;
      context.run.soundChanged?.(this.audioEnabled);
      this.audioButton?.label.setText(this.audioEnabled ? 'Som' : 'Mudo');
      if (this.audioEnabled) {
        this.startMusicAfterGesture();
        this.playSound(audioKeys.tap, 0.2);
        return;
      }
      this.music?.stop();
      this.music?.destroy();
      this.music = undefined;
      Object.values(audioKeys).forEach((key) => this.sound.stopByKey(key));
    }

    private failAsset(reason: string): void {
      if (this.assetFailure) return;
      this.assetFailure = true;
      context.run.assetFailed(reason);
    }
  }

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: christmasTheme.color.pineDark,
    pixelArt: false,
    antialias: true,
    loader: { timeout: 8_000, maxRetries: 1 },
    scale: { mode: Phaser.Scale.RESIZE, parent, width: '100%', height: '100%' },
    scene: TicTacToeScene,
  });
  const pauseRun = (reason: PauseReason): void => {
    if (setScenePauseReason) setScenePauseReason(reason, true);
    else context.run.pause();
  };
  const resumeRun = (reason: PauseReason): void => {
    if (setScenePauseReason) setScenePauseReason(reason, false);
    else context.run.resume();
  };
  const pauseForHidden = (): void => pauseRun('hidden');
  const pauseForBlur = (): void => pauseRun('blur');
  const resumeFromVisible = (): void => resumeRun('hidden');
  const resumeFromFocus = (): void => resumeRun('blur');
  game.events.on(Phaser.Core.Events.HIDDEN, pauseForHidden);
  game.events.on(Phaser.Core.Events.BLUR, pauseForBlur);
  game.events.on(Phaser.Core.Events.VISIBLE, resumeFromVisible);
  game.events.on(Phaser.Core.Events.FOCUS, resumeFromFocus);

  let destroyPromise: Promise<void> | undefined;
  return {
    destroy(): Promise<void> {
      if (destroyPromise) return destroyPromise;
      destroyPromise = new Promise<void>((resolve, reject) => {
        const complete = (): void => {
          game.events.off(Phaser.Core.Events.HIDDEN, pauseForHidden);
          game.events.off(Phaser.Core.Events.BLUR, pauseForBlur);
          game.events.off(Phaser.Core.Events.VISIBLE, resumeFromVisible);
          game.events.off(Phaser.Core.Events.FOCUS, resumeFromFocus);
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

export const ticTacToeGameModule: GameModule<typeof PhaserModule, HTMLElement> = {
  definition: ticTacToeDefinition,
  create: createTicTacToeGame,
};
