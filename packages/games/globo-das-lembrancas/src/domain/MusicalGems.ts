export type GemColor = 'ruby' | 'emerald' | 'sapphire' | 'gold';
export type MusicalNote = 'C5' | 'E5' | 'G5' | 'C6';

export interface GemDef {
  index: number;
  color: GemColor;
  note: MusicalNote;
  lit: boolean;
}

export interface GemTapResult {
  gemIndex: number;
  color: GemColor;
  note: MusicalNote;
  isNew: boolean;
  allLit: boolean;
}

const DEFAULT_GEMS: readonly { color: GemColor; note: MusicalNote }[] = [
  { color: 'ruby', note: 'C5' },
  { color: 'emerald', note: 'E5' },
  { color: 'sapphire', note: 'G5' },
  { color: 'gold', note: 'C6' },
];

/**
 * Tracks the 4 crystal chime gems mounted on the carved mahogany base.
 * Pure deterministic domain logic.
 */
export class MusicalGems {
  readonly gems: GemDef[];

  constructor() {
    this.gems = DEFAULT_GEMS.map((def, index) => ({
      index,
      color: def.color,
      note: def.note,
      lit: false,
    }));
  }

  get litCount(): number {
    return this.gems.filter((gem) => gem.lit).length;
  }

  get isComplete(): boolean {
    return this.litCount === this.gems.length;
  }

  /**
   * Taps a gem by index (0 to 3).
   * Returns tap result with musical note and completion status.
   */
  tap(index: number): GemTapResult | undefined {
    const gem = this.gems[index];
    if (!gem) return undefined;

    const isNew = !gem.lit;
    gem.lit = true;

    return {
      gemIndex: gem.index,
      color: gem.color,
      note: gem.note,
      isNew,
      allLit: this.isComplete,
    };
  }
}
