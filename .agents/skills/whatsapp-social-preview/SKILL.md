---
name: whatsapp-social-preview
description: Use for per-session WhatsApp Open Graph cards, server-rendered crawlers and privacy-gated social images.
---

# Social OG — single-authority rule

Read in order:
1. `docs/ops/WHATSAPP_OG_SOCIAL_COVERS_2026-10-10.md`
2. `docs/architecture/SHARING_AND_SOCIAL_PREVIEW.md`
3. `apps/catalog-server/src/{socialPreview,CatalogServer,filePreviewRepository,main}.ts`
4. `apps/catalog-server/src/publication/SessionRepository.ts`, `deploy/readiness.json`
5. `tools/media-pipeline/src/socialCover.ts`, Nginx templates, tests.

- The bot reads HTML **without React**; OG must render in the initial server response.
- `/`, `/demo/fotos`, `/demo/game/:id` use only **public studio-approved** demo image(s).
- `/s/:token`, `/s/:token/fotos`, `/s/:token/game/:id` use a **shared, deterministic session image** via `/s/:token/social-preview?v=REVISION`.
- Verify SQLite `ACTIVE`, not just preview JSON, before private photo serving. Require separately documented **opt-in consent for social card**.
- Never load original photos into public webroot, logs, Github, or a GET handler; create optimized JPEG offline after authorized publication.
- Never create a different photo for every message or per game. One image per session/revision.
- Never default `pilotReady`, `customerDataAllowed` or `automaticDeliveryAllowed` to true.
- Keep `/_customer_social` `internal`; no public static route for customer photos.
- Run focused Vitest, pnpm check:fast, repo-map, full pnpm check, release staging/verify; only then authorized live smoke.
- On WhatsApp cache mismatch, rotate **preview version** for authorized sessions; do not rotate customer token merely to force a crawler to update.
