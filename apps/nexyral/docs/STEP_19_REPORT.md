# Step 19: evidence overview and output availability

Run detail now presents a readable overview of this attempt's measured type,
production-build and browser outcomes. Each result distinguishes Passed, Failed,
Incomplete, Not recorded, Not run and Unreadable evidence. A missing artifact or
run completion status never supplies a pass. Null process exits are incomplete;
duplicate, malformed and inconsistent results require raw artifact review.
Compiler success and browser failure can appear independently.

Security review, generated-app accessibility/performance audits and deployment
are explicitly unrun. Source and isolated preview availability use the existing
server metadata, including expired/quota states. Links lead to raw evidence and
the existing output controls. Availability is provisional: actual requests still
validate stored approval/source/preview integrity. A preview is not deployment.

The browser detail component now uses the same defensive evidence parser, so
malformed result arrays cannot crash run detail. Completion/failure banners no
longer infer check outcomes or repeat current worker availability as past build
history. Pipeline approval/build markers now use stored approval/build evidence.
Original-run links and preserved context from Step 18 remain available; prior
attempt results do not certify the current attempt.

Created:

- `shared/run-evidence.ts`
- `src/pages/workspace/EvidenceOverview.tsx`
- `server/run-evidence.test.ts`, `tests/evidence.spec.ts`, this report

Modified:

- `src/pages/workspace/RunPage.tsx`, `BehaviorEvidence.tsx`
- `src/styles/workspace.css`, `docs/API_CONTRACT.md`

No dependencies, database migration, API endpoints or startup changes were
needed. The existing onboarding configuration remains applicable. Home, themes,
navigation and the Core identity are preserved.

Commands and verified results:

- `npm run lint`, `npm run typecheck`, `npm run build`: passed on the final code.
- `node --test server/run-evidence.test.ts server/retry.test.ts`: five passed;
  covers invalid/missing/interrupted/duplicate evidence, independent outcomes,
  contradictory browser data, latest evidence and existing retry protections.
- `npx playwright test tests/retry.spec.ts tests/workspace.spec.ts`: nine passed.
- `npx playwright test tests/evidence.spec.ts`: four passed. Each exercises six
  explicitly controlled evidence fixtures using a real API and temporary SQLite,
  covering missing results, compiler failure, interruption, malformed JSON,
  malformed browser data and browser failure. Both themes at375px/1440px use
  reduced motion, with no page/console errors or horizontal overflow observed.
- After banner/pipeline corrections, `npx playwright test tests/evidence.spec.ts
  tests/workspace.spec.ts`: nine passed. Includes actual explicitly approved
  Docker frontend type/build/browser checks, source export and isolated preview.
- `npm run preflight:backend`: local runtime/build/origin/storage checks passed.
- `npm run package:backend`: source-only package regenerated and its checksum,
  safe entries and inclusion of the new evidence source/tests inspected.

Thirteen distinct browser scenarios passed, with nine final rechecks. All four
`artifacts/evidence-<width>-<theme>.png` screenshots were inspected; final mobile
light and desktop dark screenshots were re-inspected after banner corrections.
The full backend suite was not rerun because server behavior did not change;
Step 18's56-test result remains historical, not a new Step 19 validation claim.

Warnings remain: the lazy 3D chunk is917.50KB /243.26KB gzip and Vite emits its
size advisory; the browser runner reports existing color-environment warnings.
No warnings were suppressed. Frontend evidence rendering is not a new audit of
generated software or a model inference benchmark. Negative evidence fixtures
are explicitly synthetic and do not masquerade as actual execution results.

Nothing was published or deployed. The Vercel demo remains unchanged; public
backend hosting still needs a VM and remote HTTPS/persistence validation.

Next: build a project-level attempt timeline with explicit retry lineage and
links to each attempt's context and evidence, without merging their results.
