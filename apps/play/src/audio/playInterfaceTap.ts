import { shellAudioAssets } from './shellAudioAssets.js';

export type ShellCue =
  'tap' | 'toggle' | 'magic' | 'open' | 'back' | 'photo' | 'reveal' | 'bells' | 'snow' | 'start';
type AssetId = keyof typeof shellAudioAssets;
const pool = new Map<AssetId, HTMLAudioElement>();
const lastGesture = new Map<ShellCue, number>();
let active: HTMLAudioElement | undefined;
let revision = 0;
let enabled = true;
let variation = 0;

/** Cancel the current voice, including a play request still waiting on the network. */
export function stopInterfaceTap(): void {
  revision += 1;
  if (active) {
    active.onended = null;
    active.onerror = null;
    active.pause();
    try {
      active.currentTime = 0;
    } catch {
      /* An undecoded source may not be seekable yet. */
    }
  }
  active = undefined;
}

export function disposeInterfaceAudio(): void {
  stopInterfaceTap();
  for (const sound of pool.values()) sound.src = '';
  pool.clear();
  lastGesture.clear();
}

export function setInterfaceSoundEnabled(value: boolean): void {
  enabled = value;
  if (!value) stopInterfaceTap();
}

/** Gesture-only sound with one voice, bounded reuse and no late response queue. */
export function playInterfaceTap(cue: ShellCue = 'tap'): void {
  if (!enabled) return;
  const now = performance.now();
  const cooldown = cue === 'snow' ? 450 : cue === 'bells' ? 300 : 0;
  if (now - (lastGesture.get(cue) ?? -Infinity) < cooldown) return;
  lastGesture.set(cue, now);
  const id: AssetId =
    cue === 'photo'
      ? variation++ % 2
        ? 'paper-b'
        : 'paper-a'
      : cue === 'bells'
        ? variation++ % 2
          ? 'bells-b'
          : 'bells-a'
        : cue;
  const asset = shellAudioAssets[id];
  stopInterfaceTap();
  const epoch = revision;
  let sound = pool.get(id);
  if (!sound) {
    sound = new Audio(asset.mp3);
    pool.set(id, sound);
  }
  const voice = sound;
  active = voice;
  voice.preload = 'auto';
  voice.volume = asset.volume;
  if (!voice.src) voice.src = asset.mp3;
  try {
    voice.currentTime = 0;
  } catch {
    /* A new source may not be seekable until its metadata arrives. */
  }
  const release = (): void => {
    if (revision !== epoch || active !== voice) return;
    voice.onended = null;
    voice.onerror = null;
    active = undefined;
  };
  voice.onended = release;
  let attempt = 0;
  const tryPlay = (fallback: boolean): void => {
    const request = ++attempt;
    const failed = (): void => {
      if (revision !== epoch || active !== voice || request !== attempt) return;
      if (fallback) release();
      else tryPlay(true);
    };
    if (fallback) voice.src = asset.m4a;
    voice.onerror = failed;
    void voice.play().catch(failed);
  };
  tryPlay(voice.src.endsWith('.m4a'));
}
