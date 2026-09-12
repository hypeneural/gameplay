import { TETROMINO_KINDS, type MosaicRandom, type TetrominoKind } from './EngineTypes.js';

export function deriveMosaicSeed(runSeed: number, label: string): number {
  let hash = (runSeed >>> 0) ^ 0x811c9dc5;
  for (const character of label) {
    hash = Math.imul(hash ^ character.charCodeAt(0), 0x01000193);
  }
  return hash >>> 0;
}

export function createMosaicRandom(seed: number): MosaicRandom {
  return { state: seed === 0 ? 0x6d2b79f5 : seed >>> 0 };
}

export function drawSevenBag(
  _previous: readonly TetrominoKind[],
  random: MosaicRandom,
): { readonly bag: readonly TetrominoKind[]; readonly random: MosaicRandom } {
  const bag = [...TETROMINO_KINDS];
  let nextRandom = random;
  for (let index = bag.length - 1; index > 0; index -= 1) {
    const draw = nextMosaicRandom(nextRandom);
    nextRandom = draw.random;
    const swapIndex = Math.floor(draw.value * (index + 1));
    const current = bag[index];
    const replacement = bag[swapIndex];
    if (current === undefined || replacement === undefined) {
      throw new Error('Seven-bag shuffle index escaped its canonical range.');
    }
    bag[index] = replacement;
    bag[swapIndex] = current;
  }
  return { bag, random: nextRandom };
}

export function takeNextTetromino(
  bag: readonly TetrominoKind[],
  random: MosaicRandom,
): {
  readonly kind: TetrominoKind;
  readonly bag: readonly TetrominoKind[];
  readonly random: MosaicRandom;
} {
  const source = bag.length === 0 ? drawSevenBag([], random) : { bag, random };
  const [kind, ...remaining] = source.bag;
  if (kind === undefined) throw new Error('Seven-bag produced no tetromino.');
  return { kind, bag: remaining, random: source.random };
}

export function takeMaterialSlot(
  random: MosaicRandom,
  materialSlotCount: number,
): { readonly materialSlot: number; readonly random: MosaicRandom } {
  if (!Number.isInteger(materialSlotCount) || materialSlotCount < 1) {
    throw new Error('materialSlotCount must be a positive integer.');
  }
  const draw = nextMosaicRandom(random);
  return { materialSlot: Math.floor(draw.value * materialSlotCount), random: draw.random };
}

function nextMosaicRandom(random: MosaicRandom): {
  readonly value: number;
  readonly random: MosaicRandom;
} {
  let state = random.state >>> 0;
  state ^= state << 13;
  state ^= state >>> 17;
  state ^= state << 5;
  const nextState = state >>> 0;
  return { value: nextState / 4_294_967_296, random: { state: nextState } };
}
