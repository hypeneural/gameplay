# Puzzle Swap 2.0

## Goal

Let a visitor choose one local-session photo and solve a mobile-first swap puzzle without distorting it.

## Acceptance requirements

- `PUZ-001`: The selected source photo keeps its aspect ratio; the grid is planned from available viewport space.
- `PUZ-002`: A player can swap cells through drag and through tap–tap.
- `PUZ-003`: Timer, moves, hint, pause and win state are visible and responsive in every supported viewport.
- `PUZ-004`: Runtime uses one photo texture plus grid geometry; it must not load a separate image per cell.
- `PUZ-005`: Domain is deterministic with injected `Random` and `Clock`.
- `PUZ-006`: The main cell action has a 52 CSS px minimum target. Drag thresholds are recorded in `TouchProfile`; a player can always complete the same swap with tap–tap.
- `PUZ-007`: After 6–8 seconds without a successful move, the game gives one non-solving visual hint. The first release uses relaxed time: elapsed time is informational, never a failure condition.
- `PUZ-008`: `LOW` quality and reduced-motion mode preserve move confirmation and progress while removing decorative snow, looping celebration and optional post-FX.
- `PUZ-009`: Feedback uses named cues (`tap`, `correct`, `wrong`, `hint`, `celebrate`) through the Game Experience composition; mechanics and win logic stay in the Puzzle domain/runtime.

## Planned files

- `src/domain/PuzzleBoard.ts`, `PuzzleShuffle.ts`, `PuzzleProgress.ts`, `GridPlanner.ts`, `Swap.ts`, `IdleAssist.ts`
- `src/runtime/phaser/PuzzleScene.ts`, `PuzzleHud.ts`, `HintOverlay.ts`, `WinCelebration.ts`
- `tests/PuzzleBoard.test.ts`, `PuzzleShuffle.test.ts`, `PuzzleInteraction.test.ts`, `GridPlanner.test.ts`, `puzzle-mobile.spec.ts`

## Donors

- Construct legacy swap behavior: algorithm only, after local audit.
- `sirAlfry/retro-arcade-collection-phaser`: `Puzzle15Scene`, algorithm only.
- Phaser 4.2.1 skills: `input-keyboard-mouse-touch`, `render-textures`, `scale-and-responsive`, `tweens`.
