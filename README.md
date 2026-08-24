# Christmas Games

Mobile-first photo games for Christmas sessions. The repository deliberately starts with three proofs before a complete minigame:

1. local photo processing creates safe, proportional derivatives;
2. React opens a session Hub, lazily mounts Phaser, then disposes it on exit;
3. agent-facing gates provide fast feedback, architectural checks and mobile browser evidence.

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
pnpm check:fast
pnpm check
pnpm validate
```

`validate` is the delivery gate. It includes production build and Playwright on four viewports.

## Factory commands

```sh
pnpm game:new photo-bingo --dry-run
pnpm media:inspect 'E:\<season-root>' --sample-per-session 3
pnpm asset:doctor
pnpm asset:validate
```

The first creates an isolated game starter without registering it in the app.
The second is read-only and measures direct photos in session folders while
excluding nested low-resolution folders. The last two audit the local catalog
of browser assets; they never fetch assets or inspect customer photos.

## Documentation

Start at [docs/index.md](docs/index.md). The implementation sequence is [docs/plan/IMPLEMENTATION_PLAN.md](docs/plan/IMPLEMENTATION_PLAN.md); official-source validation is [docs/references/OFFICIAL_VALIDATION.md](docs/references/OFFICIAL_VALIDATION.md).
