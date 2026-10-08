# Play shell

- React owns routes, session state, Hub, Gallery, errors, sharing and the safe-area shell.
- Read root `AGENTS.md`, `.agents/current-state.json` and `.agents/rules/christmas-gallery-album.md` before Gallery/session work.
- Phaser exists only while gameplay is active. Use `PhaserHost`; do not instantiate Phaser in a screen.
- Keep Phaser imports dynamic in `src/phaser/createGame.ts` so Hub and `/fotos` remain engine-free.
- `/s/:token/fotos` must not mount canvas, request Phaser or load game runtime chunks before the user enters a game.
- React communicates with games only through discriminated `GameBridge` events.
- Local Gallery Lab media is allowed only in development. `staging-demo` uses synthetic fixtures. Normal production mode remains `production-disabled` until the real SessionProvider/authority exists.
- Never turn an invalid/unknown production session into `createFixtureSession` fallback.
- Preserve browser Back/Forward, gallery scroll and `selectedPhotoId` across Gallery -> game -> Gallery.
- Responsive `srcset` is emitted only when actual per-variant intrinsic dimensions exist.
- Run `pnpm check:fast` during iteration; Gallery changes also run `pnpm test:e2e:gallery`; run `pnpm check` before handoff.
- In Gallery Lightbox, `Jogar com esta foto` **selects the photo and navigates to Hub**; it never auto-opens Puzzle. Hub's game cards own subsequent game selection. Preserve browser back to Gallery, photo selection and scroll.
- Gallery visual v3 uses AI-generated decorative WebP in `christmas-shell/gallery` with a vector fallback. All UI text/controls are real DOM + accessible icons, never baked into artwork.
