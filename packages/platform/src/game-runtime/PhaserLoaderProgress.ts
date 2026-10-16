import type { GameRun } from '../contracts/index.js';
import type { SceneScope } from './SceneScope.js';

export interface PhaserLoaderLike {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  on(event: string, fn: (...args: any[]) => void, context?: unknown): unknown;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  off(event: string, fn: (...args: any[]) => void, context?: unknown): unknown;
}

/**
 * Structural adapter that connects a Phaser.Loader.LoaderPlugin to GameRun
 * without importing Phaser inside @christmas-games/platform.
 *
 * - Caps asset download progress at 95% ('loading_assets') so the UI never
 *   claims 100% completion while Scene.create() is still building textures.
 * - Transitions to 'preparing_scene' (96%) when the initial loader batch
 *   completes, leaving true readiness exclusively to GAME_READY.
 * - Automatically detaches listeners via SceneScope and ignores dynamic file
 *   loads that happen after the run has already reached 'ready' or 'started'.
 */
export function bindLoaderProgress(
  loader: PhaserLoaderLike,
  scope: SceneScope,
  run: GameRun,
): void {
  if (!run.loadProgress) return;

  let highestProgress = 0;

  const onProgress = (rawProgress: unknown): void => {
    if (run.state !== 'idle' && run.state !== 'opened') return;
    if (typeof rawProgress !== 'number' || !Number.isFinite(rawProgress)) return;
    const bounded = Math.max(0, Math.min(1, rawProgress));
    const scaled = Math.min(0.95, bounded * 0.95);
    if (scaled < highestProgress) return;
    highestProgress = scaled;
    run.loadProgress?.(highestProgress, 'loading_assets');
  };

  const onComplete = (): void => {
    if (run.state !== 'idle' && run.state !== 'opened') return;
    highestProgress = Math.max(highestProgress, 0.96);
    run.loadProgress?.(highestProgress, 'preparing_scene');
  };

  loader.on('progress', onProgress);
  loader.on('complete', onComplete);
  scope.add(() => {
    loader.off('progress', onProgress);
    loader.off('complete', onComplete);
  });
}
