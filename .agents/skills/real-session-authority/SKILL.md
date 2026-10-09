---
name: real-session-authority
description: Implemente a autoridade persistente de photo sessions no catalog-server sem desbloquear piloto ou acoplar EvydFlow cedo.
---

# Real Session Authority

This is the next milestone declared by `.agents/current-state.json`.

## Stop conditions

Stop instead of improvising when:

- `pnpm agent:doctor` is blocked;
- the requested change needs real customer data in staging;
- the change requires setting `pilotReady=true`;
- a solution creates another backend/session store;
- a solution creates multiple galleries for the same CRM order or crosses data between different orders;
- a database migration is destructive without an explicit migration/backup path.

## Vertical cut 1 — persistence only

Implement persistence before public access.

Minimum model:

```text
photo_sessions
photo_revisions
photos
revision_photos
media_assets
idempotency_records
audit_events
```

Do not add browser grants or WhatsApp in this first cut.

### Session

Stores one stable technical `photoSessionId` per CRM order and optional business identity.

Business uniqueness when a CRM identity is present:

```text
UNIQUE(crm_order_uuid)
```

If a legacy integration still supplies `galleryKey`, accept only the constant `principal`; it must not enable additional galleries. Store photos as revisions of the same session.

### Revision

Required states:

```text
STAGED -> VALIDATED -> ACTIVE
   \-> FAILED
```

ACTIVE is represented by `photo_sessions.active_revision_id`; do not mutate old revision rows into a new collection.

### Media

A media asset belongs to:

```text
revisionId + photoId + variant
```

Store actual width, height, bytes, hash and recipe identity. Do not store a browser-visible original path.

## Vertical cut 2 — application services

Add commands/services with explicit inputs and typed results:

```text
resolveOrCreateSession
beginRevision
recordMediaAsset
verifyRevision
activateRevision
getSessionStatus
```

Activation input includes `expectedActiveRevisionId`.

Keep idempotency in the application/repository contract, not as retry magic in HTTP.

## Vertical cut 3 — internal API

Only after repository/service tests are green, expose the internal publisher API.

The first publisher is Node/manual and consumes the same Gallery Lab/media manifest. Python/EvydFlow remains out of this cut.

## SQLite driver rule

Do not couple domain/application types to a specific SQLite package.

Node 24 `node:sqlite` may be evaluated behind an adapter, but its release-candidate status must be explicitly accepted if chosen. A different driver must implement the same repository contract and must not force ORM concepts into the domain.

## Evidence checklist

Before handoff:

- targeted persistence tests;
- one order A with consecutive immutable revisions A1/A2; a distinct order B stays isolated;
- stale CAS rejection;
- idempotency replay;
- restart/persistence test;
- migration from empty DB;
- `pnpm check:fast`;
- `pnpm check`;
- current readiness remains `pilotReady=false`.

Do not edit `deploy/readiness.json` to claim completion. A later pilot-gate PR updates readiness only after all listed blockers have evidence.
