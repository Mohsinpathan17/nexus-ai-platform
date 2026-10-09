# Authenticated workspace API contract

This API persists accounts, personal projects, engineering intent, events, and artifacts. A separately configured local Ollama worker produces proposals. An opt-in Docker executor compiles owner-approved small React frontends and runs bounded owner-approved browser checks when specified. Verified output can be exported or viewed using isolated, short-lived preview grants. Deployment is not implemented. The public-site orchestration UI remains a separately labeled simulation.

## Runtime

Node 24.19+; the validated version is pinned in `.node-version`. The service uses `node:http`, `node:crypto`, and `node:sqlite`, with Nodemailer for optional SMTP delivery. SQLite is stored in `.data/nexyral.sqlite` by default, with WAL enabled, foreign keys, schema version 7, and owner-only database permissions. Unsupported newer schemas are rejected rather than downgraded. This is a single-instance persistence layer with bounded preview retention and local consistent backup/restore commands. Distributed workers, shared session infrastructure, total account storage quotas and automated off-machine backups are not implemented. See RECOVERY.md and BACKEND_HOSTING.md.

## Authentication and authorization

Passwords use asynchronous scrypt with unique random salts. Passwords are never stored as plaintext. Sessions use 256-bit random cookie tokens; only their SHA-256 hashes are stored. Session cookies are HttpOnly and SameSite=Lax, expire after seven days, and are Secure for HTTPS-only origins. Login rotates the previous session. Logout revokes it in the database. Session expiry and revocation are checked on API requests and open event streams. Account/session writes are transactional.

Mutations require an allowed Origin, JSON bodies, and—for authenticated operations—a matching `X-CSRF-Token` obtained from the session endpoint. Email/password authentication endpoints enforce a bounded, in-memory per-IP attempt limit. All project, run, stream, and artifact access is owner-scoped; other owners receive 404. Queries use prepared statements. JSON request bodies are bounded to 16 KB. Static application responses include a content security policy, nosniff, and same-origin referrer policy.

Optional configured providers support GitHub OAuth sign-in/linking and SMTP verification/recovery. Without SMTP, recovery remains operator-assisted. MFA, team membership, shared projects, and account deletion/export are not implemented. Accounts belong to this instance. No public backend deployment has been verified.

## Endpoints

All endpoints are relative to `/api`. Errors are `{ "error": "human-readable message" }` with appropriate HTTP status. Private JSON responses and streams use `Cache-Control: no-store`.

| Method | Path | Behavior |
| --- | --- | --- |
| GET | `/health` | Service readiness and live planning-worker lease state |
| GET | `/auth/session` | `{user, csrfToken}`; both are null when anonymous |
| POST | `/auth/signup` | Name, email, password → account/session; HTTP 201 |
| POST | `/auth/login` | Email, password → rotated session |
| POST | `/auth/logout` | Revoke the current session and clear its cookie |
| GET | `/projects` | List the owner's projects and persisted run counts |
| POST | `/projects` | Name → new personal project; HTTP 201 |
| GET | `/projects/:id` | One owned project and its actual run count; other owners receive 404 |
| PATCH | `/projects/:id` | `{name, expectedName}` → rename owned project; Origin/CSRF required; conflicting current name returns 409 |
| GET | `/projects/:id/requirements` | Current saved brief, revision and update time; owner-only |
| PATCH | `/projects/:id/requirements` | `{text, expectedRevision}` → save/clear a bounded brief; Origin/CSRF required; conflicting revision returns 409 |
| GET | `/projects/:id/runs` | List that owned project's runs |
| POST | `/projects/:id/runs` | Intent → stored run; HTTP 201 |
| GET | `/runs/:id` | Owned run, actual events, stored artifacts, executor availability |
| GET | `/runs/:id/events` | Cookie-authenticated SSE; supports `Last-Event-ID` replay |
| POST | `/runs/:id/approve` | Exact stored `artifactId` → owner approval and queued frontend build; requires live build capability, Origin and CSRF; idempotent for the same approval |
| POST | `/runs/:id/cancel` | Cancel a nonterminal run; repeat cancellation is idempotent |

The shared TypeScript source of truth is `shared/contracts.ts`.

Project names contain 2–100 trimmed characters. Rename preserves the project ID,
creation time and all runs/events/artifacts. `expectedName` must match the current
stored name inside a write transaction; refresh after a conflicting edit. This
compares names, not a monotonic revision history. Project search/sorting are
client-side across the owner's loaded project list; pagination and archival are
not implemented.

Project requirements contain up to 6,000 trimmed characters (32KiB request limit).
New projects start with empty text/revision0. Changed saves increment a monotonic
revision; unchanged saves leave it intact. A clear preserves the revision and
affects only future runs. Current text/revision live in the v6 project_requirements
table. Creating a run atomically captures any saved revision in an immutable
`project-requirements.json` intent artifact. Planning and generation receive that
snapshot with the specific run intent as untrusted user context, never a freshly
edited project brief. Legacy runs keep their original intent-only input. Briefs
do not authorize builds, expand executor capabilities or bypass plan approval.

## Run state and evidence

Creation is atomic: a run is inserted in `awaiting_executor` at the `intent` stage, together with `run.created` and, when no live worker lease exists, `executor.unavailable` events and the user's text in an `intent.md` artifact. No fake requirements, generated source code, successful tests, or deployment results are produced.

Cancellation appends one `run.cancelled` event and preserves the original intent/artifact. Owners can approve a stored plan; clients cannot mark checks as passed. The planning worker atomically claims pending runs, transitions to `running` at `plan`, and stores a validated `engineering-plan.json` before stopping at `awaiting_approval`. Errors transition to `failed`. Expired leases recover interrupted running work as failed without automatic retry. Owner approval captures a plan snapshot/hash and queues stage `build`. The enabled worker stores generated frontend source and actual TypeScript/Vite exit codes, transitions to `succeeded` or `failed` at `verify`, and never advances to `ship`. One bounded compilation repair and owner-approved browser checks are supported. Arbitrary repository execution and deployment are not implemented. See [worker documentation](WORKER.md).

SSE messages use monotonically increasing database event IDs and the `run.event` event name. Heartbeats are comments, not engineering events. Session revocation emits `session.expired` and closes the stream. The UI deduplicates event replay and refreshes the run and artifacts when each event is observed. It reconnects or returns to authentication as appropriate.

## Configuration

| Variable | Default / purpose |
| --- | --- |
| `NEXYRAL_API_PORT` | `8787` |
| `NEXYRAL_API_HOST` | `127.0.0.1`; the dev frontend proxies locally |
| `NEXYRAL_TRUSTED_PROXIES` | Empty for direct development; exact local proxy IPs only, with loopback API binding. See BACKEND_HOSTING.md. |
| `NEXYRAL_DB_PATH` | `.data/nexyral.sqlite`; relative to the application working directory |
| `NEXYRAL_APP_ORIGINS` | Comma-separated exact URL origins; defaults cover local dev/preview only |
| `NODE_ENV` | With `production`, explicit HTTPS origins are mandatory |

No LLM keys or session signing secret are required for the current scope. Session tokens are random and persisted as hashes. Hosting requires real HTTPS, explicit origins, durable private storage and validated off-machine recovery. Local backup/recovery tools and a source-only VM installer are available; they do not constitute a completed deployment.

## Frontend execution scope

See [worker setup and execution boundaries](WORKER.md). `executor.buildAvailable` requires an unexpired lease advertising an enabled builder. This is trusted same-machine infrastructure, not a remotely authenticated distributed worker API. The worker entrypoint checks the configured model is installed before claiming runs and requires the pinned Docker image before advertising build capability. No deployment endpoint exists.

Real local inference and bounded frontend execution have been verified. Generation requests schema-constrained output and can make one repair request after an actual compilation failure; per-attempt check evidence and source hashes are retained. Owner proposal review and bounded browser behavior checks are implemented below. `testsRun` describes actual browser execution; absent checks or incomplete execution are recorded as `not_run`. Stronger tenant isolation and deployment approval remain future work.

## Proposal review

### Project attempt history

`GET /api/projects/:id/runs` remains owner-scoped and returns lightweight run
entries. Entries now include a project-local `sequence` for stable ordering of
equal timestamps and optionally `parentRunId` for the immediate retry parent.
Parent IDs are included only when the stored lineage parses and the parent is
a different run in the same owned project. Malformed, missing and cross-project
lineage is omitted; no artifacts, request IDs or verification results are added
to the history payload. Sequence is a chronological sorting aid, not a retry
generation number. The UI keeps search/status/order controls and adds a retries
filter, parent links and focused Context/Evidence links after asynchronous load.
This history is currently loaded as a whole, without server pagination.

### Owner-controlled retry

`POST /api/runs/:id/retry` accepts `{intent, requestId}` with a 10–4,000
character trimmed intent and a lowercase UUIDv4 request ID. Only failed or
cancelled owner-scoped runs may be retried. Session, Origin and CSRF checks apply;
another owner receives 404, an active/successful source returns 409.

The transaction creates a distinct run in `awaiting_executor` at the intent
stage. It copies only the original captured project-requirements artifact,
records the new intent and stores `retry-origin.json` with its parent run ID,
request ID and creation time. Current project edits do not replace the original
brief; legacy sources without a captured brief remain intent-only. Source
events/artifacts stay unchanged. No proposal, approval, code or verification
result is copied. An enabled worker may plan the new run, but its new proposal
requires explicit owner approval before building.

The response is 201 `{run,created:true}` for a new request, or 200
`{run,created:false}` when the same source/request ID/intent is resubmitted.
Concurrent duplicates create one attempt. Reusing the ID with different intent
returns 409. Deduplication persists in stored lineage, including after restart;
it is scoped to the source run. Opening a fresh retry form creates a fresh ID.

`POST /api/runs/:id/revise` accepts `{artifactId, reason, plan}` (64 KiB maximum). `POST /api/runs/:id/reject` accepts `{artifactId, reason}`. Reasons contain 2–1000 characters. Both enforce session, Origin, CSRF, ownership and exact latest proposal identity. Only an awaiting-approval run may be reviewed. A revision adds an immutable `engineering-plan.json` and `plan-review.json`; rejection stores a review and cancels the run. Prior artifacts remain downloadable. Stale review or approval returns 409. Only the latest revision can be approved.

## Behavior scope and evidence

The workspace evidence overview derives individual type/build states from the
recorded process exit codes in `verification.json`. Missing results are shown
as `Not recorded`, null exit codes as `Incomplete`, and malformed/ambiguous
results as `Unreadable evidence`; run status alone never produces a pass.
Browser outcomes also require a consistent `testsRun` flag and structured
results. Security, accessibility, performance and deployment are explicitly
unrun in this execution scope. Output availability uses the existing server
metadata; requesting an archive or preview still performs integrity checks.

A revised plan may include `behaviorChecks: [{name, steps}]`. Steps are `{action:"click",text}` (exact button accessible name), `{action:"fill",text,value}` (exact textbox accessible name), or `{action:"expectText",text}` (exact visible text). Scope is bounded to 8 checks and 12 steps each; names are at most 100 characters, targets 200, fill values 500. Each check requires a visible-text assertion. These checks are included in the immutable owner-approved plan and its hash. Additional executable fields are discarded during validation.

Verification artifacts now include `testsRun` and `behavior: {status, reason?, results}`. Status is `passed`, `failed`, or `not_run`. Results identify the executed checks and measured failures. Required checks must all pass for verification to succeed. Compilation failure, absent checks, or incomplete browser execution is explicitly reported as `not_run`. Behavior results are limited to selected interactions and never authorize shipping.

## Retained output

Run detail now includes `outputs: {sourceAvailable, previewAvailable}`. Compiled preview payloads are omitted from the ordinary artifact list and delivered only when requested.

`GET /api/runs/:id/source` returns a `no-store` USTAR archive as an attachment. It includes the exact stored scaffold/source files, `nexyral/approved-plan.json`, `nexyral/verification.json`, and export instructions. Both successful and failed completed builds may export source when approval and evidence match. Unsupported source shapes or mismatched source/approval digests return 409. Source is never regenerated on download.

`POST /api/runs/:id/preview-access` requires the authenticated owner, accepted Origin,
CSRF token, and an empty JSON body. It verifies retained preview/source/approval
hashes, applies a 30-per-minute owner rate limit, and returns 201 with `{url,
expiresAt}`. Missing preview service configuration returns 503. The URL contains
a single-use 60-second grant, stored only as a hash and bound to the session,
owner, run and app origin. A maximum of ten pending grants per session is allowed;
a fresh grant replaces the same-session/run grant. Logout revokes session grants.

`GET /view/:grant` on the distinct-host preview service consumes a valid grant
without cookie authentication. Missing, expired, revoked and consumed grants
return 404. Responses are no-store/no-referrer and enforce `sandbox allow-scripts`,
exclude same-origin privilege, block fetch/connect, workers, child frames, forms
and non-data assets, and allow embedding only by configured app origins. The UI
adds its own iframe sandbox. These grants are not public sharing links.

The former `GET`/`HEAD /api/runs/:id/preview` is retired (410 after owner checks).
Output metadata includes `previewExpiresAt` and `previewUnavailableReason`
(`expired` or `quota`) where applicable. Source export remains available after
preview retention ends. Legacy preview records receive no automatic TTL.

A missing output returns 404; unauthorized requests return 401, other owners receive 404, and mismatched evidence returns 409. Output responses cannot be cached. Older runs without retained compiled assets have no preview and are never rebuilt automatically.


## Password recovery (v5)

`POST /api/auth/recovery` accepts `{token,password}` without a session, but
requires an accepted Origin and is limited to five attempts per client identity
per 15 minutes. Valid single-use emailed or operator-issued codes update credentials, revoke
all account sessions/preview grants and return `{ok:true,signInRequired:true}`.
Passwords require 12–128 characters. Invalid/expired/consumed codes return 400;
wrong Origin returns 403; limit returns 429. Responses are no-store and clear
the browser session cookie. When SMTP is configured, `/auth/request-recovery` can issue and send a code without exposing it in the response.
See ACCOUNT_RECOVERY.md for the trusted operator command and private delivery.

Client identity uses the socket address by default, or a single validated
forwarded IP from an explicitly trusted local proxy. Other peers cannot override
their identity; chains/malformed addresses from trusted peers are rejected.
These rate budgets remain process-local and reset on restart.

## Account providers (v7)

Provider secrets remain server-side. See [ACCOUNT_PROVIDERS.md](ACCOUNT_PROVIDERS.md)
for AWS SES, GitHub OAuth app registration, and receiving-mailbox configuration.
No live provider or public backend has been activated by this implementation.

| Method | Path | Behavior |
| --- | --- | --- |
| GET | `/auth/providers` | Public capability flags `github`, `email`, and configured `supportEmail`; no secrets |
| GET | `/auth/github/start` | Rate-limited GitHub authorization redirect with browser-bound state and PKCE |
| GET | `/auth/github/callback` | Single-use state/code verification, session rotation, fixed app-origin redirect |
| POST | `/auth/github/connect` | Signed-in, Origin/CSRF-protected explicit link initiation; returns authorization URL |
| POST | `/auth/send-verification` | Signed-in, Origin/CSRF-protected, rate-limited email resend |
| POST | `/auth/verify-email` | Allowed Origin plus single-use `{token}`; marks verified without signing in |
| POST | `/auth/request-recovery` | Allowed Origin plus `{email}`; uniform 202 for known/unknown recipients, throttling, or SMTP delivery failure |

Session responses include `emailVerified` and `githubConnected`; signup can include
`emailDelivery` (`sent`, `failed`, or `not_configured`). `sent` means SMTP accepted
the message, not inbox delivery. Configured SMTP gates project writes on verified
email, including legacy accounts. Reading existing work, account recovery,
verification, logout and explicit GitHub connection remain available.

GitHub requests only `read:user user:email`; repository access is not granted.
New accounts require a verified primary GitHub email. Existing email accounts
must sign in and explicitly link the same verified email; no silent account
merging. Provider tokens are discarded after identity lookup. Linking rechecks
the initiating session after provider exchange. OAuth pending state is bounded,
process-local and expires after ten minutes; restarting invalidates it.

Verification grants expire after one hour, are hashed in storage, and are
single-use. Resend supersedes an earlier grant. Recovery grants expire after
15 minutes and password changes revoke sessions. SMTP failure removes the
unsent grant. No durable mail queue or bounce/webhook processing is implemented.
Schema v7 adds GitHub identities, verified-email records and verification grants;
restore keeps identities/verified status while revoking grants and sessions.
