import { describe, expect, it } from 'vitest';
import { SeededRandom } from '@christmas-games/platform';
import { selectRudolphPhotos } from '../src/domain/PhotoSelection.js';
import { RudolphRound } from '../src/domain/RudolphRound.js';
import { sweptCatch } from '../src/domain/CatchGeometry.js';

const ids = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

describe('Rudolph photo selection', () => {
  it('bounds the subset, deduplicates and puts the authorized anchor first', () => {
    const photos = selectRudolphPhotos([...ids, ...ids, 'i'], 'e', new SeededRandom(8));
    expect(photos).toHaveLength(8);
    expect(photos[0]).toBe('e');
    expect(new Set(photos).size).toBe(8);
    expect(() => selectRudolphPhotos(['a', 'b'], 'a', new SeededRandom(1))).toThrow();
    expect(() => selectRudolphPhotos(ids, 'outside', new SeededRandom(1))).toThrow();
  });
});

describe('Rudolph deterministic round', () => {
  it('does not move before start and stops commands explicitly', () => {
    const round = new RudolphRound(ids, new SeededRandom(3));
    round.aim(1);
    round.step(1 / 60);
    expect(round.playerX).toBe(0.5);
    round.start();
    round.aim(1);
    for (let n = 0; n < 80; n++) round.step(1 / 60, 4);
    expect(round.playerX).toBeGreaterThan(0.85);
    expect(round.playerX).toBeLessThanOrEqual(0.88);
    round.stopMovement();
    const stopped = round.playerX;
    round.step(1 / 60, 4);
    expect(round.playerX).toBe(stopped);
  });

  it('counts a repeated rescue once per instance, fills unique pages and charges magic', () => {
    const round = new RudolphRound(ids, new SeededRandom(1));
    round.start();
    let duplicate = false;
    let captured = 0;
    for (let tick = 0; tick < 20_000 && !duplicate; tick++) {
      const next = round.falling[0];
      if (next) round.aim(next.x);
      for (const event of round.step(1 / 60)) {
        if (event.type === 'caught') {
          captured++;
          duplicate ||= !event.first;
          expect(round.totalRescues).toBe(captured);
          expect(new Set(round.savedPhotoIds).size).toBe(round.savedPhotoIds.length);
        }
      }
    }
    expect(duplicate).toBe(true);
    expect(round.totalRescues).toBeGreaterThan(round.savedPhotoIds.length);
    expect(round.noseCharge).toBe(3);
    expect(round.activateMagic()).toBe(true);
    expect(round.activateMagic()).toBe(false);
    expect(round.noseCharge).toBe(0);
    for (let tick = 0; tick < 181; tick++) round.step(1 / 60, 4);
    expect(round.magicSeconds).toBe(0);
  });

  it('gives missed photos another opportunity without counting a rescue', () => {
    const round = new RudolphRound(ids, new SeededRandom(19));
    round.start();
    round.aim(0);
    const misses: string[] = [];
    const spawns: { photoId: string; sequence: number }[] = [];
    for (let tick = 0; tick < 3000; tick++) {
      for (const event of round.step(1 / 60)) {
        if (event.type === 'spawned')
          spawns.push({ photoId: event.memory.photoId, sequence: spawns.length });
        if (event.type === 'missed') misses.push(event.memory.photoId);
      }
    }
    expect(misses.length).toBeGreaterThan(0);
    expect(spawns.filter((item) => item.photoId === misses[0]).length).toBeGreaterThan(1);
    expect(round.savedPhotoIds.length).toBeLessThan(ids.length);
  });

  it('finishes all unique photos across many seeds and never spawns after finishing', () => {
    for (let seed = 0; seed < 40; seed++) {
      const round = new RudolphRound(ids, new SeededRandom(seed));
      round.start();
      let maxFalling = 0;
      let duplicateInFlight = false;
      for (let tick = 0; tick < 24_000 && round.phase === 'playing'; tick++) {
        const next = [...round.falling].sort((a, b) => b.y - a.y)[0];
        if (next) round.aim(next.x);
        round.step(1 / 60);
        duplicateInFlight ||=
          new Set(round.falling.map((item) => item.photoId)).size !== round.falling.length;
        maxFalling = Math.max(maxFalling, round.falling.length);
      }
      expect(duplicateInFlight, `seed ${seed}`).toBe(false);
      expect(maxFalling, `seed ${seed}`).toBeLessThanOrEqual(2);
      expect(round.phase, `seed ${seed}`).toBe('finishing');
      expect([...round.savedPhotoIds].sort()).toEqual([...ids].sort());
      expect(round.step(1)).toEqual([]);
      expect(round.activateMagic()).toBe(false);
      expect(round.finish()).toBe(true);
      expect(round.finish()).toBe(false);
    }
  });

  it('replays identical inputs and respects presentation backpressure', () => {
    const play = () => {
      const round = new RudolphRound(ids, new SeededRandom(11));
      round.start();
      const events = [];
      for (let tick = 0; tick < 2400; tick++) {
        round.aim(0.5 + Math.sin(tick / 100) * 0.35);
        events.push(...round.step(1 / 60, tick < 600 ? 4 : 0));
        if (tick < 600) expect(round.falling).toHaveLength(0);
      }
      return { events, saved: round.savedPhotoIds, rescues: round.totalRescues };
    };
    expect(play()).toEqual(play());
  });

  it('offers one golden anchor after half the album, without another required page', () => {
    const round = new RudolphRound(ids.slice(0, 4), new SeededRandom(42));
    round.start();
    let goldenOffered = 0;
    let goldenCaught = 0;
    for (let tick = 0; tick < 12_000 && round.phase === 'playing'; tick++) {
      if (round.falling[0]) round.aim(round.falling[0].x);
      for (const event of round.step(1 / 60)) {
        if (event.memory.golden && event.type === 'spawned') {
          goldenOffered++;
          expect(event.memory.photoId).toBe('a');
          expect(round.savedPhotoIds.length).toBeGreaterThanOrEqual(2);
          expect(round.falling).toHaveLength(1);
        }
        if (event.memory.golden && event.type === 'caught') {
          goldenCaught++;
          expect(event.first).toBe(false);
        }
      }
    }
    expect(goldenOffered).toBe(1);
    expect(goldenCaught).toBe(1);
    expect(round.savedPhotoIds).toHaveLength(4);
    expect(round.phase).toBe('finishing');
  });
});

describe('swept capture', () => {
  it('detects crossing the catch band between frames, including a moving Rudolph', () => {
    expect(sweptCatch(0.5, 0.8, 0.5, 1.2, 0.4, 0.6, 0.13)).not.toBeUndefined();
    expect(sweptCatch(0.9, 0.8, 0.9, 1.2, 0.1, 0.1, 0.13)).toBeUndefined();
    expect(sweptCatch(0.5, 0.4, 0.5, 0.6, 0.5, 0.5, 0.13)).toBeUndefined();
  });
});
