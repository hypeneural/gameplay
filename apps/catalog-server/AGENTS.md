# Catalog server agent guide

## Owner mission

`apps/catalog-server` is the single VPS authority for public session HTML and the future photo-session persistence, browser grants, revision publication and private media authorization.

Do not create a second backend for galleries, games or uploads.

## Current stage

Read, in this order:

1. root `AGENTS.md`;
2. `.agents/current-state.json`;
3. `deploy/readiness.json`;
4. `.agents/skills/real-session-authority/SKILL.md` for persistence/session work;
5. `.agents/rules/staging-release-safety.md` for runtime/deploy work.

While `pilotReady=false`, customer data is forbidden on the VPS staging-demo.

## Layering

Keep four concerns separate:

```text
HTTP parsing / response
        |
application services
        |
repository + authorization ports
        |
SQLite / filesystem / Nginx adapters
```

HTTP handlers do not contain SQL. Repository adapters do not render HTML. React contracts do not contain database rows.

## Session authority invariants

O parser puro `src/publication/publicationManifest.ts` e `docs/contracts/photo-publication-manifest-v1.schema.json` servem para validar apenas metadados futuros; não armazenam fotografias, não ativam revisões e não habilitam cliente real. Antes de integrar Python, ler `docs/integrations/photo-sessions/PUBLISHER_EVYDFLOW_HANDOFF_V1.md`.

- `photoSessionId` is the technical gallery identity.
- One gallery per CRM order is the business rule; if a legacy interface needs `galleryKey`, keep it fixed to `principal`.
- revisions are immutable after VALIDATED;
- STAGED or FAILED revisions are never public;
- `activeRevisionId` changes only with compare-and-swap using the expected previous value;
- a grant for A never resolves unpublished revisions or media belonging to a different order B;
- tokens are random capabilities, never order/phone-derived;
- store only a verifier/hash of the public capability when the real access model is implemented;
- unknown/revoked/expired access fails closed without fixture fallback.

## SQLite boundary

Do not let a SQLite-specific API leak into application/domain contracts.

The repository targets Node 24. `node:sqlite` is available but is still release-candidate stability in the current Node 24 line. If it is selected, keep it behind a narrow adapter and document the acceptance in the implementation PR. Do not add an ORM or native dependency merely to avoid writing the small repository layer unless a measured requirement justifies it.

Required database settings/behaviour for the pilot design:

- database on local VPS disk only;
- foreign keys enabled;
- WAL only after tests prove the selected driver/settings;
- explicit migrations with monotonically ordered versions;
- busy timeout / bounded write contention handling;
- transactions for revision validation/activation;
- backup + restore tested before pilot;
- no DB file inside the immutable release directory.

## Implementation order

Do not start with public HTTP routes.

1. schema/migrations;
2. repository contracts;
3. in-memory/repository unit tests for invariants;
4. SQLite adapter;
5. A1/A2 revision tests plus isolation from a different order B;
6. revision application service;
7. internal API;
8. public grant/session provider;
9. media authorization;
10. manual Node publisher.

EvydFlow comes after the manual Node publisher is green.

## Required tests

At minimum prove:

- create/replay of the same CRM order resolves the same photo session;
- A and its next revision keep one album with atomic activation;
- B (a different order) remains isolated;
- photo from B cannot be resolved using A;
- incomplete revision cannot activate;
- activation fails on stale `expectedActiveRevisionId`;
- idempotency replay returns the prior result;
- process restart preserves ACTIVE revision;
- invalid/revoked token returns unavailable/404, never fixtures.

## Runtime

Production-like service runs compiled JS with Node:

```bash
pnpm --filter @christmas-games/catalog-server build
pnpm --filter @christmas-games/catalog-server start
```

Do not run `tsx` in the VPS service.

The existing host-systemd deployment example binds to `127.0.0.1` and expects Nginx as HTTPS edge. **This is not yet reconciled with the operator-reported Contabo Caddy/Docker edge.** For that host, read `docs/ops/CONTABO_JOGOS_STAGING_2026-10-08.md` and preserve single Caddy :443 termination; Nginx should be internal only if containerized. Do not deploy both edge topologies.

For future customer publication follow `docs/integrations/photo-sessions/SESSION_MEDIA_PUBLICATION_CONTRACT_V1.md`: revisions STAGED→VALIDATED→ACTIVE, upload/authorization not yet implemented, manual Node publisher before EvydFlow, one CRM order=one gallery.
