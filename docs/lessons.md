# Durable lessons

## LESSON-001 — Photographic games use linear filtering

For customer photography keep `pixelArt: false`, anti-aliasing enabled and CSS image rendering non-pixelated. This follows the audited photographic-rendering guidance and prevents avoidable visual degradation.

## LESSON-002 — Responsive layout is owned, not inferred

`Scale.RESIZE`, FIT and EXPAND are configuration tools, not an app layout system. Each screen-space owner must respond to a pure viewport layout and remove its resize listener on shutdown.

## LESSON-003 — Cold Phaser starts need conservative E2E parallelism

Four simultaneous cold mobile starts left two projects waiting on the lazy Phaser chunk in this environment. Playwright therefore uses one worker for the foundation lifecycle suite; raise it only after measuring the VPS/CI resource ceiling and preserving the same evidence.

## LESSON-004 — Phaser destruction has a real completion boundary

`game.destroy()` schedules destruction for a later frame. A React route transition must wait for Phaser's `DESTROY` event before granting the next game a canvas/input lease; an animation-frame guess is not a lifecycle guarantee.

## LESSON-005 — A stable photo id does not prove stable pixels

Photo ingestion keys must include content identity. Store the original and derivatives under the source hash, validate staged derivatives before publish, and merge the session manifest so processing one photo cannot erase the rest.

## LESSON-006 — Folder hierarchy is input schema

The 2024 Christmas corpus has one date-batch layer above sessions. The inspector recognizes that explicit layer but never recursively scans inside a session, preventing low-resolution delivery folders from becoming accidental game inputs.

## LESSON-007 — Navigation requests must be edge-triggered per host

An incrementing exit request is safe only when a fresh `PhaserHost` treats its current value as already handled. Otherwise it consumes a completed predecessor request and immediately exits the next game. Browser Back now records the target route, cancels the current host and applies that target only after `DESTROY`.

## LESSON-008 — A grid can reuse one photo texture without distorting it

Puzzle pieces are visual crops of one authorized `game` variant, positioned from source-frame proportions and the contain-fitted board geometry. A piece never needs a separate image request; touch targets are transparent geometry over that same layout.

## LESSON-009 — A crop rectangle and a proportional puzzle frame are different tools

Cropping a display-sized full image preserves the original display scale; it does not make the cropped region fill a puzzle cell. Build named frames on the one authorized texture using source coordinates, then display each frame at the calculated cell size. This preserves aspect ratio, avoids extra requests and makes mixed orientation predictable.

## LESSON-010 — Seasonal feedback needs a bounded motion budget

Use finite scene-owned tweens for tap, hint, correct and win sparkles. A
continuous snowfall is allowed only when it is an explicit part of the scene:
use one scene-owned emitter with a texture already loaded, reserve its small
pool, cap live particles, keep it behind the photo, and omit it in LOW and
reduced-motion modes. Never add an unbounded emitter merely to fill empty
space.

## LESSON-019 — A useful swap hint names two visual places, not one

For a swap puzzle, highlight the cell that needs its own piece and the cell
currently holding that piece. This gives a child a concrete, non-solving move:
swapping the two always puts one piece into place. Keep that choice in a pure
domain function and let Phaser only present it, so the hint is testable without
the canvas.

## LESSON-020 — Asset facts need a local, exact and complete boundary

An asset provenance table explains intent, but it cannot prove that every file
currently under a public game directory was reviewed. Keep one manifest per
game with exact bytes, delivery alternatives and a provenance anchor; audit the
directory against it. Count browser-format alternatives twice for the static
package and once (the larger choice) for a game run. Do not switch the runtime
to generated asset code until a second game proves the adapter is genuinely
shared.

## LESSON-011 — Real-photo review needs a separate local delivery boundary

A useful operator preview can use real derivatives without weakening the product privacy model: prepare opaque ids and WebP variants in a private external cache, bind the review server to loopback, and expose only a dev-only derivative endpoint with no-store. Do not treat that convenience adapter as authorization or deploy it to the VPS.

## LESSON-012 — Responsive image attributes need a bounded display box

An image’s intrinsic `height` attribute can become a multi-thousand-pixel layout height when CSS only constrains its width. A mixed-orientation mobile gallery must own a fixed tile box and explicitly make the image fill that box with proportional `object-fit`; verify it at the smallest supported viewport with real derivatives.

## LESSON-013 — A completion overlay needs a direct scene reference

Adding a child to a Phaser `Container` removes it from the Scene display list, so a later `children.getByName()` cannot retrieve that child reliably. Retain the win-duration text as a scene field; otherwise a completed run can emit `GAME_COMPLETED` while the visual completion path throws before the overlay appears or the controller destroys cleanly.

## LESSON-014 — “Correct” is a state transition, not every move

For a swap puzzle, compare the two affected cell assignments before and after the move. Tween the two existing piece objects to their new cells, then trigger sparkle, haptic and correct SFX only for cells that were incorrect and have just become correct. Recreating the entire board on every move hides this distinction and makes photographic play feel like a web page rather than an app.

## LESSON-015 — Loader-retry proof needs an HTTP fixture

Phaser loads data-URI images through its image-element path, which does not exercise XHR retry behavior. Browser fixtures now use safe static portrait/landscape SVGs so Playwright can abort the required-photo request, prove exactly one configured retry and verify that only a privacy-safe failure code reaches React. Keep this distinction in mind whenever loader policy is validated.

## LESSON-016 — A responsive board keeps its topology and its objects

Choose a puzzle topology when a run begins, then pass that one candidate to responsive geometry. A resize can move and scale pieces, but must not reselect rows or columns: doing so disconnects ids, source frames and the solved permutation. Reflow the existing piece and border Game Objects instead of destroying and recreating them. If the tiny active swap tween targets stale coordinates during a resize, stop only those targets and complete the already accepted move idempotently before reflowing.

## LESSON-017 — Display geometry and native texture scale are not interchangeable

`setDisplaySize` sets the proportional size of a photo or its source-frame
piece. Calling `setScale(1)` afterward discards that fitted scale and restores
the texture at native dimensions, which can cover the whole mobile stage and
make an otherwise correct grid look stretched. Animate alpha, or calculate a
relative scale from the fitted value; never reset photographic Image scale in
an entrance or victory tween.

## LESSON-018 — Local photo review needs its server-time configuration

The local browser route only returns private derived photos when the Vite
server starts with `LOCAL_TEST_MEDIA_ROOT` pointing to the prepared external
storage. A route can otherwise return the application HTML for the private
endpoint and fail JSON validation. Check the endpoint response before visual
review; do not weaken the middleware or expose a filesystem path as a fix.
