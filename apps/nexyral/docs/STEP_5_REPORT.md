# Step 5 — explicit plan approval and isolated frontend executor

Implemented readable plan review, exact owner approval, a bounded local-model frontend generator, real Docker TypeScript/Vite verification, source/evidence artifacts, and artifact download. Preserved the public website, Core, themes, old prototype and root files. Nothing was published or deployed.

## What is working

- Plan review shows requirements, architecture, acceptance criteria and risks; an explicit checkbox acknowledges the limited frontend scope.
- Origin/CSRF-protected owner approval references an exact artifact ID and stores an immutable snapshot/hash, owner and timestamp. Repeated approval is idempotent. Other owners cannot approve it.
- Build capability must be advertised by a live worker; planning-only workers cannot authorize builds. Startup checks the installed model before opening the database/claiming runs and checks the pinned local Docker image before enabling builds.
- Generated App.tsx/CSS are bounded. Trusted scaffolding supplies all paths, scripts and configuration. No model-generated shell commands or build config are used.
- Actual TypeScript checking and Vite compilation run in non-root, network-disabled, resource-limited Docker containers with read-only root/dependencies and no repository/database/credential mounts.
- Actual exit codes, bounded output, source hash and approved-plan hash are persisted. Type errors fail the run. Successful checks do not imply application tests or deployment.
- Users can download stored artifacts. Generated bundles and workspaces are transient; no generated application is hosted.

## Files

Created `shared/plans.ts`, `server/build.ts`, `server/build.test.ts`, `server/builder.ts`, `src/pages/workspace/PlanReview.tsx` and this report.

Modified `server/database.ts`, `server/planner.ts`, `server/worker.ts`, `server/worker-entry.ts`, `server/runs.ts`, `server/app.ts`, `server/app.test.ts`, `server/worker.test.ts`, `shared/contracts.ts`, `src/pages/workspace/RunPage.tsx`, `ProjectPage.tsx`, `WorkspaceLayout.tsx`, `src/pages/AuthPage.tsx`, `src/pages/ContentPage.tsx`, `src/styles/workspace.css`, `tests/workspace.spec.ts`, `README.md`, `docs/API_CONTRACT.md`, and `docs/WORKER.md`.

No npm dependencies added; no lockfile change. External setup installed official Ollama0.40.0 at `/workspace/tools/ollama` and pulled the digest-pinned official Node Docker image. SQLite migration to schema3 is additive.

## Verification

- `npm run typecheck`: passed.
- `npm run lint`: passed with no findings.
- `npm run build`: passed for server and React; final build rerun after account/status copy updates.
- `npm run test:api`: **18 passed, zero skipped**, including real Docker compilation, deliberate TS2322 failure, pre-cancellation, owner/CSRF/stale-artifact rejection, approval idempotence, worker lifecycle and previous authentication tests. Final rerun passed.
- `npm run test:e2e`: **20 passed**. New approval flow checks consent, a real fixture-source Docker build, live evidence, artifact download and reload persistence. Review layout checks passed at375,390,430,768,1440px in both themes. This full suite preceded only final account/status copy updates; it was not rerun after those copy-only changes.
- Docker runtime probe confirmed uid1000, read-only root and only the loopback interface. No leftover build containers observed.
- Official Ollama archive SHA256 matched the release checksum: c94aa4156b3d13e64ebc2efe5ea53f015384c882be776e6695cfb37fb180d5ad.
- Ollama service starts locally with cloud disabled; `/api/tags` returns200 with no installed models.
- Missing-model worker startup correctly exits before creating the probe database or claiming pending runs.
- Combined development command started; frontend and proxied API health returned200 with executor/build availability false.
- Prototype/root preservation verified with `git diff --exit-code -- apps/api apps/web README.md Makefile docker-compose.yml docs` from the repository root.

Screenshots `artifacts/plan-review-dark.png` and `plan-review-light.png` were produced and visually inspected. Controlled provider/source fixtures are explicitly not real inference.

Existing warning: lazy-loaded 3D chunk914.85KB /242.62KB gzip; the Vite advisory remains visible. Test tooling also emits its existing NO_COLOR/FORCE_COLOR warning. No application page errors observed in the new browser flow.

## Remaining external blocker

The Ollama binary download is now reachable. The real model pull reached the official registry, then failed on its blob redirect to `dd20bb891979d25aebc8bec07b2b3bbc.r2.cloudflarestorage.com`. Direct HTTPS probe returned403; native pulling also reported DNS failure during redirect validation. The exact host was added to the unpublished network draft without dropping existing rules or presets. Updated complete startup instructions were saved. Draft saving does not activate access. No real model proposal or model-generated frontend has been verified.

See [worker setup](WORKER.md). Apply the required network access in environment settings, then retry the official model pull and a real planning/build flow. No paid API credentials are required.

## Next

Verify real local inference first. Then add plan revisions, generated-app behavior tests, repair with measured failures, operational quotas/backups and stronger workload isolation. Backend generation and deployment remain separate future milestones. This is a scoped frontend executor foundation, not a commercial multi-tenant execution service.
