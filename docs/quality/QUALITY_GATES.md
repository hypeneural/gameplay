# Quality gates

| Command           | Intended loop    | Required evidence                                                          |
| ----------------- | ---------------- | -------------------------------------------------------------------------- |
| `pnpm check:fast` | tight edit loop  | typecheck, lint, unit tests                                                |
| `pnpm check`      | phase completion | fast gate, dependency graph, unused-code scan, format and current repo map |
| `pnpm validate`   | delivery         | check, production build, Playwright mobile lifecycle and screenshots       |

Playwright runs 390×844, 412×915, 430×932 and 768×1024. It fails on page errors, console errors, failed assets, missing gameplay canvas, missing bridge events or a canvas left behind after returning to the Hub.
