# Media pipeline

- This package is Node/VPS-only. Never import it from `apps/` or a browser package.
- Originals remain outside the webroot and are never returned as public URLs.
- Preserve aspect ratio: derivatives use Sharp `fit: 'inside'` and `withoutEnlargement: true`.
- Keep processing idempotent by content hash and bounded by `MEDIA_JOB_CONCURRENCY` in the future queue adapter.
- Validate changes with `pnpm --filter @christmas-games/media-pipeline test` and `pnpm validate`.
