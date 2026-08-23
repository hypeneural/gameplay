# Local VPS media architecture

## Storage layout

```text
/srv/christmas-games/
  releases/
  current/
  storage/
    originals/<session-uuid>/<photo-id>/<content-hash>/source
    derived/<session-uuid>/<photo-id>/<content-hash>/thumb.webp
    derived/<session-uuid>/<photo-id>/<content-hash>/card.webp
    derived/<session-uuid>/<photo-id>/<content-hash>/game.webp
```

`storage` is outside the webroot. Token, database id, public photo id, filename and physical path are separate identifiers.

## Ingestion state machine

```text
pending → processing → ready
                  └→ failed
```

The Node worker validates a regular file, a 32 MiB input-byte ceiling, decodability and bounds (`limitInputPixels`, `limitInputChannels`), applies EXIF auto-orientation, records oriented metadata, and writes WebP derivatives using `fit: inside` plus `withoutEnlargement`. A bounded batch adapter isolates one failed photo from the rest of a session. A future queue adapter must set `MEDIA_JOB_CONCURRENCY` and `SHARP_CONCURRENCY` from VPS measurements; initial production target is 2 concurrent photos, never all session photos at once.

Content hash makes both the stored original and its derivation idempotent. A reused photo id with changed pixels receives a new immutable namespace instead of silently serving the prior original. A worker creates all variants in a sibling staging directory, verifies the WebP format and dimensions, then renames it into the content-hash directory. It writes a sibling `manifest.json.next-<uuid>` and renames that file only after the merged manifest write succeeds. A pre-existing incomplete hash directory is rejected rather than published; the deployment worker must alert and quarantine/rebuild it under a leased job before a retry. The local merge is safe for one writer only: a multi-worker deployment needs a database-backed lease and manifest/state transaction.

## Authorized delivery

```nginx
location /_private_media/ {
    internal;
    alias /srv/christmas-games/storage/derived/;
}
```

The application endpoint accepts `/media/p/<opaque-photo-id>/<variant>`, validates the session cookie, ownership and allowed variant, then returns an `X-Accel-Redirect` header such as `/_private_media/<session>/<photo>/<hash>/game.webp`. Nginx serves the local file; neither original nor physical path is exposed.

The authorization endpoint must reject traversal, variant values outside `thumb|card|game`, unknown ids and sessions without the secure HttpOnly session cookie. Add cache policy and rate limits at deployment time; do not add Cloudflare Images, S3, R2 or imgproxy in this phase.
