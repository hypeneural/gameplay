# Deferred implementation plan

1. [x] Define immutable rectangular board state, legal swap commands and tap–tap selection in pure domain tests.
2. [x] Add deterministic injected-Random shuffle, progress copy, injected-Clock idle assistance and adaptive `GridPlanner` viewport tests.
3. [x] Read the Phaser 4.2.1 input, texture-frame and responsive-scale guidance; implement one authorized photo texture plus proportional source frames. The runtime is lazy-registered and browser-validated; bounded asset recovery remains open.
4. [x] Add typed drag/tap input, native-like Christmas HUD, relaxed timer, hint, pause and win overlays, with scene-local resource ownership for every tween, timer and texture.
5. [-] Add mixed-orientation Playwright evidence: portrait and landscape fixtures mount and leave cleanly, and pause proves `GAME_PAUSED → GAME_RESUMED`. Completion through both input paths, LOW/reduced-motion and asset-failure evidence remain open.
