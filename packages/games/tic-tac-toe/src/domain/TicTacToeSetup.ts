import type { Random } from '@christmas-games/platform';
import { createTicTacToeMatch, type TicTacToeMatch } from './TicTacToeMatch.js';
import type { SantaDifficulty, TicTacToeMode, TicTacToePhotoDescriptor } from './TicTacToeTypes.js';

export interface TicTacToeSantaSetup {
  readonly mode: 'santa';
  readonly photoA: TicTacToePhotoDescriptor;
  readonly photoB: null;
  readonly santaDifficulty: SantaDifficulty;
  readonly initialStarter: 'player-a';
}

export interface TicTacToeLocalSetup {
  readonly mode: 'local';
  readonly photoA: TicTacToePhotoDescriptor;
  readonly photoB: TicTacToePhotoDescriptor;
  readonly santaDifficulty: null;
  readonly initialStarter: 'player-a' | 'player-b';
}

export type TicTacToeSetup = TicTacToeSantaSetup | TicTacToeLocalSetup;

export function createSantaTicTacToeSetup(
  photoA: TicTacToePhotoDescriptor,
  santaDifficulty: SantaDifficulty = 'smart',
): TicTacToeSantaSetup {
  assertTicTacToePhotoDescriptor(photoA);
  return { mode: 'santa', photoA, photoB: null, santaDifficulty, initialStarter: 'player-a' };
}

export function createLocalTicTacToeSetup(
  photoA: TicTacToePhotoDescriptor,
  photoB: TicTacToePhotoDescriptor,
  random: Random,
): TicTacToeLocalSetup {
  assertTicTacToePhotoDescriptor(photoA);
  assertTicTacToePhotoDescriptor(photoB);
  if (photoA.id === photoB.id) {
    throw new Error('Tic-Tac-Toe local setup needs two distinct photo ids.');
  }
  return {
    mode: 'local',
    photoA,
    photoB,
    santaDifficulty: null,
    initialStarter: random.int(0, 1) === 0 ? 'player-a' : 'player-b',
  };
}

export function createTicTacToeMatchFromSetup(setup: TicTacToeSetup): TicTacToeMatch {
  return createTicTacToeMatch({ mode: setup.mode, initialStarter: setup.initialStarter });
}

export function isTicTacToeModeAvailable(mode: TicTacToeMode, photoCount: number): boolean {
  if (!Number.isInteger(photoCount) || photoCount < 1) return false;
  return mode === 'santa' || photoCount >= 2;
}

function assertTicTacToePhotoDescriptor(photo: TicTacToePhotoDescriptor): void {
  if (
    photo.id.trim().length === 0 ||
    !Number.isFinite(photo.aspectRatio) ||
    photo.aspectRatio <= 0
  ) {
    throw new Error('Tic-Tac-Toe photos need a non-empty id and positive aspect ratio.');
  }
}
