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
