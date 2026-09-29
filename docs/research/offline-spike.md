# Offline queue spike (M0-S2) — findings and contract for M2-E2 / M2-A5

Code: `spikes/offline/`. Everything claimed below is backed by a passing test — see
`docs/reports/M0-S2.md` for the exact commands and their output.

## Recommendation: confirm D-06, with two additions

**D-06 as written** ("Online-first PWA. Offline queue only for attendance and marks entry
(idempotent, client-generated IDs). No full offline replica in v1.") **should be confirmed.**
The idempotent, client-generated-ID outbox pattern works end to end — a real (Chromium)
browser queuing 200 writes offline, reconnecting, and syncing them all correctly; a
duplicate HTTP delivery of the same op having exactly one effect; a write to
locked/finalised data being rejected with a typed reason the UI can show; and the queue
surviving a page reload — are all passing, real (not simulated) tests, not just a design
on paper. Restricting the queue to attendance and marks, and not attempting a full offline
read replica, held up too: nothing in building this suggested either boundary needs to move.

Two things came out of building this that are worth folding into D-06 or a linked note,
since they weren't specified by the original one line and the next task to implement this
for real will need them:

1. **The specific conflict policy** — idempotent by `op_id`, last-write-wins per natural key
   (not by client clock), with an audit trail for marks — now has a validated, documented
   shape (see "Conflict policy" below). D-06 didn't say how conflicts resolve; this spike
   answers that.
2. **iOS Safari can silently delete the whole queue.** WebKit deletes all script-writable
   storage (IndexedDB included) for an origin that a user hasn't interacted with for 7 days
   of Safari use, and separately under disk pressure — deletion is silent, all-or-nothing,
   and not something this scope currently defends against (see "Storage limits and iOS
   behaviour"). This isn't a reason to change D-06's scope, but the real implementation
   should not ship without a mitigation for it — see Requests in the task report.

## The `apply_ops` contract

`apply_ops(p_ops jsonb) returns jsonb` — a single Postgres function the client calls with
a batch of queued writes and gets back one result per op. Full source (with the reasoning
inline as comments): `spikes/offline/db/apply_ops.sql`; tests: `spikes/offline/server/apply_ops.test.ts`.

**Request shape** — a JSON array of the client's own outbox rows, unchanged:

```json
[
  {
    "opId": "3f2504e0-4f89-41d3-9a0c-0305e82c3301",
    "entity": "attendance",
    "payload": { "studentId": "…", "date": "2026-09-27", "status": "present" }
  },
  {
    "opId": "9c858901-8a57-4791-81fe-4c455b099bc9",
    "entity": "marks",
    "payload": { "studentId": "…", "componentId": "…", "value": 88 }
  }
]
```

`createdAt` / `attempts` / `status` / `nextRetryAt` are client-only bookkeeping (see the
outbox contract below) and are not read by `apply_ops` — sending them is harmless, and the
client already has them on every `OutboxOp`, so nothing needs stripping before the request
goes out.

**Response shape** — one result per op, in the same order:

```json
{
  "results": [
    { "opId": "3f2504e0-…", "status": "applied", "duplicate": false },
    { "opId": "9c858901-…", "status": "rejected", "reason": "exam_locked", "duplicate": false }
  ]
}
```

- `status: "applied"` — the write happened (or, for a duplicate `opId`, had already
  happened; see `duplicate` below).
- `status: "rejected"`, with a `reason` of `"attendance_finalised"`, `"exam_locked"`, or
  `"unknown_entity"` — a stable, typed code the UI maps to a message. **Rejections are
  terminal, not transient** — the client outbox moves a rejected op straight to its Error
  state rather than retrying it (retrying a locked-write rejection cannot succeed until a
  human unlocks it).
- `duplicate: true` — this exact `opId` had already been applied before this call. The
  `status`/`reason` reflect the *original* outcome, not a fresh re-evaluation — a duplicate
  delivery of a rejected op is reported as rejected again, not silently swallowed.

**Idempotency** is by `op_id` alone, checked against an `applied_ops` ledger table before
anything else runs (`spikes/offline/db/schema.sql`). This is what makes it safe for the
client to retry a batch it never got a response for (see "Recovering an interrupted sync"
below) and for a flaky connection to deliver the same HTTP request twice — both collapse to
one effect, proven directly over a real HTTP round-trip in `spikes/offline/e2e/offline.spec.ts`
("duplicate delivery over the real HTTP round-trip has one effect"), not just at the SQL
layer.

## Conflict policy

**Last-write-wins per natural key** — `(institution_id, student_id, date)` for attendance,
`(institution_id, component_id, student_id)` for marks — where "last" means the last op
`apply_ops` processes, not the client's own clock. Client clocks are not trusted for
ordering: a phone with a wrong clock, or two teachers whose devices' clocks disagree by a
few minutes, must not be able to make an earlier real-world edit silently win over a later
one just because its device claims an earlier timestamp. Ordering instead falls out of
delivery order — within one `apply_ops` call, the later array element wins
(`spikes/offline/server/apply_ops.test.ts`, "within a single batch, the later array element
wins"); across calls, whichever reaches the server later wins.

This is a real, deliberate trade-off, not a free lunch: if two people edit the same
student's attendance for the same day while both offline, the one who reconnects and syncs
second wins, silently, with no merge and no notification to the person who lost. For
attendance and marks specifically this is an acceptable trade — both are "set the current
value" fields (there's one true status for a student on a given day, one true mark for a
component), not fields where two edits should combine — but it is worth stating plainly
rather than leaving implicit, since it's exactly the kind of thing that reads as a bug
report ("my attendance change didn't save!") when a teacher hits it in practice.

**Marks get an audit trail** (`marks_audit`, append-only, one row per applied write,
including ones later overwritten) so a disputed final mark can be traced back through every
value it passed through and which `op_id` (and so which offline session) wrote each one.
Attendance does not get an equivalent audit table in this spike — only the current value is
kept. Worth a decision before M2-A5 builds the real thing: attendance disputes ("I marked
her present, why does it say absent?") seem at least as likely as marks disputes, and the
same audit pattern would answer them the same way.

## The client outbox contract

Dexie-backed, one row per queued write, keyed by the same `opId` sent to `apply_ops`.
Full source: `spikes/offline/src/outbox.ts`; tests: `spikes/offline/src/outbox.test.ts`.

```ts
interface OutboxOp {
  opId: string; // client-generated UUID; the idempotency key
  entity: "attendance" | "marks";
  payload: AttendancePayload | MarksPayload;
  createdAt: string; // ISO instant
  attempts: number;
  status: "pending" | "syncing" | "synced" | "error";
  nextRetryAt: string; // ISO instant; not eligible for sync() until this passes
  lastError?: string;
}
```

- **Visible status** is a simple roll-up of the table: `Synced` when nothing is pending or
  errored, `Pending n` while writes are queued or in flight, `Error n` when at least one
  write needs attention — matching `docs/spec/ux-standard.md`'s "Synced / Pending n / Error"
  requirement exactly, and never colour-only (the harness's status text states the word
  itself; colour is a bonus cue only — see `spikes/offline/harness/index.html`).
- **`sync()` makes one pass and returns** — it does not loop or block waiting for
  connectivity. It's meant to be called on app open, on the browser's `online` event, and on
  a foreground timer; none of those need a blocking call. Retry timing lives in each op's own
  `nextRetryAt`, not in a caller-side loop.
- **Retry with exponential backoff** (`nextRetryDelayMs`, capped) applies to *transient*
  failures (network errors, timeouts) — not to typed rejections, which go straight to Error
  since retrying them cannot change the outcome, and not to max-attempts-exceeded, which also
  goes straight to Error rather than retrying forever.
- **Manual retry** resets an errored op to pending with a clean attempt count, for the "try
  again" affordance `docs/spec/ux-standard.md` asks for next to an Error state.

### Recovering an interrupted sync (a real bug this spike found and fixed)

Building the "survives a restart" test surfaced a genuine gap, not a test artifact: if the
app is closed or the page reloaded while a batch is mid-flight, the affected ops are left
in `"syncing"` — the state `sync()` sets before calling the server — with nothing left to
ever move them out of it, since the promise that would have resolved them was abandoned,
not rejected. Nothing else was watching for this, so those writes would sit invisible
forever (the sync status still shows them as "Pending", but no future `sync()` call would
ever pick them up, since `sync()` only looked at `"pending"` rows).

The fix (now in `sync()` itself, so every caller gets it automatically): on each call,
before doing anything else, any op still stuck in `"syncing"` is recovered — treated as one
more attempt and made immediately eligible again, no backoff, since the interruption says
nothing about server or network health. This is safe specifically *because* `apply_ops` is
idempotent: at worst, recovery re-sends a write the server already applied, and gets back
`duplicate: true` for it. The two are a matched pair — the client's crash-recovery story
only works because the server-side contract makes retrying-when-unsure safe. Tests:
`spikes/offline/src/outbox.test.ts`, "sync — recovering an interrupted sync".

## Storage limits and iOS behaviour

Researched, not implemented against — no test forces real browser storage eviction, since
it isn't practically forceable in a short test run. Current as of WebKit's own documentation
and MDN (checked while writing this report):

- **iOS/macOS Safari can delete all of an origin's script-writable storage — IndexedDB
  included — after 7 days of Safari use with no user interaction (click or tap) on that
  origin.** This is Intelligent Tracking Prevention's storage policy, not a bug; it applies
  whether or not there's anything unsynced queued. Eviction is silent (no warning shown to
  the user beforehand) and all-or-nothing (if it fires, everything goes, not just the oldest
  data).
- Storage can also be evicted under general **disk-pressure**, independent of the 7-day rule.
- **Adding the app to the Home Screen substantially reduces both risks** and increases the
  storage quota available to the origin — exact percentages have shifted across iOS versions
  and shouldn't be hard-coded into product copy, but the direction (installed is much safer
  than a bookmarked tab) is well established and worth an onboarding nudge.
- `navigator.storage.persist()` can be called to request non-evictable storage; on Safari
  this is silently auto-approved-or-denied based on engagement history (no user-visible
  prompt the way Firefox shows one) — calling it is harmless and occasionally helps, but
  cannot be relied on by itself.

For a queue meant to hold writes for at most a short reconnect window, most teachers syncing
within a day or two are in no danger. The real exposure is a teacher who is offline for an
extended stretch (illness, a school holiday, a broken phone) with unsynced writes still
queued — for them, this is a genuine silent-data-loss path this spike's scope doesn't
address. See Requests in the task report for what the real implementation should add
(surface pending-age in the UI, prompt Home Screen installation, call `persist()` on load).

## What this spike does not prove

- **Tenant isolation.** `apply_ops` here uses one fixed, hard-coded `institution_id` and has
  no RLS, no `auth.jwt()` scoping, nothing stopping one tenant's ops from touching another's.
  This is fine for a spike proving the queue mechanism in isolation, but the real migration
  (M2-E2/M2-A5) is a different, security-critical piece of work: it must derive
  `institution_id` from the authenticated session, never a client-supplied value, and run
  under real RLS policies, per README D-04.
- **Marks as `numeric(6,2)`, not integer hundredths.** `docs/spec/domain-model.md` documents
  marks storage as `numeric(6,2)`; `@sms/domain`'s own convention (per M1-D1) is integer
  hundredths for calculation. This spike's `marks.value` is a plain `numeric` end to end and
  never converts through an integer-hundredths representation — reasonable for proving the
  queue/conflict/lock mechanics, but the real implementation needs that conversion layer,
  which this spike doesn't attempt.
- **A real Postgres migration.** Everything server-side here runs against an embedded
  Postgres (`@electric-sql/pglite`) inside the spike, not `supabase/migrations/` — that
  directory is outside this task's owned paths (`spikes/offline/**` only). `db/schema.sql`
  and `db/apply_ops.sql` are a validated starting point for that migration, not the migration
  itself.
- **A full offline app shell.** There's no service worker here, so the harness page itself
  cannot be *loaded* while offline — only writes made after the page is already open are
  queued. A real offline-first PWA needs an app-shell caching strategy too; that's a separate
  concern from the write-queue this spike scoped to (see D-06's "no full offline replica").
