import type { Random } from '../contracts/index.js';

export class SeededRandom implements Random {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  next(): number {
    this.state += 0x6d2b79f5;
    let value = this.state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  }

  int(minInclusive: number, maxInclusive: number): number {
    if (
      !Number.isInteger(minInclusive) ||
      !Number.isInteger(maxInclusive) ||
      minInclusive > maxInclusive
    ) {
      throw new Error('Invalid integer range.');
    }
    return minInclusive + Math.floor(this.next() * (maxInclusive - minInclusive + 1));
  }
}
