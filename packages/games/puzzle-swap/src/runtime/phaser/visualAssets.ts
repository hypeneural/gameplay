/**
 * Static visual assets owned by Puzzle Swap. URLs are public bundle paths;
 * texture keys are unique per Phaser game so SceneScope can release them.
 */
const visualAssetBasePath = '/assets/puzzle-swap';

export const puzzleVisualAssets = {
  background: {
    key: 'puzzle-background-winter-village',
    url: `${visualAssetBasePath}/backgrounds/vila-nevada-noite-v1.webp`,
  },
  hint: {
    key: 'puzzle-ui-hint',
    url: `${visualAssetBasePath}/ui/dica.svg`,
  },
  pause: {
    key: 'puzzle-ui-pause',
    url: `${visualAssetBasePath}/ui/pausar.svg`,
  },
  play: {
    key: 'puzzle-ui-play',
    url: `${visualAssetBasePath}/ui/continuar.svg`,
  },
  soundOn: {
    key: 'puzzle-ui-sound-on',
    url: `${visualAssetBasePath}/ui/som.svg`,
  },
  soundOff: {
    key: 'puzzle-ui-sound-off',
    url: `${visualAssetBasePath}/ui/silenciar.svg`,
  },
} as const;

export const puzzleUiTextureKeys = [
  puzzleVisualAssets.hint.key,
  puzzleVisualAssets.pause.key,
  puzzleVisualAssets.play.key,
  puzzleVisualAssets.soundOn.key,
  puzzleVisualAssets.soundOff.key,
] as const;
