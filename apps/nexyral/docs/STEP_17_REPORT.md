# Step 17: persistent project requirements and run history controls

Projects now have an owner-controlled, reusable requirements brief. The editor
supports add/edit/clear, focused input, Escape/Cancel, restored trigger focus,
character bounds, saved-revision display and conflict refresh. Saved context is
readable in both themes; long summaries scroll with keyboard focus. New-run
creation is disabled while editing the brief to distinguish unsaved changes
from the saved version used by the server.

Each new run atomically captures the saved brief in a project-requirements.json
artifact. Later edits and clears do not rewrite previous artifacts. Planning and
code generation use that captured context with the specific run intent, as
untrusted user input. Legacy runs remain intent-only. Exact owner approval and
executor restrictions are unchanged; requirements do not authorize execution.

Run history supports intent search, actual status filters and oldest/newest
ordering, with result counts and a clear-filters empty state. These controls
operate on the currently loaded owner-scoped history, not paginated queries.

SQLite v6 adds only project_requirements. API writes enforce session, ownership,
Origin and CSRF; text is limited to6,000 trimmed characters, request bodies to
32KiB, and expectedRevision is checked within the transaction. Changed saves
increment a monotonic revision; identical saves do not. Empty text clears only
future context. Backups/preflight accept v4/v5/v6, and older database openings
upgrade additively. Back up before upgrading an existing deployment; older
servers cannot open v6. No new npm dependencies or hosting services were added.

Created:

- `server/project-requirements.ts`, `server/project-requirements.test.ts`
- `src/pages/workspace/ProjectRequirements.tsx`, `RunHistory.tsx`
- `tests/requirements.spec.ts`, this report

Modified:

- `shared/contracts.ts`, `server/database.ts`, `server/app.ts`, `server/runs.ts`,
  `server/worker.ts`, `server/projects.test.ts`
- `server/backups.ts`, `server/backups.test.ts`, `server/retention.test.ts`,
  `server/deployment-preflight.ts`, `server/deployment-preflight.test.ts`
- `src/pages/workspace/ProjectPage.tsx`, `RunPage.tsx`, `src/styles/workspace.css`
- `docs/API_CONTRACT.md`, `docs/RECOVERY.md`

Validation:

- Full backend suite:53 passed, zero failed/skipped. Includes ownership,
  Origin/CSRF, text bounds, revision conflicts, stable earlier snapshots, clear
  behavior, captured planner input, v5 migration and v6 backup/restore.
- Targeted storage/backup/retention/preflight suite:13 passed.
- Lint, TypeScript and ordinary production build passed.
- Final browser suite:13 passed, including project management, requirements and
  history in both themes at375px/1440px, session flows, and actual approved
  isolated frontend verification. No horizontal overflow was observed.
- Standalone deployment preflight passed against the ordinary local build.
- Final brief/screenshot rechecks:4 passed, with both themes and widths.
- Source-only package:checksum and208 safe entries passed inspection. A clean
  extraction passed `npm ci`, lint, TypeScript/production build, seven focused
  requirements/project/backup tests and preflight with private fresh storage.

Browser tests found and fixed duplicate sibling keys causing repeated rename
controls and an ambiguous implicit textarea label on reopening a saved brief.
Those obsolete browser runs were interrupted before testing the corrected build;
they are not counted as successful. Corrected final results are recorded above.

The history status test now uses the control's accessible combobox name rather
than implicit-label text that included mapped option contents. Screenshots are
captured from scroll position0 to avoid showing offscreen fixed skip links in
full-page capture. These are test corrections, not weakened assertions. The
`artifacts/brief-<width>-<theme>.png` screenshots were inspected in both themes.

Reusable startup guidance was saved with schema6 migration/backup instructions,
preserving existing installation, network and credential settings. Review/save
the draft in environment settings, then publish the environment to retain the
setup changes. A saved draft does not deploy services or publish a snapshot.

No backend was published, no VM created and the Vercel public demo is unchanged.
The existing lazy 3D chunk-size advisory remains917.50KB /243.26KB gzip, along
with test-runner color warnings. Deliberate conflict tests retain the expected
HTTP409 network diagnostic; additional application errors remain failures.
This milestone verifies captured-context handling with a deterministic planner,
not a new actual-model inference benchmark or commercial tenant isolation.

Next: improve run context/evidence review and add a controlled retry path that
creates a new run without automatically executing prior approvals. Public
hosting still requires the VM and remote HTTPS/persistence validation.
