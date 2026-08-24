import type {
  Analytics,
  AnalyticsEvent,
  Clock,
  Haptics,
  Photo,
  Session,
} from '../contracts/index.js';

export class FixedClock implements Clock {
  constructor(private readonly value = 0) {}

  now(): number {
    return this.value;
  }
}

export class MemoryAnalytics implements Analytics {
  readonly events: AnalyticsEvent[] = [];

  track(event: AnalyticsEvent): void {
    this.events.push(event);
  }
}

export const noOpHaptics: Haptics = {
  async impact(): Promise<void> {
    return undefined;
  },
};

function fixturePhoto(index: number, orientation: 'portrait' | 'landscape'): Photo {
  const width = orientation === 'portrait' ? 500 : 700;
  const height = orientation === 'portrait' ? 700 : 500;
  const url = `/fixtures/${orientation}.svg`;

  return {
    id: `ph_${String(index).padStart(3, '0')}`,
    width,
    height,
    aspectRatio: width / height,
    orientation,
    variants: { thumb: url, card: url, game: url },
  };
}

export function createFixtureSession(count: 4 | 12 | 120 | 172): Session {
  const photos = Array.from({ length: count }, (_, index) =>
    fixturePhoto(index + 1, index % 2 === 0 ? 'portrait' : 'landscape'),
  );
  return {
    id: `session-${count}${count === 12 || count === 120 || count === 172 ? '-mixed' : ''}`,
    publicToken: 'local-demo-token',
    displayName: 'Sessão de Natal',
    photos,
  };
}
