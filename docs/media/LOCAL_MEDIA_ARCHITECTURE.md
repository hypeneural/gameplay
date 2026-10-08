# Local media architecture

> The media pipeline is a versioned Node/Sharp package, not a VPS-only runtime. For photo sessions, the MVP uses `prepared-derivatives`: the worker runs on the Windows studio machine and the VPS receives only verified derivatives. Before EvydFlow integration, the same worker is used by the Node-first Gallery Lab so real photos can exercise Hub, Gallery and games without CRM/Python.

## Storage layout

```text
private-storage-root/
  originals/<session-uuid>/<photo-id>/<source-hash>/source
  derived/<session-uuid>/<photo-id>/<source-hash>/<recipe-key>/thumb.webp
  derived/<session-uuid>/<photo-id>/<source-hash>/<recipe-key>/card.webp
  derived/<session-uuid>/<photo-id>/<source-hash>/<recipe-key>/game.webp
  derived/<session-uuid>/manifest.json
  local-test-session.json          # only in Gallery Lab/local preview
```

`storage` is outside the webroot. In the `prepared-derivatives` MVP, VPS storage contains browser derivatives and publication metadata; it does not require client originals. Token, database id, public photo id, filename and physical path are separate identifiers.

The cache key is not only the source hash. Browser media is scoped by:

```text
photoId + sourceHash + recipeKey
```

`recipeKey` changes when output-affecting policy changes, including resize recipe, encoder policy and pinned Sharp/libvips versions. This prevents a recipe update from reusing stale files generated from the same source bytes.

## Ingestion state machine

```text
pending → processing → ready
                  └→ failed
```

The Node worker validates a regular file, a 32 MiB input-byte ceiling, decodability and bounds (`limitInputPixels`, `limitInputChannels`), applies EXIF auto-orientation, converts to sRGB, records oriented metadata, and writes WebP derivatives using `fit: inside` plus `withoutEnlargement`.

Before derivation, the source is hashed and copied into a private snapshot. The snapshot is hashed again before promotion; if it no longer matches the first hash, processing fails instead of deriving from a moving source.

A bounded batch adapter isolates one failed source from the worker loop, but a Gallery Lab/publication config is published only when:

```text
expected == ready
failed == 0
```

For every derivative, the manifest records:

```text
width
height
byteLength
```

Those are the only valid inputs for responsive `w` descriptors. Recipe names such as `thumb=480` are long-edge policies, not intrinsic widths.

A future queue adapter must set `MEDIA_JOB_CONCURRENCY` and `SHARP_CONCURRENCY` from measurements on the runtime that actually executes Sharp. For the photo-session MVP this is the Windows studio machine; never infer VPS throughput from the local benchmark and never process every session photo concurrently.

## Prepared derivatives: Windows -> VPS

The production photo-session path remains:

```text
treated source folder
  -> freeze manifest
  -> private snapshot
  -> Node/Sharp on Windows
  -> verify thumb/card/game + hashes + real dimensions + recipeKey
  -> authenticated HTTPS staging upload
  -> backend exact-set verification
  -> atomic revision activation
```

Only an activated revision is visible to Hub, gallery and games. The backend never treats the arrival of the last file as implicit activation.

## Node-first Gallery Lab

For product validation, Python/EvydFlow is intentionally not required.

From the repository root:

```powershell
pnpm gallery:lab --source "C:\Fotos\Sessao-Tratada"
```

The command prepares the default private storage at:

```text
.local-test-media/gallery-lab/
```

and starts `apps/play` on loopback (`127.0.0.1`). It prints direct links to:

```text
Hub
/s/<local-token>

Galeria
/s/<local-token>/fotos

Puzzle
/s/<local-token>/game/puzzle-swap
```

all with the local-test query required by the development adapter.

For automation without a long-running Vite server:

```powershell
pnpm gallery:prepare --source "C:\Fotos\Sessao-Tratada"
```

This returns a JSON receipt on stdout. Typed errors are written to stderr and the process exits non-zero.

The local config v2 contains worker fingerprint, recipeKey and real variant metrics, but never original filenames or source paths. Local photo ids are deterministic/opaque so inserting another file earlier in sort order does not renumber existing photos.

The Gallery Lab proves image behavior and gameplay integration. It is **not** the production authorization endpoint and must not be exposed as a remote publishing mechanism.

See `docs/integrations/photo-sessions/AUDITORIA_NODE_FIRST_GALLERY_LAB_2026-10-06.md` for the staged validation sequence.

## Authorized delivery

```nginx
location /_private_media/ {
    internal;
    alias /srv/christmas-games/storage/derived/;
}
```

The application endpoint accepts `/media/p/<opaque-photo-id>/<variant>`, validates the session cookie, ownership, active revision and allowed variant, then returns an `X-Accel-Redirect` into the recipe-scoped derivative namespace. Nginx serves the local file; neither original nor physical path is exposed.

The authorization endpoint must reject traversal, variant values outside the allowlist, unknown ids and sessions without the secure HttpOnly browser grant. Add cache policy and rate limits at deployment time; do not add Cloudflare Images, S3, R2 or imgproxy merely to bypass the missing session backend.

## Direct Node publisher before Python integration

Once `apps/catalog-server` implements the real internal session/revision API, add a manual Node publisher that consumes the same manifest generated by `tools/media-pipeline`:

```text
prepare -> create/resolve session -> begin revision -> upload derivatives -> verify -> activate
```

That publisher is the second validation stage and still does not require EvydFlow. Only after it is green should the Python adapter invoke the same worker and the same API.

Do not create an interim FTP/webroot upload path. A temporary bypass would invalidate the exact security and atomicity properties the production path is meant to prove.
