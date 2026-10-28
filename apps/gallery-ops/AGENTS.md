# Gallery Ops (administrative frontend)

This app is intentionally isolated from `apps/play` and `apps/catalog-server`. It must never copy CRM commercial eligibility rules, query SQLite in the browser, or place bearer/capability credentials in JS.

## Working modes

- `pnpm --filter @christmas-games/gallery-ops dev`: deterministic **synthetic-only** preview on loopback. Never real customer data.
- Production build: calls the same-origin BFF implemented under `server/` only after signed Cloudflare Access JWT and email allowlist checks; unauthenticated/failed API receives no rows and never falls back to mocks. **Deploy not approved until gated tests and live canary.**
- No automatic fallback from live API errors to synthetic data.

## Hard gates before any live deployment

1. Per-operator authentication/authorization for both HTML and API via BFF Cloudflare Access RS256 verification; deny by default; do not depend on `robots.txt`, cookies from another domain, or static host rules alone.
2. Canonical eligible order IDs from `NatalValidOrdersQuery::validNatalOrders()` via an authorized CRM/MCP server-side bridge; do not assume product filter equals commercial eligibility.
3. Private Gameplay reader lookup by UUID in ≤50 batches, excluding capability URLs from listing/CSV; unknown API results are not `no_session`.
4. Dates from actual first READY blob / active revision `activated_at` with declared semantics; not inferred from order creation.
5. Individual links only after authorized recheck and browser-pilot proof.
6. Prove aggregate parity at same `asOf`, no data truncation, 401/403, no caching, no IDOR, audit and rollback.

Never change `deploy/readiness.json`, public game routing, customer media, PrintServer, Z-API, or publisher pilot gates from this app.

## Commands

```sh
pnpm install --frozen-lockfile
pnpm --filter @christmas-games/gallery-ops build
pnpm --filter @christmas-games/gallery-ops test
pnpm repo:map:check
```
