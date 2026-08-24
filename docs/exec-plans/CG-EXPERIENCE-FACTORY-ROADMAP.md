# CG-EXPERIENCE-FACTORY — implementation roadmap

## Purpose

Turn the validated game-factory foundation into a production-ready path for many personalized photo games, while keeping the first real game (`Puzzle Swap 2.0`) small, testable and usable by children. This is an execution plan: no licensed audio, customer imagery, database choice or speculative game framework is included.

## Preconditions and fixed constraints

- The source corpus has mixed orientation and session counts from 5 to 92 photos at p90/max extremes that matter to a game; all game UI must remain proportional and select a bounded active subset where applicable.
- `apps/play` is the only composition root. `packages/platform` never imports Phaser or a concrete game.
- Original photos remain outside the web root. A game receives only authorized derived variants through `GameContext`.
- Phaser game destruction is asynchronous. A route must never create another game canvas before the old controller's destruction promise completes.
- A child-facing primary action is at least 52 CSS px; an explicitly secondary control may use 44 CSS px.

## Official validation that shapes the work

| Topic                    | Primary source                                                                                                                                                                                                            | Applied decision                                                                                                      |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Phaser destruction       | [Phaser `Game.destroy`](https://docs.phaser.io/api-documentation/class/game#destroy)                                                                                                                                      | Retain the mount lease through the `DESTROY` event and keep `noReturn: false`, because the SPA creates later games.   |
| Canvas layout            | [Phaser Scale Manager](https://docs.phaser.io/phaser/concepts/scale-manager)                                                                                                                                              | The React parent owns a bounded, padding-free game stage; Phaser `RESIZE` owns the canvas within it.                  |
| Dragging accessibility   | [WCAG 2.2 SC 2.5.7](https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html)                                                                                                                                  | A non-drag single-pointer alternative is mandatory unless drag is genuinely essential. Puzzle uses tap–tap.           |
| Phaser input thresholds  | [Phaser `InputPlugin`](https://docs.phaser.io/api-documentation/class/input-inputplugin)                                                                                                                                  | A `TouchProfile` sets initial distance/time thresholds and each game records tested overrides.                        |
| Audio sprites and unlock | [Phaser audio concepts](https://docs.phaser.io/phaser/concepts/audio) and [WebAudioSoundManager](https://docs.phaser.io/api-documentation/class/sound-webaudiosoundmanager)                                               | Phaser owns autoplay unlock on first interaction; audio remains optional and silent-safe until licensed assets exist. |
| Particles and filters    | [Phaser `ParticleEmitter`](https://docs.phaser.io/api-documentation/class/gameobjects-particles-particleemitter) and [FilterList](https://docs.phaser.io/api-documentation/4.0.0/class/gameobjects-components-filterlist) | Use finite feedback bursts explicitly; post-FX is optional because filters are WebGL-only.                            |

The 52 px primary target, 16 px / 200 ms initial drag thresholds and 7 s idle-assist value are product defaults to measure with real users. They are not claimed to be mandated by Phaser or WCAG.

## Work package A — lifecycle correction and safe prefetch

**Status: implemented and validated by fast checks.**

1. Keep `loadGameRuntime()` in `apps/play/src/phaser/createGame.ts` entirely side-effect free: it imports Phaser and the selected module but creates no game.
2. Acquire `PhaserMountCoordinator` only after loading finishes in `PhaserHost`.
3. Allow `GameModule.create()` to return either a controller or a promise. If React unmounts while creation is in flight, await the returned controller, destroy it, then release the lease.
4. Prefetch the chosen game on intentional `pointerdown` and keyboard focus from the Hub. The same module promise is reused by browser module caching on play.
5. Require every controller to resolve `destroy()` only when Phaser emits `Core.Events.DESTROY`.

**Proof:** `pnpm check:fast`; existing enter/exit browser coverage; a manual race review covering unmount before import, after lease acquisition and during asynchronous module creation.

## Work package B — shell and navigation before a real game

**Goal:** replace the development-only entry with a semantic, mobile-safe product shell.

**Current status:** the first P0 slice is implemented: static metadata drives the Hub card and React cover; the shell supports `/s/:token` and `/s/:token/game/:gameId`; loading/error chrome surrounds one padding-free Phaser stage; explicit exit and browser Back wait for the host destruction path. A 390 px review found and corrected unbounded thumbnail height, an unclear photo-selection action and loss of the local-review query during routing; the Hub now has a bounded two-column mobile gallery and fixed 52 px “Jogar agora” action. The PWA, deployment recovery and WebKit evidence remain future release work.

1. Introduce an app route model for `hub → cover → run`. Store only safe identifiers in the URL: session public token and installed game id; `runId` remains internal. Never expose source paths, photo filenames or client names.
2. Add `GameCover` in React: static cover image/gradient, game name, a one-sentence first rule, reduced-motion-safe fade and an explicit play button. The cover does not instantiate Phaser.
3. Split the current host chrome into `GameScreen`: semantic header, status text, exit button and one `phaser-host` stage. The stage's direct parent has a definite width/height and no padding/border that affects Phaser layout.
4. On an in-app exit or browser back, await controller destruction before committing the route to Hub. On a load failure, show retry and return-to-cover actions; retries are bounded by the asset policy.
5. Generalize Hub game cards so each installed game controls its own prefetch and cover metadata. Do not prefetch derivatives merely because a photo card became visible.

**Files expected:** `apps/play/src/app/*`, `apps/play/src/screens/GameCover.tsx`, `GameScreen.tsx`, `Hub.tsx`, `phaser/PhaserHost.tsx`, and Playwright route tests.

**Exit tests:** browser Back during loading and during play leaves zero canvas; double-tapping play creates one canvas; stale Vite chunk receives one recovery attempt; portrait and landscape screenshots preserve one visible stage.

## Work package C — small Game Experience v0 and Experience Lab

**Goal:** provide consistent feedback without a universal `BaseScene` or a game-rule framework.

**Current status:** pure composition is implemented and unit-tested under `packages/theme/src/game-feel/`; `/__dev/experience` is browser-tested with deterministic query settings. It deliberately uses a React preview port first. A Phaser adapter must be added only with Puzzle, where its tween/particle resources can be registered in that game's `SceneScope`.

1. Add these focused files under `packages/theme/src/game-feel/`:

   - `MotionTokens.ts`: initial duration/easing values and reduced-motion substitutions.
   - `TouchProfile.ts`: primary/secondary target minimums, drag thresholds and idle-assist default.
   - `SfxCues.ts`: names and volume policy only; no asset URLs.
   - `ParticlePresets.ts`: pure ambient, feedback and finite-celebration preset data.
   - `FeedbackDirector.ts`: maps `tap | correct | wrong | hint | celebrate` to a bounded tween, haptic call, optional sound call and optional particle action.
   - `ChristmasEffects.ts`: a thin convenience composition used only after Puzzle proves it is useful.

2. Keep Phaser as a type-only dependency of the director or, if that proves awkward, inject a narrow scene port from each game. Theme must not construct a game, own navigation or store a scene after `SHUTDOWN`.
3. Every effect registers its tween, timer, listener and generated texture through the calling scene's `SceneScope`. The director returns no background loop and exposes no global singleton.
4. Add `__dev/experience?quality=LOW|NORMAL|HIGH&motion=reduce|full&seed=<n>` with deterministic visual inputs. It is a lab route, never a hidden production game. Test the pure tokens/presets with Vitest and the rendered route with Playwright screenshots.
5. Define quality behavior before adding graphics:

   | Mode   | Ambient         | Interaction feedback          | Celebration / post-FX                 |
   | ------ | --------------- | ----------------------------- | ------------------------------------- |
   | LOW    | none            | small finite functional burst | no post-FX; short static confirmation |
   | NORMAL | bounded snow    | bounded feedback burst        | finite celebration; no assumed filter |
   | HIGH   | measured opt-in | bounded feedback burst        | optional post-FX only on WebGL        |

6. Respect reduced motion independently of quality: keep confirmation and readability, remove oscillation, repeated ambient movement and looping celebration.

**Exit tests:** each named cue does not outlive `SceneScope`; LOW/reduced modes show no decorative emitter or filter; repeated lab entry/exit leaves one-or-zero canvases as appropriate; deterministic query inputs produce stable screenshots.

## Work package D — factory ergonomics for many games

**Goal:** a new game is generated consistently but becomes available to a build only through an explicit product decision.

1. Keep `pnpm game:new <id>` non-registering. It creates `domain/`, `runtime/phaser/`, `tuning.ts` and `SPEC.md`; the template records child usability and lifecycle acceptance up front.
2. Add `pnpm game:new <id> --register` as a later explicit operation, never as the default. Before writing it, validate all intended edits; then update only documented markers in:

   - `apps/play/package.json` (workspace dependency),
   - `apps/play/vite.config.ts` (source alias),
   - `apps/play/src/phaser/gameRegistry.ts` (lazy loader).

   The workspace glob already discovers `packages/games/*`; it requires no edit. If a marker is absent or the game is already registered, fail without partial registration. A dry run prints all three edits.

3. Add `pnpm game:validate <id>` after registration exists. It verifies identifier/package consistency, required exports, `SPEC.md` acceptance IDs, `tuning.ts`, lazy registry membership, dependency/alias parity and no platform-to-game import. It calls the existing type, lint and selected unit checks rather than duplicating them.
4. Add generator fixture tests for plain creation, dry run, explicit registration, already-registered failure and malformed marker failure. Validate a freshly generated module through a temporary workspace fixture before exposing `--register`.

**Exit tests:** a generated unregistered game cannot be routed to; an explicitly registered game builds as a lazy chunk; `game:validate` catches each missing composition edit; no generator command overwrites an existing game.

## Work package E — Puzzle Swap 2.0 as the first real proof

**Progress (2026-08-23):** [x] pure deterministic board, injected-Random shuffle, tap–tap command mapping, accessible progress, adaptive grid planning and injected-Clock idle assist; [x] a lazy Phaser runtime loads one selected-photo texture, adds proportional frames, supports pointer drag/tap mapping, native Christmas HUD, relaxed timer, hint, pause, win overlay, finite feedback and safe teardown; [x] an operator can create an opaque loopback-only test session from real local derivatives without source paths/names entering the app; [x] the Hub and real local-review flow are visually checked at 390 × 844 with bounded photo tiles, an immediate play action and no browser-console error; [-] completion-path, actual LOW/reduced-motion, five-exit and bounded asset-recovery evidence remain open.

1. Freeze the current SPEC with grid sizes, deterministic shuffle, one photo texture, portrait/landscape layout, drag and tap–tap interaction, 52 px primary hit areas, idle assist and relaxed-time policy.
2. Implement and test `PuzzleBoard`, `GridPlanner` and `Swap` without Phaser. Test legal swaps, replayable shuffle, solved-state detection, progress copy and no-solution idle hint selection.
3. Implement the Phaser adapter around one source texture and geometry. Configure input from `TouchProfile`; on every accepted move emit named feedback through Experience v0. The runtime must retain no full-resolution original or individual image-per-cell load.
4. Use `PhotoSurface` by default. If a game-specific crop is needed, document its focal rule and test it with portrait and landscape fixtures before rendering.
5. Add mobile Playwright evidence for drag, tap–tap, hint, reduced motion, LOW quality, asset retry and five enter/exit cycles on 390×844, 412×915, 430×932 and 768×1024.

**Exit condition:** Puzzle is a product-quality game, not a Theme Lab visual proof: an understandable first action, correct feedback without punishment, visual loading/retry/exit states, no leak after repeated runs and linked screenshot/trace evidence.

## Release work retained after Puzzle

1. Add manifest, install affordance, cache versioning and offline/error route. Cache static app shell only until the authorized-derivative privacy review approves specific media behavior.
2. Add WebKit and high-DPI device evidence to CI after explicitly installing and stabilizing its browsers.
3. Measure target VPS/browser/device performance before making FPS, memory or chunk-size budgets blocking. The current Phaser lazy chunk is a measured observation, not a budget.
4. Only after Puzzle, Memory and Tic-Tac-Toe demonstrate repetition, decide whether a convenience API from Experience v0 is truly shared. Do not introduce a superclass scene hierarchy.

## Final command and evidence checklist

For each completed work package, run `pnpm check:fast` during implementation, then `pnpm check`, `pnpm build` and the relevant Playwright suite before closing it. At the full-release gate, run `pnpm validate` on Node 24 and retain the screenshot/trace artifacts outside product source. No evidence may contain customer photos, names, telephone numbers, absolute source paths or authorization URLs.
