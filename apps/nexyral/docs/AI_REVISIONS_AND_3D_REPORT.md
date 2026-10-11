# AI revisions and dimensional UI — 12 October 2026

This upgrade addresses the next product gap: users should be able to improve an existing app without writing TypeScript. It also gives the existing 3D identity a clearer physical presentation. No independent executive score or universal rating is claimed.

## Shipped

- **Plain-language AI changes:** signed-in, verified users can ask Gemini to revise their existing frontend. The original intent, current saved app/CSS, and change request are included in the provider request. Complete updated source is returned; unrelated behavior is explicitly requested to remain intact.
- **Recoverable versions:** successful manual edits, AI revisions, and restores atomically snapshot the previous source. The last ten snapshots per project can be restored without another model request. Source/history/restore routes are account scoped and reject stale versions.
- **Failed-request protection:** failed inference or exhausted service capacity preserves the previous source and releases the generation lease. Duplicate requests and obsolete completions cannot overwrite a newer result. Interrupted requests can be retried after the existing two-minute lease window.
- **Practical workspace:** the AI request panel sits beside the app on wider screens. The new-project form collapses after generation. Mobile workflow labels are compact; preview and controls stack deliberately. Unsaved code must be saved or discarded before an AI revision or restore.
- **Reload recovery:** completed source arriving through polling is adopted only if the local editor still matches the previous saved source. Local unsaved edits are preserved.
- **3D Core:** a computational base, active shell accents, and an inspect/reassemble control for shell and processing layers. Slow rotation, pointer parallax, controlled DPR, offscreen suspension, and reduced motion are preserved. Only two small meshes were added; no new Canvas, postprocessing, shaders, particle systems, or dependencies.
- **Dimensional visual language:** a framed Core scene, restrained perspective grid, desktop pointer depth on the workspace illustration, and stacked surface shadows. Touch and reduced-motion layouts remain still. Both themes use existing semantic tokens.
- **Clear explanations:** Home, Features, Documentation, FAQ, and data-use text reflect AI revisions and version snapshots. Prepared public starters remain labeled as prepared; saved Gemini examples remain separate.

## Server contracts

- `POST /api/cloud/projects/:id/refine` — `{instruction, updatedAt}`; authenticated/verified owner, bounded request, shared AI budget, atomic generation lease.
- `GET /api/cloud/projects/:id/history` — last ten snapshot IDs, labels, and timestamps; no other account's versions.
- `POST /api/cloud/projects/:id/restore` — `{versionId, updatedAt}`; authenticated owner, version-conflict protection, current source snapshotted before restore.
- Existing source saves now use the same atomic snapshot/update helper.

D1 migration `0004_project_versions.sql` adds the snapshot table/index and was successfully applied to remote `nexyral` before publication. No existing project rows or source were deleted by migration.

## Checks executed

- `npm run lint`: passed without lint warnings.
- `npm run build:cloud`: frontend/server TypeScript, production Vite build, and Cloudflare type checking passed.
- `npm run preflight:cloud`: passed.
- `npm run test:cloud`: **20 passed**, none skipped. Includes context sent to the model, revision/restore persistence, ownership, verification gates, stale writes, failure preservation, lease release, duplicate requests, obsolete completions, shared budgets, and ten-version retention.
- `npm run test:cloud:ui`: **38 passed**, none skipped. Includes AI failure/retry, changed React preview, restoring source, dirty-editor protection, inspect/reassemble Core, pause, reduced motion, accounts, source editing, recovery, exports, and both themes.
- After final copy and layout adjustments: **7 targeted homepage/Core/revision tests** and **10 targeted workspace/revision tests** passed.
- Internal screenshot checks: 390/768/1440px, both themes, Core expansion, pointer depth, reduced motion, and no page overflow passed. Screenshots inspected for desktop/dark hero, phone/light expanded Core, and workspace layout.
- `npm run test:dimensional:live`: actual public site passed six viewport/theme combinations, inspect/reassemble Core, desktop pointer depth, reduced motion, and no page/console errors or overflow.
- `npm run test:preview:live`: actual public prepared starter passed interactions, code edits, changed preview, ZIP export containing edited source, and phone layout at 390/1440px in both themes.
- `npm run test:showcase:live`: three saved real Gemini outputs still passed interactions at 390/1440px, with no page/preview overflow or errors. Guided signup draft handoff passed.
- Actual public refine/history/restore endpoints rejected unauthenticated requests with 401.
- `git diff --check`: passed.

Authenticated browser tests use Firebase/API fixtures. Backend tests use the actual handlers and an in-memory SQL adapter with a mocked provider. Live public tests fetch actual deployed HTTPS assets/results through Node's verified CA trust; no TLS bypass or invented model output is used. **A new authenticated production Gemini revision and production restore were not executed in this turn.** Public saved outputs and browser execution were exercised; this distinction is deliberate.

## Publication

- https://nexyral.online
- https://nexyral.online/playground
- Worker version: `a770fabb-64f1-4d81-aa3f-2174f1beda00`
- No dependencies added.

## Remaining limits

AI model quality and provider/service quotas still apply. The product generates/revises frontends, not complete business backends. Browser previews do not constitute type checking, automated tests, security verification, or generated-app production deployment. Source snapshots are bounded recovery, not indefinite version history. Browser sandboxing does not provide a CPU isolation boundary. Physical mobile-device profiling and real-user completion/retention measurement remain outstanding.

The lazy Core bundle is **919.35 KB / 243.78 KB gzipped**; Vite's existing size advisory remains. The homepage bundle is **463.83 KB / 146.75 KB gzipped**. Local Vite-only browser checks may report refused legacy proxy connections on unfixture'd public-example requests; separate actual public-site checks passed.

The original timestamp-only Focus ZIP regeneration was restored in Git to avoid an unrelated binary change. No secrets are recorded in source or this report.

## Exact file inventory

**Modified**

- `cloudflare/cloud.test.ts`
- `cloudflare/gemini.ts`
- `cloudflare/worker.ts`
- `package.json`
- `src/components/3d/nexyral-core/CoreEngine.tsx`
- `src/components/3d/nexyral-core/NexyralCore.tsx`
- `src/components/3d/nexyral-core/NexyralScene.tsx`
- `src/components/workspace/SourceOutput.tsx`
- `src/main.tsx`
- `src/pages/CloudStudio.tsx`
- `src/pages/ContentPage.tsx`
- `src/pages/GettingStartedGuide.tsx`
- `src/pages/PolicyPage.tsx`
- `src/sections/GettingStarted/GettingStarted.tsx`
- `src/sections/Hero/Hero.tsx`
- `src/sections/Questions/Questions.tsx`
- `src/sections/WorkspaceInvite/WorkspaceInvite.tsx`
- `tests/cloud/home.spec.ts`
- `tests/cloud/studio.spec.ts`

**Created**

- `cloudflare/migrations/0004_project_versions.sql`
- `cloudflare/project-revisions.ts`
- `docs/AI_REVISIONS_AND_3D_REPORT.md`
- `scripts/check-dimensional-live.mjs`
- `src/components/effects/DepthSurface.tsx`
- `src/components/workspace/RefinementPanel.tsx`
- `src/styles/dimensional.css`
- `src/styles/refinement-studio.css`

