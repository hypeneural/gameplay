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
