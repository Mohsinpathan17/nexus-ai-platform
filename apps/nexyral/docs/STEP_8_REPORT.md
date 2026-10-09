# Step 8 — Owner-reviewed browser behavior verification

Added bounded behavior-check contracts to engineering plans, a structured owner editor and readable approval scope. Each selected check requires an assertion. Approval remains bound to the immutable latest plan, including test scope; unsaved editing disables approval and clears consent.

After compilation, selected checks run inside a resource-limited, network-disabled Docker container using a trusted Playwright harness and read-only system Chromium libraries. Each check starts in a fresh browser context. Required failures gate run success and feed the existing one-repair limit. Evidence distinguishes passed, failed and not-run results. No checks means explicitly compile-only verification.

Created: `shared/behavior.ts`, `server/behavior-harness.mjs`, `server/behavior.test.ts`, `scripts/copy-worker-assets.ts`, `src/pages/workspace/BehaviorEditor.tsx`, `src/pages/workspace/BehaviorEvidence.tsx`, this report.

Modified: `shared/plans.ts`, `server/build.ts`, `server/builder.ts`, `server/worker.ts`, `server/runs.ts`, `server/build.test.ts`, `src/pages/workspace/PlanEditor.tsx`, `src/pages/workspace/PlanReview.tsx`, `src/pages/workspace/RunPage.tsx`, `src/styles/workspace.css`, `tests/workspace.spec.ts`, `package.json`, `docs/API_CONTRACT.md`, `docs/WORKER.md`.

No dependencies added. Playwright remains an existing development dependency; the build worker needs a full install. No database migration. No deployment or publication.

Validation: lint, TypeScript and production build passed. All 24 server tests passed with zero skipped; all five workspace browser tests passed, followed by a final targeted run after approval controls changed. Expanded actual-Docker checks verified both pass and failure, textbox fills and fresh-context isolation. A compile-error test confirmed selected browser checks never run after compiler failure. The expanded test initially exposed a Chromium crash from missing fonts; read-only font/configuration mounts fixed it without loosening resource limits, and the final targeted test passed. The compiled worker executed a real isolated assertion successfully; evidence is stored in `artifacts/compiled-behavior-smoke.json`. The behavior editor screenshot was visually inspected, and the opened editor had no overflow at 375, 768 and 1440 pixels. Existing review layouts were checked in both themes at 375, 390, 430, 768 and 1440 pixels. Existing lazy 3D bundle size advisory remains. The Linux system-browser mounting approach is specific to this environment and is not a hardened hosted multi-tenant execution service. Selected checks cover defined interactions, not comprehensive application quality. No new real-model inference benchmark was performed: model integration uses the same approved-plan path, while deterministic tests verify actual browser execution against controlled generated sources.

Next: durable preview/source export and a clearer run result view, followed by container image portability and operational hardening. Backend generation and deployment remain out of scope.


Commands: `npm run lint`, `npm run typecheck`, `npm run build`, `npm run test:api`, `npx playwright test tests/workspace.spec.ts`, targeted `owner reviews` and `approved browser|real type error` rechecks, and a compiled-worker `verifyFrontend` smoke with an actual browser assertion. The compiled harness was compared byte-for-byte with its trusted source. Root prototype tracked files remain unchanged.

The cloud environment startup draft was saved with browser library/font prerequisites, development dependency requirements, compiled harness packaging, test commands and conservative evidence semantics. Existing repositories, install script, network rules and credential requirements were preserved. Saving did not apply or publish the configuration, and fresh-task restoration has not been verified.
