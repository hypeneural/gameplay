# Christmas Games agent map

## Mission

Build a safe, local-VPS, mobile-first factory for personalized photo minigames. This repository is optimized for legibility, deterministic domains and runtime evidence.

## Start here

1. Read `docs/index.md`, the active execution plan and the relevant game `SPEC.md`. For photo-session/gallery work, read `docs/integrations/photo-sessions/AUDITORIA_NODE_FIRST_GALLERY_LAB_2026-10-06.md` before the active plan; use the Node-first Gallery Lab to prove media + Hub + Gallery + games before involving EvydFlow/Python whenever the task can be validated locally. For GalleryRoute/album work also read `.agents/rules/christmas-gallery-album.md` and `.agents/skills/christmas-gallery-album/SKILL.md`.
2. For presentation or asset work, read `docs/experience/christmas/ART_BIBLE.md` and `docs/assets/ASSET_MANIFEST_CONTRACT.md`.
3. For Phaser work, read the matching file in `vendor/phaser-skills/v4.2.1/`, then inspect installed types and a 4.2.1 official example.
4. Make the smallest coherent change and run `pnpm check:fast`.
5. Before handoff, run `pnpm validate`; record durable discoveries in `docs/lessons.md`.

## Source order

`phaserjs/phaser@v4.2.1` → vendored skill → installed `phaser.d.ts` → official examples → official template → community donor. Older Phaser 3/RC code is algorithmic reference only.

## Ownership

- `apps/play`: React composition root, route/session shell and Phaser lifecycle.
- `packages/platform`: contracts, deterministic runtime primitives and fakes.
- `packages/theme`: tokens and quality profiles shared by React and Phaser.
- `packages/games/<game>`: isolated game domain/runtime/spec.
- `tools/media-pipeline`: Node/Sharp processing shared by controlled runtimes; never browser code. For photo sessions, `prepared-derivatives` runs on the Windows studio machine in the MVP and only validated derivatives are uploaded to the VPS. Before the production ingest API is wired, `pnpm gallery:prepare` / `pnpm gallery:lab` are the canonical local validation path.
- `tools/asset-factory`: Node/VPS-only inspection, preparation, provenance and
  budgeting of game assets; never browser code.
- `docs`: system of record. Generated map must match the real tree.

## Non-negotiable boundaries

- Game `domain/` cannot import Phaser, React, DOM/fetch/localStorage, `Date.now` or `Math.random`.
- A game cannot import another game. `platform` and `theme` cannot import games.
- Only `apps/play` composes concrete games.
- React receives typed bridge events only, never a Scene or `Phaser.Game`.
- Create one Phaser game on entry; on exit shut down, remove listeners, release game-owned textures and call `game.destroy(true)`.
- Never serve originals or filesystem paths. Backend authorization must precede Nginx `X-Accel-Redirect`.
- For photo sessions, do not derive access from CRM/order identifiers and do not create a second gallery/session authority outside the gameplay backend.
- Do not create FTP/webroot/static-JSON publication shortcuts to bridge the Gallery Lab to production. Once the internal photo-session API exists, prove it first with a manual Node publisher using the same media manifest; integrate EvydFlow/Python only after that path is green.

## Work style

Keep this file a map, not a changelog. Put domain knowledge beside the owner, decisions in docs, and a finished plan in `docs/exec-plans/completed/`. Current focus is consolidation, mobile quality hardening and release gates across the active game catalog.
