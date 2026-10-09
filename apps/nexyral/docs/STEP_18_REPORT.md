# Step 18: captured-context review and owner-controlled retry

Run detail now shows the recorded outcome and captured requirements as readable
input, including its revision or an explicit intent-only state. Raw evidence
remains inspectable and downloadable. A retry links back to its original run.
The cancellation notice now avoids claiming that no source was ever generated;
available evidence remains stored without implying successful verification.

Owners of failed/cancelled runs can prepare a new attempt, review/edit its intent
and explicitly create it. The form supports focused input, Escape/Cancel and
restored trigger focus, pending controls, bounded text and visible errors.
The original captured brief is retained even if current project requirements
have changed. To use the current brief instead, create a normal new run from
the project. Legacy runs without a captured brief remain intent-only on retry.

The owner-scoped endpoint enforces session, Origin, CSRF, terminal source status
and input bounds. A transaction creates a new run and immutable lineage artifact
without modifying source evidence. A UUIDv4 request ID deduplicates concurrent
and repeated submissions. Reusing that source/request ID with different intent
returns 409. A retry copies no plans, approvals, code or verification results.
An enabled worker may plan it; building requires new explicit proposal approval.

Created:

- `src/pages/workspace/RunContext.tsx`, `RunRetry.tsx`
- `server/retry.test.ts`, `tests/retry.spec.ts`, this report

Modified:

- `server/runs.ts`, `server/app.ts`
- `src/pages/workspace/RunPage.tsx`, `src/styles/workspace.css`
- `docs/API_CONTRACT.md`

No dependencies were added; schema remains v6. Existing Home, navigation, themes
and Core identity are preserved. No startup/configuration changes are needed
for this milestone; the existing saved onboarding instructions still apply.

Executed validation:

- `npm run lint`, `npm run typecheck`, `npm run build`: passed.
- `node --test server/retry.test.ts server/project-requirements.test.ts`: six
  passed, including unchanged source evidence, stable snapshots, idempotency,
  authorization/bounds and a connected builder waiting for new approval.
- `npm run test:api`: 56 passed, zero failed/skipped. Includes actual isolated
  TypeScript/build/browser verification, failed compilation, bounded repair,
  storage recovery and HTTP/TLS fixtures.
- `npx playwright test tests/retry.spec.ts tests/requirements.spec.ts
  tests/workspace.spec.ts`: 13 passed. Retry cases cover both themes at 375px
  and 1440px with reduced motion, keyboard focus/Escape, changed project briefs,
  original-run links, missing copied approvals/results, reload persistence,
  retained original evidence and project history. Existing workspace tests
  also exercise explicit approval and real isolated frontend checks/preview.
- `npm run preflight:backend`: runtime, ordinary build, origins/proxy and
  private database storage passed for the local configuration.
- `npm run package:backend`: source-only archive regenerated; checksum and
  archive-entry safety inspected. Runtime databases, credentials, dependency
  caches and generated execution outputs are excluded.

All four `artifacts/retry-<width>-<theme>.png` screenshots were inspected.
No horizontal overflow, application console errors or page errors were observed
in the new retry flow. Existing runner color warnings and Vite's lazy 3D size
advisory remain: 917.50KB / 243.26KB gzip. No warning was hidden or disabled.

Limitations: deduplication searches stored lineage within the project; pagination
and indexed high-volume attempt history remain future work. This step exercises
planning with a deterministic test fixture, not a new real-model benchmark.
Public accounts/backend remain undeployed because no VM has been created;
remote HTTPS/persistence checks remain outstanding. The Vercel demo is unchanged.

Next: add an evidence overview that distinguishes completed, failed and unrun
checks and makes source/preview availability easier to assess across attempts.
