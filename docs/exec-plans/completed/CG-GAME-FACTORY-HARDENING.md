# CG-GAME-FACTORY-HARDENING execution record

## Completed — 2026-08-23

This increment converts the initial React↔Phaser proof into a reusable game-factory foundation. It does not claim that Puzzle, Memory or production media authorization are implemented.

## Delivered

1. `GameDefinition`, generic `GameModule`, and an open game-id contract remove the central edit required to create an isolated game.
2. `GameRunController`/`ActiveGameClock` make lifecycle telemetry idempotent and exclude hidden time. The host creates one run per Phaser host instance, which is safe under React Strict Mode.
3. `PageVisibilityController`, `SceneScope`, `AssetLoader`, `AudioManager`, haptic cues, touch geometry, proportional `PhotoSurface` and a one-way `FrameBudgetMonitor` establish tested runtime policy.
4. Dev smoke now exercises the real run and scene-scope seams.
5. `pnpm game:new <kebab-id>` safely renders an isolated package starter; `--dry-run` was exercised with `photo-bingo` and wrote nothing.
6. Hub selection is explicit and a 120-photo fixture grows from a 12-card intersection-observer window; browsing remains thumbnail-only.
7. The media worker now validates input bytes/opaque photo ids, stages complete variants, publishes with same-directory rename, writes manifests via a sibling temporary file and isolates failed batch items.
8. `pnpm media:inspect` provides a read-only, nested-folder-excluding corpus baseline. The inspected source remains outside this repository.

## Evidence

- `pnpm media:inspect <requested-root> --sample-per-session 3`: 66 sessions, 1,329 direct photos and a 198-header stratified sample. Details are in `docs/media/PHOTO_CORPUS_BASELINE.md`.
- `pnpm game:new photo-bingo --dry-run`: listed only the five expected starter files.
- `pnpm validate` passed on Node 24: strict typecheck, lint, 25 unit tests, dependency-cruiser (63 modules / 80 dependencies), Knip, formatting, repository map, production build and 12 Playwright scenarios across iPhone 390, Android 412, large phone 430 and tablet 768. Browser suite: 2.1 minutes.
- The production build keeps Phaser in a lazy chunk. Vite reports it as 1,375.61 kB / 357.99 kB gzip; the Hub chunk is 201.30 kB / 63.96 kB gzip. This is a measured warning to monitor, not a failing budget until target-device measurements establish one.

## Corrections found during validation

React Strict Mode runs a development mount-cleanup-remount cycle. Sharing one `GameRun` through the app context incorrectly left the second mount in `GAME_EXITED`. The host now creates the run and active clock per concrete Phaser host instance. The failing lifecycle scenario then passed across all four viewports.

The intersection sentinel can legitimately advance from 12 to 24 cards when it is near the viewport. The browser assertion checks progressive behavior (less than the 120-photo session total), not an implementation-fragile exact first-frame count.

## Deferred, explicit next authority

- A backend/database choice, per-photo lease, stale-staging cleanup policy, retry/dead-letter queue and Nginx authorization integration.
- A Phaser SoundManager adapter when the first selected game has licensed audio assets.
- An analytics transport after the destination and privacy review are authorized.
- Target-device performance benchmarks before enforcing FPS or bundle budgets.
- Puzzle Swap 2.0 only after its SPEC is selected as the next scoped implementation.
