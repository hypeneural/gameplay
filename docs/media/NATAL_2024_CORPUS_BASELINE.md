# Christmas 2024 photo corpus baseline — 2026-08-23

The requested Christmas 2024 source was inspected **read-only**. No customer photo, filename, folder name or source path was copied into this repository. The inspector recognized the date-batch layout, inspected only files directly inside each session folder, and excluded delivery subfolders such as `baixa`.

## Full-header result

| Metric                                                           |                                 Result |
| ---------------------------------------------------------------- | -------------------------------------: |
| Candidate session directories / non-empty sessions               |                              398 / 396 |
| Direct production-format candidates                              |                                 10,244 |
| Supported-extension candidates unreadable by Sharp header parser |                                      0 |
| Photos per non-empty session — min / median / p90 / max          |                       5 / 23 / 44 / 92 |
| Orientation — landscape / portrait / square                      | 6,469 / 3,775 / 0 (63.2% / 36.8% / 0%) |
| Display-normalized dimensions — median                           |                       4,868 × 3,937 px |
| Width p10 / p90                                                  |                       2,496 / 5,600 px |
| Height p10 / p90                                                 |                       2,552 / 5,557 px |
| Aspect-ratio p10 / median / p90                                  |                     0.71 / 1.40 / 1.40 |
| Megapixels p10 / median / p90                                    |                8.18 / 20.00 / 24.17 MP |
| File size median / p90 / total read                              |       8.81 MiB / 12.27 MiB / 83.97 GiB |
| Format / colour space                                            |              10,244 JPEG / 10,244 sRGB |
| Embedded colour profile                                          |                          9,789 (95.6%) |
| EXIF orientations needing normalisation                          |                                      0 |

The scan reads Sharp metadata for every accepted direct file. It proves the files have parseable headers; it does **not** claim that every file has passed the worker's full decode and derivative validation.

## Product consequences

1. A fixed “32 photos per session” rule would be incorrect. The actual distribution is 5–92; selection policies need an explicit minimum and should work from a deterministic subset.
2. The product must support both orientations in the same session. A landscape-majority corpus still contains 3,775 portrait photos, so square grid and fixed-ratio assumptions remain invalid.
3. The existing 480 / 800 / 1600px longest-edge derivative policy is proportionate to 20MP median sources. Originals must stay out of the browser path.
4. A 120-photo browser fixture remains a useful stress test. The 172-photo fixture stays in the test matrix because the separate Mother’s Day corpus measured a 172-photo session; it is intentionally above this Christmas season's observed maximum.
5. The sRGB/profile result lowers colour-management uncertainty for this season, but the worker still strips metadata by default and writes normalized WebP derivatives. Any future decision to preserve metadata requires privacy review.

## Reproducible read-only command

```powershell
pnpm media:inspect 'H:\<season-root>' --sample-per-session 0
```

The inspector recognizes one explicit `DD MM YYYY` date-folder layer. It never descends further into a session folder. For a faster representative check, use `--sample-per-session 3`; use the full scan before changing source-size limits or production concurrency.
