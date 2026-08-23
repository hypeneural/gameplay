# Games

- Each game is an isolated package with a `SPEC.md`, pure `src/domain/`, Phaser-only `src/runtime/phaser/`, and tests.
- Do not introduce `application/` until orchestration is genuinely needed.
- Domain code cannot import Phaser, React, browser APIs, `Date.now`, or `Math.random`.
- Never import another game. Share only deliberate contracts through `@christmas-games/platform` and visual primitives through `@christmas-games/theme`.
- Read the relevant vendored Phaser skill before changing runtime code, then check `phaser.d.ts` and a Phaser 4.2.1 official example.
