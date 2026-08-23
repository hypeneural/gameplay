# Photo corpus baseline — 2026-08-23

The requested Mother’s Day source was inspected **read-only**. No customer photo, filename or folder name was copied into this repository. The scan considers image files directly inside every session folder and deliberately excludes nested “baixa” folders.

## Measured result

| Metric                                                     |                                                          Result |
| ---------------------------------------------------------- | --------------------------------------------------------------: |
| Session folders                                            |                                                              66 |
| Direct production-format candidates                        |                                                           1,329 |
| Photos per session — min / median / p90 / max              |                                               5 / 15 / 34 / 172 |
| Header sample                                              | 198 photos: first, middle and last direct image of each session |
| Orientation — landscape / portrait / square                |                               136 / 62 / 0 (68.7% / 31.3% / 0%) |
| Display-normalized dimensions — median                     |                                                4,000 × 3,778 px |
| Width p10 / p90                                            |                                                2,496 / 5,600 px |
| Height p10 / p90                                           |                                                2,454 / 5,379 px |
| Aspect-ratio p10 / median / p90                            |                                              0.71 / 1.40 / 1.40 |
| Megapixels p10 / median / p90                              |                                         8.01 / 19.97 / 22.40 MP |
| File size median / p90                                     |                                                6.69 / 10.45 MiB |
| EXIF headers requiring orientation normalization in sample |                                                               1 |

The explicitly mentioned 22-photo session was also checked at its direct session root: it contains 22 usable files, of which 13 are portrait and 9 landscape. It is therefore a useful mixed-orientation acceptance fixture; it is not imported into source control.

## Resulting production rules

1. Preserve orientation metadata after EXIF normalization. Do not infer orientation from filename, folder or camera naming.
2. The existing **480 / 800 / 1600 px longest-edge** `thumb`, `card` and `game` WebP variants are appropriate initial ceilings: the median original is about 20 MP, so browser code must not receive an original by default. `withoutEnlargement` protects smaller sources.
3. `PhotoSurface` defaults to `contain`: portrait and landscape stay proportional. A game may request `cover` only when its SPEC explains the crop and provides an acceptable no-subject-loss fallback.
4. A 120-photo test session is realistic but not the maximum. The Hub uses progressive thumbnail rendering and must keep the game variant unloaded until the user enters a game.
5. The production worker starts with two concurrent photos on the VPS. It must benchmark real hardware before changing `MEDIA_JOB_CONCURRENCY`, because median source size is materially larger than a synthetic test image.

## Reproducible read-only command

```powershell
pnpm media:inspect 'E:\<season-root>' --sample-per-session 3
```

Use `--sample-per-session 0` only when the full header scan is desired. The inspector reads headers with Sharp, applies EXIF orientation logically and excludes all nested folders; it writes no media and does not enumerate customer names in its output. A parseable header is a processing candidate, not proof of a successful full worker decode.
