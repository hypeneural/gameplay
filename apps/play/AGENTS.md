# Play shell

- React owns routes, session state, Hub, errors, sharing and the safe-area shell.
- Phaser exists only while gameplay is active. Use `PhaserHost`; do not instantiate Phaser in a screen.
- Keep Phaser imports dynamic in `src/phaser/createGame.ts` so the Hub bundle stays engine-free.
- React communicates with games only through the discriminated `GameBridge` events.
- Run `pnpm check:fast` during iteration and `pnpm validate` before declaring a feature ready.
