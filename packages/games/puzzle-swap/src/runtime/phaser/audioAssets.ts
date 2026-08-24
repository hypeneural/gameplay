/**
 * Static, game-owned audio. Files are deliberately named by role rather than
 * by the legacy project filenames and live in the application's public bundle.
 */
const audioBasePath = '/assets/puzzle-swap/audio';

export const puzzleAudio = {
  tap: {
    key: 'puzzle-sfx-tap',
    urls: [`${audioBasePath}/tap.m4a`, `${audioBasePath}/tap.mp3`],
  },
  hint: {
    key: 'puzzle-sfx-hint',
    urls: [`${audioBasePath}/hint.m4a`, `${audioBasePath}/hint.mp3`],
  },
  correct: {
    key: 'puzzle-sfx-correct',
    urls: [`${audioBasePath}/correct.m4a`, `${audioBasePath}/correct.mp3`],
  },
  wrong: {
    key: 'puzzle-sfx-wrong',
    urls: [`${audioBasePath}/wrong.m4a`, `${audioBasePath}/wrong.mp3`],
  },
  celebrate: {
    key: 'puzzle-sfx-celebrate',
    urls: [`${audioBasePath}/celebrate.m4a`, `${audioBasePath}/celebrate.mp3`],
  },
  music: {
    key: 'puzzle-music-winter-loop',
    urls: [`${audioBasePath}/winter-loop.m4a`, `${audioBasePath}/winter-loop.mp3`],
  },
} as const;

export const puzzleSfxKeyByCue: Record<string, string> = {
  'ui.tap': puzzleAudio.tap.key,
  'ui.select': puzzleAudio.tap.key,
  'feedback.correct': puzzleAudio.correct.key,
  'feedback.wrong': puzzleAudio.wrong.key,
  'feedback.hint': puzzleAudio.hint.key,
  'christmas.win': puzzleAudio.celebrate.key,
};
