/** Game-owned sound effects with mobile M4A and MP3 fallback sources. */
const audioBasePath = '/assets/expresso-das-fotos/audio';

export const expressoAudio = {
  tap: {
    key: 'expresso-sfx-tap',
    urls: [audioBasePath + '/tap.m4a', audioBasePath + '/tap.mp3'],
  },
  correct: {
    key: 'expresso-sfx-correct',
    urls: [audioBasePath + '/correct.m4a', audioBasePath + '/correct.mp3'],
  },
  wrong: {
    key: 'expresso-sfx-wrong',
    urls: [audioBasePath + '/wrong.m4a', audioBasePath + '/wrong.mp3'],
  },
  celebrate: {
    key: 'expresso-sfx-celebrate',
    urls: [audioBasePath + '/celebrate.m4a', audioBasePath + '/celebrate.mp3'],
  },
  steamRelease: {
    key: 'expresso-sfx-steam-release',
    urls: [audioBasePath + '/steam-release.m4a', audioBasePath + '/steam-release.mp3'],
  },
  toyWhistle: {
    key: 'expresso-sfx-toy-whistle',
    urls: [audioBasePath + '/toy-whistle.m4a', audioBasePath + '/toy-whistle.mp3'],
  },
  railRoll: {
    key: 'expresso-sfx-rail-roll',
    urls: [audioBasePath + '/rail-roll.m4a', audioBasePath + '/rail-roll.mp3'],
  },
  arrivalBrake: {
    key: 'expresso-sfx-arrival-brake',
    urls: [audioBasePath + '/arrival-brake.m4a', audioBasePath + '/arrival-brake.mp3'],
  },
} as const;

export type ExpressoSoundCue = keyof typeof expressoAudio;
