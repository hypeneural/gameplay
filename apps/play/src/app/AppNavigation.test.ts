import { describe, expect, it } from 'vitest';
import { parseAppRoute, routePath, sameRoute } from './AppNavigation.js';

describe('AppNavigation', () => {
  it('keeps the public session, gallery and selected game in stable paths', () => {
    expect(parseAppRoute('/s/local-demo-token')).toEqual({
      kind: 'session',
      token: 'local-demo-token',
    });
    expect(parseAppRoute('/s/local-demo-token/fotos')).toEqual({
      kind: 'gallery',
      token: 'local-demo-token',
    });
    expect(parseAppRoute('/s/local-demo-token/game/dev-smoke')).toEqual({
      kind: 'game-cover',
      token: 'local-demo-token',
      gameId: 'dev-smoke',
    });
    expect(routePath({ kind: 'gallery', token: 'token with space' })).toBe(
      '/s/token%20with%20space/fotos',
    );
    expect(routePath({ kind: 'game-cover', token: 'token with space', gameId: 'dev-smoke' })).toBe(
      '/s/token%20with%20space/game/dev-smoke',
    );
  });

  it('recognizes isolated development labs and rejects unknown route shapes safely', () => {
    expect(parseAppRoute('/__dev/theme')).toEqual({ kind: 'theme-lab' });
    expect(parseAppRoute('/__dev/experience')).toEqual({ kind: 'experience-lab' });
    expect(parseAppRoute('/__dev/assets')).toEqual({ kind: 'asset-lab' });
    expect(parseAppRoute('/__dev/performance')).toEqual({ kind: 'performance-lab' });
    expect(parseAppRoute('/unexpected')).toEqual({ kind: 'session', token: 'local-demo-token' });
  });

  it('compares route identity without exposing a run or photo identifier', () => {
    expect(
      sameRoute(
        { kind: 'gallery', token: 'session' },
        { kind: 'gallery', token: 'session' },
      ),
    ).toBe(true);
    expect(
      sameRoute(
        { kind: 'game-cover', token: 'session', gameId: 'dev-smoke' },
        { kind: 'game-cover', token: 'session', gameId: 'dev-smoke' },
      ),
    ).toBe(true);
    expect(
      sameRoute(
        { kind: 'game-cover', token: 'session', gameId: 'dev-smoke' },
        { kind: 'session', token: 'session' },
      ),
    ).toBe(false);
  });
});
