# Public session read-only gate — Natal 2026 (28/10/2026)

**Purpose:** allow the studio to open **existing ACTIVE** family sessions at
`https://jogos.fotosdenatal.com/s/<opaque-token>` (hub / games) and
`/s/<opaque-token>/fotos` without enabling new session publication or
changing CRM commercial status. This is separate from the private reader and
from the authenticated MCP inventory PR #15.

## Existing production topology audited

- Nginx `deploy/vps/docker/nginx.conf` proxies public `/s/:token` HTML,
  `/s/:token/data` and `/s/:token/media/*` to `catalog:4180`.
- Current public `catalog` is `staging-demo` and `file-demo`: its
  `CatalogServer` normally returns 404 for a customer token absent from the
  demo preview config. The **private** `catalog-reader` deliberately returns
  404 for all public paths; enabling `CATALOG_PRIVATE_CUSTOMER_LINKS_ENABLED`
  alone cannot make a working album link.
- The public `PublicationService` already provides session data and
  authorized media reads when its `SqliteSessionRepository` and
  `FileSystemStorageService` are configured. All I/O/mounts and WebP media
  permissions still need real deployment verification.

## Proposed opt-in

PR #47 adds a narrow, fail-closed public HTML fallback that:

- activates only with `CATALOG_PUBLIC_SESSION_READ_ENABLED=1` and
  `CATALOG_PUBLIC_CUSTOMER_ROUTES_VERIFIED=1` and
  `CATALOG_CUSTOMER_DATA_ALLOWED=1` at startup;
- additionally requires an initialized `PublicationService` and
  `sessionIsActive`, which checks a token hash for an ACTIVE session with
  active revision in SQLite;
- applies only to actual `/s/:token`, `/fotos`, `/game/id` routes;
- refuses tokens absent/revoked; never overrides a revoked social-preview
  record; never uses a client-supplied order ID or name to authorize a token;
- uses generic studio-only social OG image, not customer photos;
- preserves current demo, internal API authentication, read-only sidecar,
  and existing `staging-demo` restrictions for publishing/OG customer photo.
- never creates a capability token, uploads, mutates orders or sets readiness.

The Compose changes add flags **defaulting to 0**, independently for public
`catalog` and private `catalog-reader`. The reader remains bound only to
`127.0.0.1:4182`, not to the public edge network.

## Hard gates before real links

1. CI on PR #47 must be green (Vitest catalog, types, lint, Prettier,
   dependency graphs and release manifest).
2. Dedicated, immutable public release with PR #47 code must be installed
   via **service-only** cut. The existing global `stackctl deploy
christmas-games` guard must not be bypassed. Verify the actual live
   mount layout and client build compatibility: the public `gateway` serves
   the UI from its own `RELEASE_DIR` mount.
3. No step changes `catalog-reader` in the public cut or invokes
   `docker compose down`, `--remove-orphans` or writes SQLite.
4. Synthetic invalid token and revoked token must give 404. Previously
   approved active pilot token must yield HTTP 200 on HTML, JSON and WebP
   variants from a real browser. Test that its game loads actual photos.
5. Only after those probes may the private reader's **separate** flags be
   opted in to generate individual capability URLs for an authorized CRM
   operator: `CATALOG_PRIVATE_CUSTOMER_LINKS_ENABLED=1`,
   `CATALOG_LINKS_OPERATOR_APPROVED=1`,
   `CATALOG_PUBLIC_CUSTOMER_ROUTES_VERIFIED=1`,
   `CATALOG_CUSTOMER_DATA_ALLOWED=1`.
6. Internal `/internal/*` must remain inaccessible from the public edge.
   No bearer secrets, URLs/tokens or names in logs.
7. Then the MCP PR #15 tool lists published family orders of Natal 2026
   regardless of CRM sale status, individually requesting links only after
   the operator asks for them.

**Caveats:**

- A valid published manifest does not prove that every image is accessible.
- The JSON session route and media auth are served by PublicationService,
  **not** by this CatalogServer HTML fallback. Both must be validated.
- Do not claim 100% availability from 525 manifest photos alone.
- Capability URLs grant access to anyone who receives them; only display
  them to the operator with CRM OAuth access.
- No merge/deploy from this document alone; use operator-approved runbook
  `hypeneural/evydencia-crm-mcp` PR #15,
  `docs/PROMPT_ANTIGRAVITY_ETAPA8_LINKS_TODAS_FAMILIAS_20261028.md`.
