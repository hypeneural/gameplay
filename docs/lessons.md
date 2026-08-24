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

## LESSON-010 — Seasonal feedback must end by itself

Use finite scene-owned tweens for tap, hint, correct and win sparkles. Do not add a continuous emitter just to make the scene feel festive: it spends battery while the child is deciding, complicates reduced motion and can outlive a route without explicit ownership.

## LESSON-011 — Real-photo review needs a separate local delivery boundary

A useful operator preview can use real derivatives without weakening the product privacy model: prepare opaque ids and WebP variants in a private external cache, bind the review server to loopback, and expose only a dev-only derivative endpoint with no-store. Do not treat that convenience adapter as authorization or deploy it to the VPS.
