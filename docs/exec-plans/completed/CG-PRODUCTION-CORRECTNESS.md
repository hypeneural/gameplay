# CG-PRODUCTION-CORRECTNESS execution record

## Completed — 2026-08-23

This increment hardens the validated Game Factory foundation. It does not add a production backend, Nginx integration, PWA service worker or a real game implementation.

## Delivered

1. The web composition root now uses a lazy installed-game registry instead of hard-coding a game in the Phaser creation function.
2. Each mounted game gets a Web Crypto run id, deterministic seed and monotonically sequenced lifecycle events. Analytics is stable at app scope; randomness is per run.
3. Phaser teardown waits for the official `DESTROY` completion event. The mount coordinator serializes React Strict Mode and route-transition game instances, preventing overlapping canvases/input managers.
4. The host reports ready only after the game emits `GAME_READY`; it filters late bridge events from prior runs. Phaser focus/visibility signals drive the product active clock after boot, with page visibility as an early fallback.
5. Audio policy no longer requests manual browser unlock. A future Phaser adapter owns `locked`/`UNLOCKED` and queued playback while the shared layer owns mute and volume preference.
6. Local media originals and derivatives are content-addressed. Reusing a photo id after replacing the source creates a new immutable namespace; derivative staging validates WebP output; manifest writes merge entries instead of deleting a session's prior entries.
7. The read-only inspector distinguishes supported candidates, unreadable headers, unsupported extensions, EXIF orientation, format, colour space and embedded profiles. It supports a single explicit date-batch layer and still excludes session delivery subfolders.
8. Hub cards reserve image geometry, expose a keyboard/touch fallback for progressive loading and include a 172-photo fixture. Vite lazy-chunk recovery retries one guarded reload.

## Evidence

- Full read-only Christmas 2024 scan: 396 non-empty sessions, 10,244 direct JPEG candidates, no unreadable headers, 5 / 23 / 44 / 92 photos at min / median / p90 / max, and mixed landscape/portrait usage. Details are in `docs/media/NATAL_2024_CORPUS_BASELINE.md`.
- `pnpm validate` passed on Node 24: strict types, ESLint, 28 unit tests, 67-module dependency-cruiser audit, Knip, formatting, map check, production build and 12 Playwright scenarios on iPhone 390, Android 412, large phone 430 and tablet 768. Browser duration: 1.8 minutes.
- The 172-photo test intentionally disables `IntersectionObserver` and proves the explicit fallback button on all four profiles. Normal entry/exit tests still exercise the browser's observer-capable environment.
- Vite keeps Phaser in a lazy chunk. Current build: 1,375.61 kB / 357.99 kB gzip. It remains a measured warning pending a target-device threshold, not a failing budget.

## Explicit next authority

- Authorize the backend/storage decision to implement job leasing, stale staging recovery, delivery authorization and private diagnostic retention.
- Authorize the public-shell scope before adding history routes, a web-app manifest, service worker and cache policy.
- Select Puzzle Swap 2.0 and approve its SPEC as the first real game implementation.
