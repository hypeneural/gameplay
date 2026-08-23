# Christmas Games agent map

## Mission

Build a safe, local-VPS, mobile-first factory for personalized photo minigames. This repository is optimized for legibility, deterministic domains and runtime evidence.

## Start here

1. Read `docs/index.md`, the active execution plan and the relevant game `SPEC.md`.
2. For Phaser work, read the matching file in `vendor/phaser-skills/v4.2.1/`, then inspect installed types and a 4.2.1 official example.
3. Make the smallest coherent change and run `pnpm check:fast`.
4. Before handoff, run `pnpm validate`; record durable discoveries in `docs/lessons.md`.

## Source order

`phaserjs/phaser@v4.2.1` → vendored skill → installed `phaser.d.ts` → official examples → official template → community donor. Older Phaser 3/RC code is algorithmic reference only.

## Ownership

- `apps/play`: React composition root, route/session shell and Phaser lifecycle.
- `packages/platform`: contracts, deterministic runtime primitives and fakes.
- `packages/theme`: tokens and quality profiles shared by React and Phaser.
- `packages/games/<game>`: isolated game domain/runtime/spec.
- `tools/media-pipeline`: Node/VPS-only Sharp processing; never browser code.
- `docs`: system of record. Generated map must match the real tree.

## Non-negotiable boundaries

- Game `domain/` cannot import Phaser, React, DOM/fetch/localStorage, `Date.now` or `Math.random`.
- A game cannot import another game. `platform` and `theme` cannot import games.
- Only `apps/play` composes concrete games.
- React receives typed bridge events only, never a Scene or `Phaser.Game`.
- Create one Phaser game on entry; on exit shut down, remove listeners, release game-owned textures and call `game.destroy(true)`.
- Never serve originals or filesystem paths. Backend authorization must precede Nginx `X-Accel-Redirect`.

## Work style

Keep this file a map, not a changelog. Put domain knowledge beside the owner, decisions in docs, and a finished plan in `docs/exec-plans/completed/`. Do not implement Puzzle, Memory or Tic-Tac-Toe from their specs until their phase is explicitly selected.
