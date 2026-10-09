# Step 16: owner-controlled project management

The authenticated workspace now supports searching projects, sorting by name,
creation date or actual run count, and renaming a project. Clear-search and
filtered-empty states are included. Creating a project clears an existing filter
so the new project is visible. Controls stack on mobile and use existing theme
variables, semantic labels, visible focus and status announcements.

Project settings open an inline form with focused input. Escape/Cancel closes
it and returns focus; a successful save also restores the trigger's focus.
The UI handles a conflicting name edit with an explicit error and refresh
control, preserving the owner's draft. Project pages load a single owned project
rather than fetching the full list to locate it. Settings reset when the project
ID changes.

GET /api/projects/:id returns an owned project and actual run count. PATCH takes
{name, expectedName} with the existing Origin/session/CSRF protections. Names
are trimmed and bounded to 2–100 characters. The write transaction checks the
current name against expectedName; a differing name returns409. This compares
current names rather than maintaining a monotonic revision history. Other owners
receive404. Renaming preserves the ID, creation timestamp, runs, events and
artifacts. No database schema change or dependency was required.

Created:

- `server/projects.ts`, `server/projects.test.ts`
- `src/pages/workspace/ProjectSettings.tsx`
- `tests/projects.spec.ts`, this report

Modified:

- `server/app.ts`, `server/runs.ts`
- `src/pages/workspace/ProjectsPage.tsx`, `ProjectPage.tsx`
- `src/styles/workspace.css`, `docs/API_CONTRACT.md`

Checks:

- Lint, TypeScript and ordinary production build passed.
- Full backend suite: 50 passed, zero failed/skipped, including ownership,
  Origin/CSRF, name bounds, conflicting edits and preserved run evidence.
- Initial projects/workspace browser suite: 9 passed, including both workspace
  themes and actual owner-approved isolated frontend verification.
- Final project browser rechecks: 4 passed. They cover dark/light at375px/1440px, search, sorting,
  persistence after reload, preserved run links, conflict refresh/resubmit,
  input focus and focus restoration. No horizontal overflow was observed.
- Standalone preflight passed against the final local ordinary build/database.
- Source-only package checksum and 202 safe entries passed inspection. A clean
  extraction passed `npm ci`, lint, TypeScript/production build, the project API
  regression test and preflight with a private empty database directory.

Existing saved startup/install instructions remain applicable. No new services,
environment variables, credentials or network domains were required, so the
environment draft was left unchanged for this product milestone.

The conflict case intentionally causes one HTTP409 browser network diagnostic.
Initial assertions treated that expected diagnostic as an unexpected error and
failed; the final test requires exactly that one diagnostic, while additional
console errors/page exceptions still fail. This is not a suppressed application
failure. The existing Vite lazy 3D advisory and test-runner color warnings remain.
The 3D chunk remains917.50KB /243.26KB gzip.

Screenshots are in ignored `artifacts/projects-<width>-<theme>.png` and
`project-settings-<width>-<theme>.png`. Dark/mobile and desktop/light project
views and settings were inspected for spacing, controls and theme consistency.

No VM was created and no backend was deployed. The existing Vercel public demo
is unchanged; these are authenticated workspace changes available locally.
Project search/sorting operate on the loaded owner list; pagination, archival,
project deletion and team membership remain future work.

Next product work: project-level requirements and richer run-history controls.
Hosting still requires the user-created VM, followed by the HTTPS and persistence
checks in FREE_HOSTING.md and HTTPS_VALIDATION.md.
