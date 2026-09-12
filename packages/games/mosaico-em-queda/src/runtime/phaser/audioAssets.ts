/** Static M4A/MP3 fallbacks are local to this game and loaded before READY. */
const audioBasePath = '/assets/mosaico-em-queda/audio';

export const mosaicAudio = {
  placement: {
    key: 'mosaico-sfx-placement',
    urls: [`${audioBasePath}/encaixe.m4a`, `${audioBasePath}/encaixe.mp3`],
  },
  press: {
    key: 'mosaico-sfx-press',
    urls: [`${audioBasePath}/toque.m4a`, `${audioBasePath}/toque.mp3`],
  },
  victory: {
    key: 'mosaico-sfx-victory',
    urls: [`${audioBasePath}/vitoria.m4a`, `${audioBasePath}/vitoria.mp3`],
  },
} as const;

export type MosaicSoundCue =
  | 'ui-press'
  | 'rotate'
  | 'blocked'
  | 'lock'
  | 'clear'
  | 'memory-reveal'
  | 'workshop-relief'
  | 'victory';

export const mosaicSoundKeyByCue: Readonly<Record<MosaicSoundCue, string>> = {
  'ui-press': mosaicAudio.press.key,
  rotate: mosaicAudio.press.key,
  blocked: mosaicAudio.press.key,
  lock: mosaicAudio.placement.key,
  clear: mosaicAudio.placement.key,
  'memory-reveal': mosaicAudio.placement.key,
  'workshop-relief': mosaicAudio.placement.key,
  victory: mosaicAudio.victory.key,
};
