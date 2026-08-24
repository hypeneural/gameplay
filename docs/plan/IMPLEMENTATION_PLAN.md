# Implementation plan — reusable personalized photo-game factory

## Product outcome

The product is a mobile-first, local-VPS factory for small personalized games built from one photography session. It must support 5-photo and 120+ photo sessions without changing a game’s rules, preserve portrait and landscape photography, and allow a new game to be added without modifying an existing game package.

The current seasonal presentation remains Christmas. The factory contracts themselves are season-neutral; a `ThemePack` abstraction is introduced only when a second real season needs it, rather than performing a speculative repository-wide rename.

## Decisions locked by source validation

- **Engine/runtime:** Phaser 4.2.1, React 19, Vite 8, TypeScript 6 strict, pnpm and Node 24 in CI/VPS.
- **Photos:** originals stay outside the webroot; Sharp/libvips creates local `thumb` (480px), `card` (800px) and `game` (1600px) WebP derivatives, preserving EXIF-normalized aspect ratio.
- **Privacy:** the application authorizes a derived variant before Nginx serves it through `X-Accel-Redirect` to an `internal` location.
- **Scalability:** a game has a `GameDefinition`, a `GameModule`, an isolated package and a SPEC. `apps/play` is the only composition root.
- **Run time:** Phaser owns its visibility-aware render loop; the product owns active play time, bridge events, analytics and scene-resource ownership.

The implementation sources for these decisions are recorded in [the original validation](../references/OFFICIAL_VALIDATION.md) and [the Game Factory validation](../references/PHASE_9_5_OFFICIAL_VALIDATION.md).

## Measured input baseline

The Mother’s Day read-only scan found 66 sessions and 1,329 direct production-format candidates. Sessions range from 5 to 172 photos (median 15); 68.7% of its 198-image stratified header sample is landscape and 31.3% portrait. Median display-normalized source dimensions are 4,000 × 3,778 px, about 20 MP and 6.69 MiB. A parseable header is a candidate, not proof of a successful worker decode. See [that baseline](../media/PHOTO_CORPUS_BASELINE.md).

The full Christmas 2024 scan validates the broader scale: 396 non-empty sessions, 10,244 direct JPEG candidates, zero unreadable headers, and 5 / 23 / 44 / 92 photos at min / median / p90 / max. It is 63.2% landscape and 36.8% portrait, with 20 MP median sources. See [the Christmas baseline](../media/NATAL_2024_CORPUS_BASELINE.md).

This rules out square thumbnail assumptions, loading originals into the browser, and a fixed “12 photos per session” product model.

## Phase map and exit gates

| Phase                                                                | Status                | Deliverable                                                                                                                   | Exit gate                                                                             |
| -------------------------------------------------------------------- | --------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| 1–4. Research, harness, architecture and deterministic core          | complete              | Workspace, pinned sources, contracts, boundaries, fakes and quality commands                                                  | `check:fast` and documented boundary proof                                            |
| 5–9. Media proof, React shell, Phaser host, Theme Lab and browser QA | complete baseline     | proportional Sharp proof, one-canvas lifecycle, viewport matrix and evidence                                                  | `validate` green on four mobile/tablet profiles                                       |
| 9.5a. Game Factory kernel                                            | validated 2026-08-23  | `GameDefinition`/`GameModule`, `GameRun`, active clock, visibility adapter, `SceneScope`, asset/feedback/quality primitives   | deterministic unit suite and dev-smoke uses `GameRun` + `SceneScope`                  |
| 9.5b. Photo scale and creation flow                                  | validated 2026-08-23  | safe `game:new`, progressive Hub, selected photo seam, read-only corpus inspector, staged media publication                   | session-120 E2E, generator test, media batch/manifest tests                           |
| 9.5c. Production correctness kernel                                  | validated 2026-08-23  | lazy installed-game registry, run correlation, serial Phaser teardown, immutable media namespaces and fuller corpus inspector | lifecycle/media unit tests and browser cleanup proof                                  |
| 9.5d. Native-like shell                                              | in progress           | Hub → card → cover → game route, serial Back/exit, retry shell; PWA and release evidence remain pending                       | install/recovery/back/viewport matrix proves no stale chunk or orphan canvas          |
| 9.5e. Christmas experience kit                                       | in progress           | photo frame, HUD, backdrop, finite quality-aware motion and accessible pause/win states                                       | real-game visual acceptance across quality modes and a measured performance threshold |
| 10. Puzzle Swap 2.0                                                  | in progress — runtime | deterministic board, source frames, selection, progress, adaptive grid, idle assist and product HUD                           | Puzzle SPEC acceptance matrix, mobile evidence and no leak after repeated runs        |
| 11. Memory                                                           | pending               | subset/mixed-orientation game                                                                                                 | deterministic cards, 120-photo selection and mobile evidence                          |
| 12. Tic-Tac-Toe                                                      | pending               | non-photo rules game using shared presentation                                                                                | deterministic AI/rules tests and mobile evidence                                      |

`Puzzle Slide` and `Present Match` stay in the backlog until Phase 12 proves that the factory is useful in more than one gameplay shape.

## Phase 9.5 — required factory contract before Puzzle

### 9.5a — game module and lifecycle kernel

Implemented now:

1. `GameDefinition` describes player-facing identity, photo count, selection strategy and mixed-orientation capability. `GameId` is open; only the app registry decides availability.
2. `GameModule<Engine, Host>` gives every game the same creation seam without importing a game into `platform`.
3. `GameRunController` is the only owner of `GAME_OPENED → READY → STARTED → PAUSED/RESUMED → COMPLETED/EXITED`. Calls are idempotent and cannot double-count analytics.
4. `ActiveGameClock` reports only active time. The React host binds Page Visibility to `GameRun` during early boot; the mounted Phaser game also relays its hidden/visible/blur/focus lifecycle to the same idempotent run.
5. `SceneScope` owns each scene listener, timer, tween and generated texture. Dev smoke disposes its scope from `SHUTDOWN` and destroys the Phaser game on host exit.
6. `AssetLoader` applies a finite timeout/retry/fallback policy. A real game must map its loader state into bridge retry/failure events; it may not loop indefinitely.
7. `AudioManager`, `HapticFeedback`, `createTouchHitArea` and `FrameBudgetMonitor` establish cross-game interaction and quality policy without inventing fake assets or platform APIs. Phaser, not application code, owns browser audio unlocking.

Before a real game adopts an item, add a game-local adapter and test it. For example, a game with music supplies a Phaser `SoundManager` port, lets Phaser handle browser unlocking, owns any retained sound at scene shutdown and provides silence as a valid fallback.

### 9.5b — photo experience and scale

Implemented now:

1. `PhotoSurface` is pure geometry with `contain` as default; it is the only default photo-fit convention in a game runtime.
2. Hub selection is explicit, and the selected `Photo` enters `GameContext`; a game no longer has to infer a choice from a card index.
3. The Hub renders 12 thumbnail cards first and advances 12 at a time through `IntersectionObserver`, with an accessible “load more” fallback. It has no reason to fetch a game derivative while browsing.
4. `pnpm media:inspect <root> --sample-per-session 3` reproduces the corpus methodology without reading nested low-resolution folders or writing a file. It recognizes a single explicit `DD MM YYYY` date-batch layer and reports candidates, unreadable headers, EXIF, format, colour space and profiles separately.
5. The media worker validates a regular source file and 32 MiB byte ceiling, hashes it as a stream, stores its immutable original and variants below the hash namespace, stages all variants before a same-filesystem publish, validates WebP output metadata, and upserts rather than replaces the session manifest through a sibling temporary file and rename.
6. `processMediaJobs` is bounded (1–8, production baseline 2) and returns failed records for one bad item without discarding ready items.

Production adapter work still required:

- persist `pending → processing → ready|failed` state in a database; store a safe public failure code and private diagnostic trace separately;
- acquire a per-photo lease/idempotency key before running a worker, expose retry/backoff/dead-letter policy, and quarantine/rebuild a stale staging directory rather than publishing it;
- test the authorization endpoint against traversal, cross-session access, expired cookie and variant escalation; and
- benchmark Sharp concurrency and response-cache headers on the actual VPS with representative photos.

### 9.5c — production correctness kernel

Implemented now:

1. `apps/play` owns a lazy installed-game registry. A generated package adds one loader there; Phaser and concrete game packages remain out of `platform`.
2. Every `GameRun` receives a Web Crypto `runId`, a Web Crypto seed and monotonic event sequence. Analytics and bridge consumers can reject an event from a prior run.
3. `PhaserMountCoordinator` gives a game instance a lease. A new mount waits for the prior `Phaser.Core.Events.DESTROY` completion, rather than assuming that `game.destroy()` is synchronous.
4. The visible UI becomes ready only on `GAME_READY`, emitted by game lifecycle code, not when the dynamic import resolves.
5. The local manifest write is now incremental and atomic for one writer. Reused `photoId`s cannot return stale originals because the immutable source namespace includes the SHA-256 hash.
6. Runtime loading now occurs before the Phaser mount lease. The lease starts immediately before creating a Phaser game and is retained through destruction, including when a future `GameModule.create` is asynchronous. This prevents a slow import from creating an orphan canvas after React has moved to another route.

Still requiring a deployment decision:

- a database-backed job lease/idempotency key, state transition audit, stale staging recovery policy and dead-letter/retry operation; and
- an authorized variant delivery endpoint and private diagnostics store. The filesystem prototype is deliberately not described as multi-worker safe.

### 9.5d — native-like shell

Current baseline: dynamic-import failure has one guarded Vite reload attempt; thumbnails have intrinsic dimensions and decode asynchronously; browse pages retain vertical pan while the game canvas owns its gesture surface. The selected game runtime can be prefetched on intentional pointer/focus input, but this prefetch is side-effect free: it imports only cached JavaScript and never creates a canvas, scene, texture or audio context.

Implemented in the current P0 slice:

1. The shell has exactly two public product paths: `/s/:token` and `/s/:token/game/:gameId`. `runId` remains a private runtime/analytics correlation value, so a refresh returns to the cover and begins a new run only after an explicit play action.
2. Installed games contribute static `GameDefinition` metadata through a definition-only entry point. The Hub builds its card and `GameCover` from that metadata without statically importing a Phaser runtime.
3. React owns `GameCover`, `GameScreen`, loading and error/retry chrome. The Phaser parent has a definite stage size and no direct padding/border, preserving `Scale.RESIZE` ownership of the canvas.
4. Browser Back while gameplay is active records the route selected by the browser, requests safe cancellation, waits for the host/controller destruction path, then changes the visible React route. The same sequence covers the explicit exit control.

Before public deployment, decide and implement:

1. Replace the temporary “Abrir dev smoke” affordance with a semantic game cover/card: static cover, title, one short rule and an explicit play action. A React/CSS fade may decorate the cover; Phaser never owns the navigation transition.
2. Add `History` routes for session, selected game and run. Browser back must request exit and wait for the Phaser destruction promise before showing the Hub, so a route transition cannot overlap canvases.
3. Give `GameScreen` a stable DOM safe-stage: header/exit in semantic React, a constrained game region, no accidental page padding around the canvas, and a canvas gesture surface that does not block Hub scrolling.
4. Add a product-level retry view for `GAME_ASSET_FAILED`, with a bounded retry count and a safe return to the cover—not an unbounded asset loop.
5. Add a web app manifest, install affordance, cache versioning and an offline/error route. Cache only static app assets and authorized derivatives; never cache originals or authorization-bearing URLs without a privacy review.
6. Add a release project with WebKit and high-DPI screenshots in addition to the existing four Chromium device profiles. Install its browser explicitly in CI, then make its known failures blocking.

### 9.5e — Christmas experience kit and performance gate

The current Theme Lab remains the visual reference. Before visually rich games are built, create a **small composed Game Experience**, not a universal `BaseScene`: `MotionTokens`, `TouchProfile`, `FeedbackDirector`, `ParticlePresets`, `SfxCues` and `ChristmasEffects` live under `packages/theme/src/game-feel/`. A game composes the pieces it needs and keeps its own mechanics and scene lifetime. The first implementation is exercised in a deterministic `__dev/experience` route with query-controlled quality and reduced-motion inputs; it becomes shared production API only after Puzzle Swap has used it.

Implemented in the current v0 slice:

1. The named feedback vocabulary is `tap`, `select`, `correct`, `wrong`, `hint` and `celebrate`. `FeedbackDirector` resolves a pure `EffectPolicy` and sends it to an injected, scene-local port; it owns no Phaser scene, timer, tween, asset or navigation state.
2. `MotionTokens`, `TouchProfile`, `SfxCues` and finite `ParticlePresets` are exported from `theme`. Reduced motion removes optional particles and limits confirmations to short non-looping movement independently of `LOW`/`NORMAL`/`HIGH` quality.
3. `__dev/experience` accepts deterministic `quality`, `motion`, `photo`, `sound` and `seed` query settings. It makes each cue observable without inventing licensed audio or persistent Phaser effects.

The Director receives a Phaser scene plus `QualityTier`, reduced-motion preference, a game-local sound port and the existing haptics port. Its public v0 vocabulary is intentionally small: `tap`, `correct`, `wrong`, `hint` and `celebrate`. It maps those semantics to a bounded tween, haptic cue, optional sound cue and optional particles. It must not own game rules, navigation, or unregistered scene resources.

Interaction is a first-class acceptance surface, not polish added at the end:

- Primary child actions are at least **52 CSS px**; secondary controls are at least **44 CSS px**.
- Press feedback starts on `pointerdown`; a 0.98 scale / 100 ms settle is the initial tunable value, not a magic value embedded in a scene.
- `TouchProfile` centralizes initial drag thresholds (16 px / 200 ms) and each game documents its tested adjustment. Puzzle Swap offers both drag and tap–tap movement, satisfying WCAG 2.2's non-drag alternative requirement.
- An idle assist appears after 6–8 seconds without solving the move. Timers are relaxed/opt-in during the first game rather than a hidden pressure mechanic.
- `prefers-reduced-motion` removes oscillation and decorative repeated movement while retaining a short state-change confirmation; it also disables optional post-FX and celebration loops.

Audio remains deferred until licensed files are available. The v0 maps stable cue names but produces no sound. A later scene-local audio sprite is loaded after a first user gesture, uses Phaser's own unlock path and has a silent fallback. Application code must not call `AudioContext.resume()` directly.

Particles are split by purpose: ambient snow is decorative, feedback particles correspond to an accepted move, and a celebration is a finite win burst. `LOW` emits no ambient decoration and only small functional feedback bursts; `NORMAL` uses bounded effects; `HIGH` is opt-in after measurement. A Phaser particle `frequency` of zero is an update-rate emission, not “one particle”, so one-shot feedback is expressed explicitly. Filters/post-FX stay optional because Phaser documents them as WebGL-only.

The performance rule is conservative:

- **LOW:** no decorative particles or post-FX; 800px gameplay imagery where the game permits it.
- **NORMAL:** baseline photo gameplay at 1600px max edge and bounded decorative effects.
- **HIGH:** opt-in after measurement, never assumed from a desktop viewport.

`FrameBudgetMonitor` samples boot and lowers at most once; it does not change quality every frame. Before making a bundle-size or FPS limit a CI blocker, collect a baseline in the target VPS/browser/device matrix and commit the measured threshold with an owner. Current visual evidence is a release artifact, not checked-in product media.

## Phase 10 — Puzzle Swap 2.0

1. [x] Freeze `packages/games/puzzle-swap/SPEC.md`: board sizes, drag **and** tap–tap move semantics, completion state, source photo variant, portrait/landscape behavior, 52 px touch targets, threshold profile, idle help, relaxed-time policy and retry UI.
2. [x] Write pure domain tests first: legal moves, deterministic shuffle from injected `Random`, solved state, accessibility-readable progress, one idle visual hint and adaptive rectangular grids.
3. [x] Complete the module through the standard factory seam. Its `tuning.ts` owns feel values; `SceneScope` owns each input listener/tween/texture and the game documents every generated puzzle texture owner. The lazy runtime loads one source texture, adds proportional source frames, and supports drag/tap, native HUD, timer, hint, pause, completion and finite feedback.
4. [x] Use a documented texture-frame strategy rather than a real-time blur or a separate request per piece. The scene composes Game Experience feedback through a local port; `NORMAL`, `LOW` and reduced-motion behavior is independently validated in Experience Lab before the composition is used here.
5. [-] Add Playwright proof: portrait and landscape selected photos now mount, capture mobile screenshots and leave cleanly; pause emits the exact bridge transition. Complete the game through pointer drag and tap–tap, exercise LOW/reduced-motion in the actual runtime, test bounded asset recovery, and retain five-exit evidence on 390×844, 412×915, 430×932 and 768×1024.

Phase 10 is complete only when the initial game feels like a product rather than a dev proof, with loading/retry/exit states, no leaked resources, and evidence linked in traceability.

## Phases 11–12 — use the factory to prove reuse

**Memory** must select a deterministic subset from a large session, preserve pair metadata without duplicating URLs needlessly, and cover portrait/landscape on the same screen. It proves that the factory handles many source photos but only a small active game set.

**Tic-Tac-Toe** must retain a pure rules/AI domain and reuse only presentation, lifecycle and feedback primitives. It proves that shared foundation does not force every game to be photo-heavy.

After these two games, decide based on evidence whether a shared scene/background/HUD component earns extraction. Do not create a generic “game framework” based on hypothetical games.

## End-to-end release gates

For every selected game and viewport:

1. Hub starts with zero canvases and progressive thumbnails only; it has a usable fallback when `IntersectionObserver` is unavailable.
2. Entering dynamic-imports Phaser and the selected module, then produces exactly one visible canvas.
3. Ready/start/complete, retry/failure and exit bridge behavior are asserted where relevant.
4. Portrait, landscape, a small session and a 120-photo session are covered by the game’s applicable matrix.
5. Page errors, console errors, failed assets, orphan canvas/listener indicators and media authorization failures fail the run.
6. Five enter/exit cycles leave no canvas. Screenshot/trace artifacts are attached to CI or release evidence.
7. `pnpm check:fast`, `pnpm check` and `pnpm validate` pass on Node 24. The public release matrix adds WebKit/high-DPI evidence when Phase 9.5d is implemented.

## Explicit non-goals until evidence changes the decision

- no Cloudflare Images, S3, R2, imgproxy, mandatory CDN or browser image resizing;
- no backend framework/database choice in the frontend/game factory;
- no complete game implementations before their SPEC is selected;
- no customer photos, names, filenames or source paths in fixtures, docs, analytics or the Git repository; and
- no global transition/animation framework or inherited universal Phaser scene; the narrowly-scoped Experience v0 must first prove itself in the dev lab and Puzzle Swap.
