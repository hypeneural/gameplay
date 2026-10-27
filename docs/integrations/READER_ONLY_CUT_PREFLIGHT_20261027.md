# Private catalog-reader: isolated release preflight (2026-10-27)

**Scope:** Media VPS read-only metadata sidecar, not the public Gameplay catalog.
This document is a preflight, **not** an authorization to deploy.

## Source-of-truth commits and environment

- Source: Gameplay PR #43; obtain its current complete HEAD with
  `git rev-parse HEAD`. The Antigravity stage-3 receipt validated
  `ab672a48c419cdb0323eb05edd81b6d480160cd7`; any later code
  change requires new tests, staged manifest and CI on the new SHA.
- Reported Media VPS reader: `20261027-37190a8`, localhost
  `127.0.0.1:4182`. It still returned 200 for GET `/` and is therefore
  **not** equivalent to the hardened build.
- Reader overlay: `deploy/vps/docker/compose.private-audit.yaml`.
  It uses `CATALOG_READER_RELEASE_DIR` **only for the reader**.
  The public catalog retains its independent `RELEASE_DIR`, usually
  `/srv/runtime/christmas-games/current`.
- The `CATALOG_READER_RELEASE_DIR` environment variable is **required**
  whenever the reader overlay is rendered, including a dry-run.
  A missing value must fail configuration rather than fall back silently.
- Confirm the approved `stackctl` wrapper can pass both variables separately
  and target only `catalog-reader`. If not, stop: **BLOCKED_WRAPPER**.

## Stage 1: local build and evidence (nonmutating)

1. Keep `readiness.json` flags false. Run `pnpm check`,
   `pnpm release:staging`, then `pnpm release:verify`.
2. Check `.release/vps/RELEASE.json`, exact `gitSha`, manifest file count,
   SHA-256 inventory and `server/main.js`.
3. Render the **merged** persistence + reader Compose model with the
   official `docker compose --profile audit-private ... config --format json`
   in a safe local environment. Use only synthetic paths/UID/GID and
   placeholder secret-file *paths*, not actual secret contents.
4. Assert `catalog-reader.command=['node','server/main.js']`, loopback
   port 4182 to container 4180, `read_only=true`, cap drop ALL,
   no new privileges, `backend` only, three release mounts
   from `CATALOG_READER_RELEASE_DIR` and no public `RELEASE_DIR` mounts.
5. Assert `catalog` and `gateway` still refer to the original
   `RELEASE_DIR`; do not confuse `docker compose config --quiet`
   (syntax pass) with the security assertions on the rendered model.
   **Never paste the full rendered model into a PR or report** because
   it may contain sensitive environment values.

## Stage 2: VPS preflight (read-only; no deployment)

1. Use `stackctl` documented inspection only: capture container ID,
   image digest, actual command, release mount source, read-only filesystem,
   UID/GID, loopback bind and health. Do not print secret values.
2. Record the existing immutable reader artifact, merged Compose config
   and a safe rollback procedure. A bare `docker compose restart` does
   not apply a new mount or command.
3. Check a **consistent** SQLite snapshot and tested restore in a
   separate scratch directory using approved tooling. Database file
   presence, zero-byte WAL and `integrity_check` alone do not prove
   that media bytes and database revisions are consistent.
4. Verify `/internal/*` is inaccessible from the public ingress.
   localhost-only host port is necessary but not a substitute for
   application-level auth or Docker network isolation.

## Stage 3: after a separately authorized reader-only cut

- Recreate **only** the `catalog-reader` service using the approved
  wrapper with `CATALOG_READER_RELEASE_DIR` pointing to the verified,
  immutable reader build. Do not use `docker compose up` on all
  services, `down`, or direct `docker rm`.
- Verify the running **container mount/source checksum**, not merely
  the Git commit or directory name.
- Require GET `/healthz` = 200; GET `/`, `/demo/fotos`, synthetic
  `/s/:token` and HEAD `/s/:token` = 404.
- POST batch without Bearer = 401. With already-provisioned operator
  Bearer + synthetic absent UUID = 200 `not_found` without URLs.
  A single link request = 409
  `{"error":"CUSTOMER_LINKS_NOT_ENABLED"}`.
- No actual customer URLs, image access, browser runtime, Z-API, print,
  CRM writes or `readiness.json` changes in this cut.
- If any gate fails, use the approved wrapper to return only the reader
  to its prior immutable artifact/config or disable the reader if the
  previous build violates public-route isolation.

## Relevant official documentation

- Docker Compose interpolation/merge:
  https://docs.docker.com/reference/compose-file/interpolation/
- Compose validation:
  https://docs.docker.com/reference/cli/docker/compose/config/
- Targeted Compose service update:
  https://docs.docker.com/reference/cli/docker/compose/up/
- SQLite WAL:
  https://sqlite.org/wal.html
- SQLite online backup:
  https://sqlite.org/backup.html
