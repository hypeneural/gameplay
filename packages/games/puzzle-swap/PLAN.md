# Deferred implementation plan

1. [x] Define immutable rectangular board state, legal swap commands and tap–tap selection in pure domain tests.
2. [x] Add deterministic injected-Random shuffle, progress copy, injected-Clock idle assistance and adaptive `GridPlanner` viewport tests.
3. [x] Read the Phaser 4.2.1 input, texture-frame, responsive-scale and Loader guidance; implement one authorized photo texture plus proportional source frames. The runtime is lazy-registered and browser-validated. Required-photo XHR loads use a 10 s timeout and one Phaser retry, then emit a privacy-safe `GAME_ASSET_FAILED` code into React retry UI; optional audio degrades to silence.
4. [x] Add typed drag/tap input, native-like Christmas HUD, relaxed timer, hint, pause and win overlays, with scene-local resource ownership for every tween, timer and texture.
5. [x] Mixed-orientation fixtures mount and leave cleanly; pause proves `GAME_PAUSED → GAME_RESUMED`; deterministic tap–tap and drag-only solves reach completion. Playwright now exercises LOW + reduced motion, a bounded required-photo failure and five Puzzle enter/exit cycles on the supported viewport projects.
