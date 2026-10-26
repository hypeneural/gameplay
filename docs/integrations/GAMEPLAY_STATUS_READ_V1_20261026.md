# Gameplay status lookup v1 — 26/10/2026

## Architecture
- Gameplay is the only photo-session and publication authority.
- CRM is the only source for customer, Natal 2026 classification and current order status.
- MCP and EvydFlow are **consumers**. Do not replicate session state in another DB.
- `POST /internal/v1/sessions/lookup` and `POST /internal/v1/sessions/lookup-batch` accept order UUID(s) and never perform `resolveOrCreateSession`.
- `CATALOG_INTERNAL_READ_SECRET` (32+ chars) is separate from `PUBLISHER_API_SECRET`; configure only server-side. Private routes must be blocked at public Caddy edge and reachable solely over private trusted network.
- Default is disabled when no secret exists or SQLite publication is not configured. Never change `pilotReady=false` solely to enable the lookup.

## Payload
Single: `{"crm_order_uuid":"<UUID>"}`. Batch (1–50 unique orders): `{"crm_order_uuids":["<UUID>"]}`.
Response: `{"schema_version":1,"source":"gameplay_catalog","verified_at":"...","results":[{"crm_order_uuid":"...","state":"published_unverified","photo_count":20,"expected_blobs":60,"ready_blobs":60,"hub_url":"https://.../s/<opaque>","gallery_url":"https://.../s/<opaque>/fotos","games_runtime_verified":false}]}`.
Other states: `not_found`, `not_published`, `revoked`, `partial`. A server failure is **not** `not_found`.

## Important caveats
- A READY blob register is not proof that a browser has successfully decoded or rendered the image.
- `published_unverified` is deliberately not labelled 'all games working'; automatic validation needs a separate browser/runtime receipt.
- No search by names on Gameplay: CRM resolves exact order UUID.
- Do not log secret bearer or capability URL; suppress request body logs.
- Before pilot, reconcile open publication PRs and verify SHA on VPS. This branch is based on PR #30 and cannot land safely on default branch until prerequisites merge.
- Test locally: `pnpm agent:doctor`, `pnpm check:fast`, `pnpm check`, `pnpm validate`. No real customer media in staging demo.
