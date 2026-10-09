# Step 20: project attempt timeline

Project history now displays an ordered attempt timeline with a readable run ID,
actual status, date, immediate retry-parent link and direct Context/Evidence
links. Search, status filters and ordering remain available; a Retries only
filter and clear-filters action support tracing repeated work. Disclosures make
clear that filters can hide related attempts and results are never combined.

The existing owner-scoped history endpoint adds optional parentRunId and a
project-local sequence. A single batched lineage read avoids per-run artifact
requests and exposes no artifact content or deduplication request IDs. Only a
different parent in the same owned project is included. Missing, malformed or
cross-project lineage is omitted and displayed as No parent recorded.

Equal creation timestamps use the local sequence, rather than arbitrary UUID
ordering. Screenshot review caught this tie issue and the final code/tests
verify oldest/newest ordering. Sequence is not a retry-generation number.

Direct section links wait for asynchronous run loading, scroll with instant
motion, and focus the corresponding heading. Effects do not repeat on ordinary
event refreshes. The timeline uses semantic list items and independent links,
avoiding nested anchors; both themes use existing design tokens and mobile
layouts wrap status/link groups.

Created:

- `server/run-history.test.ts`, `tests/timeline.spec.ts`, this report

Modified:

- `shared/contracts.ts`, `server/runs.ts`
- `src/pages/workspace/ProjectPage.tsx`, `RunHistory.tsx`, `RunPage.tsx`,
  `RunContext.tsx`, `EvidenceOverview.tsx`
- `src/styles/workspace.css`, `docs/API_CONTRACT.md`
- `tests/projects.spec.ts`, `requirements.spec.ts`, `retry.spec.ts`: selectors
  updated for semantic timeline list items and their main run links.

No dependencies, schema migration, hosting services or startup changes were
added. Existing onboarding instructions still apply; no configuration draft
update was needed. Home, themes, navigation and Core identity are preserved.

Executed checks:

- `npm run lint`, `npm run typecheck`, `npm run build`: passed on final code.
- `node --test server/run-history.test.ts server/projects.test.ts
  server/retry.test.ts`: five passed. Covers lineage chains, same-project scope,
  malformed metadata, stable ordering, ownership, existing rename protections,
  preserved evidence, retry deduplication and fresh approval requirements.
- `npx playwright test tests/timeline.spec.ts tests/retry.spec.ts
  tests/requirements.spec.ts tests/projects.spec.ts`:16 passed. Both themes at
  375px/1440px, with timeline tests using reduced motion. Covers parent links,
  filters, clear/reset, history/requirements/retry regressions, asynchronous
  section navigation and heading focus. No overflow observed.
- Final ordering/wording rechecks: `npx playwright test tests/timeline.spec.ts
  tests/requirements.spec.ts`: eight passed. Intermediate timeline-only
  wording rechecks: four passed.
- `npm run preflight:backend`: local runtime/build/origin/storage checks passed.
- `npm run package:backend`: source archive regenerated; checksum and safe
  archive entries inspected, including new timeline source/tests/report.

All four `artifacts/timeline-<width>-<theme>.png` screenshots were inspected;
final mobile dark and desktop light screenshots were inspected after the
ordering correction. No new timeline page or console errors were observed.
Existing deliberate rename-conflict tests retain their expected HTTP409
diagnostic. Vite's lazy 3D size advisory remains917.50KB /243.26KB gzip; test
runner color-environment warnings remain. No warning was suppressed.

Validation is scoped to project/history/retry behavior. The full backend and
Docker execution suites were not rerun for this read-only metadata/UI change;
their prior results are not new Step20 checks. Timeline fixtures are controlled
test runs, not new model inference or generated-software measurements.

Limitations: history is still loaded in full, not paginated, and does not poll
for remote updates while the project page remains open. Links trace immediate
parents; this is not a graph or merged cross-attempt evidence view. Nothing was
published or deployed; the Vercel demo remains unchanged and a public backend
still needs a VM plus remote HTTPS/persistence validation.

Next: add bounded server-side history pagination and filtering while preserving
lineage links and making older attempts accessible without loading all runs.
