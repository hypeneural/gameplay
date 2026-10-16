# Handoff - Natal Velvet Gallery v1 (16/10/2026)

Status: visual implementation on an isolated branch, pending local checks and CI. Base: PR #7 `feat/christmas-gallery-native-mobile-v2`. Do not deploy, merge into default branch or publish customer data.

## Delivered

- Burgundy / Christmas red feed background, gold photo frames and CSS-only illuminated side rails.
- Fourteen lightweight CSS snow particles **behind** photography; unmounted while the lightbox is open and for LOW/calm.
- Minimal heading; photo count is now in the bottom brand area, preserving existing commercial link.
- Per-image natural aspect ratio based on metadata (portrait 15x21 and landscape 21x15 work without enforcing rounding or crop).
- Keyboard left/right support in viewer when not zoomed; photo counter at the bottom.
- Christmas themed lazy Suspense loader in the eager shell style bundle.
- Existing `playInterfaceTap` audio remains: paper on photo, tap on buttons. No autoplay, new libraries, customer photo files or production publication changes.

## Findings / follow-up (Antigravity)

1. **Existing constraints**: `.agents/rules/christmas-gallery-album.md` previously prohibited continuous snow and heavy repeated photo frames. Operator explicitly requests this Christmas direction. Keep the photo-first quality invariant, but amend that rule carefully **only after profiling**. The current branch is an isolated aesthetic experiment, not a blanket approval of slow effects.
2. **Assets**: current rails are CSS placeholders, not photorealistic. Generate a clean transparent tiling Christmas garland atlas (left/right/corners) with zero human faces, text or controls; optimize to WebP/AVIF with transparency; register exact SHA256/bytes/dimensions, provenance and budget in `apps/play/assets/christmas-shell/manifest.json`, `ASSET_PROVENANCE.md` and `GALLERY_PROVENANCE.md`. Preserve existing AI WebP hero.
3. **Performance**: verify LCP and resource count with 30/35 real images. Avoid filter/box-shadow continuous animation; use compositor-friendly opacity/transform only where measured, pause decorative animation when hidden. No Phaser and no particle engine on gallery route.
4. **Interaction**: current zoom is fixed 180% Boolean, not continuous pinch; implement accessible, pointer-safe 1-3x zoom only after physical iPhone/Android evaluation. Consider existing YARL+Zoom challenger if supported by actual profiling, otherwise keep DOM viewer.
5. **Sound**: use existing `playInterfaceTap` (with a user-gesture unlock and shared mute setting); never autoplay. Buttons back, close X, share, photo, game CTA and a future sound toggle should have tactile scale feedback and accessible names. Fireworks should be a finite small burst after an explicit user action, outside photo pixels, and off for LOW/reduced-motion.
6. **User flow**: photo selection -> Hub -> user chooses game. Maintain `selectedPhotoId`, scroll state, session isolation, revisions, and secure URLs.
7. **Loader**: no arbitrary timeouts or fake progress; skeleton dimensions must follow actual photo aspect metadata. Distinguish slow network from invalid/revoked access.
8. **Layout**: maintain one-column feed, real image ratio, safe areas, no crop and no horizontal overflow. Avoid interpreting the mockup's two-column grid as the production requirement.

## Minimal gate sequence

```powershell
corepack enable
pnpm agent:doctor
pnpm check:fast
pnpm test:e2e:gallery
pnpm test:e2e:gallery-multi
pnpm asset:validate:all
pnpm check
pnpm build
pnpm gallery:lab --source "C:\\Fotos\\Sessao-Tratada"
```

Execute full checks once after targeted corrections, not as an infinite loop. Capture 320/390/412/430/768 responsive screenshots and test iPhone Safari/Android Chrome physically. The gallery E2E checks no Phaser/canvas, initial 8 images, keyboard, reduced-motion, bottom counter, swipe/back/focus, lightbox, no 404/500, photo restoration and A/B isolation. Record actual metrics; the developer's review is not a substitute for real run evidence.

## Official references

- https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion
- https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay
- https://developer.mozilla.org/en-US/docs/Web/CSS/aspect-ratio
- https://web.dev/articles/animations-guide

## Release safety

Do not change `deploy/readiness.json`, customerDataAllowed, token handling, derivatives, CRM publisher or backend. No production deploy in this PR. The public Git repository must never hold real customer photo sources or identifying order details.

## Forensic review v2 — geometry and photoreal asset plan

### Audited implementation (do not guess)

- `SessionGallery.tsx`: single-column batches of 8, naturally sized images, persistent scroll/selection, safe Hub handoff, compact hero, bottom photo count and tappable bow.
- `GalleryFrame.tsx` / `galleryFrameGeometry.ts`: computes the frame aperture ratio from the **actual selected derivative** (card in feed, game in lightbox), then uses that exact CSS aspect ratio. Decorations live in separate DOM siblings outside the image window. The window clips to its own radius and uses `contain`. No white pass-partout should appear unless it exists in the source pixels or variant geometry is incorrect.
- `PhotoPrint.tsx`: responsive WebP srcset computed from measured width, lazy except the first photo; important: variantMetrics from backend may differ from source ratio after auto-orient or rounding, so do not use `photo.aspectRatio` alone for the well.
- `GalleryAtmosphere.tsx`: 14 CSS snowflakes, disabled during zoom/lightbox, LOW, calm and hidden tab. OS reduced-motion disables animation via CSS.
- `GalleryMagicButton.tsx`: 8 tiny finite radial sparks and existing `bells` cue on an actual user tap, with accessible name. No autoplay, WebGL, Phaser, looping fireworks or overlays over photography.
- `SessionGalleryLightbox.tsx`: same frame geometry for portrait/landscape, bottom counter, keyboard arrows, lazy component, optional instruction popover, existing 180% zoom (continuous pinch still incomplete).
- `galleryPolicy.ts`: narrower responsive sizes reflecting the decorative matte so cards do not needlessly request full viewport widths.

### Root cause: white gaps and imperfect fit

`object-fit: contain` correctly preserves the full photo, but creates letterbox/pillarbox whenever the image and reserved frame differ in proportions. The gallery was reserving an opening from a nominal source aspect ratio while `PhotoPrint` could render a differently oriented/rounded derivative. Fix by measuring the **same derivative that was requested**. Only apply `cover` to art, never customer photography. Test on actual output `img.naturalWidth/Height`: compare to the CSS well at <=1% difference; report anomalies and inspect EXIF normalization and `variantMetrics`. If the original file itself has white padding, report it separately, never crop it without operator approval.

### Asset generation spec — essential to reach both approved reference screenshots

The current side rails and frame corners are **functional placeholders**, not visually equivalent to the references. The existing registered `gallery-evergreen-hero-retina-v6.webp` is already photoreal; it is temporarily reused along the sides with no new transfer budget. Reusing full-size game frames is **not** a safe shortcut: existing `guirlanda` game frame portrait is 343x640 / 40,074 bytes and landscape 640x449 / 50,980 bytes, and their alpha openings are tied to game-specific normalized aperture geometry (`GarlandLayout.ts`). Stretching them across arbitrary 15x21/21x15 photo cards would warp materials or leave undesired internal gaps.

Generate a transparent modular kit (AI source + deterministic processing) that does **not** include photographs or backgrounds behind apertures:

- `gallery-velvet-side-left-v1.webp`: seamless vertical 128x512 RGBA tile, pine needles, red berries, cones, discreet warm LEDs, real transparent center-side; avoid repeated giant bows every tile.
- Right side should preferably mirror with CSS; only create a distinct right tile if art asymmetry requires it.
- `gallery-velvet-top-v1.webp`: single compact 640x132 RGBA garland, bow and staggered practical LEDs, minimal text clearance; reuse current approved hero where possible.
- `gallery-velvet-frame-corners-v1.webp`: transparent atlas with 4 corner ornaments, each designed in a 64x64 or 96x96 cell. Gold filigree, green holly, tiny ruby beads and realistic shadows; no opaque square/background. Sprite clips must live mainly on the **matte**, not in the central photo opening.
- `gallery-velvet-frame-edges-v1.webp`: ultra-light narrow repeatable gold/ivory candy-cane edge strips (horizontal and vertical), alpha center. Implement four corner/edge slices or genuine nine-slice, with fixed-thickness CSS borders so shapes remain undistorted in all image aspect ratios.
- Optional `gallery-velvet-bottom-v1.webp`: compact wreath footer.

**Image-quality gates**: 1) transparent center alpha=0 with a safety inset, 2) no baked pixels of photos, people, phone hardware, control icons or text, 3) no visible white background corners or opaque rectangle from the RGBA master, 4) corners do not cross into faces, 5) edge tile seams inspected, 6) material silhouette readable at 320px, 7) portrait AND landscape previews rendered at actual media dimensions, 8) compare 390 and 430px against the user's two red reference images.

**Performance gates**: audit existing 36KB gallery visual shell budget: a photoreal bundle that exceeds it is NOT automatically approved. Benchmark encoded WebP/AVIF bytes, separate fixed decoration (may load once) and lazy frame resources (may be shared), DOM+GPU cost. Propose budget update with measured evidence only; do not silently change `manifest.json` thresholds. Register every new public asset in `apps/play/assets/christmas-shell/manifest.json` and provenance using the existing asset-factory. Never direct-reference game-owned files to evade the shell budget.

### Profile and acceptance

1. Run `pnpm agent:doctor` first; Node 24/pnpm 11 are required. On this branch, `pnpm check` MUST be green before moving on.
2. Run `pnpm exec prettier --write apps/play/src/app/AppRouter.tsx apps/play/src/components/GalleryAtmosphere.tsx apps/play/src/components/GalleryFrame.tsx apps/play/src/components/GalleryMagicButton.tsx apps/play/src/components/SessionGalleryLightbox.tsx apps/play/src/components/ShellIcon.tsx apps/play/src/gallery.css apps/play/src/gallery/galleryFrameGeometry.test.ts apps/play/src/screens/SessionGallery.tsx apps/play/src/shell.css docs/integrations/photo-sessions/GALLERY_NATAL_VELVET_HANDOFF_2026-10-16.md tests/e2e/session-gallery.spec.ts` once.
3. Test with real 15x21 and 21x15 derivatives; log computed `well.width/well.height`, `naturalWidth/naturalHeight`, CSS `object-fit`, dropped image errors, and edge transparency before accepting any asset.
4. Verify default, calm, saveData/LOW, reduced-motion, document-hidden; no input blocked by side rails or fixed dock; aria labels for X/Info/Share and correct gesture/help states.
5. On network throttling, sample 8 initial photos and a 30-photo scroll. Feed must not request game variant; zero Phaser, zero canvas; compare cold start bytes, long tasks, LCP/INP/CLS to branch before.
6. On iPhone Safari and Android Chrome: real pinch/zoom, tap feedback, native share and clipboard fallback, landscape, scroll restore and 320px safe area.
7. CI: targeted tests, then one full suite run, then physical review; if failed, fix exact failure and rerun affected gate. Do not repeat hundreds of unrelated tests.

### Current limitations acknowledged

- The HTML and CSS changes are pushed, but no physical screenshot of this branch or executed local Android/iOS acceptance is yet available.
- Continued touch pinch currently toggles 180%, not a genuine fluid 1-3x gesture; do not label it native-perfect.
- The refs shown by user are design references, not a guarantee that flat screenshot image sections can be placed in the runtime.
- Production gallery delivery is still gated separately; do not alter API, order/revision isolation or release readiness here.

## Forensic addendum v3 — source-verified 16/10/2026

- Audited CI initially at HEAD `35e69d7`: TypeScript/lint/architecture/Knip and 92 files/460 unit tests passed; full pipeline blocked by Prettier in seven files, then E2E skipped. Do not claim new commits green until their own workflow concludes.
- Fixed in PR: `GalleryFrame` reads actual `naturalWidth/naturalHeight` from loaded `PhotoPrint`, accounting for the browser's `srcset` selection. Adds **only explicit retry** in the lightbox after a failed image, preserving default feed controls (never nest a retry button inside a photo button). File changes and tests still require CI.
- Fixed in PR: gallery uses the existing AppRouter `soundEnabled/onToggleSound` state, instead of creating an independent mute store. Magic sparks dispose after animation, and do not mount for OS reduced motion; side lights pause on hidden/LOW/calm/lightbox.
- The Antigravity plan's proposed `git stash -u` would mutate unrelated uncommitted production release work. Prefer an **isolated git worktree** under a new sibling directory, created from the exact remote branch; leave existing dirty workspace untouched. Ask for user approval only if that worktree cannot be safely created.
- The shell visual asset budget was documented as 34,389 / 36,000 B at last Antigravity inspection. The 35–55 KB new kit is a **hypothesis** requiring actual encoding and measurement. Do not automatically lift `visualBytesMax/runtimeBytesMax/publicBytesMax`; first deduplicate/preload strategically and propose an evidence-based revised limit before changing gates.
- The original approved UI screenshots are design targets, not browser assets. Do not check customer/children photographs or private order URLs into this public repo. For local A/B, accept screenshots from the operator via local file paths outside git.
- Existing game frame images (Guirlanda das Lembranças) are approved for their own Phaser geometry, not drop-in 9-slice assets for gallery. Reuse only as art reference unless remastered, renamed, registered and revalidated against shell ownership and budget.
- Official docs: https://developer.mozilla.org/en-US/docs/Web/API/HTMLImageElement/currentSrc ; https://developer.mozilla.org/en-US/docs/Web/API/HTMLImageElement/naturalWidth ; https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/border-image-slice ; https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/touch-action ; https://developer.mozilla.org/en-US/docs/Web/API/HTMLDialogElement/showModal ; https://web.dev/articles/optimize-lcp/ ; https://web.dev/articles/animations-guide .

## Consolidation & Homologation v4 — 16/10/2026

### 1. Gallery Lab loopback security & multi-session isolation

- `apps/play/vite.localTestMedia.ts` now enforces `isLoopbackRequest(request)` checking both socket address (`127.0.0.1`, `::1`, `::ffff:127.0.0.1`) and `Host` header (`127.0.0.1`, `localhost`, `[::1]`), returning `403 { code: 'local_test_loopback_only' }` on non-loopback requests.
- Single-session lab manifests now validate `/__local-test/sessions/:token` and `/__local-test/media/:token/:photoId/:variant` against `config.session.publicToken`, returning `404` on unknown tokens or variants and never serving original files (`originalPath`).
- Unit tests in `apps/play/src/app/LocalTestSession.test.ts` cover loopback rejection, cross-session token isolation, and unknown variant rejection.

### 2. Photorealistic Natal Velvet asset kit & budget accounting

Generated offline via `tools/asset-factory/scripts/prepare-gallery-velvet-art.mjs` (Sharp 0.35.3) with unpremultiply black-background despill, feathered organic edges (zero dry cuts or dark halos), vertical torus seam blending, and programmatic `alpha === 0` assertions inside photo apertures:

| Asset                                  | Dimensions               | Bytes     | SHA-256                                                            | Role & Transparency Verification                                                                                                          |
| -------------------------------------- | ------------------------ | --------- | ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `gallery-velvet-side-left-v1.webp`     | `56×224`                 | `4,968 B` | `4bd4ab4a01f56757547188d76c92a7240509f992f4d04df78be54f60eae070cd` | Seamless vertical `repeat-y` pine/velvet/berry/cone rail; mirrored on right rail; `alpha === 0` at `x = 55`                               |
| `gallery-velvet-frame-corners-v1.webp` | `144×144` (`72×72`/cell) | `5,716 B` | `103cc0a8be66670f78fd4f112341849c0d944f45e21436b3045b0a93b1218d55` | 2×2 corner ornament atlas (pine/holly/cone/berries TL & BR; 3D gold filigree snowflake TR & BL); `alpha === 0` for `dx >= 38 && dy >= 38` |
| `gallery-velvet-frame-edges-v1.webp`   | `144×144` (`slice 48`)   | `2,262 B` | `6d90b27c88e2e311eacbf1a087e23d3195e4f0a16cccb5146f1dff1941c3a5ed` | 9-slice champagne-gold outer molding + warm ivory mat + diagonal candy-cane inner fillet; `alpha === 0` in center `28..115`               |
| `gallery-velvet-bottom-v1.webp`        | `288×58`                 | `4,510 B` | `2917ecd22ee5ce064f7891d1e555a968054b0451174fdd872d54f21fc808d54b` | U-cradle footer garland with pine, cones, ruby/gold baubles and gold scrolls; `alpha === 0` at `y = 0`                                    |

- Removed 5 unused legacy gallery SVGs (`gallery-starlight-footer-v1.svg`, `gallery-evergreen-hero-v2.svg`, `gallery-header-glow-v1.svg`, `gallery-badge-photo-count-v1.svg`, `gallery-divider-starlight-v2.svg` = `17,929 B` freed).
- Total `christmas-shell` visual budget: **`33,916 / 36,000 B`** (`2,084 B` headroom, `473 B` smaller than the `34,389 B` baseline without raising `manifest.json` limits).

### 3. Real derivative geometry & native-like mobile interactions

- Validated locally with 30 real studio photos (`25` landscape `21×15` at `2500×1786` / `card` `800×572`, and `5` portrait `15×21` at `1786×2500` / `card` `572×800`):
  - Landscape aperture `winRatio = 1.4025` vs `imgRatio = 1.4025` (`relDiffPct = 0.004% <= 1%`).
  - Portrait aperture `winRatio = 0.7146` vs `imgRatio = 0.7146` (`relDiffPct = 0.002% <= 1%`).
  - `object-fit: contain`, zero crop, zero white bars, and `.local-test-media` purged before commit.
- `SessionGalleryLightbox.tsx` implements pointer-tracked 2-finger continuous pinch-to-zoom (`1×` to `3×`), clamped 1-finger pan when zoomed, double-tap zoom toggle, and 1-finger horizontal swipe navigation (`> 48px`) when unzoomed.
- `GalleryMagicButton.tsx` triggers `bells`, an 8-spark golden radial burst, and a synchronized 900ms warm fairy-light pulse (`data-magic-pulse="true"`) on the hero and side rails.

### 4. Viewport & Core Web Vitals telemetry (Playwright Chromium)

| Viewport         | `canvasCount` | `phaserRequested` | Overflow | `LCP`    | `CLS` | `imageTransferBytes` | `jsHeapUsed` | Max `relDiffPct` |
| ---------------- | ------------- | ----------------- | -------- | -------- | ----- | -------------------- | ------------ | ---------------- |
| `320×690@2x`     | `0`           | `false`           | `false`  | `808 ms` | `0`   | `34,355 B`           | `12.7 MB`    | `0.006%`         |
| `360×780@2x`     | `0`           | `false`           | `false`  | `524 ms` | `0`   | `34,355 B`           | `12.7 MB`    | `0.002%`         |
| `390×844@3x`     | `0`           | `false`           | `false`  | `520 ms` | `0`   | `34,355 B`           | `12.7 MB`    | `0.000%`         |
| `412×915@2.625x` | `0`           | `false`           | `false`  | `544 ms` | `0`   | `34,355 B`           | `12.7 MB`    | `0.005%`         |
| `430×932@3x`     | `0`           | `false`           | `false`  | `544 ms` | `0`   | `34,355 B`           | `12.7 MB`    | `0.001%`         |
| `768×1024@2x`    | `0`           | `false`           | `false`  | `532 ms` | `0`   | `34,355 B`           | `12.7 MB`    | `0.001%`         |

- Synthetic interaction latency at `390×844@3x`: velvet bow tap `28.7 ms`, lightbox next photo `21.2 ms`, lightbox lazy-chunk open `379 ms`.
