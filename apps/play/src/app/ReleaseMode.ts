export type BrowserReleaseMode = 'development' | 'staging-demo' | 'production-disabled';

interface ViteReleaseEnvironment {
  readonly DEV: boolean;
  readonly PROD: boolean;
  readonly MODE: string;
}

/**
 * Production customer sessions are intentionally disabled until the real
 * session authority is wired. The only production-like mode currently allowed
 * by the browser is an explicit staging-demo build with synthetic fixtures.
 */
export function resolveBrowserReleaseMode(environment: ViteReleaseEnvironment): BrowserReleaseMode {
  if (environment.DEV) return 'development';
  if (environment.PROD && environment.MODE === 'staging-demo') return 'staging-demo';
  return 'production-disabled';
}
