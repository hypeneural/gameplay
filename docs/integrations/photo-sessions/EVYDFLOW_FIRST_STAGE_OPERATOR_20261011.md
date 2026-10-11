# Gameplay ↔ EvydFlow real first-stage handoff (Antigravity 2.22)

**Owner:** Gameplay for Node/Sharp, CatalogServer, VPS, private publisher, gallery and games. **Owner:** EvydFlow for CRM lookup, BAIXA with logo, SóClick physical printing, Drive for desktop local mirror and Z-API durable outbox. Work on isolated worktrees, one PR per repository; no raw customer folder/media/secret in Git.

## What really exists

- Default branch `codex/puzzle-native-like-v1` has demo-only `deploy/readiness.json` (pilotReady/customerDataAllowed/automaticDeliveryAllowed false).
- Publisher work is developed in layered PRs #11–#21. This branch extends #21: `PublicationService.ts`, `SessionRepository.ts`, SQLite migrations, `FileSystemStorageService.ts`, and `tools/deploy/publish-session.mjs` exist **in source**. Source ≠ running VPS.
- PR #22, based on default, excludes Chaveiro from the game source filter; integrate it into the publisher release candidate as a cherry-pick/reconciliation after inspecting the diff. Do not cherry-pick files blindly.
- On publisher branch `apps/catalog-server/src/main.ts` instantiates `PublicationService` only when private `CATALOG_DATABASE_PATH` and `PUBLISHER_API_SECRET` are available (separately validate storage and CATALOG_SERVER_SECRET). A 403 from public /internal doesn't mean an authenticated publisher is running.
- No player-side customer data may be published to the public demo for convenience.

## Step 0: quick, honest readiness check

In Gameplay worktree:
```powershell
node tools/deploy/evydflow-publisher-doctor.mjs
node --test tools/deploy/evydflow-publisher-doctor.test.mjs
```
Outputs booleans only; `ready_to_publish_customer_data` verifies local source and environment flags, NEVER claims VPS proof. It is expected to return exit code 2 until the gates are properly enabled.

## Step 1: private synthetic canary then VPS release

Inspect latest commit `git rev-parse HEAD`, VPS running SHA, private listener/port/TLS, and storage/migrations. Use existing `pnpm agent:doctor`, `pnpm check:fast`, `pnpm release:staging` ONLY as needed. Before customer data, run existing `tools/deploy/photo-session-preflight.mjs` and `tools/deploy/backup-restore-catalog.mjs` on synthetic session and verify restore/integrity. First confirm a synthetic `resolve -> upload 3 blobs -> status -> activate -> GET /s/<token>/fotos` with private authentication and blob authorization.

**Publisher commands must never put secrets on argv**. Set `PUBLISHER_API_SECRET`, `CRM_ORDER_UUID`, `PUBLISHER_API_ORIGIN` in the secured process environment; `PUBLISHER_API_ORIGIN` must be internal private authenticated HTTPS address, not the public demo.

## Step 2: reuse the 30 prepared originals

EvydFlow `tools/pilots/natal_5022.py games-plan` already produced `_GAMEPLAY_LOCAL_SOURCE` from the approved order #5022, excluding four special products. Gameplay's existing Node/Sharp pipeline prepares 30 source images and 90 thumb/card/game derivatives; do not use 30 BAIXA with logo as game originals. Verify content hashes and one-session-per-CRM-order policy.

Then use the EXISTING publisher:
```powershell
node tools/deploy/publish-session.mjs --storage "<PRIVATE_GAMEPLAY_PREPARED_STORAGE>" --receipt-file "<PRIVATE_NON_GIT_DIRECTORY>\\order-5022-gameplay.json"
```
The CLI requires a receipt location OUTSIDE the Git checkout. Complete session/grant/URL receipt is saved privately, never printed. On replay with an existing private receipt it reports `ALREADY_PUBLISHED_USE_PRIVATE_RECEIPT` and does not re-upload. The public gallery URL is a capability; never put it into stdout, GitHub PR or generic logs.

**Do not mark sent without external evidence:** require actual session ACTIVE, 30 photos, successful GET of gallery and authorized media, then pass the real receipt and public GET data to EvydFlow `PilotDeliveryLedger.mark_gameplay_active`. EvydFlow supports Gameplay's actual `status/ photosCount` receipt shape. After that, the existing private `pilot_whatsapp_queue.py` and `pilot_gameplay_link_dispatch.py` handle exactly one WhatsApp URL through the durable outbox.

## Minimal verification and handoff

One Node doctor check, one synthetic publication canary, one real #5022 only after gates. Run entire `pnpm check` ONCE at the final candidate commit. Never automatically retry activation/upload after an ambiguous network result; reconcile checkpoint + backend state first. Report per step `PASS/BLOCKED/UNKNOWN_OUTCOME/NOT_RUN`, SHA and remote GET metadata; no customer PII, raw URLs, token or storage paths.
