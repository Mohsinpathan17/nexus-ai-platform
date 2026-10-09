# Step 9 — Durable previews and source export

Successful frontend runs now retain the exact compiled JavaScript/CSS before temporary build workspace cleanup. The SQLite worker transaction binds the preview to source, approval and verification digests. Owners can open an isolated preview, interact, reset it, and download a source archive containing the stored scaffold and evidence. Raw artifact inspection is collapsed by default to keep the run result readable.

## Files

Created: `shared/preview.ts`, `server/preview.ts`, `server/archive.ts`, `server/outputs.ts`, `server/preview.test.ts`, `src/pages/workspace/RunOutput.tsx`, `docs/STEP_9_REPORT.md`.

Modified: `shared/contracts.ts`, `server/build.ts`, `server/worker.ts`, `server/app.ts`, `server/app.test.ts`, `server/worker.test.ts`, `src/pages/workspace/RunPage.tsx`, `src/styles/workspace.css`, `tests/workspace.spec.ts`, `docs/API_CONTRACT.md`, `docs/WORKER.md`.

No new dependencies, database migration, services or environment variables. Existing cloud startup requirements remain applicable, so the environment draft was unchanged. No publication or deployment.

## Behavior and controls

Only successful verification retains a preview; failed completed runs can still export matching source/evidence. Old runs without retained bundles are not rebuilt. Both output endpoints require the owner session and verify stored digests. Source paths are fixed; traversal and oversized preview payloads are rejected. Preview headers force an opaque sandbox even if the endpoint is opened directly. The UI adds an iframe sandbox without same-origin permission. Required fetch/connect blocking and parent/cookie/storage isolation were tested in a real browser.

The archive is standard USTAR with the exact source/scaffold, approved scope, measured evidence and instructions. No lockfile is generated; fresh installation reproducibility is not claimed. The preview supports a bounded, self-contained local frontend, not remote resources or arbitrary dynamic chunks. Dedicated preview-origin hosting and operational hardening remain future work.

## Validation

All 27 server tests passed with zero skipped. They include actual Docker compilation and behavior verification, API ownership and response policies, digest mismatch rejection, safe packaging, source archive extraction with system tar, persisted outputs after database/server reopening, and failure preventing preview retention.

Five workspace browser scenarios passed, including actual build, retained preview interaction/reset, opaque-origin isolation, blocked API fetch, matching source/evidence download and reopening after page reload. Both themes were checked at 375, 390, 430, 768 and 1440 pixels without page overflow. All five scenarios also passed in the final run after collapsing raw artifact inspection. Both light and dark retained-preview screenshots were visually inspected.

Lint, TypeScript and production build passed. The initial build caught a stylesheet overwrite from an edit script; workspace rules were recovered from the last successful CSS bundle and reformatted, preserving their declarations and layout. Responsive and theme browser checks passed after recovery. The light preview screenshot was inspected; final screenshots are in `artifacts/retained-preview-light.png` and `artifacts/retained-preview-dark.png`. The source archive exercised by the browser is `artifacts/retained-source.tar`.

Commands: `npm run lint`, `npm run typecheck`, `npm run test:api`, `node --test server/app.test.ts server/preview.test.ts`, `npm run build`, `npx playwright test tests/workspace.spec.ts`, and tar listing/extraction assertions inside tests. Existing lazy 3D bundle size advisory remains; no new application runtime errors were observed in workspace checks. Sandbox probe intentionally produces an expected CSP-blocked fetch.

## Next

Move preview hosting to a dedicated origin and package a portable execution image. Add run retention/quota controls and improve operational visibility before broadening generation scope. No fresh real-model inference benchmark was performed in this increment.
