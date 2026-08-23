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
  const label = `${orientation === 'portrait' ? 'PORTRAIT' : 'LANDSCAPE'} ${String(index).padStart(2, '0')}`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="${orientation === 'portrait' ? '#8f1d35' : '#0f4a3c'}"/><text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" font-family="Arial" font-size="42" font-weight="700" fill="#f8dfa0">${label}</text></svg>`;
  const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

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
