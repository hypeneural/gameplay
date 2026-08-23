# Memory

## Scope

Create a card-matching game from a deterministic subset of the session catalogue.

## Acceptance requirements

- `MEM-001`: 4, 6 and 8 pairs use a reproducible subset; a 120-photo session never loads every `game.webp`.
- `MEM-002`: Portrait and landscape source images never stretch; the card-frame decision is explicit and screenshot-tested.
- `MEM-003`: The match state machine is pure TypeScript and has no Phaser import.
- `MEM-004`: Card flips, success feedback, accessibility labels and completion event work with pointer/touch.

## Donors

- Phaser Create Game Memory demo: API and lifecycle checked against 4.2.1 before adoption.
- `sirAlfry/retro-arcade-collection-phaser`: state-machine ideas only.
