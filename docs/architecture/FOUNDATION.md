# Foundation architecture

## Runtime ownership

| Owner          | Responsibility                                                            | Must not own                             |
| -------------- | ------------------------------------------------------------------------- | ---------------------------------------- |
| React shell    | session, Hub, picker, share, safe area, errors, navigation                | Scene references or game state internals |
| Phaser runtime | gameplay rendering, touch input, screen-space layout, game-owned assets   | session authorization or DOM shell       |
| Platform       | contracts, game context, analytics shape, clock/random/haptics interfaces | concrete game implementations            |
| Theme          | tokens and quality profile                                                | game business rules                      |
| Media pipeline | VPS-only image import and derivation                                      | a browser import path                    |

## Lifecycle contract

```text
Hub → dynamic import Phaser + game → one Phaser.Game → GAME_READY → GAME_STARTED
  → user exits → Scene SHUTDOWN → listeners removed → game.destroy(true) → Hub
```

Every screen-space Phaser owner exposes `layout(viewport)`. It is called from `create()` and on `Scale.Events.RESIZE`, and the resize listener is removed at `SHUTDOWN`. CSS never centers a canvas also centered by Phaser.

## Enforced boundaries

ESLint applies local authoring rules and dependency-cruiser checks the dependency graph. The intentional-violation exercise and command output belong in the active execution plan before the architecture phase is closed.
