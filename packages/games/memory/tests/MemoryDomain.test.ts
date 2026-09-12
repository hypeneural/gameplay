import { SeededRandom, createViewportLayout } from '@christmas-games/platform';
import { describe, expect, it } from 'vitest';
import {
  canRevealMemoryCard,
  createMemoryDeck,
  createMemoryTurn,
  memoryDefinition,
  memoryMusicDuckForCue,
  memorySoundRateForCue,
  pairCountForMemoryDifficulty,
  planMemoryBoardLayout,
  planMemoryCardMaterial,
  selectMemoryCard,
  selectMemoryPhotos,
  settleMemoryTurn,
} from '../src/index.js';

const pairIds = ['anchor', 'family', 'tree', 'lights'] as const;

describe('Memory domain', () => {
  it('declares a four-photo subset game for the app shell', () => {
    expect(memoryDefinition).toMatchObject({
      id: 'memory',
      minPhotos: 4,
      recommendedPhotos: 4,
      photoSelection: 'subset',
    });
  });

  it('keeps the chosen photo in a bounded, reproducible four-photo subset', () => {
    const candidates = Array.from({ length: 120 }, (_, index) => ({
      id: `photo-${index}`,
      catalogPosition: index,
      orientation:
        index % 3 === 0
          ? ('square' as const)
          : index % 2 === 0
            ? ('portrait' as const)
            : ('landscape' as const),
    }));
    const first = selectMemoryPhotos({
      anchorId: 'photo-37',
      candidates,
      pairCount: 4,
      random: new SeededRandom(73),
    });
    const second = selectMemoryPhotos({
      anchorId: 'photo-37',
      candidates,
      pairCount: 4,
      random: new SeededRandom(73),
    });

    expect(first).toEqual(second);
    expect(first).toHaveLength(4);
    expect(first[0]?.id).toBe('photo-37');
    expect(new Set(first.map((photo) => photo.id)).size).toBe(4);
  });

  it('only expands to six pairs after the shell asks for more cards', () => {
    expect(pairCountForMemoryDifficulty()).toBe(4);
    expect(pairCountForMemoryDifficulty('normal')).toBe(4);
    expect(pairCountForMemoryDifficulty('desafio')).toBe(6);
    expect(createMemoryDeck(['a', 'b', 'c', 'd', 'e', 'f'], new SeededRandom(12))).toHaveLength(12);
  });

  it('cycles sound variations deterministically and reserves the deepest music duck for victory', () => {
    expect(memorySoundRateForCue('pair.match', 0)).toBe(0.96);
    expect(memorySoundRateForCue('pair.match', 1)).toBe(1);
    expect(memorySoundRateForCue('pair.match', 2)).toBe(1.04);
    expect(memorySoundRateForCue('pair.match', 3)).toBe(0.96);
    expect(memoryMusicDuckForCue('pair.match')?.targetVolume).toBe(0.09);
    expect(memoryMusicDuckForCue('winter.win')?.targetVolume).toBe(0.065);
    expect(memoryMusicDuckForCue('winter.win')?.restoreDurationMs).toBe(420);
  });

  it('creates exactly two cards per unique pair source and rejects duplicate sources', () => {
    const deck = createMemoryDeck(pairIds, new SeededRandom(12));

    expect(deck).toHaveLength(8);
    expect(deck.filter((card) => card.pairId === 'anchor')).toHaveLength(2);
    expect(() => createMemoryDeck(['same', 'same'], new SeededRandom(12))).toThrow(
      'unique pair ids',
    );
  });

  it('settles matching and mismatching cards without ever allowing a third open card', () => {
    const turn = createMemoryTurn([
      { id: 'a-left', pairId: 'a' },
      { id: 'a-right', pairId: 'a' },
      { id: 'b-left', pairId: 'b' },
      { id: 'b-right', pairId: 'b' },
    ]);
    const first = selectMemoryCard(turn, 'a-left');
    const match = selectMemoryCard(first.state, 'a-right');

    expect(match.resolution).toBe('match');
    expect(selectMemoryCard(match.state, 'b-left')).toMatchObject({
      accepted: false,
      rejection: 'not-selectable',
    });
    const afterMatch = settleMemoryTurn(match.state);
    expect(afterMatch.matchedPairs).toBe(1);
    expect(afterMatch.cards.filter((card) => card.status === 'matched')).toHaveLength(2);

    const mismatchTurn = createMemoryTurn([
      { id: 'a-left', pairId: 'a' },
      { id: 'a-right', pairId: 'a' },
      { id: 'b-left', pairId: 'b' },
      { id: 'b-right', pairId: 'b' },
    ]);
    const mismatchFirst = selectMemoryCard(mismatchTurn, 'b-left');
    const mismatch = selectMemoryCard(mismatchFirst.state, 'a-left');
    expect(mismatch.resolution).toBe('mismatch');
    expect(
      settleMemoryTurn(mismatch.state).cards.find((card) => card.id === 'b-left')?.status,
    ).toBe('down');
  });

  it('refuses an impossible turn deck before presentation is created', () => {
    expect(() =>
      createMemoryTurn([
        { id: 'only-one', pairId: 'unpaired' },
        { id: 'other-left', pairId: 'other' },
      ]),
    ).toThrow('exactly two cards');
  });

  it('keeps presentation-only pause and hinting out of the domain truth', () => {
    const turn = createMemoryTurn(createMemoryDeck(pairIds, new SeededRandom(4)));
    const cardId = turn.cards[0]!.id;

    expect(canRevealMemoryCard(turn, cardId, { paused: true, hinting: false })).toBe(false);
    expect(canRevealMemoryCard(turn, cardId, { paused: false, hinting: true })).toBe(false);
    expect(canRevealMemoryCard(turn, cardId, { paused: false, hinting: false })).toBe(true);
  });

  it.each([
    [390, 844],
    [412, 915],
    [430, 932],
    [768, 1024],
  ])('keeps 8-card targets touch-safe at %ix%i', (width, height) => {
    const layout = planMemoryBoardLayout(createViewportLayout(width, height), 8);

    expect(layout.cardWidth).toBeGreaterThanOrEqual(52);
    expect(layout.cardHeight).toBeGreaterThanOrEqual(52);
    expect(layout.placements).toHaveLength(8);
  });

  it('uses three comfortable columns in phone portrait and centers the final pair', () => {
    const layout = planMemoryBoardLayout(createViewportLayout(390, 844), 8);
    const finalPair = layout.placements.slice(-2);

    expect(layout.columns).toBe(3);
    expect(layout.rows).toBe(3);
    expect(layout.cardWidth).toBeGreaterThanOrEqual(88);
    expect(finalPair).toHaveLength(2);
    expect((finalPair[0]!.x + finalPair[1]!.x) / 2).toBeCloseTo(195);
  });

  it('uses the same three-column rhythm for the future 12-card board', () => {
    const layout = planMemoryBoardLayout(createViewportLayout(412, 915), 12);

    expect(layout.columns).toBe(3);
    expect(layout.rows).toBe(4);
    expect(layout.cardWidth).toBeGreaterThanOrEqual(88);
  });

  it('falls back to two columns only when three would make cards too narrow', () => {
    const layout = planMemoryBoardLayout(createViewportLayout(300, 720), 8);

    expect(layout.columns).toBe(2);
    expect(layout.rows).toBe(4);
  });

  it('uses four comfortable columns on a tablet', () => {
    const layout = planMemoryBoardLayout(createViewportLayout(768, 1024), 8);

    expect(layout.columns).toBe(4);
    expect(layout.rows).toBe(2);
    expect(layout.cardWidth).toBeGreaterThanOrEqual(104);
  });

  it.each([8, 12])('keeps %i photos readable and inside a short phone canvas', (count) => {
    const viewport = createViewportLayout(336, 552);
    const layout = planMemoryBoardLayout(viewport, count);
    expect(layout.cardWidth).toBeGreaterThanOrEqual(60);
    expect(layout.columns).toBeGreaterThan(2);
    for (const point of layout.placements) {
      expect(point.y + layout.cardHeight / 2).toBeLessThanOrEqual(
        viewport.height - viewport.safeBottom,
      );
    }
  });

  it.each([
    [88, 110],
    [104, 130],
    [160, 200],
  ])('keeps each Card Lab material inside a %ix%i card', (width, height) => {
    const material = planMemoryCardMaterial(width, height);

    expect(material.frameInset).toBeGreaterThan(0);
    expect(material.backInnerWidth).toBeLessThan(width);
    expect(material.backInnerHeight).toBeLessThan(height);
    expect(material.backSealDiameter).toBeLessThanOrEqual(material.backInnerWidth);
    expect(material.backRibbonHeight).toBeLessThan(height);
    expect(material.matchMarkInset).toBeGreaterThan(0);
  });

  it('rejects an invalid size before a visual card is created', () => {
    expect(() => planMemoryCardMaterial(0, 110)).toThrow('positive finite size');
  });
});
