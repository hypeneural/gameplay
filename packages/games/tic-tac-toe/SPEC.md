# Tic-Tac-Toe

## Scope

Offer a three-level Santa opponent while keeping game rules and AI in pure TypeScript.

## Acceptance requirements

- `TTT-001`: `WIN_LINES`, legal-move validation and terminal state are domain-tested.
- `TTT-002`: Santa Easy, Smart and Master are deterministic from injected `Random`.
- `TTT-003`: Minimax belongs to the domain; Phaser renders state and sends intent only.

## Donor

` sirAlfry/retro-arcade-collection-phaser` `TicTacToeScene`: inspect `WIN_LINES` and Minimax, then port the algorithm—not the Phaser 3 code.
