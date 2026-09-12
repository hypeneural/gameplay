# Analytics contracts

Analytics records game lifecycle events such as opened, ready, started, paused, resumed, completed and exited. `GameRunController` is the single owner of these events and reports a completion duration from `ActiveGameClock`, excluding hidden/paused time. It must never receive a session token, customer identity, original filename, filesystem path, media URL or client name.

Games can record at most 64 unique `GAME_MILESTONE` names per run. Each name is
an implementation-owned kebab-case code, at most 48 characters; never derive it
from session fields. `elapsedMs` is measured on the same active clock. Duplicate,
invalid and out-of-run submissions are ignored. Milestones go only to analytics,
so a decorative phase cannot replace the React bridge's completion event. Magic
Photo uses fixed state codes and five fixed discovery names to measure time to
first touch and time spent opening, exploring and clearing ice.

Concrete delivery is deferred; `MemoryAnalytics` is the local fake used by the smoke proof.
