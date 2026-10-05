# LanternaMagica specification

## Experience

- **Photo rule:** define exactly which variant and which photos are needed.
- **Win condition:** define the deterministic domain transition.
- **Orientation:** support portrait and landscape through `PhotoSurface`; do not crop a person by default.

## Acceptance matrix

| ID                 | Requirement                                                                                                                                     | Proof                    |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| LANTERNA_MAGICA-01 | Domain state is deterministic.                                                                                                                  | Unit test                |
| LANTERNA_MAGICA-02 | Enter → play → exit owns one canvas and no leaked listeners.                                                                                    | Playwright               |
| LANTERNA_MAGICA-03 | Portrait and landscape work on the mobile viewport matrix.                                                                                      | Screenshots              |
| LANTERNA_MAGICA-04 | Every owned timer, tween, listener and texture is registered in `SceneScope`.                                                                   | Runtime review + test    |
| LANTERNA_MAGICA-05 | Child usability is explicit: main action is learnable in ≤5 seconds, has a ≥52px primary target and drag has a tap alternative when applicable. | SPEC review + Playwright |

## Child usability

- **Learnability:** explain the first action visually; do not rely on a paragraph tutorial.
- **Touch:** record the smallest primary and secondary target in `tuning.ts`; main controls are at least 52 CSS px.
- **Drag:** state the equivalent tap/tap action unless dragging is essential; record evidence-backed thresholds in `tuning.ts`.
- **Wrong action:** describe feedback that teaches without punishment.
- **Idle assist:** state when a non-solving hint appears; record its delay in `tuning.ts`.
- **Pressure:** state whether time is visible or the run is relaxed.

## Before coding

1. Read the matching Phaser 4.2.1 skills in `vendor/phaser-skills`.
2. Add domain tests before Phaser code.
3. Register this module only in `apps/play`.
