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

## LESSON-021 — A style anchor is a decision tool, not a browser asset

Keep the master visual frame outside `public/`, without client photography,
and record its purpose and provenance next to it. Use the anchor to review
photo hierarchy, protected zones and CTA before sourcing or preparing any
runtime art. A CSS-only preview may prove that hierarchy with existing
authorized assets, but it does not bypass manifest, licensing or approval
gates for new art.

## LESSON-022 — A child-facing hint needs a paced, bounded presentation

Keep the hint pair deterministic in the domain, but present it in two short
stages: first the destination border, then the piece currently holding it,
with a colour relationship stated in simple words. Scene-owned timers must be
cancelled on swap, pause and shutdown; a small cooldown prevents repeated taps
from restarting the teaching sequence or stacking feedback. This preserves the
child's agency while still making the next gesture clear.

## LESSON-023 — Chrome must earn its vertical space

Treat header and coach-mark reserves as explicit layout metrics, then test the
proportional board against the former values at every supported viewport. Keep
the visible surface compact, but never reduce the independent 48 px touch
bounds of sound, hint or pause. A narrow phone can remain width-constrained,
so report recovered vertical room separately from photo-board area; a taller
viewport reveals the real area gain without distorting the photo.

## LESSON-024 — A real-time HUD needs one visual owner

Timer and progress belong to the Phaser Scene while they are spatial parts of
the active board: the Scene already owns the game clock, board mutation and
layout. React can announce typed lifecycle events to assistive technology, but
it must not mirror time or progress visibly. Moving that HUD to DOM would need
an explicit bridge contract and removal of the Phaser text; do not add a second
display path merely for convenience.

## LESSON-025 — Frame percentiles need the presentation clock and a stated scope

Use the timestamp supplied by a presentation callback to derive frame deltas;
do not put a browser clock into game domain code or compare a hidden-tab pause
with an active frame. Keep the percentile formula shared by adaptive quality
and the future laboratory, and document decoded RGBA bytes as an estimate—not
as total GPU memory. A real Android device still decides any budget.

## LESSON-026 — Browser asset review needs a deliberately smaller catalog

The Node audit manifest is a source of truth for provenance and exact files,
but it can include source paths that do not belong in a browser—even on a local
development route. Project a browser-safe catalog with only public paths and
review facts, grouping browser delivery alternatives by creative role. A lab
must declare absent asset types rather than mock unapproved art, and a native
audio control with `preload="none"` prevents every sound from becoming an
eager request merely because a reviewer opened the page.

## LESSON-027 — A reproducible scene scenario cannot rely on a synthetic DOM gesture

Dispatching mouse or pointer events from React can be batched differently from
the browser gesture path and is not a reliable proof that a Phaser interaction
ran. Keep the scenario plan pure, but let a local-only typed command be handled
inside the already-mounted Scene through the same production methods for hint,
swap, pause and completion. React may select the command and observe typed
bridge events, never a Scene or board. Lifecycle scenarios still go through
the host destruction path, where a DOM snapshot can prove canvas and host
counts return to zero.

## LESSON-028 — Size alone is not asset identity

An unchanged byte count cannot prove that the reviewed browser file is still
the same content. Keep size for bundle budgeting and pair it with a SHA-256
computed in the Node-only asset factory. The digest detects a same-size
replacement, but it is not provenance, licence or visual approval: those are
separate human-review facts in the manifest.

## LESSON-029 — A diagnostic sequence must wait for completion, not elapsed time

An approximate delay after a Phaser tween is not a completion contract: a
mobile frame may arrive late, and consuming the next deterministic swap while
the previous one still owns the board silently loses a step. Chain a local
diagnostic sequence from the actual tween completion callback, retain the
pending action until the move is available, and keep each short timer in the
Scene-owned cleanup scope. This exercises production feedback without making
development timing a source of test-only flakiness.

## LESSON-030 — A reference map must not become a speculative dependency bundle

An exact Phaser version, a concrete trigger and the matching installed type are
enough to make a future API discoverable. Do not vendor or load a broad skill
simply because an adjacent feature might use it someday. Until an approved task
needs that API, retain the official tagged link and keep the production path
closed; when it does, add only the reviewed local reference needed by that
task and validate against its official Quick Start and installed types.

## LESSON-031 — A social preview is a server decision, not a React feature

The browser may open the native sharing panel only after a person taps, but
social crawlers read the initial HTML response and may cache it beyond the
game's control. Keep the ordinary share link in the React shell, while the
backend authorizes an opaque session link and emits Open Graph metadata. Use a
generic approved Christmas image by default; a client photo requires explicit
social consent, a separate derivative without personal metadata and a
revocable server decision before Nginx can deliver it.

## LESSON-032 — Revocation must be checked when the crawler asks for the image

Rendering Open Graph HTML once is insufficient because a crawler fetches
`og:image` separately and may retry it later. Keep a stable image route under
the opaque session token, authorize that request again and only then send an
`X-Accel-Redirect` to an `internal` Nginx location. The generic approved art
is also served through that decision, so a revoked consent returns to the safe
default without exposing a customer derivative on a direct public path.

## LESSON-033 — A responsive assertion must observe the rendered CSS viewport

Mobile emulation can map a requested physical viewport to a different CSS
layout width. A responsive regression test should therefore compare the
rendered viewport with its own prior state and inspect real bounds and
overflow, rather than assume that the requested device size is the page's CSS
width. This catches reflow failures without creating false negatives from the
emulator's device-scale model.

## LESSON-034 — A full E2E matrix needs a clean development server

Playwright can reuse a convenient local Vite server, but source edits or HMR
can then replace the game while a later mobile scenario is still waiting for
its initial Phaser lifecycle event. A failure stuck in “Preparando jogo” or
“Atualizando jogo” is not evidence of a gameplay defect until the suite has
been repeated against its own clean server. Keep the user's local preview on
its normal port and run the release matrix with a distinct port and `CI=1`,
which disables server reuse.

## LESSON-035 — Test evidence must not be a watched source input

Writing a screenshot below a directory observed by Vite can trigger a full
reload while a Phaser scenario is waiting for its next bridge event. Write
private evidence with Playwright's `testInfo.outputPath()` instead: it places
the file inside the unique output directory of that test, outside the served
source tree. Capturing proof can then neither change the measured lifecycle nor
collide with evidence from another worker.

## LESSON-036 — Long journeys need a bounded per-scenario budget

A serialized mobile journey with several Phaser tweens, audio authorization and
two independent mounts can exceed a generic interaction timeout on a cold or
contended WebGL process. Give that named journey a local, finite timeout and
assert its real readiness, completion and teardown events; do not raise the
global timeout and hide failures in short scenarios.

## LESSON-037 — Mobile canvas tests must wait for state, not for a guessed tween duration

Canvas interaction on a touch device should be exercised with a real touch
gesture in viewport CSS pixels, rather than a mouse click that happens to reach
the same location. After a valid piece swap, expose a small typed bridge event
only when the game accepts the next move; the E2E journey can then wait for
that state before sending the next touch. This avoids race conditions on a
contended WebGL process while preserving the production rule that child input
is buffered only briefly during the visible swap animation.

## LESSON-038 — Idle assistance must never cancel an active two-step choice

An idle timeout measures the absence of a completed move, not the absence of a
player action. If it resets the selected piece between the first and second
tap, the next valid tap looks ignored and the child loses the intended swap.
Only request idle help while no piece is selected and no real swap is settling;
the active selection already provides the contextual next-step instruction.

## LESSON-039 — Player-facing copy and lifecycle evidence must evolve together

The typed bridge event is the product truth; its Portuguese sentence is a
separate, player-facing decision. When that sentence changes, update the
journeys that intentionally verify visible copy in the same patch, while
lifecycle journeys should prefer the event sequence or event code whenever
available. A stale expectation can make a correctly completed game look
broken and waste a full mobile matrix run.
