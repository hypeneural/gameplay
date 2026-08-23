# Game Factory architecture

This is a factory for independently shippable photo games, not a single large Phaser application. A new game is a module with a deterministic domain and a small Phaser adapter; React chooses it but never holds a Scene reference.

## Module boundary

```text
apps/play composition root
  ├─ static GameDefinition entry → Hub card + GameCover
  └─ lazy GameModule<Phaser, HTMLElement>
       ├─ definition: the same GameDefinition
       ├─ domain/        deterministic rules; no Phaser, DOM, time or random globals
       ├─ runtime/phaser/ scene + layouts + PhotoSurface + SceneScope
       └─ SPEC.md        experience and acceptance matrix

packages/platform
  └─ contracts, GameRun, active time, asset policy, input/photo math, feedback policy

packages/theme
  └─ seasonal tokens and quality profiles; never game rules
```

`GameId` is intentionally open. Registration, not a central string union, decides which modules are available in a build. A game exposes `src/definition.ts` separately from its Phaser entry, so the Hub can render `displayName`, `shortDescription`, `shortRule` and cover description without pulling its runtime into the initial bundle. This lets the generator add a game without editing platform internals.

## Create a game

```sh
pnpm game:new photo-bingo --dry-run
pnpm game:new photo-bingo
```

The command accepts only lowercase kebab-case and refuses an existing target. It creates package metadata, a static definition, a pure state starter, a Phaser module implementing `GameModule`, `tuning.ts`, and a SPEC acceptance matrix. It never registers the module automatically: adding it to `apps/play` is an intentional product decision.

## Public shell routes

```text
/s/:token                Session Hub
/s/:token/game/:gameId   Game cover, then one new game run on “Jogar”
```

`runId` does not appear in the URL. It belongs to the active runtime and analytics event identity, so refreshing a cover never attempts to restore a stale Phaser scene. When browser Back occurs during gameplay, the browser selects the target URL first; the React shell records it, requests host exit, waits for the game destruction path and only then shows the target route.

## Run lifecycle

```text
React entry
  → preload Phaser + selected module (no mount lease, no engine side effect)
  → acquire one Phaser mount lease
  → construct the selected GameModule
  → GameRun.open → ready → start
  → [Page hidden: GameRun.pause; Phaser handles its own loop focus]
  → [Page visible: GameRun.resume]
  → complete (active duration only) → exit
  → Scene SHUTDOWN → SceneScope.dispose → Phaser.Game.destroy(true)
  → Phaser Core DESTROY → release mount lease
```

`GameRunController` is idempotent. It is the sole source for lifecycle analytics and bridge events, so React cleanup, a scene shutdown and a user tap cannot double-report completion or exit. Its clock omits time spent hidden or paused.

The mount lease begins only after both dynamic imports have resolved. If React unmounts during loading, nothing engine-owned has been created. If a module's `create()` becomes asynchronous, the lease remains held until its returned controller has completed destruction; the next route therefore cannot create a second canvas early. Intent prefetch may call the import step, but never the creation step.

## Runtime ownership checklist

- Put every scene listener, tween, timer and generated texture in a `SceneScope`; dispose it from scene `SHUTDOWN`.
- Use the generic `AssetLoader` only with a bounded timeout/retry policy and a specified fallback. Relay retry/failure through bridge events when a game loads external media.
- Use `PhotoSurface(..., 'contain')` by default. It is geometry, so domain code remains media-agnostic and deterministic.
- Use `createTouchHitArea` for child-facing primary controls smaller than 52 CSS-equivalent pixels. Pass 44 only for an explicitly secondary control. The canvas owns `touch-action: none`; no game should add ad-hoc browser gesture listeners.
- Treat 52 CSS px as the child-facing primary-control floor and 44 CSS px as the secondary-control floor. When an action uses dragging, specify and test a simple single-pointer alternative such as tap–tap.
- Phaser owns browser autoplay unlocking. The first game needing sound supplies a small `SoundManager` adapter, can expose `isReady()` for UI, and lets Phaser queue/unlock playback; there is deliberately no fake background music in the foundation.
- Use `HapticFeedback` cues (`tap`, `correct`, `celebrate`, `error`) rather than arbitrary vibration patterns.
- Sample performance only during boot with `FrameBudgetMonitor`. Quality may lower once for that run; it never oscillates every frame.

## Photo and asset ownership

The session Hub sees only thumbnail URLs and metadata. A game receives the selected photo through `GameContext`, decides its `game`-variant needs from its SPEC, and owns any runtime texture it creates. Derived media is content-addressed and a ready manifest is published only after all three variants are complete.

## What remains intentionally per game

Puzzle mechanics, card matching strategy, opponent AI, music tracks, visual win scenes, exact HUD copy and analytics outcome fields are not prematurely generalized. The Game Experience v0 is composition, not inheritance: it can supply a named feedback cue but cannot decide a win, navigate, or retain a scene-owned resource. Implement game behavior only after the game SPEC, domain tests and mobile evidence are selected for that game.
