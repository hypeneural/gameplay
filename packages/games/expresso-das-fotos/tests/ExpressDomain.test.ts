import { SeededRandom, createViewportLayout } from '@christmas-games/platform';
import { describe, expect, it } from 'vitest';
import {
  EXPRESS_INITIAL_PRESENTATION_EPOCH,
  EXPRESS_RAIL_SPECS,
  arriveAtExpressStation,
  arbitrateExpressStationTap,
  chooseExpressStation,
  createExpressJourney,
  createExpressRoute,
  deliverExpressMemory,
  expressoDasFotosDefinition,
  finishExpressTrackSwitch,
  getCurrentExpressStop,
  getExpressHint,
  getExpressProgress,
  invalidateExpressPresentation,
  issueExpressArrivalToken,
  ownsExpressArrivalToken,
  pauseExpressJourney,
  planExpressLayout,
  planExpressPhotoLoads,
  planExpressRailTravel,
  resumeExpressJourney,
  selectExpressPhotos,
  startExpressJourney,
} from '../src/index.js';

describe('Expresso das Fotos domain', () => {
  it('declares a mixed-orientation, six-photo subset game for the app shell', () => {
    expect(expressoDasFotosDefinition).toMatchObject({
      id: 'expresso-das-fotos',
      minPhotos: 1,
      recommendedPhotos: 6,
      photoSelection: 'subset',
      supportsMixedOrientation: true,
    });
    expect(expressoDasFotosDefinition.shortRule).toContain('foto igual');
  });

  it('always keeps the anchor and chooses underrepresented orientations first', () => {
    const selection = selectExpressPhotos({
      anchor: { id: 'anchor', orientation: 'portrait', catalogPosition: 0 },
      candidates: [
        { id: 'portrait-2', orientation: 'portrait', catalogPosition: 1 },
        { id: 'landscape', orientation: 'landscape', catalogPosition: 2 },
        { id: 'square', orientation: 'square', catalogPosition: 3 },
      ],
      maxDistinctPhotos: 4,
    });

    expect(selection).toEqual({
      anchorPhotoId: 'anchor',
      destinationPhotoIds: ['anchor', 'landscape', 'square', 'portrait-2'],
    });
  });

  it('uses the injected seeded source only for identical catalog priorities', () => {
    const input = {
      anchor: { id: 'anchor', orientation: 'portrait' as const, catalogPosition: 0 },
      candidates: [
        { id: 'landscape-a', orientation: 'landscape' as const, catalogPosition: 1 },
        { id: 'landscape-b', orientation: 'landscape' as const, catalogPosition: 1 },
      ],
      maxDistinctPhotos: 2,
    };

    expect(selectExpressPhotos({ ...input, random: new SeededRandom(17) })).toEqual(
      selectExpressPhotos({ ...input, random: new SeededRandom(17) }),
    );
  });

  it.each([1, 2, 5, 6, 7, 8, 92])(
    'keeps the anchor and bounds the cast for a %i-photo session',
    (count) => {
      const candidates = Array.from({ length: count }, (_, index) => ({
        id: 'photo-' + index,
        orientation: (['portrait', 'landscape', 'square'] as const)[index % 3]!,
        catalogPosition: index,
      }));
      const selection = selectExpressPhotos({
        anchor: candidates[Math.floor(count / 2)]!,
        candidates,
        random: new SeededRandom(88),
      });

      expect(selection.destinationPhotoIds[0]).toBe('photo-' + Math.floor(count / 2));
      expect(selection.destinationPhotoIds.length).toBe(Math.min(count, 6));
      expect(new Set(selection.destinationPhotoIds).size).toBe(
        selection.destinationPhotoIds.length,
      );
    },
  );

  it('loads the anchor at game size and each other authorized photo once at card size', () => {
    expect(
      planExpressPhotoLoads({
        anchorPhotoId: 'anchor',
        destinationPhotoIds: ['anchor', 'portrait', 'anchor', 'landscape', 'portrait'],
      }),
    ).toEqual([
      { photoId: 'anchor', variant: 'game' },
      { photoId: 'portrait', variant: 'card' },
      { photoId: 'landscape', variant: 'card' },
    ]);
  });

  it('builds a bounded reproducible itinerary with one unambiguous target station per stop', () => {
    const first = createExpressRoute(['anchor', 'family', 'tree'], new SeededRandom(41));
    const second = createExpressRoute(['anchor', 'family', 'tree'], new SeededRandom(41));

    expect(first).toEqual(second);
    expect(first.stops).toHaveLength(6);
    expect(first.stops.map((stop) => stop.targetPhotoId)).toEqual([
      'anchor',
      'family',
      'tree',
      'anchor',
      'family',
      'tree',
    ]);

    for (const stop of first.stops) {
      const target = stop.stations[stop.targetStationIndex];
      expect(target).toMatchObject({ availability: 'available', photoId: stop.targetPhotoId });
      expect(
        stop.stations.filter((station) => station.photoId === stop.targetPhotoId),
      ).toHaveLength(1);
      expect(new Set(stop.stations.map((station) => station.stationId)).size).toBe(3);
    }

    for (let index = 2; index < first.stops.length; index += 1) {
      expect(
        first.stops[index - 2]!.targetStationIndex === first.stops[index - 1]!.targetStationIndex &&
          first.stops[index - 1]!.targetStationIndex === first.stops[index]!.targetStationIndex,
      ).toBe(false);
    }
  });

  it('closes unused stations for a one-photo session instead of inventing a second matching card', () => {
    const stop = createExpressRoute(['anchor'], new SeededRandom(12), 1).stops[0]!;
    expect(stop.stations.filter((station) => station.availability === 'available')).toHaveLength(1);
    expect(stop.stations.filter((station) => station.photoId === 'anchor')).toHaveLength(1);
  });

  it('rejects invalid route bounds before a scene is mounted', () => {
    expect(() => createExpressRoute([], new SeededRandom(1))).toThrow('at least one');
    expect(() => createExpressRoute(['anchor', 'anchor'], new SeededRandom(1))).toThrow(
      'distinct photo ids',
    );
    expect(() => createExpressRoute(['anchor'], new SeededRandom(1), 7)).toThrow('one and six');
  });

  it('keeps a wrong station harmless, pauses in flight, and completes every delivery once', () => {
    const route = createExpressRoute(['anchor', 'tree', 'family'], new SeededRandom(4), 2);
    const ready = createExpressJourney(route);
    const awaiting = startExpressJourney(ready).state;
    const firstStop = getCurrentExpressStop(awaiting)!;
    const firstTarget = firstStop.stations[firstStop.targetStationIndex]!;

    expect(getExpressHint(awaiting)).toEqual({
      stationId: firstTarget.stationId,
      photoId: firstStop.targetPhotoId,
    });
    const wrongStation = chooseExpressStation(
      awaiting,
      firstStop.stations.find((station) => station.stationId !== firstTarget.stationId)!.stationId,
    );
    expect(wrongStation).toMatchObject({ accepted: false, rejection: 'wrong-station' });
    expect(wrongStation.state.destinationIndex).toBe(0);

    const switching = chooseExpressStation(wrongStation.state, firstTarget.stationId).state;
    const paused = pauseExpressJourney(switching).state;
    expect(paused).toMatchObject({ phase: 'paused', resumePhase: 'switching-track' });
    expect(getExpressHint(paused)).toBeUndefined();

    const travelling = finishExpressTrackSwitch(resumeExpressJourney(paused).state).state;
    const afterFirst = deliverExpressMemory(arriveAtExpressStation(travelling).state).state;
    expect(afterFirst).toMatchObject({ phase: 'awaiting-station', destinationIndex: 1 });

    const secondStop = getCurrentExpressStop(afterFirst)!;
    const completed = deliverExpressMemory(
      arriveAtExpressStation(
        finishExpressTrackSwitch(
          chooseExpressStation(
            afterFirst,
            secondStop.stations[secondStop.targetStationIndex].stationId,
          ).state,
        ).state,
      ).state,
    ).state;

    expect(completed).toMatchObject({ phase: 'completed', collectedStopIds: ['stop-1', 'stop-2'] });
    expect(getExpressProgress(completed)).toEqual({
      collectedStops: 2,
      totalStops: 2,
      completed: true,
    });
  });

  it('maps one direct touch to a station and blocks input outside the decision phase', () => {
    const layout = planExpressLayout(createViewportLayout(390, 844));
    const journey = startExpressJourney(
      createExpressJourney(
        createExpressRoute(['anchor', 'tree', 'family'], new SeededRandom(3), 1),
      ),
    ).state;
    const center = layout.stations['station-center'];

    expect(
      arbitrateExpressStationTap(journey, layout, {
        x: center.x + center.width / 2,
        y: center.y + center.height / 2,
      }),
    ).toEqual({ kind: 'choose-station', stationId: 'station-center' });
    expect(
      arbitrateExpressStationTap({ ...journey, phase: 'travelling' }, layout, {
        x: center.x + center.width / 2,
        y: center.y + center.height / 2,
      }),
    ).toEqual({ kind: 'ignored' });
    expect(center.width).toBeGreaterThanOrEqual(64);
    expect(center.height).toBeGreaterThanOrEqual(64);
  });

  it('keeps the rail specs normalized and plans a path-length proportional travel', () => {
    for (const rail of Object.values(EXPRESS_RAIL_SPECS)) {
      expect(rail.start.x).toBeGreaterThanOrEqual(0);
      expect(rail.start.x).toBeLessThanOrEqual(1);
      expect(rail.start.y).toBeGreaterThanOrEqual(0);
      expect(rail.start.y).toBeLessThanOrEqual(1);
    }
    expect(
      planExpressRailTravel(500, {
        baseDurationMs: 190,
        minimumDurationMs: 420,
        millisecondsPerPixel: 0.72,
      }),
    ).toEqual({ railLengthPx: 500, durationMs: 550 });
  });

  it('invalidates a stale presentation callback before resize, pause or exit can settle it', () => {
    const issued = issueExpressArrivalToken(EXPRESS_INITIAL_PRESENTATION_EPOCH);
    expect(ownsExpressArrivalToken(issued.state, issued.token)).toBe(true);
    expect(ownsExpressArrivalToken(invalidateExpressPresentation(issued.state), issued.token)).toBe(
      false,
    );
  });
});
