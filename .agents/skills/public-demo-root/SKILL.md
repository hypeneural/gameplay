---
name: public-demo-root
description: Use for public homepage demo routing, photo-demo asset import and separation from private customer sessions.
---

# Public Demo Root — Antigravity

**Use when:** homepage `/`, synthetic preview, demo gallery/games or demo photo folder.

1. Read `docs/ops/GAMEPLAY_PUBLIC_DEMO_AND_CRM_EVYDFLOW_FORENSIC_2026-10-09.md`, `apps/play/src/app/AppNavigation.ts`, `AppRouter.tsx`, `deploy/vps/docker/nginx.conf`, `deploy/readiness.json`.
2. The demo is PUBLIC and contains approved/synthetic assets only. The root must never need CRM, Tailscale, a customer token, private WebP blobs or the internal publisher API.
3. Routes: `/`, `/demo/fotos`, `/demo/game/:id`. Client routes `/s/:token` always stay fail-closed and load `/s/:token/data`.
4. Before a demo-photo import, require user-provided folder path **and** rights confirmation. Use Node/Sharp offline to remove metadata and generate bounded demo WebP variants; never commit local path, customer names, EXIF or originals. Do not retrofit private-session publication into static webroot.
5. Verify only known Nginx routes serve the app; random paths remain 404 and `/internal/v1` remains forbidden publicly.
6. Focused checks: `pnpm vitest run apps/play/src/app/AppNavigation.test.ts apps/play/src/app/SessionDataLoader.test.ts tools/deploy/staging-boundaries.test.mjs`, `pnpm exec playwright test tests/e2e/public-demo-root.spec.ts`, then `pnpm check` + release stage verification.
7. Live VPS smoke requires operator-controlled canary; never touch Caddy/EvolutionGO/Asterisk/SmartDialer casually or lift `customerDataAllowed=false` for the demo.
