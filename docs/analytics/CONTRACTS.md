# Analytics contracts

Analytics records only game lifecycle events such as opened, ready, started, paused, resumed, completed and exited. `GameRunController` is the single owner of these events and reports a completion duration from `ActiveGameClock`, excluding hidden/paused time. It must never receive a session token, customer identity, original filename, filesystem path, media URL or client name.

Concrete delivery is deferred; `MemoryAnalytics` is the local fake used by the smoke proof.
