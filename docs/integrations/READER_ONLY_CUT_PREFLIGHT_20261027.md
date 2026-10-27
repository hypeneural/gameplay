# Reader-only cut preflight

Date: 2026-10-27. Scope: private Gameplay metadata reader only.

This is a review checklist, not permission to deploy.

## Release isolation

- Public catalog release variable: `RELEASE_DIR`.
- Private reader release variable: `CATALOG_READER_RELEASE_DIR`.
- The reader release variable is required in the audit overlay.
- The public `catalog` and `gateway` must keep their existing release mounts.
- The reader must mount its own immutable `server`, `package.json` and `web`.

## Local build

1. Record the current full Git SHA and clean worktree.
2. Run `pnpm check`, `pnpm release:staging` and `pnpm release:verify`.
3. Validate `.release/vps/RELEASE.json` and `server/main.js`.
4. Render the merged Compose model using synthetic environment values.
5. Verify reader command, mounts, profile, network and localhost port.
6. Confirm that `catalog` and `gateway` still use the public release.
7. Do not print the full rendered configuration because it may contain secrets.

## VPS read-only preflight

1. Inspect the live reader container ID, actual command and mount sources.
2. Verify the host bind is limited to `127.0.0.1:4182`.
3. Verify that public ingress cannot reach `/internal/*`.
4. Verify `stackctl` can target only the reader and pass both release variables.
5. Confirm the previously deployed immutable artifact and rollback mechanism.
6. Test SQLite backup integrity and restore in an isolated scratch directory.
7. Do not restore to live paths or change public catalog, CRM or PrintServer.

If the wrapper cannot isolate the service, report `BLOCKED_WRAPPER`.

## After a separately authorized reader cut

- Verify the running container mounts the approved, hashed reader bundle.
- Require `GET /healthz` to return 200.
- Require public pages and synthetic session pages to return 404.
- Require a missing Bearer token to return 401.
- Require an authorized, absent synthetic order UUID to return 200 without URLs.
- Require customer links to return 409 with `CUSTOMER_LINKS_NOT_ENABLED`.
- Keep customer publication, automatic delivery and WhatsApp disabled.
- Restore the prior immutable reader only through the approved wrapper.

The old Media VPS reader reportedly serves HTTP 200 on `GET /`.
It cannot be accepted as the new hardened reader.

## Separate risks

Gameplay issue #44 tracks fail-closed backup restoration safeguards.
Do not use `restoreCatalog()` against an existing production target.

## Official references

- https://docs.docker.com/reference/compose-file/interpolation/
- https://docs.docker.com/reference/cli/docker/compose/config/
- https://docs.docker.com/reference/cli/docker/compose/up/
- https://sqlite.org/backup.html
- https://sqlite.org/wal.html
