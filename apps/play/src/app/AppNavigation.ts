export interface SessionRoute {
  kind: 'session';
  token: string;
}

export interface GameCoverRoute {
  kind: 'game-cover';
  token: string;
  gameId: string;
}

interface ThemeLabRoute {
  kind: 'theme-lab';
}

interface ExperienceLabRoute {
  kind: 'experience-lab';
}

interface AssetLabRoute {
  kind: 'asset-lab';
}

interface PerformanceLabRoute {
  kind: 'performance-lab';
}

export type AppRoute =
  | SessionRoute
  | GameCoverRoute
  | ThemeLabRoute
  | ExperienceLabRoute
  | AssetLabRoute
  | PerformanceLabRoute;

const fallbackSessionRoute: SessionRoute = { kind: 'session', token: 'local-demo-token' };

/** Parses only public route identifiers; run ids and photo paths never enter the URL. */
export function parseAppRoute(pathname: string): AppRoute {
  const segments = pathname.split('/').filter(Boolean);
  if (segments[0] === '__dev' && segments[1] === 'theme') return { kind: 'theme-lab' };
  if (segments[0] === '__dev' && segments[1] === 'experience') return { kind: 'experience-lab' };
  if (segments[0] === '__dev' && segments[1] === 'assets') return { kind: 'asset-lab' };
  if (segments[0] === '__dev' && segments[1] === 'performance') return { kind: 'performance-lab' };
  if (segments[0] !== 's' || !segments[1]) return fallbackSessionRoute;

  const token = decodeSegment(segments[1]);
  if (segments[2] === 'game' && segments[3]) {
    return { kind: 'game-cover', token, gameId: decodeSegment(segments[3]) };
  }
  return { kind: 'session', token };
}

export function routePath(route: SessionRoute | GameCoverRoute): string {
  const token = encodeURIComponent(route.token);
  return route.kind === 'session'
    ? `/s/${token}`
    : `/s/${token}/game/${encodeURIComponent(route.gameId)}`;
}

export function sameRoute(first: AppRoute, second: AppRoute): boolean {
  if (first.kind !== second.kind) return false;
  if (
    first.kind === 'theme-lab' ||
    first.kind === 'experience-lab' ||
    first.kind === 'asset-lab' ||
    first.kind === 'performance-lab' ||
    second.kind === 'theme-lab' ||
    second.kind === 'experience-lab' ||
    second.kind === 'asset-lab' ||
    second.kind === 'performance-lab'
  ) {
    return true;
  }
  return (
    first.token === second.token &&
    (first.kind === 'session' || first.gameId === (second as GameCoverRoute).gameId)
  );
}

function decodeSegment(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
