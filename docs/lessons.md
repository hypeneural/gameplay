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
