/** Static, game-owned audio with M4A and MP3 fallbacks for mobile browsers. */
const audioBasePath = '/assets/memory/audio';

export const memoryAudio = {
  tap: {
    key: 'memory-sfx-tap',
    urls: [`${audioBasePath}/tap.m4a`, `${audioBasePath}/tap.mp3`],
  },
  hint: {
    key: 'memory-sfx-hint',
    urls: [`${audioBasePath}/hint.m4a`, `${audioBasePath}/hint.mp3`],
  },
  match: {
    key: 'memory-sfx-match',
    urls: [`${audioBasePath}/correct.m4a`, `${audioBasePath}/correct.mp3`],
  },
  return: {
    key: 'memory-sfx-return',
    urls: [`${audioBasePath}/wrong.m4a`, `${audioBasePath}/wrong.mp3`],
  },
  celebrate: {
    key: 'memory-sfx-celebrate',
    urls: [`${audioBasePath}/celebrate.m4a`, `${audioBasePath}/celebrate.mp3`],
  },
  music: {
    key: 'memory-music-winter-loop',
    urls: [`${audioBasePath}/winter-loop.m4a`, `${audioBasePath}/winter-loop.mp3`],
  },
} as const;

export type MemorySoundCue =
  'card.flip' | 'card.return' | 'hint.magic' | 'pair.match' | 'ui.button' | 'winter.win';

export const memorySfxKeyByCue: Readonly<Record<MemorySoundCue, string>> = {
  'card.flip': memoryAudio.tap.key,
  'card.return': memoryAudio.return.key,
  'hint.magic': memoryAudio.hint.key,
  'pair.match': memoryAudio.match.key,
  'ui.button': memoryAudio.tap.key,
  'winter.win': memoryAudio.celebrate.key,
};
