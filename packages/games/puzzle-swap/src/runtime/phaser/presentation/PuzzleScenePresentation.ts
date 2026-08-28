import type { QualityTier, Random, SceneScope } from '@christmas-games/platform';
import { christmasTheme } from '@christmas-games/theme';
import type * as PhaserModule from 'phaser';
import { puzzleVisualAssets } from '../visualAssets.js';

const puzzleGold = 0xf8dfa0;
const puzzlePineDark = 0x082821;
const puzzleNight = 0x09143b;
const puzzlePine = 0x0f493a;
const puzzleCranberry = 0x8f1d35;

interface PuzzleScenePresentationInput {
  Phaser: typeof PhaserModule;
  scene: PhaserModule.Scene;
  scope: SceneScope;
  textureKey: string;
  quality: QualityTier;
  reducedMotion: boolean;
  random: Random;
  audioEnabled: boolean;
}

interface PuzzleScenePresentation {
  boardFrame: PhaserModule.GameObjects.Rectangle;
  sourcePreview: PhaserModule.GameObjects.Image;
  progressText: PhaserModule.GameObjects.Text;
  timerText: PhaserModule.GameObjects.Text;
  instructionsPanel: PhaserModule.GameObjects.Rectangle;
  instructionsText: PhaserModule.GameObjects.Text;
  pauseOverlay: PhaserModule.GameObjects.Container;
  winOverlay: PhaserModule.GameObjects.Container;
  winDurationText: PhaserModule.GameObjects.Text;
  winScrim: PhaserModule.GameObjects.Rectangle;
  snowSpawnZone?: PhaserModule.Geom.Rectangle;
}

/**
 * Presentation-only composition for this game. It owns neither board rules nor
 * lifecycle policy: the caller supplies SceneScope so Scene shutdown still
 * releases every generated VFX object and particle emitter.
 */
export function createPuzzleScenePresentation(
  input: PuzzleScenePresentationInput,
): PuzzleScenePresentation {
  const { scene } = input;
  createBackdrop(scene);
  const { boardFrame, sourcePreview } = createBoardPresentation(scene, input.textureKey);
  const hud = createHud(scene, input.audioEnabled);
  const pauseOverlay = createPauseOverlay(scene);
  const victory = createVictoryOverlay(scene);
  const snowSpawnZone = createAmbientSnow(input);
  return {
    boardFrame,
    sourcePreview,
    ...hud,
    pauseOverlay,
    ...victory,
    ...(snowSpawnZone === undefined ? {} : { snowSpawnZone }),
  };
}

function createBackdrop(scene: PhaserModule.Scene): void {
  scene.add
    .image(0, 0, puzzleVisualAssets.background.key)
    .setName('puzzle-background-art')
    .setDepth(-1)
    .setOrigin(0.5);
  scene.add
    .rectangle(0, 0, 1, 1, puzzleNight, 0.56)
    .setOrigin(0)
    .setName('puzzle-backdrop')
    .setDepth(0);
  scene.add
    .rectangle(0, 0, 1, 1, puzzlePine, 0.78)
    .setOrigin(0)
    .setName('puzzle-pine-horizon')
    .setDepth(0);
  scene.add
    .rectangle(0, 0, 1, 1, puzzleCranberry, 0.34)
    .setOrigin(0)
    .setName('puzzle-ribbon')
    .setDepth(0);
  scene.add
    .text(0, 0, '✦', {
      color: christmasTheme.color.gold,
      fontFamily: 'system-ui, sans-serif',
      fontSize: '28px',
    })
    .setName('puzzle-star-left')
    .setDepth(0)
    .setAlpha(0.52)
    .setOrigin(0.5);
  scene.add
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

function createBoardPresentation(
  scene: PhaserModule.Scene,
  textureKey: string,
): Pick<PuzzleScenePresentation, 'boardFrame' | 'sourcePreview'> {
  const boardFrame = scene.add
    .rectangle(0, 0, 1, 1, 0x020813, 0.38)
    .setStrokeStyle(3, puzzleGold, 0.94)
    .setDepth(0.8)
    .setName('puzzle-board-frame');
  const sourcePreview = scene.add
    .image(0, 0, textureKey)
    .setOrigin(0.5)
    .setDepth(2.5)
    .setVisible(false)
    .setName('puzzle-photo-reveal');
  return { boardFrame, sourcePreview };
}

function createHud(
  scene: PhaserModule.Scene,
  audioEnabled: boolean,
): Pick<
  PuzzleScenePresentation,
  'progressText' | 'timerText' | 'instructionsPanel' | 'instructionsText'
> {
  scene.add
    .rectangle(0, 0, 1, 1, puzzlePineDark, 0.92)
    .setStrokeStyle(1, puzzleGold, 0.4)
    .setName('puzzle-hud-panel')
    .setDepth(3);
  scene.add
    .text(0, 0, 'QUEBRA-CABEÇA', {
      color: christmasTheme.color.snow,
      fontFamily: 'system-ui, sans-serif',
      fontSize: '13px',
      fontStyle: 'bold',
    })
    .setName('puzzle-title')
    .setDepth(4)
    .setOrigin(0, 0.5);
  const progressText = scene.add
    .text(0, 0, '', {
      color: christmasTheme.color.gold,
      fontFamily: 'system-ui, sans-serif',
      fontSize: '11px',
      align: 'center',
    })
    .setName('puzzle-progress')
    .setDepth(4)
    .setOrigin(0, 0.5);
  const timerText = scene.add
    .text(0, 0, '00:00', {
      color: christmasTheme.color.snow,
      fontFamily: 'ui-monospace, SFMono-Regular, monospace',
      fontSize: '13px',
      fontStyle: 'bold',
    })
    .setName('puzzle-timer')
    .setDepth(4)
    .setOrigin(0.5);
  const instructionsPanel = scene.add
    .rectangle(0, 0, 1, 1, puzzlePineDark, 0.9)
    .setStrokeStyle(1, puzzleGold, 0.56)
    .setName('puzzle-instruction-panel')
    .setDepth(3.5);
  const instructionsText = scene.add
    .text(0, 0, 'Toque em uma peça para escolher.', {
      color: christmasTheme.color.snow,
      fontFamily: 'system-ui, sans-serif',
      fontSize: '13px',
      align: 'center',
      wordWrap: { width: 280 },
    })
    .setName('puzzle-instructions')
    .setDepth(4)
    .setOrigin(0.5);
  createHudButton(scene, 'puzzle-hint-button', puzzleVisualAssets.hint.key, 'Dica');
  createHudButton(scene, 'puzzle-pause-button', puzzleVisualAssets.pause.key, 'Pausar');
  createHudButton(
    scene,
    'puzzle-audio-button',
    audioEnabled ? puzzleVisualAssets.soundOn.key : puzzleVisualAssets.soundOff.key,
    audioEnabled ? 'Som' : 'Mudo',
  );
  return { progressText, timerText, instructionsPanel, instructionsText };
}

function createHudButton(
  scene: PhaserModule.Scene,
  name: string,
  iconKey: string,
  label: string,
): void {
  scene.add
    .rectangle(0, 0, 42, 38, puzzleCranberry, 0.86)
    .setStrokeStyle(1, puzzleGold, 0.75)
    .setName(`${name}-surface`)
    .setDepth(4);
  scene.add.image(0, 0, iconKey).setName(name).setDepth(5).setDisplaySize(20, 20).setOrigin(0.5);
  scene.add
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

function createPauseOverlay(scene: PhaserModule.Scene): PhaserModule.GameObjects.Container {
  const panel = scene.add
    .rectangle(0, 0, 286, 156, puzzlePineDark, 0.98)
    .setStrokeStyle(2, puzzleGold, 0.95);
  const title = scene.add
    .text(0, -36, 'PAUSA', {
      color: christmasTheme.color.gold,
      fontFamily: 'system-ui, sans-serif',
      fontSize: '22px',
      fontStyle: 'bold',
    })
    .setOrigin(0.5);
  const message = scene.add
    .text(0, 8, 'O jogo espera por você.\nToque para continuar.', {
      color: christmasTheme.color.snow,
      fontFamily: 'system-ui, sans-serif',
      fontSize: '15px',
      align: 'center',
    })
    .setOrigin(0.5);
  return scene.add
    .container(0, 0, [panel, title, message])
    .setDepth(8)
    .setVisible(false)
    .setName('puzzle-pause-overlay');
}

function createVictoryOverlay(
  scene: PhaserModule.Scene,
): Pick<PuzzleScenePresentation, 'winOverlay' | 'winDurationText' | 'winScrim'> {
  const winScrim = scene.add
    .rectangle(0, 0, 1, 1, 0x020713, 0)
    .setOrigin(0)
    .setDepth(10)
    .setVisible(false)
    .setName('puzzle-win-scrim');
  const panel = scene.add
    .rectangle(0, 0, 304, 192, puzzlePineDark, 0.98)
    .setStrokeStyle(3, puzzleGold, 0.98);
  const eyebrow = scene.add
    .text(0, -58, 'MISSÃO CONCLUÍDA', {
      color: christmasTheme.color.gold,
      fontFamily: 'system-ui, sans-serif',
      fontSize: '13px',
      fontStyle: 'bold',
    })
    .setOrigin(0.5);
  const title = scene.add
    .text(0, -24, 'Feliz Natal! ✦', {
      color: christmasTheme.color.snow,
      fontFamily: 'system-ui, sans-serif',
      fontSize: '27px',
      fontStyle: 'bold',
    })
    .setOrigin(0.5);
  const winDurationText = scene.add
    .text(0, 19, 'Você montou essa lembrança\nem 00:00.', {
      color: christmasTheme.color.snow,
      fontFamily: 'system-ui, sans-serif',
      fontSize: '15px',
      align: 'center',
    })
    .setOrigin(0.5)
    .setName('puzzle-win-duration');
  const continueLabel = scene.add
    .text(0, 68, 'Escolha a próxima brincadeira logo abaixo.', {
      color: christmasTheme.color.gold,
      fontFamily: 'system-ui, sans-serif',
      fontSize: '11px',
      align: 'center',
    })
    .setOrigin(0.5);
  const winOverlay = scene.add
    .container(0, 0, [panel, eyebrow, title, winDurationText, continueLabel])
    .setDepth(11)
    .setVisible(false)
    .setName('puzzle-win-overlay');
  return { winOverlay, winDurationText, winScrim };
}

function createAmbientSnow(
  input: PuzzleScenePresentationInput,
): PhaserModule.Geom.Rectangle | undefined {
  if (input.quality === 'LOW' || input.reducedMotion) return undefined;
  const spawnZone = new input.Phaser.Geom.Rectangle(0, -28, input.scene.scale.gameSize.width, 28);
  input.scope.resource(
    input.scene.add
      .particles(0, 0, puzzleVisualAssets.snow.key, {
        alpha: { start: 0.78, end: 0.1 },
        advance: 3_600,
        emitZone: {
          type: 'random',
          source: {
            getRandomPoint: (point) => {
              point.x = spawnZone.x + input.random.next() * spawnZone.width;
              point.y = spawnZone.y + input.random.next() * spawnZone.height;
            },
          },
        },
        frequency: input.quality === 'HIGH' ? 360 : 560,
        gravityY: 5,
        lifespan: { min: 6_500, max: 10_500 },
        maxAliveParticles: 18,
        maxParticles: 20,
        quantity: 1,
        radial: false,
        reserve: 18,
        scale: { start: 0.26, end: 0.11, ease: 'Sine.easeOut' },
        speedX: { min: -11, max: 13 },
        speedY: { min: 62, max: 96 },
      })
      .setDepth(0.7)
      .setName('puzzle-ambient-snow'),
  );
  return spawnZone;
}
