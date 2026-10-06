# Foundation architecture

## Runtime ownership

| Owner          | Responsibility                                                            | Must not own                             |
| -------------- | ------------------------------------------------------------------------- | ---------------------------------------- |
| React shell    | session, Hub, picker, share, safe area, errors, navigation                | Scene references or game state internals |
| Phaser runtime | gameplay rendering, touch input, screen-space layout, game-owned assets   | session authorization or DOM shell       |
| Platform       | contracts, game context, analytics shape, clock/random/haptics interfaces | concrete game implementations            |
| Theme          | tokens and quality profile                                                | game business rules                      |
| Media pipeline | deterministic Node/Sharp derivation; photo-session MVP runs prepared derivatives on the Windows studio machine | a browser import path or session authorization |

## Photo-session deployment boundary

For the photo-session MVP, the studio freezes the selected sources and runs the versioned Sharp worker locally on Windows. Only verified `thumb`/`card`/`game` derivatives cross the HTTPS ingest boundary to the VPS. A future VPS `source-ingest` mode is separate and must not share publication semantics with `prepared-derivatives`.

The backend remains the sole authority for session identity, revisions, access grants and media authorization. Hub, gallery and games consume the same active revision.

## Lifecycle contract

```text
Hub → dynamic import Phaser + game → one Phaser.Game → GAME_READY → GAME_STARTED
  → user exits → Scene SHUTDOWN → listeners removed → game.destroy(true) → Hub
```

Every screen-space Phaser owner exposes `layout(viewport)`. It is called from `create()` and on `Scale.Events.RESIZE`, and the resize listener is removed at `SHUTDOWN`. CSS never centers a canvas also centered by Phaser.

## Enforced boundaries

ESLint applies local authoring rules and dependency-cruiser checks the dependency graph. The intentional-violation exercise and command output belong in the active execution plan before the architecture phase is closed.
