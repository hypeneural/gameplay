# Puzzle Swap — asset provenance

## Authorized legacy audio (2026-08-24)

The project owner explicitly authorized use of the listed audio from the
previous Christmas-game project in this repository and its deployed bundle.
Only sound assets were imported. No customer photograph, session data,
filename, folder name or public game endpoint was copied.

| Bundle role                   | Source-role filename    | Derived browser files                | Duration |
| ----------------------------- | ----------------------- | ------------------------------------ | -------- |
| tap / select                  | `click_001.webm`        | `tap.m4a`, `tap.mp3`                 | 0.12 s   |
| hint                          | `Scissors_Snip_01.webm` | `hint.m4a`, `hint.mp3`               | 0.06 s   |
| correct placement             | `Fizz_01.webm`          | `correct.m4a`, `correct.mp3`         | 0.48 s   |
| cancellation / invalid action | `error_007.webm`        | `wrong.m4a`, `wrong.mp3`             | 0.21 s   |
| completion                    | `applause.webm`         | `celebrate.m4a`, `celebrate.mp3`     | 3.78 s   |
| optional background music     | `wintery loop.webm`     | `winter-loop.m4a`, `winter-loop.mp3` | 44.31 s  |

The two formats provide practical current-browser coverage. Phaser selects a
supported source at load time; this game never resumes an `AudioContext`
itself. The runtime starts the optional music only after a player gesture and
stops its retained loop during scene teardown.

React-owned navigation controls use the same authorized `tap.mp3` as a small
inlined data URL. This keeps its 0.12-second response alive across a history
change instead of starting a network request that the route can cancel.

## Visual direction

The new runtime creates its snow, moonlight, board frame and celebratory
sparkles as bounded scene-owned Phaser objects. It intentionally does not copy
the legacy customer-image flow or the old server-side image scripts.

## Original visual package v1 (2026-08-24)

These files are original project assets. They do not contain customer photos,
session details, third-party characters, logos or marks.

| Role                                | Browser asset                           | Source / processing                                                                                                                                            | Size budget                                  |
| ----------------------------------- | --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| Illustrated winter-village backdrop | `backgrounds/vila-nevada-noite-v1.webp` | Original project illustration generated for this product; prepared from the retained PNG source with Sharp, `fit: inside`, no enlargement and WebP quality 78. | 1024 × 1536, 106,970 bytes                   |
| Hint control                        | `ui/dica.svg`                           | Original project SVG, hand-authored.                                                                                                                           | 64 × 64 source; Phaser rasterizes to 96 × 96 |
| Pause / continue controls           | `ui/pausar.svg`, `ui/continuar.svg`     | Original project SVGs, hand-authored.                                                                                                                          | 64 × 64 source; Phaser rasterizes to 96 × 96 |
| Sound controls                      | `ui/som.svg`, `ui/silenciar.svg`        | Original project SVGs, hand-authored.                                                                                                                          | 64 × 64 source; Phaser rasterizes to 96 × 96 |
| Soft snowfall particle              | `ui/floco-neve.svg`                     | Original project SVG, hand-authored as a transparent radial snowflake.                                                                                         | 64 × 64 source; Phaser rasterizes to 48 × 48 |

The retained editable backdrop source is outside the browser public directory
under `assets-src/puzzle-swap/backgrounds/`. The game only requests the
optimized WebP and the five small SVG controls. Every texture is registered in
the scene scope and released during shutdown.
