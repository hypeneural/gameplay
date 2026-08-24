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

## Visual direction

The new runtime creates its snow, moonlight, board frame and celebratory
sparkles as bounded scene-owned Phaser objects. It intentionally does not copy
the legacy customer-image flow or the old server-side image scripts.
