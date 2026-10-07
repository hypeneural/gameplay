# Christmas Games agent map

## Mission

Build a safe, local-VPS, mobile-first factory for personalized photo minigames. This repository is optimized for legibility, deterministic domains and runtime evidence. Prefer boring, explicit paths over clever automation.

## Start here

1. Run `pnpm agent:doctor`. If it does not return `status=ok`, stop and fix the reported repository contradiction before product work.
2. Read `docs/index.md`, `deploy/readiness.json`, the active execution plan and the relevant owner `AGENTS.md`/`SPEC.md` before editing.
3. For photo-session/gallery work, read `docs/integrations/photo-sessions/AUDITORIA_NODE_FIRST_GALLERY_LAB_2026-10-06.md` before the active plan; use the Node-first Gallery Lab to prove media + Hub + Gallery + games before involving EvydFlow/Python whenever the task can be validated locally. For GalleryRoute/album work also read `.agents/rules/christmas-gallery-album.md` and `.agents/skills/christmas-gallery-album/SKILL.md`.
4. For presentation or asset work, read `docs/experience/christmas/ART_BIBLE.md` and `docs/assets/ASSET_MANIFEST_CONTRACT.md`.
5. For Phaser work, read the matching file in `vendor/phaser-skills/v4.2.1/`, then inspect installed types and a 4.2.1 official example.
6. Make the smallest coherent change and run `pnpm check:fast`.
7. Before handoff, run `pnpm validate`; record durable discoveries in `docs/lessons.md`.

## AntiGravity 2.19.1 safe execution protocol

This section is intentionally repetitive and deterministic. A weaker agent must not infer a release stage or invent a shortcut.

1. **Classify the task first:** `local-lab`, `vps-staging-demo`, or `pilot`. Read `deploy/readiness.json`; if the requested stage is not in `allowedReleaseStages`, do not work around the block.
2. **Inspect before mutation:** fetch/read the target file, its nearest owner instructions and relevant tests. Never replace a file from memory or from an older audit snapshot.
3. **Use canonical commands only:** start with `pnpm agent:doctor`; local photos use `pnpm gallery:lab`; readiness uses `pnpm deploy:readiness`; VPS demo packaging uses `pnpm release:staging` + `pnpm release:verify`; repository proof uses `pnpm check`/`pnpm validate`.
4. **One authority per concern:** session/media authority stays in `apps/catalog-server`; UI stays in `apps/play`; image derivation stays in `tools/media-pipeline`; games stay in their packages. Do not create parallel session stores, alternate galleries or ad-hoc upload servers.
5. **Fail closed:** missing env, invalid token, unknown session, missing media, wrong release stage or incomplete revision must produce an unavailable/error state, never a fixture/customer fallback.
6. **Prove the change:** first targeted test, then `pnpm check:fast`, then `pnpm check`; build/release changes also require `pnpm build` or `pnpm release:staging` as applicable.
7. **Stop on a real blocker:** document the exact blocker and preserve the last green state. Do not disable tests, loosen types, add `any`, bypass auth, expose private storage or silently change architecture to make a command pass.

### Never do automatically

- never commit `.env`, credentials, tokens, phone/order PII, source photo names/paths, DB/WAL files or private media;
- never run destructive Git/history operations, force-push, delete broad trees or rotate credentials unless the human explicitly requests that operation;
- never change dependency versions or add a new framework just to solve a local coding problem without first proving the existing stack cannot do it;
- never expose Vite/dev routes, local-test endpoints or customer data in a VPS staging-demo release;
- never promote `staging-demo` to `pilot` by editing only documentation/config; pilot requires the blockers in `deploy/readiness.json` to be implemented and tested;
- never deploy or merge a red head just because the failure looks unrelated; the current merge target has no enforced required status checks, so human discipline is part of the safety boundary until a GitHub ruleset is configured;
- never build on the production VPS when an artifact can be built in CI/workstation; the host shares resources with other services.

## Release stages

`pnpm build` is deliberately fail-closed for private customer sessions. It compiles the web app and catalog server, but the browser refuses fixture-backed public sessions in normal production mode.

`pnpm release:staging` is the only currently allowed VPS release command. It builds Vite with mode `staging-demo`, compiles `apps/catalog-server`, checks `deploy/readiness.json` and writes an ignored `.release/vps` bundle. Run `pnpm release:verify` before promotion. Staging uses synthetic/fixture photos only. Real customer data is forbidden until `pilotReady` becomes true through implementation and evidence, not by assertion.

For deploy/VPS work, read `.agents/rules/staging-release-safety.md` and `.agents/skills/vps-staging-release/SKILL.md`.

## Source order

`phaserjs/phaser@v4.2.1` → vendored skill → installed `phaser.d.ts` → official examples → official template → community donor. Older Phaser 3/RC code is algorithmic reference only.

## Ownership

- `apps/play`: React composition root, route/session shell and Phaser lifecycle.
- `apps/catalog-server`: single VPS authority/gateway for session HTML, future session DB/API, media authorization and health. Do not create another backend for photo sessions.
- `packages/platform`: contracts, deterministic runtime primitives and fakes.
- `packages/theme`: tokens and quality profiles shared by React and Phaser.
- `packages/games/<game>`: isolated game domain/runtime/spec.
- `tools/media-pipeline`: Node/Sharp processing shared by controlled runtimes; never browser code. For photo sessions, `prepared-derivatives` runs on the Windows studio machine in the MVP and only validated derivatives are uploaded to the VPS. Before the production ingest API is wired, `pnpm gallery:prepare` / `pnpm gallery:lab` are the canonical local validation path.
- `tools/deploy`: release/readiness packaging only; no embedded infrastructure secrets and no direct credential management.
- `tools/asset-factory`: Node/VPS-only inspection, preparation, provenance and budgeting of game assets; never browser code.
- `deploy`: non-secret release policy and VPS templates. `deploy/readiness.json` is the machine-readable release gate.
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

Keep this file a map, not a changelog. Put domain knowledge beside the owner, decisions in docs, and a finished plan in `docs/exec-plans/completed/`. Current focus is consolidation, mobile quality hardening, VPS staging and release gates across the active game catalog.
