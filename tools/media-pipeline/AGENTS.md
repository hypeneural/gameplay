# Media pipeline

- This package is **Node-only**, never browser code. Do not interpret that as VPS-only.
- For photo sessions, the current `prepared-derivatives` MVP runs this worker on the Windows studio machine through `pnpm gallery:prepare` / `pnpm gallery:lab`.
- A future VPS `source-ingest` mode is a separate contract; do not move Sharp to the VPS merely to simplify the current integration.
- Originals remain outside the webroot and are never returned as public URLs.
- Preserve aspect ratio: derivatives use Sharp `fit: 'inside'` and `withoutEnlargement: true`.
- Derivative identity/cache includes `sourceHash + recipeKey`; source hash alone is not enough after recipe changes.
- Re-hash the private staging snapshot and compare it with the pre-copy hash before promotion.
- Every variant records actual width, height and byte length. Never invent `srcset` widths from the recipe name.
- A collection is publishable only when the expected exact set is ready with zero failed items.
- Keep concurrency bounded. Do not process an entire customer session with unbounded `Promise.all`.
- Human-readable diagnostics go to stderr when a machine-readable JSON receipt is expected on stdout.
- Validate targeted media changes with `pnpm exec vitest run tools/media-pipeline/tests/media-pipeline.test.ts`, then run `pnpm check:fast` and `pnpm check`.
