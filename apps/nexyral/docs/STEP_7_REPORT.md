# Step 7 — Proposal revision and rejection

Implemented an owner-controlled review cycle before frontend execution. The latest proposal can be edited through labeled text fields, with a required review reason. Saving creates a new immutable proposal artifact and review record, preserving earlier versions. Approval consent resets for the new version. Stale approval, revision, and rejection requests receive HTTP 409. Rejecting the current proposal cancels the run and prevents build execution.

## Files

Created: `src/pages/workspace/PlanEditor.tsx`, `docs/STEP_7_REPORT.md`.

Modified: `server/runs.ts`, `server/http.ts`, `server/app.ts`, `shared/contracts.ts`, `src/pages/workspace/PlanReview.tsx`, `src/pages/workspace/RunPage.tsx`, `src/styles/workspace.css`, `server/worker.test.ts`, `server/app.test.ts`, `tests/workspace.spec.ts`, `docs/API_CONTRACT.md`.

No dependencies added. No database migration required. No existing project records altered by validation: worker fixtures use in-memory databases.

## Contract

`POST /api/runs/:id/revise`: `{artifactId, reason, plan}`. JSON body bounded to 64 KiB. Complete plan validation remains required.

`POST /api/runs/:id/reject`: `{artifactId, reason}`. Default 16 KiB body limit.

Both require an authenticated owner, allowed Origin, valid CSRF token, awaiting-approval status, and exact latest proposal ID. Reviews are transactional. Approval after revision snapshots only the latest proposal. Revision and rejection are unavailable after approval. Review reasons are stored as evidence, not interpolated into executable commands.

## Validation

Lint, TypeScript, production build and 22 server tests passed (zero skipped). The updated API test additionally exercises revision CSRF protection, rejection owner isolation and stale approval rejection. All five workspace browser scenarios passed across the full run and targeted final rerun. They cover rejection, revision, renewed consent, immutable artifact counts, actual Docker compilation, downloads, and persistence. Both themes were checked at 375, 390, 430, 768 and 1440 pixels with no overflow. Light and dark review screenshots were generated; the light screenshot was visually inspected. Initial browser failures came from an accidental test count change and an exact label lookup; both were corrected without removing assertions. The final revision flow passed in 16.9 seconds.

## Limitations and next increment

Per-run generated application behavior tests are not implemented in this increment. Verification still means TypeScript plus production compilation; the existing standalone counter behavior smoke remains separate. A preliminary isolated Chromium version probe passed with read-only browser library mounts, but does not establish application behavior-test execution readiness.

Next: bounded declarative behavior-check contracts, owner-reviewed test scope, isolated browser execution, and measured per-check evidence that gates run success. Nothing published or deployed. Existing lazy Three.js chunk size advisory remains.

Commands: `npm run lint`, `npm run typecheck`, `npm run test:api`, `node --test server/app.test.ts`, `npm run build`, `npx playwright test tests/workspace.spec.ts`, and the targeted `owner reviews` rerun. Existing root/prototype files remain unchanged. Startup dependencies and service commands are unchanged, so no environment configuration update is needed.
