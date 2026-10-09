# Step 4 — local planning-worker foundation

Implemented an independently started free local Ollama planning adapter, durable single-worker lease, transactional queue claim, validated proposal storage, human-review stop, cancellation, shutdown, and interrupted-run recovery. Live events update the existing workspace. Public Hero, Core, themes, and original prototype files remain preserved. Nothing was published or deployed.

## Files

Created `server/planner.ts`, `server/worker.ts`, `server/worker-entry.ts`, `server/worker.test.ts`, `docs/WORKER.md`, and this report.

Modified `server/database.ts`, `server/app.ts`, `server/runs.ts`, `server/index.ts`, `shared/contracts.ts`, `src/pages/workspace/RunPage.tsx`, `ProjectPage.tsx`, `WorkspaceLayout.tsx`, `tests/workspace.spec.ts`, `package.json`, `README.md`, and `docs/API_CONTRACT.md`.

No dependencies were added. Node built-ins and existing browser testing tools are used. Existing SQLite files migrate additively to schema v2; no data reset is performed.

## Validation

- `npm run lint`: passed.
- `npm run typecheck`: passed.
- `npm run build`: passed, including compiled server and React app.
- `npm run test:api`: 11 tests passed (six existing API tests plus five worker tests).
- Full `npm run test:e2e`: all 15 public-site tests and the new planning test passed; two existing workspace tests initially failed because a stage label changed from NOT STARTED to NOT COMPLETED. Corrected the display so stages that have not started retain their accurate label.
- Final `npm run test:e2e -- tests/workspace.spec.ts`: all four workspace tests passed, including signup, login, persistence, cancellation, session protection, streamed proposal, and stored artifact refresh.
- The isolated planning browser test uses its own in-memory database and real compiled server; it does not mutate other tests' run records. Overflow checks passed at 375, 768, and 1440 px in both themes. Planning screenshots were produced and inspected in both themes.
- `git diff --exit-code -- apps/api apps/web README.md Makefile docker-compose.yml docs` from the repository root confirmed the previous prototype and root files were unchanged.

Vite's existing lazy 3D bundle advisory remains: 914.85 KB / 242.62 KB gzip. Test tooling emits its existing NO_COLOR/FORCE_COLOR warning. No application page errors were observed in the planning browser test.

## Real inference is not yet verified

Tests use clearly controlled provider fixtures, not actual model inference. No Ollama binary or loopback service is available in the current machine. The official Linux download endpoint returned HTTP 403. The environment draft now preserves the package-manager presets and adds custom `ollama.com` and `registry.ollama.ai` destinations plus updated worker startup instructions. Saving this draft does not activate network access or install a model. No paid API credential is required.

See [worker setup](WORKER.md) for the exact runtime requirements and boundaries. A real Ollama model must be installed and serving locally before this integration can be called operational with actual inference.

## Next

Verify a real local model proposal, then implement explicit plan revision and approval together with an isolated build executor. Build, repair, tests on generated applications, and deployment remain unimplemented. The awaiting-approval state deliberately exposes no approval button until such an executor exists.
