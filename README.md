# Christmas Games

Mobile-first photo games for Christmas sessions. The repository deliberately starts with three proofs before a complete minigame:

1. local photo processing creates safe, proportional derivatives;
2. React opens a session Hub, lazily mounts Phaser, then disposes it on exit;
3. agent-facing gates provide fast feedback, architectural checks and mobile browser evidence.

## Game catalog

The repository hosts personalized Christmas photo games running Phaser 4.2.1 + React 19:

- **Magic Photo (`magic-photo`)**: Unwrap gift, scratch realistic ice layer, reveal family photo.
- **Puzzle Swap (`puzzle-swap`)**: Swap puzzle pieces to assemble holiday portrait.
- **Memory (`memory`)**: Ruby velvet card memory match with album reveal.
- **Expresso das Fotos (`expresso-das-fotos`)**: Holiday train delivering family photos to matching stations.
- **Guirlanda das Lembranças (`guirlanda-das-lembrancas`)**: Handcrafted Christmas wreath photo framing.
- **Mosaico em Queda (`mosaico-em-queda`)**: Falling mosaic blocks forming glowing stained-glass photo windows.
- **Trinca de Natal (`tic-tac-toe`)**: Christmas tic-tac-toe with minimax AI and personalized photo tokens.
- **Rudolph (`rena-das-lembrancas`)**: Flying reindeer photo arcade rescue game (in DEV mode).

## Local start

```sh
corepack enable
pnpm install
pnpm fixtures:generate
pnpm dev
```

Open `/s/local-demo-token`, or `/__dev/theme` in development. Use Node 24 in CI and VPS; the current local toolchain permits Node 25 only for development compatibility.

## Required gates

```sh
pnpm check:fast   # Typecheck, lint and unit tests
pnpm check        # Architecture, dead code, prettier, repo map
pnpm validate     # Full validation gate including production build and E2E
pnpm clean:reports # Remove old Playwright test artifacts and reports
```

## Factory commands

```sh
pnpm game:new photo-bingo --dry-run
pnpm media:inspect 'E:\<season-root>' --sample-per-session 3
pnpm asset:doctor
pnpm asset:validate
```

## Documentation

Start at [docs/index.md](docs/index.md) and the latest audit report at [docs/quality/RELATORIO_AUDITORIA_E_ESTADO_REPOSITORIO_2026-09-11.md](docs/quality/RELATORIO_AUDITORIA_E_ESTADO_REPOSITORIO_2026-09-11.md).
